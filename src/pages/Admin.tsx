import { Link } from "react-router-dom";
import { AgentControlPanel } from "../components/admin/AgentControlPanel";

export default function Admin() {
  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Agent Orchestrator</h1>
          <Link to="/" className="text-sm text-emerald-400 hover:text-emerald-300">
            Back to Directory
          </Link>
        </div>
        <p className="mb-6 text-sm text-neutral-300">
          Start the manager and workers to process Supabase queue tasks and insert verified businesses into the
          frontend directory table.
        </p>
        <AgentControlPanel />
      </div>
    </main>
  );
}
