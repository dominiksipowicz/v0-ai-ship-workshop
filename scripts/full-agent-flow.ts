#!/usr/bin/env node
import "../lib/envConfig";
import {
  Experimental_Agent as Agent,
  Output,
  tool,
  stepCountIs,
  generateText,
} from "ai";
import { z } from "zod";
import { Redis } from "@upstash/redis";
import type { BrandContext, Question, VisibilityAnswer } from "../lib/upstash";
import { MODELS } from "../lib/constants";

// Initialize Redis client with proper environment variable handling
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "",
  token:
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "",
});

// Schema for brand context
const brandContextSchema = z.object({
  description: z.string().describe("What the brand/product is"),
  keyFeatures: z.array(z.string()).describe("Key features and offerings"),
  targetAudience: z.string().describe("Target audience"),
  industry: z.string().describe("Industry and category"),
  valuePropositions: z.array(z.string()).describe("Unique value propositions"),
  comprehensiveSummary: z
    .string()
    .describe("A comprehensive paragraph summary for generating questions"),
});

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

async function createBrandContext(
  runId: string,
  brand: string
): Promise<BrandContext> {
  console.log("\n📝 Step 1: Creating brand context...");

  const brandContextAgent = new Agent({
    model: "openai/gpt-4o-mini",
    system:
      "You are an expert at creating comprehensive brand context for AI visibility testing. Analyze brands and products to provide detailed, structured information.",
    experimental_output: Output.object({
      schema: brandContextSchema,
    }),
  });

  const { experimental_output: brandContext } =
    await brandContextAgent.generate({
      prompt: `Analyze this brand/product: "${brand}"
      
Provide comprehensive information that will be used to generate natural questions users might ask AI assistants.`,
    });

  const contextData: BrandContext = {
    brand,
    context: brandContext.comprehensiveSummary,
    timestamp: Date.now(),
  };

  await redis.set(`${runId}:context`, JSON.stringify(contextData));
  console.log(`✅ Brand context created and stored in Redis`);
  console.log(`   Industry: ${brandContext.industry}`);
  console.log(`   Target: ${brandContext.targetAudience}`);

  return contextData;
}

async function generateQuestions(
  runId: string,
  brand: string,
  context: string
): Promise<Question[]> {
  console.log("\n❓ Step 2: Generating questions...");

  // Create validation tool
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
          `   ⚠️  Brand validation failed - found "${brand}" in questions:`,
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

      console.log("   ✅ Brand validation passed");
      return {
        valid: true,
        message: "All questions are valid - no brand mentions detected.",
      };
    },
  });

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
    stopWhen: stepCountIs(3),
  });

  const { experimental_output: questionsData } = await questionAgent.generate({
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
  });

  const questions: Question[] = questionsData.questions;
  await redis.set(`${runId}:questions`, JSON.stringify(questions));

  console.log("✅ Questions generated and stored:");
  questions.forEach((q) => console.log(`   ${q.id}: ${q.question}`));

  return questions;
}

async function checkVisibility(
  runId: string,
  questionId: string,
  question: string,
  model: string,
  run: number,
  brand: string
): Promise<VisibilityAnswer> {
  try {
    // Get answer from target model
    const { text: answer } = await generateText({
      model: model,
      prompt: question,
    });

    // Use detection agent
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

    const { experimental_output: detection } = await detectionAgent.generate({
      prompt: `Analyze this AI-generated answer to determine if the brand "${brand}" is mentioned.

Answer to analyze:
"${answer}"

Determine:
1. Is the brand "${brand}" explicitly mentioned in the answer?
2. If yes, what position is it mentioned among other brands/products? (1 = first mentioned, 2 = second, etc., or null if not mentioned or if it's the only one)`,
    });

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

    return answerData;
  } catch (checkError) {
    const failedAnswerData: VisibilityAnswer = {
      questionId,
      model,
      run,
      answer: "",
      mentioned: false,
      position: null,
      timestamp: Date.now(),
      failed: true,
      error: checkError instanceof Error ? checkError.message : "Unknown error",
    };

    await redis.set(
      `${runId}:${questionId}:answer${run}:${model.replace(/\//g, "_")}`,
      JSON.stringify(failedAnswerData)
    );

    return failedAnswerData;
  }
}

async function main() {
  try {
    // Get command line arguments
    const brand = process.argv[2];
    const runId = process.argv[3];

    if (!brand || !runId) {
      console.error("❌ Error: Please provide both brand and runId");
      console.log("Usage: pnpm full-agent-flow <brand> <runId>");
      console.log("Example: pnpm full-agent-flow iphone 222");
      process.exit(1);
    }

    console.log("🚀 Starting Full Agent Flow...");
    console.log(`   Brand: ${brand}`);
    console.log(`   Run ID: ${runId}`);

    // Check environment variables
    const redisUrl =
      process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const redisToken =
      process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (!redisUrl || !redisToken) {
      console.error("\n❌ Missing environment variables:");
      console.error(
        "   Please ensure either UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN"
      );
      console.error(
        "   or KV_REST_API_URL/KV_REST_API_TOKEN are set in .env.local"
      );
      process.exit(1);
    }

    console.log("✅ Redis connection configured");

    // Step 1: Create brand context
    const contextData = await createBrandContext(runId, brand);

    // Step 2: Generate questions
    const questions = await generateQuestions(
      runId,
      brand,
      contextData.context
    );

    // Step 3: Check visibility across all models (in parallel)
    console.log("\n🔍 Step 3: Checking visibility across models...");
    const totalChecks = questions.length * MODELS.length * 3;
    console.log(`   Total checks to perform: ${totalChecks}`);
    console.log(`   Running all checks in parallel...`);

    // Build array of all checks to run in parallel
    const allChecks = questions.flatMap((question) =>
      MODELS.flatMap((model) =>
        Array.from({ length: 3 }, (_, i) => ({
          question,
          model,
          run: i + 1,
        }))
      )
    );

    // Run all checks in parallel using Promise.allSettled
    // This ensures all checks complete even if some fail
    const settledResults = await Promise.allSettled(
      allChecks.map(({ question, model, run }) =>
        checkVisibility(
          runId,
          question.id,
          question.question,
          model.id,
          run,
          brand
        ).then((result) => {
          // Log individual completion
          const status = result.failed
            ? `⚠️  Failed - ${result.error}`
            : result.mentioned
            ? `✅ Mentioned (pos: ${result.position ?? "only"})`
            : `❌ Not mentioned`;
          console.log(
            `   [${question.id}] ${model.name} run ${run}: ${status}`
          );
          return result;
        })
      )
    );

    // Extract successful results from settled promises
    const results = settledResults
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);

    // Calculate summary
    const successfulChecks = results.filter((r) => !r.failed);
    const mentionedCount = successfulChecks.filter((r) => r.mentioned).length;

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Full Agent Flow Complete!");
    console.log("=".repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   Brand: ${brand}`);
    console.log(`   Run ID: ${runId}`);
    console.log(`   Questions: ${questions.length}`);
    console.log(`   Total checks: ${results.length}/${totalChecks}`);
    console.log(`   Successful: ${successfulChecks.length}`);
    console.log(`   Failed: ${results.length - successfulChecks.length}`);
    console.log(`   Brand mentions: ${mentionedCount}`);
    console.log(
      `   Visibility rate: ${(
        (mentionedCount / successfulChecks.length) *
        100
      ).toFixed(1)}%`
    );
    console.log(`\n✅ All data stored in Redis with runId: ${runId}`);
    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n❌ Error occurred:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
      if (error.stack) {
        console.error("   Stack:", error.stack);
      }
    }
    process.exit(1);
  }
}

main();
