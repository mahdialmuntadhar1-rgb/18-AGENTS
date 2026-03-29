# Iraq Business Data Agents – 18 City Scrapers + Quality Control

## Features
- 18 independent agents, one per Iraqi city
- Real data from Google Places API + Gemini AI enrichment
- Quality control manager scores each business (0-100)
- Dashboard to run any agent individually or all 18 at once
- Live WebSocket logs

## Quick Start

### 1. Prerequisites
- Node.js 18+
- Redis (or use Docker)
- Supabase account (free tier)
- Google Places API key
- Gemini API key

### 2. Setup Backend
```bash
cd server
cp .env.example .env
# Edit .env with your keys
npm install
npm run dev
```

### 3. Setup Frontend
```bash
cd dashboard
npm install
npm run dev
```

### 4. Database
Run the SQL migration in Supabase SQL editor.

### 5. Run Redis (if not already)
```bash
docker-compose up -d redis
```

## API Endpoints
- `GET /api/agents/status` – List all agent jobs
- `POST /api/agents/start` – Start one city agent
- `POST /api/agents/start-all` – Start all 18 agents
- `GET /api/agents/logs/:jobId` – Fetch logs for a job

## WebSocket
Connect to `ws://localhost:3001` to receive real-time agent logs.

## Agent Workflow
1. City agent queries Google Places for businesses in that city.
2. For each result, calls Gemini to extract Arabic name & social media.
3. Raw data saved to `raw_businesses`.
4. Quality manager scores each record (phone=30, social=20, maps=20, etc.).
5. Verified businesses saved to `verified_businesses` with status (`approved`/`needs_review`/`rejected`).

## Cost Estimates
- Google Places: ~$0.017 per search (50 results) → ~$0.30 per city
- Gemini: free tier (60 requests/min)
- Total for full 18-city run: ~$5.40

## License
MIT
