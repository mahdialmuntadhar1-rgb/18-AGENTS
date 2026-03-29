import { useWebSocket } from '../hooks/useWebSocket';

export function LiveLogs() {
  const logs = useWebSocket();

  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
      <div className="text-gray-400 mb-2">📡 Live Agent Logs</div>
      {logs.length === 0 && <div className="text-gray-500">Waiting for agent activity...</div>}
      {logs.map((log, idx) => (
        <div key={idx} className="border-b border-gray-800 py-1">
          <span className="text-gray-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
          <span className={log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-green-400'}>
            {log.level.toUpperCase()}
          </span>{' '}
          {log.message}
        </div>
      ))}
    </div>
  );
}
