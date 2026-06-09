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
import { SkeletonDashboard } from '../../components/Skeleton';

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
  const [systemAlerts, setSystemAlerts] = useState([]);

  const navigate = useNavigate();

  // Fetch Stats Data
  const fetchPlatformStats = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const orgsSnap = await getDocs(collection(db, 'organizations'));
      const orgs = orgsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const totalOrgs = orgs.length;
      const activeSubs = orgs.filter(o => {
        const s = o.subscription?.status?.toLowerCase();
        return s === 'active' || s === 'trial';
      }).length;
      const totalAI = orgs.reduce((acc, o) => acc + (o.aiUsage?.currentUsage || 0), 0);

      const planCounts = {
        enterprise: 0,
        pro: 0,
        free: 0
      };

      // Mock revenue calculation
      const revenue = orgs.reduce((acc, o) => {
        const plan = (o.subscription?.plan || o.subscription?.planId || 'free').toLowerCase();

        // Count plans for distribution chart
        if (plan === 'enterprise') planCounts.enterprise++;
        else if (plan === 'pro' || plan === 'business') planCounts.pro++;
        else planCounts.free++;

        const status = o.subscription?.status?.toLowerCase() || 'inactive';
        if (status === 'active') {
          const users = o.memberCount || 1;
          if (plan === 'pro') return acc + (99 * users);
          if (plan === 'business') return acc + (199 * users);
          if (plan === 'enterprise') return acc + 9999;
        }
        return acc;
      }, 0);

      setStats({
        totalOrgs,
        totalRevenue: revenue,
        totalAIUsage: totalAI,
        activeSubscriptions: activeSubs,
        planCounts
      });

      // Fetch recent organizations
      const q = query(collection(db, 'organizations'), orderBy('createdAt', 'desc'), limit(5));
      const recentSnap = await getDocs(q);
      setRecentOrgs(recentSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Generate Dynamic System Alerts based on real organization data
      const alerts = [];
      const now = new Date();

      orgs.forEach(org => {
        // 1. High AI Usage Alert
        if (org.aiUsage?.currentUsage && org.aiUsage?.monthlyLimit) {
          const ratio = org.aiUsage.currentUsage / org.aiUsage.monthlyLimit;
          if (ratio >= 0.85) {
            alerts.push({
              id: `ai-${org.id}`,
              type: 'warning',
              icon: 'BrainCircuit',
              title: 'High AI Consumption warning',
              desc: `${org.name || 'An organization'} has consumed ${Math.round(ratio * 100)}% of their standard monthly AI token quota.`,
              time: 'Just now',
              weight: 3
            });
          }
        }

        // 2. Subscription Issues
        const subStatus = org.subscription?.status?.toLowerCase();
        if (subStatus === 'suspended' || subStatus === 'past_due' || subStatus === 'canceled') {
          alerts.push({
            id: `sub-${org.id}`,
            type: 'danger',
            icon: 'CreditCard',
            title: 'Subscription issue detected',
            desc: `Payment or subscription issue for "${org.name || 'Organization'}" (${org.subscription?.plan || 'Unknown'} Plan). Status: ${subStatus}.`,
            time: 'Action Required',
            weight: 4
          });
        }

        // 3. New Tenants (created within last 7 days)
        if (org.createdAt) {
          const createdDate = org.createdAt?.toDate ? org.createdAt.toDate() : new Date(org.createdAt);
          const diffDays = (now - createdDate) / (1000 * 60 * 60 * 24);
          if (diffDays < 7) {
            let timeStr = 'Recently';
            if (diffDays < 1) timeStr = `${Math.max(1, Math.floor(diffDays * 24))} hours ago`;
            else timeStr = `${Math.floor(diffDays)} days ago`;

            alerts.push({
              id: `new-${org.id}`,
              type: 'success',
              icon: 'Building2',
              title: 'New Tenant onboarding',
              desc: `${org.name || 'A new tenant'} registered on the ${org.subscription?.plan || 'Free'} tier.`,
              time: timeStr,
              weight: 1,
              dateObj: createdDate
            });
          }
        }
      });

      // Sort alerts: High priority first, then by date for new tenants
      alerts.sort((a, b) => {
        if (b.weight !== a.weight) return b.weight - a.weight;
        if (a.dateObj && b.dateObj) return b.dateObj - a.dateObj;
        return 0;
      });

      // Ensure we always have some activity to show if there are no dynamic alerts
      if (alerts.length === 0) {
        alerts.push({
          id: 'system-ok',
          type: 'success',
          icon: 'ShieldAlert',
          title: 'System Optimal',
          desc: 'All organizations are operating within regular usage limits and subscription parameters.',
          time: 'Current'
        });
      }

      setSystemAlerts(alerts.slice(0, 4));

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
    return <SkeletonDashboard />;
  }

  // Generate dynamic dates and values based on real current stats
  const generateDynamicChartData = () => {
    const revenueData = [];
    const aiData = [];

    const today = new Date();
    // Provide a small base value so the chart isn't completely flat if stats are 0
    const currentRevenue = stats.totalRevenue || 5000;
    const currentAI = stats.totalAIUsage || 1000;

    // Seed variance so it looks consistent on re-renders, but grows towards the current value
    const varianceFactors = [0.45, 0.52, 0.48, 0.65, 0.80, 0.75, 1.0];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const revVal = Math.round(currentRevenue * varianceFactors[6 - i]);
      const aiVal = Math.round(currentAI * varianceFactors[6 - i]);

      revenueData.push({
        label,
        val: revVal,
        display: `₹${revVal.toLocaleString()}`
      });

      aiData.push({
        label,
        val: aiVal,
        display: `${aiVal.toLocaleString()} tokens`
      });
    }

    return { revenue: revenueData, ai: aiData };
  };

  const chartData = generateDynamicChartData();

  const activePoints = chartData[activeChartTab];
  const rawMax = Math.max(...activePoints.map(p => p.val));
  const rawMin = Math.min(...activePoints.map(p => p.val));
  const maxVal = (rawMax === 0 ? 10 : rawMax) * 1.15;
  const minVal = rawMin * 0.85;

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
    const y = svgHeight - paddingY - ((p.val - minVal) / (maxVal - minVal || 1)) * chartHeight;
    return { x, y, ...p };
  });

  const formatYAxis = (val, isRevenue) => {
    if (val === 0) return isRevenue ? '₹0' : '0';
    if (val >= 1000) return (isRevenue ? '₹' : '') + (val / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return (isRevenue ? '₹' : '') + Math.round(val);
  };

  const linePath = pointsCoords.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const areaPath = `${linePath} L ${pointsCoords[pointsCoords.length - 1].x} ${svgHeight - paddingY} L ${pointsCoords[0].x} ${svgHeight - paddingY} Z`;

  // System status pulse details
  const infrastructureServices = [
    { name: 'Core API Gateway', status: 'operational', uptime: '99.98%', ping: '42ms' },
    { name: 'Cloud Firestore DB', status: 'operational', uptime: '100%', ping: '18ms' },
    { name: 'Gemini AI Integration', status: 'operational', uptime: '99.95%', ping: '148ms' }
  ];

  // Calculate dynamic plan distribution percentages
  const totalPlans = stats.totalOrgs || 1; // prevent div by zero
  const enterprisePct = stats.totalOrgs > 0 ? Math.round(((stats.planCounts?.enterprise || 0) / totalPlans) * 100) : 20;
  const proPct = stats.totalOrgs > 0 ? Math.round(((stats.planCounts?.pro || 0) / totalPlans) * 100) : 45;
  const freePct = stats.totalOrgs > 0 ? (100 - enterprisePct - proPct) : 35;

  const enterpriseDash = `${enterprisePct} ${100 - enterprisePct}`;
  const proDash = `${proPct} ${100 - proPct}`;
  const freeDash = `${freePct} ${100 - freePct}`;

  const enterpriseOffset = 25;
  const proOffset = 100 - enterprisePct + 25;
  const freeOffset = 100 - enterprisePct - proPct + 25;

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
                {formatYAxis(maxVal, activeChartTab === 'revenue')}
              </text>
              <text x={12} y={paddingY + chartHeight / 2 + 4} fill="#94A3B8" fontSize="11" fontWeight="500">
                {formatYAxis((maxVal + minVal) / 2, activeChartTab === 'revenue')}
              </text>
              <text x={12} y={svgHeight - paddingY + 4} fill="#94A3B8" fontSize="11" fontWeight="500">
                {formatYAxis(minVal, activeChartTab === 'revenue')}
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
              {/* Enterprise segment */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--sa-rose)" strokeWidth="4"
                strokeDasharray={enterpriseDash} strokeDashoffset={enterpriseOffset} className="sa-donut-segment" />
              {/* Pro segment */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--sa-indigo)" strokeWidth="4"
                strokeDasharray={proDash} strokeDashoffset={proOffset} className="sa-donut-segment" />
              {/* Free segment */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--sa-amber)" strokeWidth="4"
                strokeDasharray={freeDash} strokeDashoffset={freeOffset} className="sa-donut-segment" />

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
              <span style={{ fontWeight: 700 }}>{proPct}%</span>
            </div>
            <div className="sa-donut-label">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="sa-donut-indicator" style={{ background: 'var(--sa-rose)' }} />
                <span>Enterprise</span>
              </div>
              <span style={{ fontWeight: 700 }}>{enterprisePct}%</span>
            </div>
            <div className="sa-donut-label" style={{ borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="sa-donut-indicator" style={{ background: 'var(--sa-amber)' }} />
                <span>Free Trial</span>
              </div>
              <span style={{ fontWeight: 700 }}>{freePct}%</span>
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
                  const planId = org.subscription?.plan || org.subscription?.planId || 'free';
                  const usageRatio = org.aiUsage ? (org.aiUsage.currentUsage / org.aiUsage.monthlyLimit) : 0;
                  const percent = Math.min(100, Math.round(usageRatio * 100));

                  return (
                    <tr key={org.id} className="sa-row-hover">
                      <td>
                        <div className="sa-org-cell">
                          <div className="sa-avatar-logo" style={{
                            background: planId === 'enterprise'
                              ? 'linear-gradient(135deg, var(--sa-rose) 0%, #FDA4AF 100%)'
                              : planId === 'business' || planId === 'pro'
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
                        <div className={`sa-status-pill ${(org.subscription?.status || '').toLowerCase() === 'active' ? 'sa-status-active' : 'sa-status-suspended'}`}>
                          {(org.subscription?.status || '').toLowerCase() === 'active' ? 'Active' : 'Suspended'}
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
            {systemAlerts.map(alert => {
              // Determine styles based on alert type
              let bg = 'rgba(226, 232, 240, 0.5)';
              let color = 'var(--text-secondary)';

              if (alert.type === 'danger') {
                bg = 'rgba(244, 63, 94, 0.08)';
                color = 'var(--sa-rose)';
              } else if (alert.type === 'warning') {
                bg = 'rgba(245, 158, 11, 0.08)';
                color = 'var(--sa-amber)';
              } else if (alert.type === 'success') {
                bg = 'rgba(16, 185, 129, 0.08)';
                color = 'var(--sa-emerald)';
              }

              return (
                <div key={alert.id} className="sa-alert-item">
                  <div className="sa-alert-icon" style={{ background: bg, color: color }}>
                    {alert.icon === 'BrainCircuit' && <BrainCircuit size={16} />}
                    {alert.icon === 'CreditCard' && <CreditCard size={16} />}
                    {alert.icon === 'Building2' && <Building2 size={16} />}
                    {alert.icon === 'ShieldAlert' && <ShieldAlert size={16} />}
                  </div>
                  <div className="sa-alert-info">
                    <h4 className="sa-alert-title">{alert.title}</h4>
                    <p className="sa-alert-desc">{alert.desc}</p>
                    <span className="sa-alert-time">{alert.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
