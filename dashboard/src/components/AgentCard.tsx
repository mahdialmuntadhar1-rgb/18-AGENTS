import { Play, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

interface AgentCardProps {
  city: string;
  status: string;
  recordsFound?: number;
  recordsVerified?: number;
  onStart: () => void;
}

export function AgentCard({ city, status, recordsFound = 0, recordsVerified = 0, onStart }: AgentCardProps) {
  const statusConfig = {
    idle: { icon: Play, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Idle' },
    pending: { icon: Loader2, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Pending' },
    running: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Running' },
    completed: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: 'Completed' },
    failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Failed' }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.idle;
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-lg">{city}</h3>
        <span className={`${config.bg} ${config.color} text-xs px-2 py-1 rounded-full flex items-center gap-1`}>
          <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
          {config.label}
        </span>
      </div>
      <div className="text-sm text-gray-600 space-y-1 mb-3">
        <div>📊 Found: {recordsFound}</div>
        <div>✅ Verified: {recordsVerified}</div>
      </div>
      <button
        onClick={onStart}
        disabled={status === 'running' || status === 'pending'}
        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
      >
        <Play className="w-4 h-4" /> Run Agent
      </button>
    </div>
  );
}
