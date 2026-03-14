import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Link } from "react-router-dom";
import { AgentControlPanel } from "../components/admin/AgentControlPanel";
import { supabase } from "../lib/supabase";

type Governor = {
  id: string;
  name: string;
  category: string;
  emoji: string;
  color: string;
  records: number;
  target: number;
  status: string;
  lastRun: string;
  errors: number;
};

type BusinessRecord = {
  id: number;
  name: string;
  category: string;
  status: string;
  created_at: string;
};

type AgentResponse = {
  id?: string | number;
  name?: string;
  agent_name?: string;
  category?: string;
  emoji?: string;
  color?: string;
  records_collected?: number | string;
  records?: number | string;
  target?: number | string;
  status?: string;
  lastRun?: string;
  errors?: number | string;
};

const GOVERNOR_STYLE_FALLBACKS = [
  { emoji: "🍽️", color: "#FF6B35" },
  { emoji: "☕", color: "#F7B731" },
  { emoji: "🥐", color: "#FC5C65" },
  { emoji: "🏨", color: "#45AAF2" },
  { emoji: "💪", color: "#26de81" },
const STATIC_GOVERNORS = [
  { id: 1, name: "Baghdad", category: "Restaurants", emoji: "🍽️", color: "#FF6B35", records: 3247, target: 4000, status: "active", lastRun: "2m ago", errors: 2 },
  { id: 2, name: "Basra", category: "Cafes", emoji: "☕", color: "#F7B731", records: 1892, target: 2500, status: "active", lastRun: "5m ago", errors: 0 },
  { id: 3, name: "Nineveh", category: "Bakeries", emoji: "🥐", color: "#FC5C65", records: 843, target: 1200, status: "idle", lastRun: "1h ago", errors: 1 },
  { id: 4, name: "Erbil", category: "Hotels", emoji: "🏨", color: "#45AAF2", records: 612, target: 800, status: "active", lastRun: "8m ago", errors: 0 },
  { id: 5, name: "Sulaymaniyah", category: "Gyms", emoji: "💪", color: "#26de81", records: 438, target: 600, status: "active", lastRun: "12m ago", errors: 3 },
  { id: 6, name: "Kirkuk", category: "Beauty Salons", emoji: "💅", color: "#fd9644", records: 1124, target: 1500, status: "active", lastRun: "3m ago", errors: 0 },
  { id: 7, name: "Duhok", category: "Barbershops", emoji: "✂️", color: "#a55eea", records: 967, target: 1200, status: "idle", lastRun: "45m ago", errors: 0 },
  { id: 8, name: "Anbar", category: "Pharmacies", emoji: "💊", color: "#2bcbba", records: 756, target: 1000, status: "active", lastRun: "6m ago", errors: 1 },
  { id: 9, name: "Babil", category: "Supermarkets", emoji: "🛒", color: "#4b7bec", records: 521, target: 700, status: "active", lastRun: "9m ago", errors: 0 },
  { id: 10, name: "Karbala", category: "Electronics", emoji: "📱", color: "#0fb9b1", records: 389, target: 600, status: "error", lastRun: "2h ago", errors: 12 },
  { id: 11, name: "Wasit", category: "Clothing Stores", emoji: "👗", color: "#e84393", records: 1043, target: 1400, status: "active", lastRun: "4m ago", errors: 0 },
  { id: 12, name: "Dhi Qar", category: "Car Services", emoji: "🚗", color: "#778ca3", records: 334, target: 500, status: "idle", lastRun: "3h ago", errors: 0 },
  { id: 13, name: "Maysan", category: "Dentists", emoji: "🦷", color: "#20bf6b", records: 287, target: 400, status: "active", lastRun: "15m ago", errors: 0 },
  { id: 14, name: "Muthanna", category: "Clinics", emoji: "🏥", color: "#eb3b5a", records: 412, target: 600, status: "active", lastRun: "7m ago", errors: 2 },
  { id: 15, name: "Najaf", category: "Schools", emoji: "🏫", color: "#f7b731", records: 891, target: 1100, status: "active", lastRun: "11m ago", errors: 0 },
  { id: 16, name: "Qadisiyyah", category: "Co-working Spaces", emoji: "💼", color: "#45aaf2", records: 156, target: 300, status: "idle", lastRun: "6h ago", errors: 1 },
  { id: 17, name: "Saladin", category: "Entertainment", emoji: "🎭", color: "#fa8231", records: 743, target: 1000, status: "active", lastRun: "18m ago", errors: 0 },
  { id: 18, name: "Diyala", category: "Tourism", emoji: "🕌", color: "#2d98da", records: 512, target: 800, status: "active", lastRun: "22m ago", errors: 4 },
];

const statusConfig: Record<string, { label: string; bg: string; border: string; dot: string }> = {
  active: { label: "ACTIVE", bg: "rgba(38,222,129,0.15)", border: "#26de81", dot: "#26de81" },
  idle:   { label: "IDLE",   bg: "rgba(247,183,49,0.15)",  border: "#F7B731", dot: "#F7B731" },
  error:  { label: "ERROR",  bg: "rgba(252,92,101,0.15)",  border: "#FC5C65", dot: "#FC5C65" },
};

const IRAQI_GOVERNORATES = [
  "Baghdad", "Basra", "Nineveh", "Erbil", "Sulaymaniyah", "Kirkuk", "Duhok", "Anbar", "Babil",
  "Karbala", "Wasit", "Dhi Qar", "Maysan", "Muthanna", "Najaf", "Qadisiyyah", "Saladin", "Diyala",
];

const CARDS_PER_PAGE = 6;

function pulse(color: string) {
  return {
    width: 8, height: 8, borderRadius: "50%", background: color,
    boxShadow: `0 0 0 0 ${color}`,
    animation: "pulse 1.8s infinite",
  };
}

export default function Admin() {
  const [time, setTime] = useState(new Date());
  const [animatedRecords, setAnimatedRecords] = useState<Record<string, number>>({});
  const [activeFilter, setActiveFilter] = useState("all");
  const [governors, setGovernors] = useState<Governor[]>([]);
  const [newToday, setNewToday] = useState(0);
  const [expandedGovernorId, setExpandedGovernorId] = useState<string | null>(null);
  const [cityRecords, setCityRecords] = useState<Record<string, BusinessRecord[]>>({});
  const [loadingCityRecords, setLoadingCityRecords] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [governors, setGovernors] = useState(STATIC_GOVERNORS);
  const [newToday, setNewToday] = useState(1247); // Mocked for visual

  // Pagination & Dropdown states
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedGovId, setExpandedGovId] = useState<string | number | null>(null);
  const [govRecords, setGovRecords] = useState<Record<string | number, any[]>>({});
  const [loadingRecords, setLoadingRecords] = useState<Record<string | number, boolean>>({});

  const itemsPerPage = 6;

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  function resolveGovernorateName(agent: AgentResponse, index: number) {
    const candidate = String(agent.name ?? agent.agent_name ?? agent.id ?? "");
    const match = candidate.match(/(\d+)/);
    const governorateIndex = match ? Number(match[1]) - 1 : index;
    return IRAQI_GOVERNORATES[governorateIndex] ?? IRAQI_GOVERNORATES[index] ?? `Governor ${index + 1}`;
  useEffect(() => {
    setCurrentPage(1);
    setExpandedGovId(null);
  }, [activeFilter]);

  async function fetchGovRecords(govId: string | number, govName: string) {
    if (govRecords[govId]) return;
    
    setLoadingRecords(prev => ({ ...prev, [govId]: true }));
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("name, category, status, created_at")
        .eq("governorate", govName)
        .limit(10)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      setGovRecords(prev => ({ ...prev, [govId]: data || [] }));
    } catch (err) {
      console.error("Error fetching records:", err);
    } finally {
      setLoadingRecords(prev => ({ ...prev, [govId]: false }));
    }
  }

  async function fetchData() {
    try {
      const { data, error } = await supabase.from("agents").select("*").order("agent_name");
      if (error) throw error;

      const data = await response.json();
      const liveGovernors = Array.isArray(data)
        ? data.map((agent: AgentResponse, index: number) => {
            const fallback = GOVERNOR_STYLE_FALLBACKS[index % GOVERNOR_STYLE_FALLBACKS.length];
            return {
              id: String(agent.id ?? agent.name ?? `agent-${index + 1}`),
              name: resolveGovernorateName(agent, index),
              category: agent.category ?? "Unassigned",
              emoji: agent.emoji ?? fallback.emoji,
              color: agent.color ?? fallback.color,
              records: Number(agent.records_collected ?? agent.records ?? 0),
              target: Number(agent.target ?? 1000),
              status: agent.status ?? "idle",
              lastRun: agent.lastRun ?? "Unknown",
              errors: Number(agent.errors ?? 0),
            };
          })
        : [];

      setGovernors(liveGovernors);
      setNewToday(liveGovernors.reduce((total: number, governor: Governor) => total + governor.records, 0));
      if (data && data.length > 0) {
        const merged = data.map((dbGov, index) => {
          // Match by name or index to ensure we get the right Iraqi city name
          const staticGov = STATIC_GOVERNORS.find((g) => g.name === dbGov.agent_name) || STATIC_GOVERNORS[index] || ({} as any);
          
          // Format last run time
          let lastRunStr = "Never";
          if (dbGov.last_run) {
            const diffMins = Math.round((new Date().getTime() - new Date(dbGov.last_run).getTime()) / 60000);
            if (diffMins < 60) lastRunStr = `${diffMins}m ago`;
            else if (diffMins < 1440) lastRunStr = `${Math.floor(diffMins / 60)}h ago`;
            else lastRunStr = new Date(dbGov.last_run).toLocaleDateString();
          }

          return {
            id: dbGov.id,
            name: staticGov.name || dbGov.agent_name,
            category: dbGov.category,
            emoji: staticGov.emoji || "🤖",
            color: staticGov.color || "#45AAF2",
            records: dbGov.records_collected || 0,
            target: dbGov.target || 1000,
            status: dbGov.status || "idle",
            lastRun: lastRunStr,
            errors: dbGov.errors || 0,
          };
        });
        setGovernors(merged as any);
      }
    } catch (err) {
      console.error("Error fetching agents:", err);
    }
  }

  useEffect(() => {
    // Animate numbers counting up
    const initial: Record<string, number> = {};
    governors.forEach(g => { initial[g.id] = 0; });
    setAnimatedRecords(initial);
    
    const timers = governors.map((g, i) =>
      setTimeout(() => {
        let count = 0;
        const step = Math.ceil(g.records / 60) || 1;
        const iv = setInterval(() => {
          count = Math.min(count + step, g.records);
          setAnimatedRecords(prev => ({ ...prev, [g.id]: count }));
          if (count >= g.records) clearInterval(iv);
        }, 20);
      }, i * 80)
    );
    return () => timers.forEach(clearTimeout);
  }, [governors]);

  const totalRecords = governors.reduce((a, g) => a + g.records, 0);
  const activeCount = governors.filter(g => g.status === "active").length;
  const errorCount = governors.filter(g => g.status === "error").length;
  const totalTarget = governors.reduce((a, g) => a + g.target, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalRecords / totalTarget) * 100) : 0;

  const filtered = activeFilter === "all" ? governors : governors.filter(g => g.status === activeFilter);
  const totalPages = Math.max(1, Math.ceil(filtered.length / CARDS_PER_PAGE));
  const paginatedGovernors = filtered.slice((currentPage - 1) * CARDS_PER_PAGE, currentPage * CARDS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handleToggleRecords(gov: Governor) {
    if (expandedGovernorId === gov.id) {
      setExpandedGovernorId(null);
      return;
    }

    setExpandedGovernorId(gov.id);

    if (cityRecords[gov.name]) {
      return;
    }

    setLoadingCityRecords(prev => ({ ...prev, [gov.name]: true }));
    const { data, error } = await supabase
      .from("businesses")
      .select("id, name, category, status, created_at")
      .eq("city", gov.name)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error(`Error loading records for ${gov.name}:`, error);
      setCityRecords(prev => ({ ...prev, [gov.name]: [] }));
    } else {
      setCityRecords(prev => ({ ...prev, [gov.name]: (data as BusinessRecord[]) ?? [] }));
    }

    setLoadingCityRecords(prev => ({ ...prev, [gov.name]: false }));
  }

  return (
    <div style={{
      fontFamily: "'Courier New', 'Lucida Console', monospace",
      background: "#090d13",
      minHeight: "100vh",
      color: "#e2e8f0",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 currentColor; }
          70% { box-shadow: 0 0 0 6px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .gov-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.2) !important;
          cursor: pointer;
        }
        .gov-card { transition: all 0.2s ease; }
        .filter-btn:hover { opacity: 1 !important; }
      `}</style>

      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
        pointerEvents: "none",
      }} />

      {/* Scan line effect */}
      <div style={{
        position: "fixed", left: 0, right: 0, height: "2px",
        background: "linear-gradient(90deg, transparent, rgba(69,170,242,0.4), transparent)",
        zIndex: 1, animation: "scan 4s linear infinite", pointerEvents: "none",
      }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 1400, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: "#45AAF2", letterSpacing: 6, fontWeight: 700 }}>
                IRAQ COMPASS // GOVERNOR CONTROL CENTER
              </div>
              <div style={{ fontSize: 9, color: "#26de81", animation: "blink 1.2s infinite", letterSpacing: 2 }}>
                ● LIVE
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: "#fff" }}>
              18 GOVERNORS DASHBOARD
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, letterSpacing: 2, display: "flex", gap: "16px" }}>
              <span>BUSINESS INTELLIGENCE COLLECTION NETWORK</span>
              <Link to="/" style={{ color: "#45AAF2", textDecoration: "none", borderBottom: "1px solid #45AAF2" }}>
                [ RETURN TO PUBLIC DIRECTORY ]
              </Link>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#45AAF2", letterSpacing: 2, fontVariantNumeric: "tabular-nums" }}>
              {time.toLocaleTimeString("en-US", { hour12: false })}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 2 }}>
              {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "TOTAL RECORDS", value: totalRecords.toLocaleString(), sub: `${overallProgress}% of target`, color: "#45AAF2", icon: "◈" },
            { label: "ACTIVE GOVERNORS", value: `${activeCount} / ${governors.length}`, sub: `${governors.length - activeCount - errorCount} idle`, color: "#26de81", icon: "▶" },
            { label: "NEW TODAY", value: `+${newToday.toLocaleString()}`, sub: "across all categories", color: "#f7b731", icon: "↑" },
            { label: "ERRORS", value: errorCount, sub: `${governors.reduce((a,g)=>a+g.errors,0)} total issues`, color: "#FC5C65", icon: "⚠" },
          ].map((stat, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.03)",
              borderTop: `2px solid ${stat.color}`,
              borderRight: `1px solid rgba(255,255,255,0.07)`,
              borderBottom: `1px solid rgba(255,255,255,0.07)`,
              borderLeft: `1px solid rgba(255,255,255,0.07)`,
              borderRadius: 8, padding: "20px 20px",
              animation: `slideIn 0.4s ease ${i * 0.1}s both`,
            }}>
              <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 3, marginBottom: 8 }}>
                {stat.icon} {stat.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: stat.color, fontVariantNumeric: "tabular-nums" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8, padding: "16px 20px", marginBottom: 28,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, letterSpacing: 3, color: "#64748b" }}>◈ OVERALL NETWORK PROGRESS</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#45AAF2" }}>{overallProgress}% — {totalRecords.toLocaleString()} / {totalTarget.toLocaleString()} records</span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 4, width: `${overallProgress}%`,
              background: "linear-gradient(90deg, #45AAF2, #26de81)",
              transition: "width 1s ease",
              boxShadow: "0 0 10px rgba(69,170,242,0.5)",
            }} />
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {["all", "active", "idle", "error"].map(f => (
            <button key={f} className="filter-btn" onClick={() => setActiveFilter(f)} style={{
              background: activeFilter === f ? "rgba(69,170,242,0.15)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${activeFilter === f ? "#45AAF2" : "rgba(255,255,255,0.07)"}`,
              color: activeFilter === f ? "#45AAF2" : "#64748b",
              borderRadius: 4, padding: "6px 16px",
              fontSize: 11, letterSpacing: 2, fontFamily: "inherit", cursor: "pointer",
              opacity: 0.9, transition: "all 0.15s",
            }}>
              {f.toUpperCase()}
              {f !== "all" && <span style={{ marginLeft: 8, opacity: 0.7 }}>
                ({governors.filter(g => g.status === f).length})
              </span>}
            </button>
          ))}
        </div>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          color: "#64748b",
          fontSize: 11,
          letterSpacing: 2,
        }}>
          <span>PAGE {currentPage} OF {totalPages}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(69,170,242,0.5)",
                color: currentPage === 1 ? "#334155" : "#45AAF2",
                borderRadius: 4,
                padding: "6px 12px",
                fontSize: 11,
                letterSpacing: 2,
                fontFamily: "inherit",
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              PREV
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(69,170,242,0.5)",
                color: currentPage === totalPages ? "#334155" : "#45AAF2",
                borderRadius: 4,
                padding: "6px 12px",
                fontSize: 11,
                letterSpacing: 2,
                fontFamily: "inherit",
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              NEXT
            </button>
          </div>
        {/* Pagination Controls */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 24 }}>
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: currentPage === 1 ? "#334155" : "#45AAF2",
              padding: "8px 16px",
              borderRadius: 4,
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontSize: 11,
              letterSpacing: 1,
              transition: "all 0.2s"
            }}
          >
            [ PREVIOUS ]
          </button>
          <span style={{ fontSize: 11, color: "#64748b", letterSpacing: 2 }}>
            PAGE <span style={{ color: "#fff", fontWeight: 700 }}>{currentPage}</span> OF <span style={{ color: "#fff", fontWeight: 700 }}>{Math.ceil(filtered.length / itemsPerPage) || 1}</span>
          </span>
          <button 
            disabled={currentPage >= Math.ceil(filtered.length / itemsPerPage)}
            onClick={() => setCurrentPage(prev => prev + 1)}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: currentPage >= Math.ceil(filtered.length / itemsPerPage) ? "#334155" : "#45AAF2",
              padding: "8px 16px",
              borderRadius: 4,
              cursor: currentPage >= Math.ceil(filtered.length / itemsPerPage) ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontSize: 11,
              letterSpacing: 1,
              transition: "all 0.2s"
            }}
          >
            [ NEXT ]
          </button>
        </div>

        {/* Governor Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {paginatedGovernors.map((gov, i) => {
          {filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((gov, i) => {
            const pct = gov.target > 0 ? Math.round((gov.records / gov.target) * 100) : 0;
            const sc = statusConfig[gov.status] || statusConfig.idle;
            const isSelected = expandedGovernorId === gov.id;
            const records = cityRecords[gov.name] ?? [];
            const isLoadingRecords = loadingCityRecords[gov.name] ?? false;

            return (
              <div key={gov.id} className="gov-card"
                style={{
                  background: isSelected ? "rgba(69,170,242,0.06)" : "rgba(255,255,255,0.025)",
                  borderTop: `1px solid ${isSelected ? "#45AAF2" : "rgba(255,255,255,0.07)"}`,
                  borderRight: `1px solid ${isSelected ? "#45AAF2" : "rgba(255,255,255,0.07)"}`,
                  borderBottom: `1px solid ${isSelected ? "#45AAF2" : "rgba(255,255,255,0.07)"}`,
                  borderLeft: `3px solid ${gov.color}`,
                  borderRadius: 8, padding: "16px 18px",
                  animation: `slideIn 0.4s ease ${i * 0.04}s both`,
                }}>

                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{gov.emoji}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: 1 }}>
                        {gov.name}
                      </div>
                      <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{gov.category}</div>
                    </div>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 5,
                    background: sc.bg, border: `1px solid ${sc.border}`,
                    borderRadius: 4, padding: "3px 8px",
                  }}>
                    <div style={{ ...pulse(sc.dot), color: sc.dot }} />
                    <span style={{ fontSize: 9, letterSpacing: 2, color: sc.dot, fontWeight: 700 }}>{sc.label}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: "#64748b" }}>PROGRESS</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: gov.color }}>{pct}%</span>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 5, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3, width: `${pct}%`,
                      background: `linear-gradient(90deg, ${gov.color}88, ${gov.color})`,
                      boxShadow: `0 0 8px ${gov.color}66`,
                      transition: "width 1.2s ease",
                    }} />
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 4, padding: "7px 8px" }}>
                    <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 1, marginBottom: 2 }}>RECORDS</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#e2e8f0", fontVariantNumeric: "tabular-nums" }}>
                      {(animatedRecords[gov.id] || 0).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 4, padding: "7px 8px" }}>
                    <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 1, marginBottom: 2 }}>TARGET</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
                      {gov.target.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: gov.errors > 0 ? "rgba(252,92,101,0.08)" : "rgba(255,255,255,0.04)", borderRadius: 4, padding: "7px 8px" }}>
                    <div style={{ fontSize: 9, color: "#64748b", letterSpacing: 1, marginBottom: 2 }}>ERRORS</div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: gov.errors > 0 ? "#FC5C65" : "#26de81" }}>
                      {gov.errors}
                    </div>
                  </div>
                </div>

                {/* Last run */}
                <div style={{ marginTop: 10, fontSize: 10, color: "#475569", display: "flex", justifyContent: "space-between" }}>
                  <span>◷ LAST RUN: {gov.lastRun}</span>
                  <span style={{ color: "#334155" }}>→ NEXT: 6h</span>
                </div>

                <button
                  onClick={() => handleToggleRecords(gov)}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    background: "rgba(69,170,242,0.08)",
                    border: "1px solid rgba(69,170,242,0.45)",
                    color: "#45AAF2",
                    borderRadius: 4,
                    padding: "7px 8px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 2,
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  {isSelected ? "▲ HIDE" : "▼ VIEW RECORDS"}
                </button>

                {isSelected && (
                  <div style={{
                    marginTop: 10,
                    border: "1px solid rgba(69,170,242,0.3)",
                    borderRadius: 6,
                    background: "rgba(9,13,19,0.9)",
                    padding: "8px 10px",
                  }}>
                    {isLoadingRecords ? (
                      <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1 }}>LOADING TOP 10 RECORDS...</div>
                    ) : records.length === 0 ? (
                      <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 1 }}>NO RECORDS FOUND FOR THIS GOVERNORATE.</div>
                    ) : (
                      <div style={{ display: "grid", gap: 6 }}>
                        {records.map(record => {
                          const recordStatus = statusConfig[record.status] || statusConfig.idle;
                          return (
                            <div key={record.id} style={{
                              display: "grid",
                              gridTemplateColumns: "1.2fr 0.8fr 0.7fr 0.9fr",
                              gap: 6,
                              alignItems: "center",
                              fontSize: 10,
                              color: "#cbd5e1",
                              padding: "6px 0",
                              borderBottom: "1px solid rgba(255,255,255,0.05)",
                            }}>
                              <span>{record.name}</span>
                              <span style={{ color: "#94a3b8" }}>{record.category}</span>
                              <span style={{
                                justifySelf: "start",
                                background: recordStatus.bg,
                                border: `1px solid ${recordStatus.border}`,
                                color: recordStatus.dot,
                                borderRadius: 4,
                                padding: "2px 6px",
                                letterSpacing: 1,
                                fontWeight: 700,
                                fontSize: 9,
                              }}>
                                {recordStatus.label}
                              </span>
                              <span style={{ color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
                                {new Date(record.created_at).toLocaleDateString("en-US")}
                              </span>
                            </div>
                          );
                        })}
                {/* View Records Button */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const isExpanded = expandedGovId === gov.id;
                    setExpandedGovId(isExpanded ? null : gov.id);
                    if (!isExpanded) fetchGovRecords(gov.id, gov.name);
                  }}
                  style={{
                    width: "100%", marginTop: 12, padding: "8px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 4, color: "#45AAF2", fontSize: 10,
                    fontWeight: 700, letterSpacing: 1, cursor: "pointer",
                    transition: "all 0.2s", fontFamily: "inherit"
                  }}
                >
                  {expandedGovId === gov.id ? "▲ HIDE RECORDS" : "▼ VIEW RECORDS"}
                </button>

                {/* Expanded Records */}
                {expandedGovId === gov.id && (
                  <div style={{ 
                    marginTop: 12, padding: "12px", 
                    background: "rgba(0,0,0,0.2)", 
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 4, animation: "slideIn 0.3s ease"
                  }}>
                    {loadingRecords[gov.id] ? (
                      <div style={{ fontSize: 9, color: "#64748b", textAlign: "center", padding: "10px", letterSpacing: 1 }}>
                        FETCHING DATA...
                      </div>
                    ) : govRecords[gov.id]?.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {govRecords[gov.id].map((rec, idx) => (
                          <div key={idx} style={{ 
                            display: "grid", gridTemplateColumns: "1.5fr 1fr 0.8fr 1fr", 
                            gap: 8, fontSize: 8, borderBottom: "1px solid rgba(255,255,255,0.03)",
                            paddingBottom: 4
                          }}>
                            <span style={{ color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rec.name}</span>
                            <span style={{ color: "#64748b" }}>{rec.category}</span>
                            <span style={{ color: rec.status === "active" ? "#26de81" : "#f7b731" }}>{rec.status?.toUpperCase()}</span>
                            <span style={{ color: "#475569", textAlign: "right" }}>{new Date(rec.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 9, color: "#64748b", textAlign: "center", padding: "10px", letterSpacing: 1 }}>
                        NO RECORDS FOUND
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Enrichment Agent Control */}
        <AgentControlPanel />

        {/* Footer */}
        <div style={{
          marginTop: 28, padding: "14px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", justifyContent: "space-between",
          fontSize: 10, color: "#334155", letterSpacing: 2,
        }}>
          <span>IRAQ COMPASS // AI GOVERNOR NETWORK v1.0</span>
          <span>SUPABASE → VERCEL → GITHUB</span>
          <span>AUTO-REFRESH: 30s</span>
        </div>
      </div>
    </div>
  );
}
