import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { redis } from "@/lib/upstash"

export async function POST(request: NextRequest) {
  try {
    const { runId, brand } = await request.json()

    if (!runId || !brand) {
      return NextResponse.json({ error: "Missing runId or brand" }, { status: 400 })
    }

    // Generate master context using AI
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `You are an expert at creating comprehensive brand context for AI visibility testing.

Given the brand/product: "${brand}"

Create a detailed master context that includes:
1. What the brand/product is
2. Key features and offerings
3. Target audience
4. Industry and category
5. Unique value propositions

Format as a comprehensive paragraph that will be used to generate natural questions users might ask AI assistants.`,
    })

    // Store context in Upstash
    const contextData = {
      brand,
      context: text,
      timestamp: Date.now(),
    }

    await redis.set(`${runId}:context`, JSON.stringify(contextData))

    return NextResponse.json({
      success: true,
      context: contextData,
    })
  } catch (error) {
    console.error("[v0] Error creating brand context:", error)
    return NextResponse.json({ error: "Failed to create brand context" }, { status: 500 })
  }
}
