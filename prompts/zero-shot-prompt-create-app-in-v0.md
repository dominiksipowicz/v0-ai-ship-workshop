Build a minimal SaaS app called “AI Visibility Checker” using Next.js (App Router), Vercel AI SDK, AI Gateway, AI Elements.

UX

Super simple layout in the style of Vercel UX. Black and white only. No color accents.

Responsive across mobile, tablet, desktop.

Theme toggle with light / dark / system.

Single-page flow with a centered card and generous spacing. Use Tailwind and shadcn/ui.

Data schemas:
MasterContext:

- runId
- context: just JSON object. No need to be more specific

Questions:

- runId
- questions: array of strings

Postions:

- id
- runId
- modelName
- Question
- Answer
- IsVisible
- position
- numberOfResults
- Competition
- createdAt

Flow

Input

A heading: “Check your brand’s visibility in LLMs”.

A textarea labeled “Brand or product description” that accepts a brand name, product, or short description.

Button: “Generate Context”.

show Thinking form AI Elements -> build Context

After click, show AI Elements:

grey out the button and show Loader while the request runs.

Task list with steps from AI Elements.

Chain of Thought component to show the step names and safe summaries for from AI Elements:
“Create master context” → “Show context JSON”.

Call POST /api/create-brand-context and render the returned masterContext JSON in a collapsible code block from AI Elements. If sources are present, show a “Sources” from AI Elements section with links. masterContext should be few properties max 2 level depth and should be only the most important properties. It should be small to medium size and concise. In UI show the masterContext JSON in a collapsible code block from AI Elements.

next step show Thinking from AI Elements -> build suggested Questions

Automatically trigger question generation with AI Elements:

Loader and Task steps.

Chain of Thought step labels: “Generate questions” → “Review questions”.

Call POST /api/generate-questions with number = 5.

Render the 10 questions with inline edit and delete controls.

Parallel Visibility Checks

Button: “Check Visibility Across Models”.

On click, show AI Elements:

Loader and Task or Tool steps per model.

Chain of Thought step labels: “Send queries” → “Aggregate positions” → “Plot results”.

Call POST /api/check-visibility in parallel across models:

OpenAI GPT-5, OpenAI Mini, Google Gemini, Anthropic Claude via AI Gateway.

For each model:

Ask all questions in parallel.

For each answer, detect if the brand is present. If multiple brands are listed, make a lightweight follow-up LLM call (e.g., OpenAI Mini) to return a position 1–10 for the target brand based on the answer text.

Repeat each model’s measurement 5 times. Aggregate with median position and visibility rate (percentage of runs where brand was found).

Visualization

Show a table : Model, Question, Median Position, Visibility Rate. Make sure it's responsive and mobile friendly.

AI Elements usage

Chain of Thought: show step labels and short safe summaries for each phase: context creation, question generation, visibility checks, aggregation, plotting.

Loader: show during network calls and parallel runs.

Task or Tool: display progress per step and per model.

API design

Create exactly 3 API routes and use them throughout:

1. POST /api/create-brand-context → create-brand-context(brand: string)

Input: brand: string

Uses AI SDK via AI Gateway to generate a masterContext JSON summarizing the brand or product.

Return: { masterContext: object}.

2. POST /api/generate-questions → generate-questions(number: number, masterContext: object)

Input: { number: number, masterContext: object }

Uses AI SDK to produce 5 concise, diverse, brand-relevant questions.

Return: { questions: string[] }.

Here is example prompt:

"Generate AEO-optimized questions for AI search engines like ChatGPT, Claude, and Gemini using only the provided master context JSON.

Create natural questions real users would ask AI assistants.
Users don’t know the brand yet and are asking to discover solutions, prices, or providers.

Output only the questions"

In UI and add information (info box or warning) to review and manually reduce to 3 for demo purpose to save on tokens. Add info to check on vercel AI Gateway how many tokens it's using.

3. POST /api/check-visibility → check-visibility(model: string, questions: string[], brandName: string, masterContext: object)

Input: model: string, questions: string[], brandName: string, masterContext: object

For each question, call the specified model via AI Gateway.

Then detect presence of the brand or product in the master context using lightweight LLM call to populate position object with IsVisible, position, and numberOfResults, competition. add meta data to the position object. IsVisible will be set to true if the brand or product is found in the answer.

Repeat the above 3 times for stability. Later in UI those 3 runs will be aggregated with median position and visibility percentage.

Those 3 runs should be shown in UI for each question and model one after another in the progress bar. Make sure to show the progress bar for each question and model.
So each question check will be called from the frontend to give user the feeling that the check is running.

Return:
{positions: object[]}

Orchestration

Use AI Gateway for all model calls with provider routing and sensible timeouts (5 minutes)

Implement parallelism with Promise.allSettled. Add a small concurrency cap for stability.

Model list constants with Gateway IDs, e.g.:

MODELS = [
{ id: "openai/gpt-oss-20b", name: "OpenAI GPT-OSS" },
{ id: "google/gemini-2.0-flash-lite", name: "Google Gemini 2.5 Flash Lite" },
{ id: "anthropic/claude-3-haiku", name: "Anthropic Claude 3 Haiku" }
]

info: It's importnat that in model list definitions DO NOT use GPT-5 and for API routes use GPT-5-mini.
Final results

Create a table of all results for each question for each model. When clicked on a question it will show all the results for that question for that model.

Misc

Use Zod for input validation on all API routes.

DO NOT use database or any storage. All data is in broweser memory and will be passed what is needed to the API routes.

Do not hide steps after each step. I want to see all the steps how agent is working.

Minimal error toasts using shadcn/ui.

Make sure to zod validate all input and output for all API routes.

Add error handling for all API routes and report on which model failed and why. Surface all errors to the user.

Use AI SDK version 5!

Make sure to use AI Elemenents (UI components from https://ai-sdk.dev/elements/overview), especially:

- "Chain of Thought" for whole steps
- "Loader" with greying out the buttons
- "Branch" for showing different Questions and Answers details for each question runs
- "Code Block" for showing the JSON data
- "Prompt Input" without plus icon, greayed out search and removed model selection
- "Response" for showing the answer when clicked on the question details.
- "Suggestion" for preselected brand check like "Vercel", or "Tesla cars" just below the input field.
- "Task" for showing the information in a "Chain of Thought" to describe the step.
- "Tool" for showing the information in a "Chain of Thought" like master context or progress bar for parallel runs

For the calls use Next.js Server Actions for buttons and API routes for the question checks.

Make sure the project will be very simple and easy to understand and maintain. This project will be used as a template and a workshop for AI Agents and AI SDK.
