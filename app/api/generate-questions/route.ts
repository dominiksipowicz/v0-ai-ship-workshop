import { type NextRequest, NextResponse } from "next/server";
import { Experimental_Agent as Agent, Output, tool, stepCountIs } from "ai";
import { z } from "zod";
import { redis, type Question } from "@/lib/upstash";

// Schema for questions
const questionsSchema = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().describe("Question ID (Q1, Q2, Q3)"),
        question: z.string().describe("The natural question users would ask"),
      })
    )
    .length(3)
    .describe("Exactly 3 natural questions"),
});

export async function POST(request: NextRequest) {
  try {
    const { runId } = await request.json();

    if (!runId) {
      return NextResponse.json({ error: "Missing runId" }, { status: 400 });
    }

    const contextData = await redis.get(`${runId}:context`);
    if (!contextData) {
      return NextResponse.json(
        { error: "Context not found for this runId" },
        { status: 404 }
      );
    }

    const { brand, context } = contextData as any;

    // Create validation tool to check for brand mentions
    const validateQuestions = tool({
      description: `Validate that the generated questions do not contain the brand name "${brand}". If brand name is found, return validation failure so new questions can be generated.`,
      inputSchema: z.object({
        questions: z.array(
          z.object({
            id: z.string(),
            question: z.string(),
          })
        ),
      }),
      execute: async ({
        questions,
      }: {
        questions: Array<{ id: string; question: string }>;
      }) => {
        const brandLower = brand.toLowerCase();
        const invalidQuestions = questions.filter((q) =>
          q.question.toLowerCase().includes(brandLower)
        );

        if (invalidQuestions.length > 0) {
          console.log(
            `[v0] Brand validation failed - found "${brand}" in questions:`,
            invalidQuestions.map((q) => q.id).join(", ")
          );
          return {
            valid: false,
            message: `Brand name "${brand}" found in questions: ${invalidQuestions
              .map((q) => q.id)
              .join(
                ", "
              )}. You MUST regenerate these questions WITHOUT the brand name.`,
            invalidQuestionIds: invalidQuestions.map((q) => q.id),
          };
        }

        console.log("[v0] Brand validation passed - no brand mentions found");
        return {
          valid: true,
          message: "All questions are valid - no brand mentions detected.",
        };
      },
    });

    // Create an Agent with validation tool
    const questionAgent = new Agent({
      model: "openai/gpt-4o-mini",
      system: `You are an expert at creating natural, AEO-optimized questions that users would ask AI assistants.

CRITICAL RULES:
1. You must NEVER mention the brand name "${brand}" in any of the questions
2. Users don't know the brand yet and are asking to discover solutions
3. After generating questions, you MUST use the validateQuestions tool to verify no brand mentions
4. If validation fails, you MUST regenerate the questions that contain the brand name
5. Generate exactly 3 questions with IDs: Q1, Q2, Q3`,
      tools: {
        validateQuestions,
      },
      experimental_output: Output.object({
        schema: questionsSchema,
      }),
      stopWhen: stepCountIs(3), // Maximum 3 steps (generate + validate + optional regenerate)
    });

    // Generate questions using the agent
    const { experimental_output: questionsData } = await questionAgent.generate(
      {
        prompt: `Given this brand context:
${context}

Generate exactly 3 natural questions that users would realistically ask AI assistants when looking for solutions in this space.

Requirements:
- DO NOT USE the brand name "${brand}" anywhere in the questions
- Users are asking to discover solutions, prices, or providers
- Questions should be natural and conversational
- Questions should be the type users would ask when seeking recommendations
- Questions should be relevant to the offerings described
- Use Q1, Q2, Q3 as IDs

After generating the questions, you MUST call the validateQuestions tool to verify they don't contain the brand name.`,
      }
    );

    // Store questions in Upstash - matches Question[] type
    const questions: Question[] = questionsData.questions;
    await redis.set(`${runId}:questions`, JSON.stringify(questions));

    return NextResponse.json({
      success: true,
      questions: questionsData.questions,
    });
  } catch (error) {
    console.error("[v0] Error generating questions:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
