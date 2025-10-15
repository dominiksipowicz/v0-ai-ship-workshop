import { NextResponse } from "next/server";
import { Sandbox } from "@vercel/sandbox";
import ms from "ms";

export async function POST(request: Request) {
  try {
    const { brand, runId } = await request.json();

    if (!brand) {
      return NextResponse.json(
        { error: "Missing brand parameter" },
        { status: 400 }
      );
    }

    // Generate runId if not provided
    const workflowRunId =
      runId || `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(
      `[Sandbox] Starting sandbox for brand: ${brand}, runId: ${workflowRunId}`
    );

    // Create sandbox with the GitHub repository
    const sandbox = await Sandbox.create({
      source: {
        url: "https://github.com/dominiksipowicz/v0-ai-ship-workshop",
        type: "git",
      },
      resources: { vcpus: 4 },
      timeout: ms("10m"), // 10 minute timeout
      runtime: "node22",
    });

    console.log(`[Sandbox] Created sandbox`);

    // Step 1: Install dependencies
    console.log(`[Sandbox] Installing dependencies...`);
    const install = await sandbox.runCommand({
      cmd: "pnpm",
      args: ["install"],
      env: {
        AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY || "",
        KV_REST_API_READ_ONLY_TOKEN:
          process.env.KV_REST_API_READ_ONLY_TOKEN || "",
        KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || "",
        KV_REST_API_URL: process.env.KV_REST_API_URL || "",
        KV_URL: process.env.KV_URL || "",
        REDIS_URL: process.env.REDIS_URL || "",
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",
      },
    });

    if (install.exitCode !== 0) {
      console.error(`[Sandbox] Failed to install dependencies`);
      await sandbox.stop();
      return NextResponse.json(
        {
          error: "Failed to install dependencies",
          exitCode: install.exitCode,
          stderr: install.stderr,
        },
        { status: 500 }
      );
    }

    console.log(`[Sandbox] Dependencies installed successfully`);

    // Step 2: Run the full agent flow (fire and forget - detached mode)
    console.log(
      `[Sandbox] Starting full-agent-flow for brand: ${brand}, runId: ${workflowRunId}`
    );

    // Run command in detached mode - don't wait for completion
    await sandbox.runCommand({
      cmd: "pnpm",
      args: ["full-agent-flow", brand, workflowRunId],
      detached: true, // Fire and forget
      env: {
        AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY || "",
        KV_REST_API_READ_ONLY_TOKEN:
          process.env.KV_REST_API_READ_ONLY_TOKEN || "",
        KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN || "",
        KV_REST_API_URL: process.env.KV_REST_API_URL || "",
        KV_URL: process.env.KV_URL || "",
        REDIS_URL: process.env.REDIS_URL || "",
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL || "",
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN || "",
      },
    });

    console.log(`[Sandbox] Command started in detached mode`);
    console.log(
      `[Sandbox] Sandbox will run until completion or timeout (10 minutes)`
    );

    // Return immediately without stopping the sandbox
    // The sandbox will automatically stop after timeout or you can stop it via Dashboard
    return NextResponse.json({
      success: true,
      message: "Full agent flow started in sandbox",
      runId: workflowRunId,
      brand,
      sandboxId: sandbox.sandboxId,
      note: "Command is running in background. Check results in Redis with the runId. Monitor sandbox in Vercel Dashboard > Observability > Sandboxes.",
    });
  } catch (error) {
    console.error("[Sandbox] Error running full flow agent:", error);
    return NextResponse.json(
      {
        error: "Failed to run full flow agent",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
