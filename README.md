> **Note**
> START by cloning the template from https://v0.app/templates/ai-ship-workshop-tyVvKQthD7X

# AI Ship 2025 Workshop - v0 Template Starter

_Learn to build modern AI-powered applications with the latest Vercel AI SDK and v0_

[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/templates/ai-ship-workshop-tyVvKQthD7X)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://v0.app/templates/ai-ship-workshop-tyVvKQthD7X)

## Overview

This is a hands-on workshop template for AI Ship 2025 that teaches you how to refactor AI applications from traditional patterns to modern, secure, and scalable approaches using the latest Vercel AI SDK v5 features. The workshop focuses on migrating to best practices including agents, workflows, structured outputs, and AI Elements.

## Tech Stack

- **Next.js** - React framework for production
- **AI SDK 5** - Vercel's AI SDK with modern agent patterns
- **shadcn/ui** - Beautiful, accessible component library
- **AI Gateway** - All AI providers in one place
- **AI Elements** - Pre-built UI components for AI interactions
- **Upstash KV** - Redis-compatible storage for workflows
- **Workflows SDK** - Long-running async operations
- **Vercel Sandbox** - Secure code execution environment

## Prerequisites

Before starting the workshop, ensure you have:

- ✅ **React** knowledge
- ✅ **Next.js** experience
- ✅ **v0 Account** - [Sign up at v0.dev](https://v0.dev)
- ✅ **Vercel Account** - [Sign up at vercel.com](https://vercel.com)
- ✅ **Vercel AI Gateway credits** - will be provided by Vercel for you to use durign the workshop
- ✅ **GitHub Account** - [Sign up at github.com](https://github.com)

## Development (after you have cloned the template!!)

Run the development server:

\`\`\`bash

pnpm install
vercel link
vercel env pull
pnpm dev

\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see your application.

Test the application with "iPhone" in the brand input field.

## Workshop Tasks

### 1. Initial Setup

#### Task 1.1: Clone Template from v0

- Navigate to [v0.dev](https://v0.app/templates/ai-ship-workshop-tyVvKQthD7X)
- [Find this workshop template](https://v0.app/templates/ai-ship-workshop-tyVvKQthD7X)
- Clone it into your personal v0 workspace

#### Task 1.2: Connect to GitHub

- In v0, connect your project to GitHub
- Authorize v0 to access your GitHub account
- Create a new repository for this project

#### Task 1.3: Deploy to Production

- Deploy your project from v0 to Vercel
- Verify the deployment is successful
- Note your production URL

#### Task 1.4: Clone Locally

- Clone the GitHub repository to your local machine
  \`\`\`bash
  git clone <your-repo-url>
  cd v0-ai-ship-workshop
  pnpm install
  \`\`\`

### 2. Refactor to AI SDK v5 Features

The main focus of this workshop is modernizing the codebase with AI SDK v5 features:

#### Task 2.1: Refactor from `generateText` to `generateObject`

- Update API routes to use structured outputs
- Implement proper TypeScript types for responses
- Reference: [Structured Output Docs](https://ai-sdk.dev/docs/agents/building-agents#structured-output)

#### Task 2.2: Implement System Prompts

- Add system prompts to guide AI behavior
- Ensure consistent AI responses across endpoints

#### Task 2.3: Use Agent Class for Generate Questions

- Refactor `generate-questions` route to use the Agent class
- **Requirement**: Verify there is no brand mentioned in the output
- Implement validation logic

#### Task 2.4: Use Agent Class for Check Visibility

- Convert `check-visibility` route to use Agent class
- Transform into a "detect results" pattern
- Implement proper error handling

#### Task 2.5: Implement Prepare Step

- Use Prepare Step for changing models dynamically
- Apply for brand mention detection
- Apply for detecting results
- Optimize model selection based on task

#### Task 2.6: Push Changes to GitHub

\`\`\`bash
git add .
git commit -m "Refactor to AI SDK v5 with Agent class and modern patterns"
git push origin main
\`\`\`

### 3. Sync and Enhance

#### Task 3.1: Sync v0 with GitHub

- Pull latest changes into v0
- Verify synchronization is working

#### Task 3.2: Add Payment Option

- Add payment integration to make this a full SaaS example
- Use v0 to generate payment UI components
- Implement billing logic

#### Task 3.3: Final Sync

- Commit payment features
- Push to GitHub
- Verify v0 sync

## Stretch Goals

Once you've completed the main tasks, try these advanced challenges:

### 🚀 Advanced Features

1. **Refactor to Use Vercel Sandbox**

   - refactor all 3 API Routes (create-brand-context, generate-questions, check-visibility) into one initial call that will execute Vercel Sandbox

2. **Add AI Elements**

   - Integrate AI Elements library
   - Enhance "view chats" functionality with AI Elements
   - Enhance UI with pre-built AI components

3. **Implement Security: BotID**

   - Add bot detection and prevention
   - Implement BotID for request verification
   - Protect against automated abuse

4. **Add Rate Limiting for API Routes**

   - Implement rate limiting middleware
   - Protect API endpoints from abuse
   - Use Vercel Edge Config or Upstash or Vercel Firewall

5. **Add Charts to Final Report**
   - Use v0 to generate chart components
   - Visualize data in the final report
   - Add interactive data visualizations

## Troubleshooting

- Make sure you have `AI_GATEWAY_API_KEY` environment variable set in `.env.local`
- Make sure youhave REDIS connected in v0 and then do `vercel env pull` to pull the environment variables into your local environment.

## Resources

- [AI SDK v5 Documentation](https://sdk.vercel.ai/docs)
- [Agent Building Guide](https://ai-sdk.dev/docs/agents/building-agents)
- [v0 Documentation](https://v0.dev/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Workflows](https://vercel.com/docs/workflow)

---

**Happy Building! 🚀**
