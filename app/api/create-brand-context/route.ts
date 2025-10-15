import { type NextRequest, NextResponse } from "next/server";
import { Experimental_Agent as Agent, Output } from "ai";
import { z } from "zod";
import { redis, type BrandContext } from "@/lib/upstash";

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

export async function POST(request: NextRequest) {
  try {
    const { runId, brand } = await request.json();

    if (!runId || !brand) {
      return NextResponse.json(
        { error: "Missing runId or brand" },
        { status: 400 }
      );
    }

    // Create Agent for brand context generation
    const brandContextAgent = new Agent({
      model: "openai/gpt-4o-mini",
      system:
        "You are an expert at creating comprehensive brand context for AI visibility testing. Analyze brands and products to provide detailed, structured information.",
      experimental_output: Output.object({
        schema: brandContextSchema,
      }),
    });

    // Generate master context using AI with structured output
    const { experimental_output: brandContext } =
      await brandContextAgent.generate({
        prompt: `Analyze this brand/product: "${brand}"
      
Provide comprehensive information that will be used to generate natural questions users might ask AI assistants.`,
      });

    // Store context in Upstash - matches BrandContext type
    const contextData: BrandContext = {
      brand,
      context: brandContext.comprehensiveSummary,
      timestamp: Date.now(),
    };

    await redis.set(`${runId}:context`, JSON.stringify(contextData));

    return NextResponse.json({
      success: true,
      context: contextData,
    });
  } catch (error) {
    console.error("[v0] Error creating brand context:", error);
    return NextResponse.json(
      { error: "Failed to create brand context" },
      { status: 500 }
    );
  }
}
