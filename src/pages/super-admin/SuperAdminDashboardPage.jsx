import { useState, useEffect } from 'react';
import { 
  Building2, Users, CreditCard, BrainCircuit, 
  ArrowUpRight, ArrowDownRight, Activity, ShieldAlert,
  Search, Filter, MoreVertical, ExternalLink, RefreshCw,
  TrendingUp, HardDrive, Database, Globe, Play, Server, AlertCircle, HelpCircle
} from 'lucide-react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrgs: 0,
    totalRevenue: 0,
    totalAIUsage: 0,
    activeSubscriptions: 0
  });
  const [recentOrgs, setRecentOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('revenue');
  const [hoveredDataPoint, setHoveredDataPoint] = useState(null);

  const navigate = useNavigate();

  // Fetch Stats Data
  const fetchPlatformStats = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const orgsSnap = await getDocs(collection(db, 'organizations'));
      const orgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const totalOrgs = orgs.length;
      const activeSubs = orgs.filter(o => o.subscription?.status === 'active' || o.subscription?.status === 'trial').length;
      const totalAI = orgs.reduce((acc, o) => acc + (o.aiUsage?.currentUsage || 0), 0);
      
      // Mock revenue calculation (Free: 0, Pro: 2999, Enterprise: 9999)
      const revenue = orgs.reduce((acc, o) => {
        const plan = o.subscription?.planId || 'free';
        const status = o.subscription?.status || 'inactive';
        if (status === 'active') {
          if (plan === 'pro') return acc + 2999;
          if (plan === 'enterprise') return acc + 9999;
        }
        return acc;
      }, 0);

      setStats({
        totalOrgs,
        totalRevenue: revenue,
        totalAIUsage: totalAI,
        activeSubscriptions: activeSubs
      });

      // Fetch recent organizations
      const q = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'), limit(5));
      const recentSnap = await getDocs(q);
      setRecentOrgs(recentSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      if (isSilent) {
        toast.success("Platform analytics synchronized");
      }
    } catch (error) {
      console.error("Error fetching super admin stats:", error);
      toast.error("Failed to load platform analytics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  if (loading) {
    return (
      <div className="sa-container" style={{ justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="spinner spinner-lg" style={{ borderTopColor: 'var(--sa-rose)' }} />
          <p style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>Analyzing Qualia SaaS Metrics...</p>
        </div>
      </div>
    );
  }

  // Pure SVG Responsive Line Chart Data (Mocking daily records)
  const chartData = {
    revenue: [
      { label: 'May 12', val: 12000, display: '₹12,000' },
      { label: 'May 13', val: 15500, display: '₹15,500' },
      { label: 'May 14', val: 14000, display: '₹14,000' },
      { label: 'May 15', val: 19500, display: '₹19,500' },
      { label: 'May 16', val: 24000, display: '₹24,000' },
      { label: 'May 17', val: 22000, display: '₹22,000' },
      { label: 'May 18', val: stats.totalRevenue || 28000, display: `₹${(stats.totalRevenue || 28000).toLocaleString()}` }
    ],
    ai: [
      { label: 'May 12', val: 450, display: '450 tokens' },
      { label: 'May 13', val: 680, display: '680 tokens' },
      { label: 'May 14', val: 890, display: '890 tokens' },
      { label: 'May 15', val: 1200, display: '1,200 tokens' },
      { label: 'May 16', val: 980, display: '980 tokens' },
      { label: 'May 17', val: 1540, display: '1,540 tokens' },
      { label: 'May 18', val: stats.totalAIUsage || 1850, display: `${(stats.totalAIUsage || 1850).toLocaleString()} tokens` }
    ]
  };

  const activePoints = chartData[activeChartTab];
  const maxVal = Math.max(...activePoints.map(p => p.val)) * 1.15;
  const minVal = Math.min(...activePoints.map(p => p.val)) * 0.85;
  
  // Calculate SVG dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const paddingX = 60;
  const paddingY = 30;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Generate SVG points
  const pointsCoords = activePoints.map((p, idx) => {
    const x = paddingX + (idx / (activePoints.length - 1)) * chartWidth;
    const y = svgHeight - paddingY - ((p.val - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, ...p };
  });

  const linePath = pointsCoords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const areaPath = `${linePath} L ${pointsCoords[pointsCoords.length - 1].x} ${svgHeight - paddingY} L ${pointsCoords[0].x} ${svgHeight - paddingY} Z`;

  // Mock Sparklines
  const sparklineOrgs = "M 0 30 Q 15 15 30 25 T 60 10 T 90 20 T 120 5";
  const sparklineRev = "M 0 25 Q 15 30 30 15 T 60 5 T 90 10 T 120 2";
  const sparklineAI = "M 0 5 Q 15 20 30 10 T 60 30 T 90 15 T 120 25";
  const sparklineSubs = "M 0 20 Q 15 10 30 25 T 60 5 T 90 18 T 120 8";

  // System status pulse details
  const infrastructureServices = [
    { name: 'Core API Gateway', status: 'operational', uptime: '99.98%', ping: '42ms' },
    { name: 'Cloud Firestore DB', status: 'operational', uptime: '100%', ping: '18ms' },
    { name: 'Gemini AI Integration', status: 'operational', uptime: '99.95%', ping: '148ms' }
  ];

  return (
    <div className="sa-container">
      {/* ── Premium Header ── */}
      <header className="sa-header">
        <div className="sa-title-area">
          <h1 className="sa-title">
            <TrendingUp size={24} style={{ color: 'var(--sa-rose)' }} />
            Platform Overview
          </h1>
          <p className="sa-subtitle">Real-time analytical control and operations terminal for Qualia SaaS</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sa-live-pulse-container" style={{ background: '#FFF', border: '1px solid rgba(226, 232, 240, 0.8)', padding: '8px 16px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
            <span className="sa-live-pulse-beating" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sa-emerald)' }}>PLATFORM STABLE</span>
          </div>

          <button 
            className="btn btn-secondary" 
            onClick={() => fetchPlatformStats(true)} 
            disabled={refreshing}
            style={{ borderRadius: 12, height: 40, padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} />
            Sync Data
          </button>
        </div>
      </header>

      {/* ── Premium Metric Grid ── */}
      <section className="sa-grid-4">
        {/* Total Organizations */}
        <div 
          className="sa-card sa-card-rose" 
          onClick={() => navigate('/super-admin/organizations')}
          style={{ cursor: 'pointer' }}
        >
          <div className="sa-card-header">
            <h3 className="sa-card-title">Total Organizations</h3>
            <div className="sa-card-icon" style={{ background: 'rgba(244, 63, 94, 0.08)', color: 'var(--sa-rose)' }}>
              <Building2 size={20} />
            </div>
          </div>
          <h2 className="sa-card-value">{stats.totalOrgs}</h2>
          <div className="sa-card-footer">
            <span className="sa-trend-up">
              <ArrowUpRight size={14} /> +12%
            </span>
            <span style={{ color: 'var(--text-muted)' }}>vs last month</span>
          </div>
          {/* Sparkline overlay */}
          <svg className="sa-sparkline" viewBox="0 0 120 40">
            <path d={sparklineOrgs} fill="none" stroke="var(--sa-rose)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Monthly Recurring Revenue */}
        <div 
          className="sa-card sa-card-indigo"
          onClick={() => navigate('/super-admin/subscriptions')}
          style={{ cursor: 'pointer' }}
        >
          <div className="sa-card-header">
            <h3 className="sa-card-title">Monthly Revenue</h3>
            <div className="sa-card-icon" style={{ background: 'rgba(99, 102, 241, 0.08)', color: 'var(--sa-indigo)' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <h2 className="sa-card-value">₹{(stats.totalRevenue || 0).toLocaleString()}</h2>
          <div className="sa-card-footer">
            <span className="sa-trend-up">
              <ArrowUpRight size={14} /> +8.4%
            </span>
            <span style={{ color: 'var(--text-muted)' }}>active MRR</span>
          </div>
          <svg className="sa-sparkline" viewBox="0 0 120 40">
            <path d={sparklineRev} fill="none" stroke="var(--sa-indigo)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* AI Quotas */}
        <div 
          className="sa-card sa-card-emerald"
          onClick={() => navigate('/super-admin/ai-usage')}
          style={{ cursor: 'pointer' }}
        >
          <div className="sa-card-header">
            <h3 className="sa-card-title">AI Token Usage</h3>
            <div className="sa-card-icon" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--sa-emerald)' }}>
              <BrainCircuit size={20} />
            </div>
          </div>
          <h2 className="sa-card-value">{(stats.totalAIUsage || 0).toLocaleString()}</h2>
          <div className="sa-card-footer">
            <span className="sa-trend-down">
              <ArrowDownRight size={14} /> -3.2%
            </span>
            <span style={{ color: 'var(--text-muted)' }}>this billing cycle</span>
          </div>
          <svg className="sa-sparkline" viewBox="0 0 120 40">
            <path d={sparklineAI} fill="none" stroke="var(--sa-emerald)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Active Subscriptions */}
        <div 
          className="sa-card sa-card-amber"
          onClick={() => navigate('/super-admin/subscriptions')}
          style={{ cursor: 'pointer' }}
        >
          <div className="sa-card-header">
            <h3 className="sa-card-title">Active Subscriptions</h3>
            <div className="sa-card-icon" style={{ background: 'rgba(245, 158, 11, 0.08)', color: 'var(--sa-amber)' }}>
              <Users size={20} />
            </div>
          </div>
          <h2 className="sa-card-value">{stats.activeSubscriptions}</h2>
          <div className="sa-card-footer">
            <span className="sa-trend-up">
              <ArrowUpRight size={14} /> +5%
            </span>
            <span style={{ color: 'var(--text-muted)' }}>paying clients</span>
          </div>
          <svg className="sa-sparkline" viewBox="0 0 120 40">
            <path d={sparklineSubs} fill="none" stroke="var(--sa-amber)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      {/* ── Interactive Charts & Distribution Section ── */}
      <section className="sa-grid-2-3">
        {/* Responsive interactive vector chart */}
        <div className="sa-card">
          <div className="sa-card-header" style={{ marginBottom: 12 }}>
            <div>
              <h3 className="sa-card-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>Platform Usage Trends</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Performance analytics and usage vectors</p>
            </div>
            {/* Chart Switcher */}
            <div style={{ display: 'flex', background: 'rgba(226, 232, 240, 0.4)', padding: 4, borderRadius: 10, gap: 4 }}>
              <button 
                onClick={() => { setActiveChartTab('revenue'); setHoveredDataPoint(null); }}
                className={`sa-tab-btn ${activeChartTab === 'revenue' ? 'sa-tab-btn-active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8, border: 'none' }}
              >
                Revenue Flow
              </button>
              <button 
                onClick={() => { setActiveChartTab('ai'); setHoveredDataPoint(null); }}
                className={`sa-tab-btn ${activeChartTab === 'ai' ? 'sa-tab-btn-active' : ''}`}
                style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8, border: 'none' }}
              >
                AI Generations
              </button>
            </div>
          </div>

          <div className="sa-chart-container">
            {/* Tooltip Overlay */}
            {hoveredDataPoint && (
              <div style={{
                position: 'absolute',
                top: hoveredDataPoint.y - 50,
                left: hoveredDataPoint.x - 60,
                background: '#0F172A',
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                pointerEvents: 'none',
                zIndex: 10,
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{hoveredDataPoint.label}</div>
                <div>{hoveredDataPoint.display}</div>
              </div>
            )}

            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={activeChartTab === 'revenue' ? '#6366F1' : '#10B981'} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={activeChartTab === 'revenue' ? '#6366F1' : '#10B981'} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} className="sa-chart-grid-line" />
              <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={svgWidth - paddingX} y2={paddingY + chartHeight / 2} className="sa-chart-grid-line" />
              <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} className="sa-chart-grid-line" />

              {/* Gradient Area Fill */}
              <path d={areaPath} fill="url(#chartGradient)" />

              {/* Smooth Spline Vector Path */}
              <path 
                d={linePath} 
                className="sa-chart-path" 
                stroke={activeChartTab === 'revenue' ? '#6366F1' : '#10B981'} 
                fill="none" 
              />

              {/* Interactive Data Nodes */}
              {pointsCoords.map((pt, idx) => (
                <g key={idx}>
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={hoveredDataPoint?.label === pt.label ? "6" : "4"} 
                    fill="#FFF" 
                    stroke={activeChartTab === 'revenue' ? '#6366F1' : '#10B981'} 
                    strokeWidth="3"
                    style={{ transition: 'all 0.15s ease', cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDataPoint(pt)}
                    onMouseLeave={() => setHoveredDataPoint(null)}
                  />
                  {/* Invisible touch target */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="20"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDataPoint(pt)}
                    onMouseLeave={() => setHoveredDataPoint(null)}
                  />
                  {/* X Axis Labels */}
                  <text 
                    x={pt.x} 
                    y={svgHeight - 10} 
                    textAnchor="middle" 
                    fill="#94A3B8" 
                    fontSize="11" 
                    fontWeight="500"
                  >
                    {pt.label}
                  </text>
                </g>
              ))}

              {/* Y Axis Labels */}
              <text x={12} y={paddingY + 4} fill="#94A3B8" fontSize="11" fontWeight="500">
                {activeChartTab === 'revenue' ? '₹30k' : '2k'}
              </text>
              <text x={12} y={paddingY + chartHeight / 2 + 4} fill="#94A3B8" fontSize="11" fontWeight="500">
                {activeChartTab === 'revenue' ? '₹15k' : '1k'}
              </text>
              <text x={12} y={svgHeight - paddingY + 4} fill="#94A3B8" fontSize="11" fontWeight="500">
                {activeChartTab === 'revenue' ? '₹0' : '0'}
              </text>
            </svg>
          </div>
        </div>

        {/* Subscription distribution Donut */}
        <div className="sa-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 className="sa-card-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>Plan Distribution</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20 }}>Subscription break-down share</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
            <svg width="150" height="150" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#E2E8F0" strokeWidth="4" />
              {/* Enterprise segment: 20% (rose) */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--sa-rose)" strokeWidth="4" 
                strokeDasharray="20 80" strokeDashoffset="25" className="sa-donut-segment" />
              {/* Pro segment: 45% (indigo) */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--sa-indigo)" strokeWidth="4" 
                strokeDasharray="45 55" strokeDashoffset="5" className="sa-donut-segment" />
              {/* Free segment: 35% (amber) */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--sa-amber)" strokeWidth="4" 
                strokeDasharray="35 65" strokeDashoffset="60" className="sa-donut-segment" />
              
              <text x="50%" y="49%" dominantBaseline="middle" textAnchor="middle" fontSize="5" fontWeight="800" fill="#0F172A">
                Qualia
              </text>
              <text x="50%" y="61%" dominantBaseline="middle" textAnchor="middle" fontSize="3" fontWeight="600" fill="#94A3B8">
                SAAS
              </text>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="sa-donut-label">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="sa-donut-indicator" style={{ background: 'var(--sa-indigo)' }} />
                <span>Premium Pro</span>
              </div>
              <span style={{ fontWeight: 700 }}>45%</span>
            </div>
            <div className="sa-donut-label">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="sa-donut-indicator" style={{ background: 'var(--sa-rose)' }} />
                <span>Enterprise</span>
              </div>
              <span style={{ fontWeight: 700 }}>20%</span>
            </div>
            <div className="sa-donut-label" style={{ borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="sa-donut-indicator" style={{ background: 'var(--sa-amber)' }} />
                <span>Free Trial</span>
              </div>
              <span style={{ fontWeight: 700 }}>35%</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Main Operations Split: Recent Orgs vs Alerts ── */}
      <section className="sa-grid-2-3">
        {/* Redesigned recent organizations list inside a proper table card container */}
        <div className="sa-card sa-table-card">
          <div className="sa-table-header">
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>Recent Organizations</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Newly onboarded platform tenants</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/super-admin/organizations')} style={{ borderRadius: 8 }}>
              Manage All
            </button>
          </div>

          <div className="sa-table-wrapper">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Subscription</th>
                  <th>Status</th>
                  <th>AI Quota Used</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recentOrgs.map(org => {
                  const planId = org.subscription?.planId || 'free';
                  const usageRatio = org.aiUsage ? (org.aiUsage.currentUsage / org.aiUsage.monthlyLimit) : 0;
                  const percent = Math.min(100, Math.round(usageRatio * 100));
                  
                  return (
                    <tr key={org.id} className="sa-row-hover">
                      <td>
                        <div className="sa-org-cell">
                          <div className="sa-avatar-logo" style={{ 
                            background: planId === 'enterprise' 
                              ? 'linear-gradient(135deg, var(--sa-rose) 0%, #FDA4AF 100%)' 
                              : planId === 'pro' 
                                ? 'linear-gradient(135deg, var(--sa-indigo) 0%, #C7D2FE 100%)'
                                : 'linear-gradient(135deg, var(--sa-amber) 0%, #FDE047 100%)'
                          }}>
                            {org.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="sa-org-name">{org.name}</p>
                            <p className="sa-org-domain">{org.domain}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${planId === 'free' ? 'secondary' : 'primary'}`}>
                          {planId.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className={`sa-status-pill ${org.subscription?.status === 'active' ? 'sa-status-active' : 'sa-status-suspended'}`}>
                          <span className="sa-pulse-dot" />
                          {org.subscription?.status === 'active' ? 'Active' : 'Suspended'}
                        </div>
                      </td>
                      <td>
                        <div className="sa-usage-bar-wrapper">
                          <div className="sa-usage-bar-track">
                            <div 
                              className="sa-usage-bar-fill" 
                              style={{ 
                                width: `${percent}%`,
                                background: percent > 80 
                                  ? 'var(--sa-rose)' 
                                  : percent > 50 
                                    ? 'var(--sa-amber)' 
                                    : 'var(--sa-indigo)'
                              }} 
                            />
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                            {org.aiUsage?.currentUsage} / {org.aiUsage?.monthlyLimit} ({percent}%)
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 28 }}>
                        <button className="sa-btn-action" onClick={() => navigate('/super-admin/organizations')} title="Edit details">
                          <ExternalLink size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic platform alert timeline feed */}
        <div className="sa-card">
          <div className="sa-card-header" style={{ marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>System Alerts & Activity</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Crucial platform notifications</p>
            </div>
            <ShieldAlert size={18} style={{ color: 'var(--sa-rose)' }} />
          </div>

          <div className="sa-alerts-list">
            <div className="sa-alert-item">
              <div className="sa-alert-icon" style={{ background: 'rgba(244, 63, 94, 0.08)', color: 'var(--sa-rose)' }}>
                <BrainCircuit size={16} />
              </div>
              <div className="sa-alert-info">
                <h4 className="sa-alert-title">High AI Consumption warning</h4>
                <p className="sa-alert-desc">Infosys workspace has consumed 92% of their standard monthly AI token quota.</p>
                <span className="sa-alert-time">5 minutes ago</span>
              </div>
            </div>

            <div className="sa-alert-item">
              <div className="sa-alert-icon" style={{ background: 'rgba(245, 158, 11, 0.08)', color: 'var(--sa-amber)' }}>
                <CreditCard size={16} />
              </div>
              <div className="sa-alert-info">
                <h4 className="sa-alert-title">Subscription Renewal failed</h4>
                <p className="sa-alert-desc">Razorpay API reported a payment charge failure for "Startup Lab XYZ" (Pro Plan).</p>
                <span className="sa-alert-time">42 minutes ago</span>
              </div>
            </div>

            <div className="sa-alert-item">
              <div className="sa-alert-icon" style={{ background: 'rgba(16, 185, 129, 0.08)', color: 'var(--sa-emerald)' }}>
                <Building2 size={16} />
              </div>
              <div className="sa-alert-info">
                <h4 className="sa-alert-title">New Tenant onboarding</h4>
                <p className="sa-alert-desc">Wipro Solutions registered on the Free Trial tier and created 3 new active QA workflows.</p>
                <span className="sa-alert-time">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
