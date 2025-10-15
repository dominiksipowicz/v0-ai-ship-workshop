import { useEffect, useRef } from "react";
import type { RunStatus } from "@/lib/upstash";

const MAX_POLLING_TIME = 5 * 60 * 1000; // 5 minutes

interface UseIntervalPollingResultsProps {
  runId: string | null;
  isRunning: boolean;
  setStatus: (status: RunStatus) => void;
  setError: (error: string | null) => void;
  setIsRunning: (isRunning: boolean) => void;
}

export function useIntervalPollingResults({
  runId,
  isRunning,
  setStatus,
  setError,
  setIsRunning,
}: UseIntervalPollingResultsProps) {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const stopPolling = () => {
    setIsRunning(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!runId || !isRunning) return;

    // Set start time when polling begins
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const pollStatus = async () => {
      try {
        // Check if 5 minutes have passed
        if (
          startTimeRef.current &&
          Date.now() - startTimeRef.current > MAX_POLLING_TIME
        ) {
          console.log("[v0] Max polling time reached, stopping");
          stopPolling();
          setError("Timeout: Process took longer than 5 minutes");
          return;
        }

        const response = await fetch(`/api/check-status?runId=${runId}`);
        if (!response.ok) throw new Error("Failed to fetch status");

        const data: RunStatus = await response.json();
        setStatus(data);

        // Stop polling if complete or failed
        if (data.status === "complete" || data.completedAnswers === 27) {
          console.log("[v0] All answers complete, stopping polling");
          stopPolling();
        }
      } catch (err) {
        console.log("[v0] Error polling status:", err);
        setError("Failed to check status");
      }
    };

    // Poll immediately on start to show initial results faster
    pollStatus();

    // Set up interval for subsequent polls
    pollingIntervalRef.current = setInterval(pollStatus, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [runId, isRunning]);

  // Reset start time when not running
  useEffect(() => {
    if (!isRunning) {
      startTimeRef.current = null;
    }
  }, [isRunning]);

  return { stopPolling };
}
