import express from "express";
import { createServer as createViteServer } from "vite";
import { AgentSystem } from "./server/agent-system.js";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT ?? 3000);
  const agentSystem = new AgentSystem(18);

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/agents", (req, res) => {
    res.json(agentSystem.getStatus());
  });

  app.post("/api/orchestrator/start", async (req, res) => {
    await agentSystem.start();
    res.json({ status: "started" });
  });

  app.post("/api/orchestrator/stop", (req, res) => {
    agentSystem.stop();
    res.json({ status: "stopped" });
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
