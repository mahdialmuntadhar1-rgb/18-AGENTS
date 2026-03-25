import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, CheckCircle2, Database, Download, Globe, ShieldCheck, Wand2, Zap } from 'lucide-react';

const CITIES = [
  { id: 'Sulaymaniyah', en: 'Sulaymaniyah', ar: 'سلێمانی', count: 5000 },
  { id: 'Baghdad', en: 'Baghdad', ar: 'بغداد', count: 16200 },
  { id: 'Karbala', en: 'Karbala', ar: 'كەربەلا', count: 3900 },
  { id: 'Erbil', en: 'Erbil', ar: 'هەولێر', count: 3300 },
  { id: 'Basra', en: 'Basra', ar: 'بصرة', count: 7000 },
  { id: 'Najaf', en: 'Najaf', ar: 'نجف', count: 2900 },
  { id: 'Mosul', en: 'Mosul', ar: 'موصل', count: 4400 },
  { id: 'Kirkuk', en: 'Kirkuk', ar: 'كەركوك', count: 1800 },
  { id: 'Diyala', en: 'Diyala', ar: 'ديالى', count: 3000 },
  { id: 'Anbar', en: 'Anbar', ar: 'انبار', count: 1800 },
  { id: 'Dohuk', en: 'Dohuk', ar: 'دهوك', count: 1600 },
  { id: 'Wasit', en: 'Wasit', ar: 'واسط', count: 1500 },
  { id: 'Muthanna', en: 'Muthanna', ar: 'مثنى', count: 1000 },
  { id: 'Qadisiyah', en: 'Qadisiyah', ar: 'قادسية', count: 1500 },
  { id: 'Maysan', en: 'Maysan', ar: 'ميسان', count: 1400 },
  { id: 'Thi-Qar', en: 'Thi-Qar', ar: 'ذي قار', count: 3200 },
  { id: 'Babil', en: 'Babil', ar: 'بابل', count: 1600 },
  { id: 'Saladin', en: 'Saladin', ar: 'صلاح الدين', count: 1750 },
];

const TASKS = [
  { id: 'text_repair', label: '🔤 Text Repair', color: 'bg-blue-500', agentId: 'cleaner' },
  { id: 'enrich', label: '📍 Enrich Data', color: 'bg-purple-500', agentId: 'enricher' },
  { id: 'social', label: '📱 Collect Socials', color: 'bg-green-500', agentId: 'social' },
  { id: 'quality_check', label: '✅ Quality Check', color: 'bg-orange-500', agentId: 'validator' },
  { id: 'export', label: '📤 Export Data', color: 'bg-gold', agentId: 'exporter' },
  { id: 'collect', label: '🧲 Collect Data', color: 'bg-cyan-500', agentId: 'collector' },
];

const AGENTS = [
  { id: 'cleaner', icon: <Wand2 size={20} />, name: 'Text Cleaner', desc: 'Repairs Arabic/Kurdish text' },
  { id: 'enricher', icon: <Database size={20} />, name: 'Data Enrichment', desc: 'Fills phones, categories' },
  { id: 'validator', icon: <ShieldCheck size={20} />, name: 'Quality Validator', desc: 'Scores & flags entries' },
  { id: 'social', icon: <Globe size={20} />, name: 'Social Finder', desc: 'Finds Instagram / Facebook' },
  { id: 'exporter', icon: <Download size={20} />, name: 'Export Agent', desc: 'Exports to Supabase' },
  { id: 'collector', icon: <CheckCircle size={20} />, name: 'Collect Agent', desc: 'Generates and inserts businesses' },
];

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'ok' | 'error' | 'agent';
}

interface PipelineEvent {
  type: 'info' | 'ok' | 'error' | 'agent' | 'done';
  message?: string;
  city?: string;
  count?: number;
  timestamp?: string;
}

