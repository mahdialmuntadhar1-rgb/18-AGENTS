import React, { useEffect, useState } from "react";

interface Agent {
  name: string;
  status: "idle" | "processing" | "error";
  processedCount: number;
  errors: number;
  lastHeartbeat: string;
}

interface AgentApiResponse {
  running: boolean;
  agents: Agent[];
}

export const AgentControlPanel: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [running, setRunning] = useState(false);

  const fetchAgents = async () => {
    const response = await fetch("/api/agents");
    const data = (await response.json()) as AgentApiResponse;
    setAgents(data.agents);
    setRunning(data.running);
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex gap-2">
        <button className="px-3 py-2 bg-emerald-600 rounded" onClick={async () => {
          await fetch("/api/orchestrator/start", { method: "POST" });
          fetchAgents();
        }}>
          Start
        </button>
        <button className="px-3 py-2 bg-red-600 rounded" onClick={async () => {
          await fetch("/api/orchestrator/stop", { method: "POST" });
          fetchAgents();
        }}>
          Stop
        </button>
        <span className="text-sm text-neutral-400 self-center">Manager: {running ? "running" : "stopped"}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {agents.map((agent) => (
          <div key={agent.name} className="border border-neutral-800 rounded p-3 bg-neutral-900 text-sm">
            <div className="font-semibold">{agent.name}</div>
            <div>Status: {agent.status}</div>
            <div>Tasks processed: {agent.processedCount}</div>
            <div>Errors: {agent.errors}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
