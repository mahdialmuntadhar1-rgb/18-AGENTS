import express from "express";
import { createServer as createViteServer } from "vite";
import { runGovernor } from "./server/governors/index.js";
import { supabaseAdmin } from "./server/supabase-admin.js";

const isSupabaseConfigured = () => {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(url && serviceRole && url.startsWith("https://") && serviceRole !== "placeholder");
};

async function fetchAgentsForControlPanel() {
  const { data, error } = await supabaseAdmin
    .from("agents")
    .select("agent_name, category, status, records_collected, last_run, government_rate")
    .order("agent_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((agent: any) => ({
    name: agent.agent_name,
    governorate: agent.category || "Unknown",
    category: agent.category || "Unknown",
    status: agent.status === "active" ? "running" : agent.status || "idle",
    governmentRate: agent.government_rate || "N/A",
    recordsInserted: agent.records_collected || 0,
    lastActivity: agent.last_run ? new Date(agent.last_run).toISOString() : "N/A",
  }));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  let activeDiscoveryRun: Promise<void> | null = null;
  let activeDiscoveryRunId: string | null = null;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/agents", async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        ok: false,
        error: "Supabase is not configured on the server",
      });
    }

    try {
      const agents = await fetchAgentsForControlPanel();
      return res.json(agents);
    } catch (error: any) {
      return res.status(500).json({ ok: false, error: error.message || "Failed to fetch agents" });
    }
  });

  app.post("/api/orchestrator/start", async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        ok: false,
        error: "Supabase is not configured on the server",
      });
    }

    const { error } = await supabaseAdmin.from("agents").update({ status: "active" }).neq("agent_name", "");

    if (error) {
      return res.status(500).json({ ok: false, error: error.message || "Failed to start agents" });
    }

    const agents = await fetchAgentsForControlPanel();
    return res.json({ status: "started", agents });
  });

  app.post("/api/orchestrator/stop", async (req, res) => {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        ok: false,
        error: "Supabase is not configured on the server",
      });
    }

    const { error } = await supabaseAdmin.from("agents").update({ status: "idle" }).neq("agent_name", "");

    if (error) {
      return res.status(500).json({ ok: false, error: error.message || "Failed to stop agents" });
    }

    const agents = await fetchAgentsForControlPanel();
    return res.json({ status: "stopped", agents });
  });

  // Endpoint to manually trigger a governor
  app.post("/api/agents/:agentName/run", async (req, res) => {
    const { agentName } = req.params;
    try {
      runGovernor(agentName).catch(console.error);
      res.json({ status: "started", agentName });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/discovery/run", async (req, res) => {
    const { agentName } = req.body || {};

    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        ok: false,
        error: "Supabase is not configured on the server",
      });
    }

    if (activeDiscoveryRun) {
      return res.status(409).json({
        ok: false,
        error: "A discovery run is already in progress",
        runId: activeDiscoveryRunId,
      });
    }

    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    activeDiscoveryRunId = runId;

    try {
      activeDiscoveryRun = (async () => {
        try {
          if (agentName) {
            await runGovernor(agentName);
          } else {
            await runGovernor("Agent-01");
          }
        } finally {
          activeDiscoveryRun = null;
          activeDiscoveryRunId = null;
        }
      })();

      if ((req.query?.mode || "direct") === "direct") {
        await activeDiscoveryRun;
        return res.json({ ok: true, runId, mode: "direct", status: "completed" });
      }

      return res.status(202).json({ ok: true, runId, mode: "async", status: "running" });
    } catch (error: any) {
      activeDiscoveryRun = null;
      activeDiscoveryRunId = null;
      console.error("Discovery run failed:", error);
      return res.status(500).json({ ok: false, error: error?.message || "Discovery run failed", runId });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
