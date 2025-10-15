import { type NextRequest, NextResponse } from "next/server";
import { Experimental_Agent as Agent, generateText, Output } from "ai";
import { z } from "zod";
import { redis, type VisibilityAnswer } from "@/lib/upstash";

// Schema for brand detection
const brandDetectionSchema = z.object({
  isVisible: z
    .boolean()
    .describe("Whether the brand is mentioned in the answer"),
  position: z
    .number()
    .nullable()
    .describe(
      "Position of the brand mention among other brands (1-10), or null if not mentioned or only one"
    ),
});

export async function POST(request: NextRequest) {
  try {
    const { runId, questionId, question, model, run, brand } =
      await request.json();

    if (!runId || !questionId || !question || !model || !run || !brand) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    console.log(
      `[v0] Checking visibility for ${brand} with ${model}, run ${run}`
    );

    try {
      // Step 1: Get answer from the target model using AI Gateway
      const { text: answer } = await generateText({
        model: model,
        prompt: question,
      });

      console.log(`[v0] Got answer from ${model}:`, answer.substring(0, 100));

      // Step 2: Use Agent for brand detection with structured output
      const detectionAgent = new Agent({
        model: "openai/gpt-4o-mini",
        system: `You are an expert at analyzing AI responses to detect brand mentions and positioning.
        
Your task is to carefully analyze answers and determine:
1. Whether a specific brand is mentioned
2. If mentioned, what position it holds among other brands/products`,
        experimental_output: Output.object({
          schema: brandDetectionSchema,
        }),
      });

      // Generate detection result using the agent
      const { experimental_output: detection } = await detectionAgent.generate({
        prompt: `Analyze this AI-generated answer to determine if the brand "${brand}" is mentioned.

Answer to analyze:
"${answer}"

Determine:
1. Is the brand "${brand}" explicitly mentioned in the answer?
2. If yes, what position is it mentioned among other brands/products? (1 = first mentioned, 2 = second, etc., or null if not mentioned or if it's the only one)`,
      });

      console.log(`[v0] Detection result:`, detection);

      // Matches VisibilityAnswer type
      const answerData: VisibilityAnswer = {
        questionId,
        model,
        run,
        answer,
        mentioned: detection.isVisible,
        position: detection.position,
        timestamp: Date.now(),
        failed: false,
      };

      await redis.set(
        `${runId}:${questionId}:answer${run}:${model.replace(/\//g, "_")}`,
        JSON.stringify(answerData)
      );

      console.log(
        `[v0] Stored answer for ${runId}:${questionId}:answer${run}:${model.replace(
          /\//g,
          "_"
        )}`
      );

      return NextResponse.json({
        success: true,
        answer: answerData,
      });
    } catch (checkError) {
      console.log(`[v0] Check failed for ${model}, run ${run}:`, checkError);

      // Matches VisibilityAnswer type
      const failedAnswerData: VisibilityAnswer = {
        questionId,
        model,
        run,
        answer: "",
        mentioned: false,
        position: null,
        timestamp: Date.now(),
        failed: true,
        error:
          checkError instanceof Error ? checkError.message : "Unknown error",
      };

      await redis.set(
        `${runId}:${questionId}:answer${run}:${model.replace(/\//g, "_")}`,
        JSON.stringify(failedAnswerData)
      );

      return NextResponse.json({
        success: true, // Still return success so the run continues
        answer: failedAnswerData,
      });
    }
  } catch (error) {
    console.log("[v0] Error checking visibility:", error);
    return NextResponse.json(
      {
        error: "Failed to check visibility",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
