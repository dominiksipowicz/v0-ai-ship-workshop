import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { redis } from "@/lib/upstash"

export async function POST(request: NextRequest) {
  try {
    const { runId, questionId, question, model, run, brand } = await request.json()

    if (!runId || !questionId || !question || !model || !run || !brand) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    console.log(`[v0] Checking visibility for ${brand} with ${model}, run ${run}`)

    try {
      const { text: answer } = await generateText({
        model,
        prompt: question,
      })

      console.log(`[v0] Got answer from ${model}:`, answer.substring(0, 100))

      const detectionPrompt = `Given this answer from an AI model, determine:
1. Is the brand "${brand}" mentioned in the answer? (true/false)
2. If yes, what position is it mentioned among other brands/products? (1-10, or null if not mentioned or if it's the only one)

Answer: "${answer}"

Return ONLY valid JSON with this structure (no markdown, no code fences):
{
  "isVisible": boolean,
  "position": number or null
}`

      const { text: detectionResult } = await generateText({
        model: "openai/gpt-4o-mini",
        prompt: detectionPrompt,
      })

      console.log(`[v0] Detection result:`, detectionResult)

      let detection
      try {
        const cleanedResult = detectionResult
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim()
        detection = JSON.parse(cleanedResult)
      } catch (parseError) {
        console.error("[v0] Failed to parse detection result:", parseError)
        // Fallback to simple string matching
        detection = {
          isVisible: answer.toLowerCase().includes(brand.toLowerCase()),
          position: null,
        }
      }

      const answerData = {
        questionId,
        model,
        run,
        answer,
        mentioned: detection.isVisible,
        position: detection.position,
        timestamp: Date.now(),
        failed: false, // Mark as successful
      }

      await redis.set(`${runId}:${questionId}:answer${run}:${model.replace(/\//g, "_")}`, JSON.stringify(answerData))

      console.log(`[v0] Stored answer for ${runId}:${questionId}:answer${run}:${model.replace(/\//g, "_")}`)

      return NextResponse.json({
        success: true,
        answer: answerData,
      })
    } catch (checkError) {
      console.log(`[v0] Check failed for ${model}, run ${run}:`, checkError)

      const failedAnswerData = {
        questionId,
        model,
        run,
        answer: "",
        mentioned: false,
        position: null,
        timestamp: Date.now(),
        failed: true, // Mark as failed
        error: checkError instanceof Error ? checkError.message : "Unknown error",
      }

      await redis.set(
        `${runId}:${questionId}:answer${run}:${model.replace(/\//g, "_")}`,
        JSON.stringify(failedAnswerData),
      )

      return NextResponse.json({
        success: true, // Still return success so the run continues
        answer: failedAnswerData,
      })
    }
  } catch (error) {
    console.log("[v0] Error checking visibility:", error)
    return NextResponse.json(
      {
        error: "Failed to check visibility",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
