import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { AgentCard } from './AgentCard';
import { AgentJob, getAgentStatus, startAgent, startAllAgents } from '../lib/api';

const CITIES = [
  'Baghdad',
  'Mosul',
  'Basra',
  'Erbil',
  'Sulaymaniyah',
  'Kirkuk',
  'Najaf',
  'Karbala',
  'Hilla',
  'Ramadi',
  'Fallujah',
  'Amarah',
  'Diwaniyah',
  'Kut',
  'Samarra',
  'Tikrit',
  'Dohuk',
  'Zakho'
];

export function AgentDashboard() {
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    const data = await getAgentStatus();
    setJobs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const getJobForCity = (city: string): AgentJob | undefined => {
    return jobs.find((j) => j.city === city && j.status !== 'completed');
  };

  const handleStartAll = async () => {
    await startAllAgents();
    setTimeout(fetchStatus, 500);
  };

  if (loading) return <div className="text-center p-10">Loading agents...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">🤖 Iraqi City Agents</h1>
        <button
          onClick={handleStartAll}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Play className="w-4 h-4" /> Run All 18 Agents
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {CITIES.map((city) => {
          const job = getJobForCity(city);
          return (
            <AgentCard
              key={city}
              city={city}
              status={job?.status || 'idle'}
              recordsFound={job?.records_found}
              recordsVerified={job?.records_verified}
              onStart={() => startAgent(city)}
            />
          );
        })}
      </div>
    </div>
  );
}
