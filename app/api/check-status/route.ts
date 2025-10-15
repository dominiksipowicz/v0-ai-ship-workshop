import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/upstash"
import type { RunStatus, VisibilityAnswer } from "@/lib/upstash"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const runId = searchParams.get("runId")

    if (!runId) {
      return NextResponse.json({ error: "Missing runId" }, { status: 400 })
    }

    const context = await redis.get(`${runId}:context`)
    const questions = await redis.get(`${runId}:questions`)

    const keys = await redis.keys(`${runId}:Q*:answer*`)
    const answers: VisibilityAnswer[] = []

    if (keys && Array.isArray(keys) && keys.length > 0) {
      const values = await redis.mget(...keys)
      if (values && Array.isArray(values)) {
        for (const value of values) {
          if (value && typeof value === "object") {
            answers.push(value as VisibilityAnswer)
          }
        }
      }
    }

    // Determine status
    let status: RunStatus["status"] = "pending"
    if (context && !questions) {
      status = "context"
    } else if (questions && answers.length === 0) {
      status = "questions"
    } else if (answers.length > 0 && answers.length < 27) {
      status = "checking"
    } else if (answers.length === 27) {
      status = "complete"
    }

    const runStatus: RunStatus = {
      runId,
      brand: (context as any)?.brand || "",
      context: context as any,
      questions: Array.isArray(questions) ? questions : null, // Ensure questions is array or null
      answers,
      totalAnswers: 27,
      completedAnswers: answers.length,
      status,
    }

    return NextResponse.json(runStatus)
  } catch (error) {
    console.info("[v0] Error checking status:", error)
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 })
  }
}
