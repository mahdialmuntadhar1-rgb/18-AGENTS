import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, Play, Square, Upload, CheckCircle2, AlertCircle, 
  Clock, Activity, Database, Sparkles, ShieldCheck, FileJson, 
  FileText, Settings, Zap
} from 'lucide-react';

const GOVERNORATES = [
  'Baghdad', 'Basra', 'Mosul', 'Erbil', 'Sulaymaniyah', 'Karbala', 
  'Najaf', 'Kirkuk', 'Anbar', 'Duhok', 'Diyala', 'Wasit', 
  'Babil', 'Qadisiyah', 'Maysan', 'Dhi Qar', 'Salahuddin', 'Muthanna'
];

interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export default function CommandCenter() {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([
    { role: 'agent', text: 'System initialized. Ready for commands.' }
  ]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [systemStatus, setSystemStatus] = useState<'idle' | 'running' | 'stopping'>('idle');
  const [selectedGovs, setSelectedGovs] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock real-time logs
  useEffect(() => {
    if (systemStatus === 'running') {
      const interval = setInterval(() => {
        const agents = ['Cleaner', 'Enricher', 'Postcard', 'QC'];
        const govs = selectedGovs.length > 0 ? selectedGovs : ['Baghdad', 'Erbil'];
        const agent = agents[Math.floor(Math.random() * agents.length)];
        const gov = govs[Math.floor(Math.random() * govs.length)];
        const actions = ['processing record', 'removed duplicate', 'categorizing business', 'generated postcard', 'flagged for review'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        
        const newLog: LogEntry = {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString([], { hour12: false }),
          message: `${agent}-${gov.substring(0,3).toUpperCase()} ${action} ${Math.floor(Math.random() * 1000)}`,
          type: action.includes('removed') ? 'success' : action.includes('flagged') ? 'warning' : 'info'
        };
        
        setLogs(prev => [newLog, ...prev].slice(0, 50));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [systemStatus, selectedGovs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setChatHistory(prev => [...prev, { role: 'user', text: chatInput }]);
    
    // Mock Agent Response
    setTimeout(() => {
      let response = `Command received: "${chatInput}". Processing...`;
      if (chatInput.toLowerCase().includes('clean') && chatInput.toLowerCase().includes('sulaymaniyah')) {
        response = `Cleaner Agent started for Sulaymaniyah\nProcessing 3,200 records\nEstimated completion: 2 minutes`;
        setSystemStatus('running');
        if (!selectedGovs.includes('Sulaymaniyah')) {
          setSelectedGovs([...selectedGovs, 'Sulaymaniyah']);
        }
      }
      setChatHistory(prev => [...prev, { role: 'agent', text: response }]);
    }, 1000);
    
    setChatInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setChatHistory(prev => [
        ...prev, 
        { role: 'user', text: `Uploaded file: ${file.name}` },
        { role: 'agent', text: `${file.name.toUpperCase()} uploaded successfully.\nRecords detected: ${Math.floor(Math.random() * 30000) + 1000}\nGovernorates detected: Baghdad, Basra, Erbil.\nStored in pipeline database.` }
      ]);
    }
  };

  const toggleGov = (gov: string) => {
    setSelectedGovs(prev => 
      prev.includes(gov) ? prev.filter(g => g !== gov) : [...prev, gov]
    );
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-300 font-sans p-4 md:p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#111827] p-6 rounded-2xl border border-slate-800 shadow-2xl">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Terminal className="text-cyan-400" size={32} />
              AI AGENT COMMAND CENTER
            </h1>
            <p className="text-slate-400 mt-1 text-sm">Iraq Compass Nationwide Business Directory Operations</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${systemStatus === 'running' ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${systemStatus === 'running' ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
              </span>
              <span className="text-sm font-bold uppercase tracking-widest text-slate-300">
                {systemStatus === 'running' ? 'System Active' : 'System Idle'}
              </span>
            </div>
            <button 
              onClick={() => setIsAutoMode(!isAutoMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest transition-all ${
                isAutoMode 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Zap size={16} />
              Auto Pipeline
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Chat & Controls */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Agent Chat & Task Box */}
            <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl flex flex-col h-[400px]">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 rounded-t-2xl flex justify-between items-center">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Terminal size={16} className="text-cyan-400" />
                  Agent Terminal
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors" title="Upload CSV/JSON">
                    <Upload size={14} />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.json" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl text-sm font-mono whitespace-pre-wrap ${
                      msg.role === 'user' 
                        ? 'bg-cyan-900/30 text-cyan-100 border border-cyan-800/50 rounded-tr-sm' 
                        : 'bg-slate-800/50 text-slate-300 border border-slate-700 rounded-tl-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 bg-slate-900/50 rounded-b-2xl flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="e.g., Clean the businesses in Sulaymaniyah..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors font-mono"
                />
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                  SEND
                </button>
              </form>
            </div>

            {/* Start / Stop Control Panel */}
            <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Pipeline Controls</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button 
                  onClick={() => setSystemStatus('running')}
                  disabled={systemStatus === 'running'}
                  className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl font-bold uppercase tracking-widest transition-all bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={24} />
                  Start Agents
                </button>
                <button 
                  onClick={() => setSystemStatus('idle')}
                  disabled={systemStatus === 'idle'}
                  className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl font-bold uppercase tracking-widest transition-all bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Square size={24} />
                  Stop Agents
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Running', color: 'bg-emerald-500' },
                  { label: 'Processing', color: 'bg-amber-500' },
                  { label: 'Error', color: 'bg-rose-500' },
                  { label: 'Idle', color: 'bg-slate-500' }
                ].map(status => (
                  <div key={status.label} className="flex flex-col items-center gap-1 bg-slate-900/50 py-2 rounded-lg border border-slate-800">
                    <div className={`w-3 h-3 rounded-full ${status.color} shadow-[0_0_8px_currentColor] opacity-80`} />
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">{status.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline Progress View */}
            <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Pipeline Progress</h2>
              <div className="space-y-4">
                {[
                  { name: 'Data Ingestion', progress: 100, color: 'bg-blue-500' },
                  { name: 'Data Cleaning', progress: systemStatus === 'running' ? 75 : 0, color: 'bg-cyan-500' },
                  { name: 'Data Enrichment', progress: systemStatus === 'running' ? 45 : 0, color: 'bg-purple-500' },
                  { name: 'Postcard Generation', progress: systemStatus === 'running' ? 10 : 0, color: 'bg-pink-500' },
                  { name: 'Quality Control', progress: systemStatus === 'running' ? 5 : 0, color: 'bg-emerald-500' }
                ].map(stage => (
                  <div key={stage.name}>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-1">
                      <span className="text-slate-300">{stage.name}</span>
                      <span className="text-slate-400">{stage.progress}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.progress}%` }}
                        transition={{ duration: 1 }}
                        className={`h-full ${stage.color} shadow-[0_0_10px_currentColor]`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Map & Monitor */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Governorate Control Map */}
            <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl p-6 flex-1">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest">Governorate Control</h2>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">Select regions to process</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {GOVERNORATES.map(gov => {
                  const isSelected = selectedGovs.includes(gov);
                  const isRunning = systemStatus === 'running' && isSelected;
                  return (
                    <div 
                      key={gov}
                      onClick={() => toggleGov(gov)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-cyan-900/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-slate-600'}`}>
                          {isSelected && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                        <span className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-slate-400'}`}>{gov}</span>
                      </div>
                      <div className="space-y-1 pl-6">
                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>Records:</span>
                          <span className="font-mono text-slate-300">{Math.floor(Math.random() * 5000) + 1000}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between items-center">
                          <span>Status:</span>
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                            <span className={isRunning ? 'text-emerald-400' : 'text-slate-500'}>{isRunning ? 'Running' : 'Idle'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real-Time Activity Monitor */}
            <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl flex flex-col h-[300px]">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 rounded-t-2xl flex justify-between items-center">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-emerald-400" />
                  Live Activity Monitor
                </h2>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Updating every 2s
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-[#0B0F19] font-mono text-xs space-y-2 custom-scrollbar">
                <AnimatePresence initial={false}>
                  {logs.map((log) => (
                    <motion.div 
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 border-b border-slate-800/50 pb-2"
                    >
                      <span className="text-slate-500 shrink-0">{log.time}</span>
                      <span className={`
                        ${log.type === 'success' ? 'text-emerald-400' : ''}
                        ${log.type === 'warning' ? 'text-amber-400' : ''}
                        ${log.type === 'error' ? 'text-rose-400' : ''}
                        ${log.type === 'info' ? 'text-cyan-400' : ''}
                      `}>
                        {log.message}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {logs.length === 0 && (
                  <div className="text-slate-600 text-center mt-10 italic">Awaiting system activity...</div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
