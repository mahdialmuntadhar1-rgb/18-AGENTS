import React, { useState, useEffect } from 'react';
import { 
  Play, RefreshCw, Globe, CheckCircle, AlertCircle, 
  Clock, MapPin, Store, Loader2, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DataSource {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  reliability: 'high' | 'medium' | 'low';
  coverage: string;
  rateLimit: string;
}

interface DiscoveryRun {
  runId: string;
  status: 'running' | 'completed' | 'failed';
  city: string;
  category: string;
  sourcesUsed: string[];
  totalFound: number;
  message: string;
  timestamp: string;
}

export default function DiscoveryRunner() {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>(['gemini']);
  const [city, setCity] = useState('Baghdad');
  const [category, setCategory] = useState('food_drink');
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<DiscoveryRun | null>(null);
  const [runHistory, setRunHistory] = useState<DiscoveryRun[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const cities = ['Baghdad', 'Basra', 'Erbil', 'Sulaymaniyah', 'Najaf', 'Karbala', 'Mosul', 'Duhok', 'Kirkuk'];
  const categories = [
    { value: 'food_drink', label: 'Dining & Cuisine' },
    { value: 'cafe', label: 'Coffee & Cafes' },
    { value: 'shopping', label: 'Shopping & Retail' },
    { value: 'events_entertainment', label: 'Entertainment & Events' },
    { value: 'hotels_stays', label: 'Accommodation & Stays' },
    { value: 'culture_heritage', label: 'Culture & Heritage' },
    { value: 'business_services', label: 'Business & Services' },
    { value: 'health_wellness', label: 'Health & Wellness' },
    { value: 'transport_mobility', label: 'Transport & Mobility' },
    { value: 'public_essential', label: 'Public & Essential' },
    { value: 'education', label: 'Education' },
    { value: 'doctors', label: 'Doctors' },
    { value: 'lawyers', label: 'Lawyers' },
    { value: 'clinics', label: 'Clinics' },
    { value: 'hospitals', label: 'Hospitals' },
  ];

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sources');
      if (response.ok) {
        const data = await response.json();
        setSources(data.sources || []);
      }
    } catch (err) {
      console.error('Failed to fetch sources:', err);
      // Fallback sources
      setSources([
        { id: 'gemini', name: 'Gemini AI Research', description: 'AI-powered web research', enabled: true, reliability: 'high', coverage: 'Iraq-wide', rateLimit: '60/min' },
        { id: 'google-places', name: 'Google Places', description: 'Global business directory', enabled: false, reliability: 'medium', coverage: 'Limited', rateLimit: '100/day' },
        { id: 'manual', name: 'Manual Import', description: 'User-uploaded data', enabled: true, reliability: 'high', coverage: 'User-dependent', rateLimit: 'N/A' },
      ]);
    }
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSources(prev => 
      prev.includes(sourceId) 
        ? prev.filter(id => id !== sourceId)
        : [...prev, sourceId]
    );
  };

  const startDiscovery = async () => {
    if (selectedSources.length === 0) {
      setError('Please select at least one data source');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLogs([`Starting discovery for ${category} in ${city}...`]);

    try {
      const response = await fetch('/api/discovery/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          category,
          sources: selectedSources,
          limit,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Discovery failed');
      }

      const run: DiscoveryRun = {
        runId: result.runId,
        status: result.status,
        city: result.city,
        category: result.category,
        sourcesUsed: result.sourcesUsed,
        totalFound: result.totalFound,
        message: result.message,
        timestamp: new Date().toISOString(),
      };

      setCurrentRun(run);
      setRunHistory(prev => [run, ...prev]);
      setLogs(prev => [...prev, `✅ ${result.message}`]);
    } catch (err: any) {
      setError(err.message);
      setLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const getReliabilityColor = (reliability: string) => {
    switch (reliability) {
      case 'high': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'low': return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="space-y-2">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Multi-Source Discovery</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Run Data Collection</h1>
        <p className="text-sm text-slate-400">
          Select data sources and launch discovery runs to populate the business directory.
        </p>
      </header>

      {/* Main Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-6">
          {/* Target Settings */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin size={18} className="text-emerald-400" />
              Target Settings
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">City</label>
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500/50"
                >
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500/50"
                >
                  {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Result Limit: {limit}</label>
              <input
                type="range"
                min="5"
                max="50"
                value={limit}
                onChange={e => setLimit(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>5</span>
                <span>50</span>
              </div>
            </div>
          </div>

          {/* Source Selection */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Globe size={18} className="text-emerald-400" />
              Data Sources
            </h2>
            
            <div className="space-y-3">
              {sources.map(source => (
                <div
                  key={source.id}
                  onClick={() => source.enabled && toggleSource(source.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedSources.includes(source.id)
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'
                  } ${!source.enabled && 'opacity-50 cursor-not-allowed'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      selectedSources.includes(source.id)
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-600'
                    }`}>
                      {selectedSources.includes(source.id) && <CheckCircle size={14} className="text-white" />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{source.name}</span>
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full border ${getReliabilityColor(source.reliability)}`}>
                          {source.reliability}
                        </span>
                        {!source.enabled && (
                          <span className="px-2 py-0.5 text-[10px] uppercase font-bold rounded-full bg-slate-700 text-slate-400">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{source.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>Coverage: {source.coverage}</span>
                        <span>Rate: {source.rateLimit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedSources.length === 0 && (
              <p className="text-rose-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                Select at least one source to continue
              </p>
            )}
          </div>

          {/* Run Button */}
          <button
            onClick={startDiscovery}
            disabled={isLoading || selectedSources.length === 0}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-lg uppercase tracking-widest rounded-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                Running Discovery...
              </>
            ) : (
              <>
                <Play size={24} />
                Start Discovery Run
              </>
            )}
          </button>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </div>

        {/* Right: Logs & History */}
        <div className="space-y-6">
          {/* Live Logs */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Clock size={18} className="text-emerald-400" />
              Live Logs
            </h2>
            
            <div className="h-64 bg-slate-950/50 border border-slate-800 rounded-xl p-4 overflow-y-auto font-mono text-sm space-y-1">
              {logs.length === 0 ? (
                <p className="text-slate-600 italic">No activity yet. Start a discovery run to see logs.</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="text-slate-400">
                    <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span> {log}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="text-emerald-400 animate-pulse">▌</div>
              )}
            </div>
          </div>

          {/* Current Run */}
          {currentRun && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-400" />
                  Latest Run
                </h2>
                <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                  currentRun.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                  currentRun.status === 'failed' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {currentRun.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs uppercase">City</p>
                  <p className="text-white font-bold">{currentRun.city}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase">Category</p>
                  <p className="text-white font-bold capitalize">{currentRun.category}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase">Sources</p>
                  <p className="text-white font-bold">{currentRun.sourcesUsed.join(', ')}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs uppercase">Businesses Found</p>
                  <p className="text-emerald-400 font-bold text-lg">{currentRun.totalFound}</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-400">{currentRun.message}</p>
            </motion.div>
          )}

          {/* Run History */}
          {runHistory.length > 1 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Run History</h2>
              
              <div className="space-y-2">
                {runHistory.slice(1, 6).map((run, i) => (
                  <div key={i} className="p-3 bg-slate-950/30 border border-slate-800 rounded-xl text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{run.city} • {run.category}</span>
                      <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                        run.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        run.status === 'failed' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {run.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                      <span>{run.sourcesUsed.join(', ')}</span>
                      <span>{run.totalFound} found</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Link to Results */}
      {currentRun?.status === 'completed' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-500/20 to-slate-900/40 border border-emerald-500/30 rounded-2xl p-6 flex items-center justify-between"
        >
          <div>
            <h3 className="text-lg font-black text-white">Discovery Complete!</h3>
            <p className="text-sm text-slate-400">{currentRun.totalFound} businesses added to the directory</p>
          </div>
          <a
            href="/discovery"
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors"
          >
            View Results <ChevronRight size={18} />
          </a>
        </motion.div>
      )}
    </div>
  );
}
