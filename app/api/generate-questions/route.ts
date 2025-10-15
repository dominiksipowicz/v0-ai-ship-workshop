import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { redis } from "@/lib/upstash"

export async function POST(request: NextRequest) {
  try {
    const { runId } = await request.json()

    if (!runId) {
      return NextResponse.json({ error: "Missing runId" }, { status: 400 })
    }

    const contextData = await redis.get(`${runId}:context`)
    if (!contextData) {
      return NextResponse.json({ error: "Context not found for this runId" }, { status: 404 })
    }

    // Generate 3 natural questions using AI
    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `You are an expert at creating natural, AEO-optimized questions that users would ask AI assistants.

Given this brand context:
${(contextData as any).context}

Generate exactly 3 natural questions that users would realistically ask AI assistants when looking for solutions that "${(contextData as any).brand}" provides.

Requirements:
- Users don’t know the brand yet and are asking to discover solutions, prices, or providers.
- DO NOT USE brand name in questions. The questions are used to check answers for brand mentions.
- Questions should be natural and conversational
- Questions should be the type users would ask when seeking recommendations
- Questions should be relevant to the brand's offerings
- Format as a JSON array of objects with "id" and "question" fields
- Use Q1, Q2, Q3 as IDs

Example format:
[
  {"id": "Q1", "question": "What are the best tools for..."},
  {"id": "Q2", "question": "How can I..."},
  {"id": "Q3", "question": "Which platform should I use for..."}
]

Return ONLY the JSON array, no other text.`,
    })

    // Parse questions
    const questions = JSON.parse(text.trim())

    // Store questions in Upstash
    await redis.set(`${runId}:questions`, JSON.stringify(questions))

    return NextResponse.json({
      success: true,
      questions,
    })
  } catch (error) {
    console.error("[v0] Error generating questions:", error)
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 500 })
  }
}
