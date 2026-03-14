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
  governorate: string;
  governmentRate: string;
  status: "running" | "idle" | "error";
  recordsInserted?: number;
  lastActivity?: string;
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
        <div className="ml-auto flex items-center gap-3 px-4 py-2 bg-emerald-900/20 border border-emerald-800 rounded">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-emerald-400 font-mono text-xs font-bold tracking-widest">QC_OVERSEER: ACTIVE</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-400 text-xs font-mono">
          ERROR: {error}
        </div>
      )}

      <div className="overflow-hidden border border-neutral-800 rounded">
        <table className="w-full text-left font-mono text-sm">
          <thead>
            <tr className="bg-neutral-800 text-neutral-400">
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Agent ID</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Gov Rate</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Records</th>
              <th className="px-4 py-3 font-bold uppercase tracking-wider">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {agents.length > 0 ? (
              agents.map((agent, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? "bg-neutral-900" : "bg-neutral-900/50"}>
                  <td className="px-4 py-3 text-neutral-300 font-bold">{agent.name}</td>
                  <td className="px-4 py-3 text-neutral-400 text-xs">{agent.governmentRate}</td>
                  <td className="px-4 py-3">
                    <span className={`
                      ${agent.status === "running" ? "text-emerald-400" : ""}
                      ${agent.status === "idle" ? "text-amber-400" : ""}
                      ${agent.status === "error" ? "text-red-400" : ""}
                    `}>
                      {agent.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-300 font-mono">{(agent.recordsInserted || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-neutral-500 text-xs">{agent.lastActivity || "N/A"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500 italic">
                  No agents found or loading...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
