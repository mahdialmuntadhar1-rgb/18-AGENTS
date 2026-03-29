# Iraq Business Data Agents – 18 City Scrapers + Quality Control

## Features
- 18 independent agents, one per Iraqi city
- Google Places + Gemini enrichment pipeline
- Quality manager scores each business (0-100)
- Dashboard to run one agent or all 18
- Live WebSocket logs

## Project Structure

```text
18-AGENTS/
├── server/
│   ├── src/
│   │   ├── index.ts
│   │   ├── agents/
│   │   │   ├── CityAgent.ts
│   │   │   ├── QualityManager.ts
│   │   │   └── index.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   ├── gemini.ts
│   │   │   └── googlePlaces.ts
│   │   ├── types.ts
│   │   └── queue.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── dashboard/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── AgentDashboard.tsx
│   │   │   ├── AgentCard.tsx
│   │   │   ├── QualityMonitor.tsx
│   │   │   └── LiveLogs.tsx
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts
│   │   ├── lib/
│   │   │   └── api.ts
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── supabase/
│   └── migrations/
│       └── 001_agent_schema.sql
├── docker-compose.yml
└── README.md
```

## Quick Start

### 1) Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend
```bash
cd dashboard
npm install
npm run dev
```

### 3) Database
Run `supabase/migrations/001_agent_schema.sql` in Supabase SQL editor.

### 4) Redis
```bash
docker-compose up -d redis
```

## API Endpoints
- `GET /api/agents/status`
- `POST /api/agents/start`
- `POST /api/agents/start-all`
- `GET /api/agents/logs/:jobId`

## WebSocket
- Connect to `ws://localhost:3001/ws`

## License
MIT
