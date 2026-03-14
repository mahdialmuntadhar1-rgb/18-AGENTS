<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ff9d62c2-6311-42b0-93a6-e0ae5804afba

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Enrichment agent startup

The enrichment orchestrator now starts all 18 governorate agents automatically when the server boots (`npm run dev` / server startup). Manual orchestration endpoints are still available if you want to explicitly trigger start/stop operations:

- `POST /api/orchestrator/start` (optional manual start)
- `POST /api/orchestrator/stop`
- `GET /api/agents`
