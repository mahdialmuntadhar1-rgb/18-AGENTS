import express from "express";
import { createServer as createViteServer } from "vite";
import { runGovernor } from "./server/governors/index.js";
import { MultiSourceOrchestrator } from "./server/orchestration/multi-source-orchestrator.js";
import { GeminiResearchAdapter } from "./server/sources/gemini-research-adapter.js";
import { OpenStreetMapAdapter } from "./server/sources/openstreetmap-adapter.js";
import { WebSearchAdapter } from "./server/sources/web-search-adapter.js";
import { FacebookDiscoveryAdapter } from "./server/sources/facebook-discovery-adapter.js";
import { InstagramDiscoveryAdapter } from "./server/sources/instagram-discovery-adapter.js";
import { GooglePlacesAdapter } from "./server/sources/google-places-adapter.js";
import { SourceName } from "./server/domain/business.js";
import { businessStore } from "./server/orchestration/business-store.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let agents: any[] = [
    { name: "Agent-01", governorate: "Baghdad", category: "Restaurants", status: "active", governmentRate: "Rate Level 1", recordsInserted: 3247, lastActivity: "2m ago" },
    { name: "Agent-02", governorate: "Basra", category: "Cafes", status: "active", governmentRate: "Rate Level 1", recordsInserted: 1892, lastActivity: "5m ago" },
    { name: "QC Overseer", governorate: "QC Overseer", category: "Quality Control", status: "active", governmentRate: "Supervisory", recordsInserted: 15420, lastActivity: "1m ago" },
  ];

  const adapters = new Map<SourceName, any>([
    ["gemini", new GeminiResearchAdapter()],
    ["osm", new OpenStreetMapAdapter()],
    ["web", new WebSearchAdapter()],
    ["facebook", new FacebookDiscoveryAdapter()],
    ["instagram", new InstagramDiscoveryAdapter()],
    ["google_places", new GooglePlacesAdapter()],
  ]);

  const orchestrator = new MultiSourceOrchestrator(adapters);

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/agents", (_req, res) => res.json(agents));

  app.get("/api/sources", (_req, res) => {
    const sources = [...adapters.values()].map((adapter) => ({
      source: adapter.getSourceName(),
      ...adapter.getCapabilities(),
    }));
    res.json({ sources, strategy: ["gemini", "osm", "web", "facebook", "instagram", "google_places"] });
  });

  app.post("/api/discovery/run", async (req, res) => {
    const { query, city, governorate, category, sources, limit } = req.body || {};
    const selected = (Array.isArray(sources) && sources.length ? sources : ["gemini", "osm", "web"]) as SourceName[];

    try {
      const run = await orchestrator.run({ query, city, governorate, category, sources: selected, limit: Number(limit || 20) });
      businessStore.upsertMany(run.businesses);
      res.json({
        status: "completed",
        selectedSources: selected,
        count: run.businesses.length,
        logs: run.logs,
        businesses: run.businesses,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/businesses", (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 10)));
    const result = businessStore.list({
      page,
      pageSize,
      source: req.query.source as string | undefined,
      status: req.query.status as string | undefined,
      minConfidence: req.query.minConfidence ? Number(req.query.minConfidence) : undefined,
    });
    res.json(result);
  });

  app.post("/api/orchestrator/start", (_req, res) => {
    agents = agents.map(a => ({ ...a, status: "running" }));
    res.json({ status: "started", agents });
  });

  app.post("/api/orchestrator/stop", (_req, res) => {
    agents = agents.map(a => ({ ...a, status: "idle" }));
    res.json({ status: "stopped", agents });
  });

  app.post("/api/agents/:agentName/run", async (req, res) => {
    const { agentName } = req.params;
    try {
      runGovernor(agentName).catch(console.error);
      res.json({ status: "started", agentName });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
