import type { RunStatus } from "@/lib/upstash";
import { MODELS } from "@/lib/constants";

export interface AggregatedResult {
  model: string;
  question: string;
  visible: boolean;
  position: number | null;
  runs: string;
  answers: string[];
  failedCount: number;
}

export function getAggregatedResults(
  status: RunStatus | null
): AggregatedResult[] {
  if (!status?.questions || !status?.answers) return [];

  const results: AggregatedResult[] = [];

  for (const question of status.questions) {
    for (const model of MODELS) {
      const modelAnswers = status.answers.filter(
        (a) => a.questionId === question.id && a.model === model.id
      );

      const successfulAnswers = modelAnswers.filter((a) => !a.failed);
      const failedCount = modelAnswers.filter((a) => a.failed).length;

      const visibleCount = successfulAnswers.filter((a) => a.mentioned).length;
      const totalRuns = modelAnswers.length;

      const answersWithPosition = successfulAnswers.filter(
        (a) => a.mentioned && a.position !== null
      );
      const avgPosition =
        answersWithPosition.length > 0
          ? Math.round(
              answersWithPosition.reduce(
                (sum, a) => sum + (a.position || 0),
                0
              ) / answersWithPosition.length
            )
          : null;

      results.push({
        model: model.name,
        question: question.question,
        visible: visibleCount > 0,
        position: avgPosition,
        runs: `${visibleCount}/${totalRuns}`,
        answers: successfulAnswers.map((a) => a.answer),
        failedCount,
      });
    }
  }

  return results;
}
