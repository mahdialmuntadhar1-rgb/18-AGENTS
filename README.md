# Iraq Compass Data Verification Dashboard

Internal tool to clean, verify, and approve 70,000+ Iraqi business records.

## Setup Instructions for Replit

1. **Create a new Replit** using the "React" template.
2. **Upload all files** from this repository to your Replit.
3. **Configure Environment Variables**:
   - Go to the **Secrets** tab in Replit.
   - Add `VITE_SUPABASE_URL` with your Supabase project URL.
   - Add `VITE_SUPABASE_ANON_KEY` with your Supabase anon key.
4. **Install Dependencies**:
   - Replit should automatically detect `package.json` and install dependencies.
   - If not, run `npm install` in the Shell.
5. **Run the App**:
   - Click the **Run** button at the top.
   - The dashboard will be available in the Webview.

<<<<<<< Updated upstream
## Supabase Schema
=======
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY` (optional for AI enrichment features)
- `SUPABASE_URL` (server-side)
- `SUPABASE_SERVICE_ROLE_KEY` (server-side)
- `GOOGLE_PLACES_API_KEY` (for real business data collection)
>>>>>>> Stashed changes

Before running the app, ensure you have executed the SQL schema provided in the `Step 1` response in your Supabase SQL Editor.

## Features

- **Overview**: Real-time metrics of raw vs verified data.
- **Review Table**: Batch approve or reject businesses based on verification scores.
- **Data Cleaner**: Repair encoding issues (mojibake) in Arabic/Kurdish text.
- **Task Manager**: Launch automated agent tasks for data enrichment.
- **Export**: Generate clean JSON files ready for the public directory.

<<<<<<< Updated upstream
## Language Support

- Full RTL support for Arabic and Kurdish.
- Trilingual data fields (AR, KU, EN).
- Dir="rtl" implemented on relevant UI components.
=======
```bash
npm run lint
npm run build
npm run analyze:repo  # Generate health report
```

## Architecture

### Agent System (18 Real Agents)

All 18 agents are now REAL implementations (no more fake GenericWorkerGovernor):

| Agent | Category | City | Rate | Status |
|-------|----------|------|------|--------|
| Agent-01 | restaurants | Baghdad | Rate Level 1 | ✅ Real |
| Agent-02 | cafes | Basra | Rate Level 1 | ✅ Real |
| Agent-03 | bakeries | Nineveh | Rate Level 1 | ✅ Real |
| Agent-04 | hotels | Erbil | Rate Level 1 | ✅ Real |
| Agent-05 | gyms | Sulaymaniyah | Rate Level 2 | ✅ Real |
| Agent-06 | beauty_salons | Kirkuk | Rate Level 2 | ✅ Real |
| Agent-07 | pharmacies | Duhok | Rate Level 2 | ✅ Real |
| Agent-08 | supermarkets | Anbar | Rate Level 2 | ✅ Real |
| Agent-09 | restaurants | Babil | Rate Level 3 | ✅ Real |
| Agent-10 | cafes | Karbala | Rate Level 3 | ✅ Real |
| Agent-11 | bakeries | Wasit | Rate Level 3 | ✅ Real |
| Agent-12 | hotels | Dhi Qar | Rate Level 3 | ✅ Real |
| Agent-13 | gyms | Maysan | Rate Level 4 | ✅ Real |
| Agent-14 | beauty_salons | Muthanna | Rate Level 4 | ✅ Real |
| Agent-15 | pharmacies | Najaf | Rate Level 4 | ✅ Real |
| Agent-16 | supermarkets | Qadisiyyah | Rate Level 5 | ✅ Real |
| Agent-17 | restaurants | Saladin | Rate Level 5 | ✅ Real |
| Agent-18 | cafes | Diyala | Rate Level 5 | ✅ Real |

### Source Adapters

The system supports multiple data source adapters:

- **Google Places Adapter** (`server/sources/google-places-adapter.ts`) - Primary data source for all agents
- **Yelp Adapter** (`server/sources/yelp-adapter.ts`) - Requires Yelp Fusion API key
- **Yellow Pages Adapter** (`server/sources/yellow-pages-adapter.ts`) - Web scraping with Gemini extraction
- **Web Crawler Adapter** (`server/sources/web-crawler-adapter.ts`) - Generic crawler with AI extraction

### Data Flow

```
Agent → Source Adapter → External API → Normalization → Supabase
```

Each agent:
1. Claims a task from the queue
2. Calls its source adapter to fetch data
3. Normalizes data to BusinessData interface
4. Stores in Supabase with deduplication
5. Logs results to agent_logs

### Gemini Enrichment

Optional AI enrichment service (`server/services/gemini-enrichment.ts`):
- Category normalization
- Description generation
- Duplicate detection
- Confidence scoring

## Runtime Truthfulness

- Runtime agent status, task queueing, and log history are read from/written to Supabase tables (`agents`, `agent_tasks`, `agent_logs`).
- Orchestrator endpoints (`/api/orchestrator/start`, `/api/orchestrator/stop`) persist status/task/log changes before responding.
- Manual agent runs (`/api/agents/:agentName/run`) create and update persisted run-task records.
- All 18 agents use real source adapters - no fake data generation.

## Business Data Schema

Recommended fields for production (see `supabase_schema.sql`):

### Source Tracking
- `source_name` - Data source identifier
- `source_url` - Source URL
- `external_source_id` - Source-specific ID

### Business Identity
- `business_name` (required)
- `business_name_ar` - Arabic name
- `business_name_ku` - Kurdish name

### Categorization
- `category` (required)
- `subcategory`
- `tags` (array)

### Location
- `governorate`
- `city` (required)
- `country` (default: Iraq)
- `address`
- `latitude`, `longitude`
- `google_maps_url`

### Contact
- `phone`
- `whatsapp`
- `email`
- `website`
- `facebook_url`
- `instagram_url`
- `tiktok_url`

### Details
- `description`
- `opening_hours`
- `price_range`

### Ratings & Media
- `rating`
- `review_count`
- `images` (array)

### Metadata
- `created_by_agent`
- `verification_status`
- `confidence_score`
- `scraped_at`
- `updated_at`

## First Real Scraping Test Contract

- **Canonical first real agent:** `Agent-01` (`RestaurantsGovernor`).
- **Real connector:** Google Places Text Search API.
- **Required connector secret:** `GOOGLE_PLACES_API_KEY` (server-side).
- **Runtime output table:** `businesses` (rows written by `BaseGovernor.store`).
- **Runtime control tables:** `agents`, `agent_tasks`, `agent_logs`.
- **Schema source of truth:** `supabase_schema.sql`.

>>>>>>> Stashed changes
