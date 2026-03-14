import express from "express";
import { createServer as createViteServer } from "vite";
import { AgentQueueSystem } from "./server/agent-queue.js";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const queueSystem = new AgentQueueSystem(18);

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/agents", (req, res) => {
    res.json(queueSystem.getWorkerStates());
  });

  app.post("/api/orchestrator/start", async (req, res) => {
    await queueSystem.start();
    res.json({ status: "started", agents: queueSystem.getWorkerStates() });
  });

  app.post("/api/orchestrator/stop", (req, res) => {
    queueSystem.stop();
    res.json({ status: "stopped", agents: queueSystem.getWorkerStates() });
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
