import { Redis } from "@upstash/redis"

export const redis = Redis.fromEnv()

export type BrandContext = {
  brand: string
  context: string
  timestamp: number
}

export type Question = {
  id: string
  question: string
}

export type VisibilityAnswer = {
  questionId: string
  model: string
  run: number
  answer: string
  mentioned: boolean
  position: number | null
  timestamp: number
  failed?: boolean // Add optional failed flag
  error?: string // Add optional error message
}

export type RunStatus = {
  runId: string
  brand: string
  context: BrandContext | null
  questions: Question[] | null
  answers: VisibilityAnswer[]
  totalAnswers: number
  completedAnswers: number
  status: "pending" | "context" | "questions" | "checking" | "complete" | "failed"
}
