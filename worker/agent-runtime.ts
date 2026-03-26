interface Env {
  APP_ENV?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GOOGLE_PLACES_API_KEY?: string;
}

type AgentStatus = 'active' | 'idle' | 'running' | 'error';

const baseAgents = [
  { name: 'Agent-01', governorate: 'Baghdad', category: 'Restaurants', status: 'active' as AgentStatus },
  { name: 'Agent-02', governorate: 'Basra', category: 'Cafes', status: 'active' as AgentStatus },
  { name: 'Agent-03', governorate: 'Nineveh', category: 'Bakeries', status: 'idle' as AgentStatus },
  { name: 'QC Overseer', governorate: 'QC Overseer', category: 'Quality Control', status: 'active' as AgentStatus },
];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization',
    },
  });

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return json({ ok: true });
    }

    if (url.pathname === '/api/health') {
      return json({ status: 'ok', runtime: 'cloudflare-worker' });
    }

    if (url.pathname === '/api/agents' && request.method === 'GET') {
      return json(baseAgents);
    }

    if (url.pathname === '/api/orchestrator/start' && request.method === 'POST') {
      return json({ status: 'started', agents: baseAgents.map((agent) => ({ ...agent, status: 'running' })) });
    }

    if (url.pathname === '/api/orchestrator/stop' && request.method === 'POST') {
      return json({ status: 'stopped', agents: baseAgents.map((agent) => ({ ...agent, status: 'idle' })) });
    }

    if (url.pathname.startsWith('/api/agents/') && url.pathname.endsWith('/run') && request.method === 'POST') {
      const agentName = decodeURIComponent(url.pathname.split('/')[3] ?? 'unknown');
      return json({ status: 'started', agentName });
    }

    return json({ error: 'Not found' }, 404);
  },
};
