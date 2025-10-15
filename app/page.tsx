"use client";

import { LoaderIcon } from "lucide-react";
import { useState } from "react";

import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AgentProgress } from "@/components/agent-progress";
import { Results } from "@/components/results";
import type { RunStatus } from "@/lib/upstash";
import { MODELS } from "@/lib/constants";
import { useIntervalPollingResults } from "@/lib/use-interval-polling-results";
import { getAggregatedResults } from "@/lib/get-aggregated-results";

export default function Home() {
  const [brand, setBrand] = useState(""); // input brand name
  const [runId, setRunId] = useState<string | null>(null); // run ID to identify the run in Redis
  // status from the server (fetch visibility results from redis)
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom hook for polling results every few seconds
  const { stopPolling } = useIntervalPollingResults({
    runId,
    isRunning,
    setStatus,
    setError,
    setIsRunning,
  });

  // Main Agent workflow
  const startAgent = async () => {
    if (!brand.trim()) {
      setError("Please enter a brand name");
      return;
    }

    setError(null);
    setIsRunning(true);

    // Generate runID
    const newRunId = `run_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    setRunId(newRunId);

    try {
      // Step 1: Create brand context
      const contextResponse = await fetch("/api/create-brand-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: newRunId, brand }),
      });

      if (!contextResponse.ok) throw new Error("Failed to create context");

      // Step 2: Generate questions
      const questionsResponse = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: newRunId }),
      });

      if (!questionsResponse.ok)
        throw new Error("Failed to generate questions");
      const { questions } = await questionsResponse.json();

      // Step 3: Check visibility across all models (27 parallel calls)
      // Fire and forget - let them run in background while polling shows results
      const totalChecks = questions.length * MODELS.length * 3;
      console.log(`[v0] Starting ${totalChecks} visibility checks in parallel`);

      for (const question of questions) {
        for (const model of MODELS) {
          for (let run = 1; run <= 3; run++) {
            fetch("/api/check-visibility", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                runId: newRunId,
                questionId: question.id,
                question: question.question,
                model: model.id,
                run,
                brand,
              }),
            }).catch((err) => {
              console.error(
                `[v0] Error checking visibility for ${model.id}, run ${run}:`,
                err
              );
            });
          }
        }
      }

      console.log(
        `[v0] All visibility checks initiated. Results will appear as they complete.`
      );
    } catch (err) {
      console.error("[v0] Error in workflow:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      stopPolling();
    }
  };

  // Get aggregated results from individual results
  const results = getAggregatedResults(status);

  return (
    <div className="min-h-screen py-8 px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-semibold text-balance">
            Check your brand&apos;s visibility in LLMs
          </h1>
        </div>

        {/* Input Section */}
        <div className="space-y-4 border rounded-lg p-6 bg-card">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand or product description</Label>
            <Input
              id="brand"
              placeholder="Enter your brand name..."
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={isRunning}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button
            className="w-full"
            onClick={startAgent}
            disabled={isRunning || !brand.trim()}
          >
            {isRunning ? (
              <>
                <LoaderIcon className="size-4 mr-2 animate-spin" />
                Running Agent...
              </>
            ) : (
              "Start Agent to check AI Visibility"
            )}
          </Button>
        </div>

        {/* Chain of Thought - Show progress */}
        {status && <AgentProgress status={status} />}

        {/* Results Table */}
        <Results results={results} />
      </div>
    </div>
  );
}
