import { useState, useEffect, useRef } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "SUCCESS";
  message: string;
  agent?: string;
}

export function SystemLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div style={{
      background: "rgba(0,0,0,0.4)",
      border: "1px solid rgba(255,255,255,0.05)",
      borderRadius: 8,
      marginTop: 24,
      fontFamily: "'Courier New', monospace",
      overflow: "hidden"
    }}>
      <div style={{
        padding: "8px 16px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <span style={{ fontSize: 10, color: "#45AAF2", letterSpacing: 2, fontWeight: 700 }}>
          [ SYSTEM_EVENT_LOG ]
        </span>
        <span style={{ fontSize: 9, color: "#64748b" }}>
          STREAMING_LIVE_DATAFEED
        </span>
      </div>
      <div 
        ref={scrollRef}
        style={{
          height: 180,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          fontSize: 11,
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.1) transparent"
        }}
      >
        {logs.length === 0 && (
          <div style={{ color: "#64748b" }}>Awaiting live worker events...</div>
        )}
        {logs.map(log => (
          <div key={log.id} style={{ display: "flex", gap: 12, opacity: 0.9 }}>
            <span style={{ color: "#475569", minWidth: 70 }}>[{log.timestamp}]</span>
            <span style={{ 
              color: log.level === "ERROR" ? "#FC5C65" : log.level === "WARN" ? "#F7B731" : log.level === "SUCCESS" ? "#26de81" : "#45AAF2",
              minWidth: 60,
              fontWeight: 700
            }}>
              {log.level}
            </span>
            <span style={{ color: "#64748b", minWidth: 100 }}>AGENT::{log.agent?.toUpperCase()}</span>
            <span style={{ color: "#e2e8f0" }}>{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