export default function CommandCenter() {
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set(['Sulaymaniyah']));
  const [selectedTask, setSelectedTask] = useState('social');
  const [isRunning, setIsRunning] = useState(false);
  const [instruction, setInstruction] = useState('Search for Instagram and Facebook pages for each business in selected cities. Add found URLs to the directory list.');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cityProgress, setCityProgress] = useState<Record<string, number>>({});
  const [doneCount, setDoneCount] = useState(0);
  const [serverTime, setServerTime] = useState(new Date().toLocaleTimeString([], { hour12: false }));

  const logEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setServerTime(new Date().toLocaleTimeString([], { hour12: false }));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: LogEntry['type'], message: string, timestamp?: string) => {
    const date = timestamp ? new Date(timestamp) : new Date();
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      time: date.toLocaleTimeString([], { hour12: false }),
      message,
      type,
    };
    setLogs((prev) => [...prev, newLog].slice(-300));
  };

  const toggleCity = (id: string) => {
    if (isRunning) return;
    const next = new Set(selectedCities);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCities(next);
  };

  const selectAll = () => {
    if (isRunning) return;
    setSelectedCities(new Set(CITIES.map((c) => c.id)));
  };

  const clearAll = () => {
    if (isRunning) return;
    setSelectedCities(new Set());
  };

  const updateProgress = (city?: string) => {
    if (!city) return;
    setCityProgress((prev) => {
      const next = { ...prev };
      next[city] = Math.min(99, (next[city] || 0) + 5);
      return next;
    });
  };

  const launchTasks = async () => {
    if (selectedCities.size === 0) {
      addLog('error', 'No cities selected. Tick at least one city.');
      return;
    }

    setIsRunning(true);
    setDoneCount(0);
    setLogs([]);

    const cities: string[] = [...selectedCities];
    const initialProgress: Record<string, number> = {};
    cities.forEach((city: string) => {
      initialProgress[city] = 0;
    });
    setCityProgress(initialProgress);
    addLog('info', `Task launched: ${selectedTask}`);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/task/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType: selectedTask, cities, instruction }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        addLog('error', `Unable to start task: HTTP ${response.status}`);
        setIsRunning(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          if (!event.startsWith('data: ')) continue;
          const payload = event.slice(6);
          let parsed: PipelineEvent;
          try {
            parsed = JSON.parse(payload) as PipelineEvent;
          } catch {
            continue;
          }

          if (parsed.type === 'done') {
            setIsRunning(false);
            setCityProgress((prev) => {
              const completed = { ...prev };
              cities.forEach((city: string) => {
                completed[city] = 100;
              });
              return completed;
            });
            setDoneCount(cities.length);
            addLog('info', `All tasks complete · ${cities.length} cities processed`);
            continue;
          }

          if (parsed.message) {
            addLog(parsed.type, parsed.message, parsed.timestamp);
            if (parsed.type === 'ok') updateProgress(parsed.city);
          }
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        addLog('error', `Run failed: ${error?.message ?? 'Unknown error'}`);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const stopAll = () => {
    abortRef.current?.abort();
    setIsRunning(false);
    addLog('error', 'All agents stopped by user.');
  };

  const activeAgentId = TASKS.find((task) => task.id === selectedTask)?.agentId;

  return (
    <div className="min-h-screen text-[#e2d9c8] font-mono p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-gold/20">
          <div>
            <h1 className="text-2xl font-bold text-gold tracking-wider flex items-center gap-3">
              <Zap className="text-gold animate-pulse" size={28} />
              AGENT COMMAND CENTER
            </h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">AI Operations Cockpit</p>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Server · {serverTime}</div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Running', value: isRunning ? Array.from(selectedCities).filter((id) => (cityProgress[id] || 0) < 100).length : 0 },
            { label: 'Queued', value: isRunning ? Array.from(selectedCities).filter((id) => (cityProgress[id] || 0) === 0).length : 0 },
            { label: 'Done', value: doneCount },
            { label: 'Governorates', value: 18 },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 border border-gold/10 rounded-xl p-4 shadow-xl">
              <div className="text-2xl font-bold text-gold">{stat.value}</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {AGENTS.map((agent) => {
            const isActive = isRunning && agent.id === activeAgentId;
            return (
              <div key={agent.id} className="bg-white/5 border border-gold/10 rounded-xl p-3 flex items-center gap-4">
                <div className="text-gold/60">{agent.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-slate-200">{agent.name}</div>
                  <div className="text-[9px] text-slate-500 truncate">{agent.desc}</div>
                </div>
                <div className={`text-[8px] px-2 py-1 rounded-full font-bold uppercase tracking-widest ${isActive ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-white/5 text-slate-500'}`}>
                  {isActive ? 'Running' : 'Idle'}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-navy/80 border border-gold rounded-2xl p-6 space-y-6">
          <div className="space-y-3">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest">Task Type</div>
            <div className="flex flex-wrap gap-2">
              {TASKS.map((task) => (
                <button
                  key={task.id}
                  onClick={() => !isRunning && setSelectedTask(task.id)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${selectedTask === task.id ? `${task.color} text-navy border-transparent` : 'bg-white/5 text-slate-400 border-transparent hover:border-white/20'}`}
                >
                  {task.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest">Select Governorates</div>
              <div className="flex gap-4">
                <button onClick={selectAll} className="text-[9px] text-gold underline">Select All</button>
                <button onClick={clearAll} className="text-[9px] text-gold underline">Clear All</button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {CITIES.map((city) => {
                const isSelected = selectedCities.has(city.id);
                const progress = cityProgress[city.id] || 0;
                return (
                  <div
                    key={city.id}
                    onClick={() => toggleCity(city.id)}
                    className={`relative p-3 rounded-xl border transition-all cursor-pointer group ${isSelected ? 'border-gold bg-gold/10' : 'border-gold/10 bg-white/5 hover:border-gold/30'}`}
                  >
                    <div className={`absolute top-2 right-2 w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-gold border-gold text-navy' : 'border-gold/20'}`}>
                      {isSelected && <CheckCircle2 size={10} />}
                    </div>
                    <div className="text-[11px] font-bold text-slate-200">{city.en}</div>
                    <div className="text-[10px] text-slate-500 font-ar mt-0.5">{city.ar}</div>
                    <div className="text-[9px] text-slate-600 mt-2">{city.count.toLocaleString()} records</div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between items-center text-[8px] uppercase">
                        <span className="text-slate-500">{progress >= 100 ? 'Done' : isRunning && isSelected ? 'Running' : 'Idle'}</span>
                        {isSelected && <span className="text-slate-400">{Math.floor(progress)}%</span>}
                      </div>
                      <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={`h-full ${progress >= 100 ? 'bg-blue-400' : 'bg-green-500'}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-[9px] text-slate-500 uppercase tracking-widest">Custom Instruction</div>
            <div className="flex flex-col sm:flex-row gap-3">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="flex-1 bg-white/5 border border-gold/20 rounded-xl p-4 text-xs text-slate-200 outline-none focus:border-gold min-h-[60px] resize-none"
              />
              <div className="flex flex-col gap-2">
                <button onClick={launchTasks} disabled={isRunning} className="px-8 py-3 bg-gold text-navy font-bold text-xs uppercase rounded-xl disabled:opacity-40">
                  ▶ Launch
                </button>
                {isRunning && (
                  <button onClick={stopAll} className="px-8 py-3 bg-transparent border border-rose-500 text-rose-500 font-bold text-xs uppercase rounded-xl">
                    ■ Stop
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-black/30 border border-gold/10 rounded-xl p-4 h-[250px] overflow-y-auto font-mono text-[10px] space-y-2">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600">Awaiting system activity...</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-4 items-start">
                <span className="text-slate-600 shrink-0">{log.time}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest shrink-0 ${log.type === 'info' ? 'bg-blue-500/20 text-blue-400' : log.type === 'ok' ? 'bg-green-500/20 text-green-400' : log.type === 'error' ? 'bg-orange-500/20 text-orange-400' : 'bg-gold/20 text-gold'}`}>
                  {log.type}
                </span>
                <span className="text-slate-300 leading-relaxed">{log.message}</span>
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
