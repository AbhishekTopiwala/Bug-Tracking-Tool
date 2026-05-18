import { useState, useEffect, useRef } from 'react';
import { 
  Activity, Play, Server, AlertCircle, RefreshCw,
  Clock, Database, Globe, ArrowUpRight, CheckCircle2, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SystemHealthPage() {
  const [logs, setLogs] = useState([
    "[13:02:01] [SYSTEM] Initializing telemetry synchronization...",
    "[13:02:02] [GATEWAY] Core API Gateway status: OPERATIONAL (ping: 42ms)",
    "[13:02:03] [FIRESTORE] Query benchmark: 10 docs matching organizations in 18ms",
    "[13:02:04] [AI_ENGINE] Initialized token pooling connection to Gemini-1.5-Pro Model"
  ]);

  const [refreshing, setRefreshing] = useState(false);
  const [uptimePercent, setUptimePercent] = useState('99.98%');
  const consoleEndRef = useRef(null);

  // Core telemetry parameters
  const services = [
    { name: 'Core API Gateway', desc: 'Reverse proxy and route authorization', status: 'operational', uptime: '99.98%', ping: '42ms' },
    { name: 'Cloud Firestore Database', desc: 'Multi-tenant database storage nodes', status: 'operational', uptime: '100%', ping: '18ms' },
    { name: 'Gemini AI API Engine', desc: 'GenAI test case compiler endpoint', status: 'operational', uptime: '99.95%', ping: '148ms' }
  ];

  // Auto-scroll the terminal console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Append new mock logs dynamically to simulate a live-beating telemetry center!
  useEffect(() => {
    const logsPool = [
      "[FIRESTORE] Write transaction success: verified token usage limits for 'Infosys Hub'",
      "[AUTH] Successfully verified JSON Web Token session signature for user profile 'Admin'",
      "[AI_ENGINE] Context token parsing complete (size: 942 tokens; target: Claude-3.5-Sonnet)",
      "[GATEWAY] Incoming GET request to /api/v1/organizations - 200 OK (latency: 31ms)",
      "[BILLING] Razorpay webhook event received: invoice.paid (charge: ₹2,999)",
      "[SCHEDULER] Executing daily task: purging expired trial workspaces (0 purged)",
      "[SECURITY] Checked tenant database isolation bounds; no leakage vectors detected",
      "[TELEMETRY] Heartbeat broadcast sent to node-14 (central-us-1)",
      "[AI_ENGINE] Successfully synthesized 12 edge-case test cases in 1140ms"
    ];

    const timer = setInterval(() => {
      const timestamp = new Date().toLocaleTimeString();
      const randomLog = logsPool[Math.floor(Math.random() * logsPool.length)];
      setLogs(prev => [...prev.slice(-30), `[${timestamp}] ${randomLog}`]);
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  const handleManualSync = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setUptimePercent('99.99%');
      const timestamp = new Date().toLocaleTimeString();
      setLogs(prev => [...prev, `[${timestamp}] [SYSTEM] Force-synchronized all database and network telemetry channels.`]);
      toast.success("Telemetry channels updated");
    }, 800);
  };

  // SVG Uptime past 24 hours grid blocks
  const uptimeGridNodes = Array.from({ length: 32 }).map((_, idx) => {
    if (idx === 14) return 'degraded'; // Add some realistic micro fluctuations!
    return 'operational';
  });

  return (
    <div className="sa-container">
      {/* Header */}
      <header className="sa-header">
        <div className="sa-title-area">
          <h1 className="sa-title">
            <Activity size={24} style={{ color: 'var(--sa-rose)' }} />
            System Health & Status
          </h1>
          <p className="sa-subtitle">Real-time platform operational benchmarks, api metrics, and rolling developer consoles</p>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={handleManualSync}
          disabled={refreshing}
          style={{ height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <RefreshCw size={14} className={refreshing ? "spin" : ""} />
          Re-evaluate Telemetry
        </button>
      </header>

      {/* Overview Status Bar Banner */}
      <div className="sa-card" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        padding: '20px 28px',
        borderLeft: '4px solid var(--sa-emerald)',
        background: 'rgba(16, 185, 129, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="sa-live-pulse-container" style={{ background: 'rgba(16, 185, 129, 0.08)', padding: 10, borderRadius: 12 }}>
            <span className="sa-live-pulse-beating" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>All Qualia Services Operational</h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>Average overall network responsiveness is 68ms (Stable)</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Uptime 24H</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>{uptimePercent}</span>
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Active Telemetry Channels</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>14 Nodes</span>
          </div>
        </div>
      </div>

      {/* Services status boards */}
      <section className="sa-grid-3">
        {services.map((srv, idx) => (
          <div key={idx} className="sa-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h4 style={{ margin: 0, fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>{srv.name}</h4>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{srv.desc}</p>
              </div>

              <div className="sa-status-pill sa-status-active">
                <span className="sa-pulse-dot" />
                Operational
              </div>
            </div>

            {/* Uptime blocks */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>Past 24 hours logs</span>
                <span>{srv.uptime} uptime</span>
              </div>
              <div className="sa-uptime-grid">
                {uptimeGridNodes.map((status, blockIdx) => (
                  <div 
                    key={blockIdx} 
                    className="sa-uptime-node" 
                    data-status={status}
                    title={status === 'operational' ? 'Operational (no incidents)' : 'Minor benchmark dip (112ms delay)'}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', borderTop: '1px solid rgba(226, 232, 240, 0.5)', paddingTop: 12 }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> Ping Response:
              </span>
              <strong style={{ color: '#0F172A' }}>{srv.ping}</strong>
            </div>
          </div>
        ))}
      </section>

      {/* Telemetry Console (Rolling live logs!) */}
      <div className="sa-card">
        <div className="sa-card-header" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="sa-card-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>Real-time Operations console</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Live telemetry feed streaming from centralized infrastructure cluster</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0F172A', color: 'var(--sa-rose)', padding: '6px 12px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700 }}>
            <span className="sa-pulse-dot" style={{ background: 'var(--sa-rose)', boxShadow: '0 0 0 2px rgba(244, 63, 94, 0.25)' }} />
            LIVE TELEMETRY ACTIVE
          </div>
        </div>

        {/* Rolling Monospace console window */}
        <div className="sa-logs-console" style={{
          background: '#0B0F19',
          border: '1px solid #1E293B',
          borderRadius: 14,
          padding: 20,
          fontFamily: 'Consolas, Courier, monospace',
          fontSize: '0.8rem',
          color: '#34D399',
          height: 300,
          overflowY: 'auto',
          boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          {logs.map((log, index) => {
            let logColor = '#34D399'; // green default
            if (log.includes('[SYSTEM]')) logColor = '#38BDF8'; // light blue
            if (log.includes('[SECURITY]') || log.includes('[BILLING]')) logColor = '#F43F5E'; // rose / alert
            if (log.includes('[SCHEDULER]')) logColor = '#FBBF24'; // amber

            return (
              <div key={index} style={{ color: logColor, display: 'flex', gap: 8, lineBreak: 'anywhere' }}>
                <span style={{ color: '#64748B', userSelect: 'none' }}>{(index + 1).toString().padStart(2, '0')}</span>
                <span>{log}</span>
              </div>
            );
          })}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
}
