# Vercel Sandbox Integration

This project now includes a Vercel Sandbox integration that runs the full agent flow in an isolated, secure environment.

## What is Vercel Sandbox?

[Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) is a secure, isolated environment for executing untrusted or dynamic code. Perfect for:

- ✅ AI agent code execution
- ✅ Running user-submitted code safely
- ✅ Dynamic, real-time workloads
- ✅ Testing code in isolation

refrence guide: https://vercel.com/docs/vercel-sandbox/reference/readme

## API Endpoint

### `POST /api/full-flow-agent`

Executes the complete brand visibility workflow in a Vercel Sandbox.

**Request:**

```bash
curl -X POST https://your-app.vercel.app/api/full-flow-agent \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "iphone",
    "runId": "222"
  }'
```

## How It Works

### 1. **Sandbox Creation**

Creates an isolated sandbox environment:

- **Resources:** 4 vCPUs
- **Runtime:** Node.js 22
- **Timeout:** 10 minutes
- **Environment:** All required environment variables passed securely

### 2. **Dependency Installation**

Runs `pnpm install` to install all project dependencies in the sandbox.

### 3. **Agent Flow Execution**

Executes `pnpm full-agent-flow <brand> <runId>` which:

- Creates brand context using AI
- Generates 3 AEO-optimized questions
- Checks visibility across 3 models × 3 runs = 27 checks
- Stores all results in Redis

## Environment Variables Required

The following environment variables are passed to the sandbox:

```bash
AI_GATEWAY_API_KEY=your-gateway-key
KV_REST_API_READ_ONLY_TOKEN=your-read-only-token
KV_REST_API_TOKEN=your-token
KV_REST_API_URL=https://your-redis.upstash.io
KV_URL=https://your-redis.upstash.io
REDIS_URL=your-redis-url
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

Make sure these are set in your Vercel project settings or `.env.local` for local development.
