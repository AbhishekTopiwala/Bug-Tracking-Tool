import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Code2, TestTube2, Bug, FolderOpen,
  TrendingUp, Activity, ArrowLeft, AlertCircle,
  CheckCircle2, Clock, Calendar, Shield,
  ChevronRight, ExternalLink, Filter, Search,
  AlertTriangle, CheckCircle, Info, Loader2, Link, Copy,
  Printer, FileSpreadsheet, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AdminTopbar from '../../components/AdminTopbar';
import { getAllBugs, getProjects, updateProject, getUsers } from '../../services/firestoreService';
import { fetchAllUsers } from '../../services/teamService';
import { toast } from 'react-hot-toast';
import { formatSafeDate } from '../../utils/dateUtils';


const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export default function ProjectOverviewPage() {
  const { projectId } = useParams();
  const { userProfile } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pList, bList, uList] = await Promise.all([
          getProjects(),
          getAllBugs(),
          fetchAllUsers()
        ]);

        const found = pList.find(p => p.id === projectId || p.name === projectId);
        setProject(found);

        if (found) {
          const projectBugs = bList.filter(b => b.projectId === found.id || b.projectName === found.name);
          setBugs(projectBugs);

          const projectUsers = uList.filter(u => found.assignedUsers?.includes(u.id));
          setAllUsers(projectUsers);
        }
      } catch (err) {
        console.error("Failed to load project data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [projectId]);

  const handleExportCSV = () => {
    if (!bugs || bugs.length === 0) {
      toast.error("No bug data available to export.");
      return;
    }
    const headers = ["Bug Key", "Title", "Priority", "Status", "Reporter", "Assignee", "Created Date"];
    const rows = bugs.map(bug => [
      bug.bugKey || 'N/A',
      bug.title || '',
      bug.priority || 'N/A',
      bug.status || 'N/A',
      bug.reportedByName || 'N/A',
      bug.assigneeName || 'Unassigned',
      formatSafeDate(bug.createdAt)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${project.name.replace(/\s+/g, '_')}_Quality_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV Report downloaded!");
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Popup blocked! Please allow popups to print the report.");
      return;
    }

    const bugRows = bugs.map(bug => `
      <tr>
        <td>${bug.bugKey || 'N/A'}</td>
        <td class="title-cell">${bug.title || ''}</td>
        <td><span class="badge badge-${(bug.priority || 'low').toLowerCase()}">${bug.priority || 'N/A'}</span></td>
        <td><span class="badge badge-${(bug.status || 'open').toLowerCase().replace(/\s+/g, '')}">${bug.status || 'N/A'}</span></td>
        <td>${bug.reportedByName || 'N/A'}</td>
        <td>${bug.assigneeName || 'Unassigned'}</td>
        <td>${formatSafeDate(bug.createdAt)}</td>
      </tr>
    `).join('');

    const statsContent = `
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total Reported</h3>
          <div class="value">${stats.total}</div>
        </div>
        <div class="stat-card">
          <h3>Active Issues</h3>
          <div class="value warning">${stats.active}</div>
        </div>
        <div class="stat-card">
          <h3>Resolved Issues</h3>
          <div class="value success">${stats.resolved}</div>
        </div>
        <div class="stat-card">
          <h3>Resolution Rate</h3>
          <div class="value info">${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%</div>
        </div>
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>${project.name} - Quality & Audit Report</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.5;
            }
            .header {
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 24px;
              margin-bottom: 32px;
            }
            .title {
              font-size: 28px;
              font-weight: 800;
              color: #0f172a;
              margin: 0 0 8px 0;
            }
            .subtitle {
              font-size: 14px;
              color: #64748b;
              margin: 0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-top: 16px;
              font-size: 13px;
              color: #475569;
            }
            .meta-item strong {
              color: #0f172a;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              margin-bottom: 40px;
            }
            .stat-card {
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              background: #f8fafc;
            }
            .stat-card h3 {
              margin: 0 0 8px 0;
              font-size: 12px;
              text-transform: uppercase;
              color: #64748b;
              letter-spacing: 0.05em;
            }
            .stat-card .value {
              font-size: 32px;
              font-weight: 800;
              color: #0f172a;
            }
            .stat-card .value.success { color: #10b981; }
            .stat-card .value.warning { color: #f59e0b; }
            .stat-card .value.info { color: #6366f1; }
            
            h2 {
              font-size: 18px;
              font-weight: 700;
              margin: 0 0 16px 0;
              color: #0f172a;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            th {
              text-align: left;
              padding: 12px 16px;
              background: #f1f5f9;
              font-size: 11px;
              text-transform: uppercase;
              color: #475569;
              font-weight: 700;
              border-bottom: 2px solid #cbd5e1;
            }
            td {
              padding: 12px 16px;
              font-size: 13px;
              border-bottom: 1px solid #e2e8f0;
            }
            .title-cell {
              font-weight: 600;
              color: #0f172a;
            }
            .badge {
              display: inline-block;
              padding: 4px 8px;
              font-size: 10px;
              font-weight: 700;
              border-radius: 6px;
              text-transform: uppercase;
            }
            .badge-critical { background: #fee2e2; color: #991b1b; }
            .badge-high { background: #ffedd5; color: #9a3412; }
            .badge-medium { background: #fef9c3; color: #854d0e; }
            .badge-low { background: #f0fdf4; color: #166534; }
            
            .badge-open { background: #fee2e2; color: #991b1b; }
            .badge-inprogress { background: #fef3c7; color: #92400e; }
            .badge-resolved { background: #d1fae5; color: #065f46; }
            .badge-done { background: #d1fae5; color: #065f46; }
            
            @media print {
              body { margin: 20px; }
              .stat-card { background: none !important; border: 1px solid #cbd5e1 !important; }
              th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .badge { border: 1px solid #cbd5e1; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${project.name}</h1>
            <p class="subtitle">Quality Status, Bug Audit & Verification Report</p>
            <div class="meta-grid">
              <div class="meta-item">Report Generated: <strong>${new Date().toLocaleString()}</strong></div>
              <div class="meta-item">Created Date: <strong>${formatSafeDate(project.createdAt)}</strong></div>
              <div class="meta-item">Generated By: <strong>${userProfile?.displayName || userProfile?.email || 'Administrator'}</strong></div>
            </div>
          </div>
          
          ${statsContent}
          
          <h2>Bug Audit Logs</h2>
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reporter</th>
                <th>Assignee</th>
                <th>Date Reported</th>
              </tr>
            </thead>
            <tbody>
              ${bugRows || '<tr><td colspan="7" style="text-align: center; color: #64748b;">No active bugs reported.</td></tr>'}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };




  // Removed handleToggleUser and saveAssignments as they are now on the dedicated page

  // Filtered members used for display in the sidebar/team list card

  const stats = useMemo(() => {
    const total = bugs.length;
    const open = bugs.filter(b => b.status === 'Open').length;
    const inProgress = bugs.filter(b => b.status === 'In Progress').length;
    const resolved = bugs.filter(b => b.status === 'Resolved' || b.status === 'Done').length;
    const critical = bugs.filter(b => b.priority === 'Critical').length;
    const high = bugs.filter(b => b.priority === 'High').length;

    const active = total - resolved;

    return { total, open, inProgress, resolved, critical, high, active };
  }, [bugs]);

  const statusDistribution = useMemo(() => {
    const counts = {
      'Open': bugs.filter(b => b.status === 'Open').length,
      'In Progress': bugs.filter(b => b.status === 'In Progress').length,
      'Reproduced': bugs.filter(b => b.status === 'Reproduced').length,
      'Reopen': bugs.filter(b => b.status === 'Reopen').length,
      'Resolved': bugs.filter(b => b.status === 'Resolved').length,
      'Done': bugs.filter(b => b.status === 'Done').length,
    };
    return counts;
  }, [bugs]);

  if (loading) {
    return (
      <div className="admin-layout">
        <AdminTopbar title="Loading Project..." />
        <div className="page-content" style={{ padding: 40 }}>
          <div className="skeleton" style={{ height: 120, borderRadius: 16, marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="admin-layout">
        <AdminTopbar title="Project Not Found" />
        <div className="page-content" style={{ padding: 40, textAlign: 'center' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ padding: 60, maxWidth: 600, margin: '40px auto' }}>
            <div style={{ width: 80, height: 80, background: 'var(--bg-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <FolderOpen size={40} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>Project Missing</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>We couldn't find the project you're looking for. It might have been deleted or the URL is incorrect.</p>
            <button className="btn btn-primary" onClick={() => navigate('/admin/projects')} style={{ borderRadius: 12, padding: '10px 20px', fontWeight: 600, gap: 8, display: 'flex', alignItems: 'center', margin: '0 auto' }}>
              <ArrowLeft size={16} /> Back to Projects
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const mainStats = [
    { label: 'Total Bugs', value: stats.total, icon: Bug, color: 'var(--admin-accent)', desc: 'Cumulative reports' },
    { label: 'Active Issues', value: stats.active, icon: Activity, color: 'var(--warning)', desc: 'Needs attention' },
    { label: 'Critical', value: stats.critical, icon: AlertTriangle, color: 'var(--danger)', desc: 'Immediate action' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'var(--success)', desc: 'Verified fixes' },
  ];

  return (
    <div className="admin-layout">
      <AdminTopbar 
        title={project.name} 
        subtitle={project.description || "Project workspace and quality tracking dashboard."}
      />

      <motion.div
        className="page-content overview-page-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Premium Header Section */}
        <motion.div variants={itemVariants} style={{ marginBottom: 40 }}>
          <div className="overview-header-wrap">
            <div className="overview-header-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Calendar size={16} />
                <span style={{ fontWeight: 600 }}>Started {formatSafeDate(project.createdAt, { month: 'long', year: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Users size={16} />
                <span style={{ fontWeight: 600 }}>{allUsers.length} Team Members</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Shield size={16} />
                <span style={{ fontWeight: 600 }}>{project.type || 'Standard'} Security</span>
              </div>
            </div>
            
            <div className="overview-header-actions">
              <button 
                className="btn"
                onClick={() => navigate('/admin/projects')}
                style={{ 
                  background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', 
                  fontWeight: 600, padding: '10px 20px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              >
                <ArrowLeft size={16} /> Back to Projects
              </button>
              <button 
                className="btn" 
                onClick={() => navigate(`/admin/bugs?project=${encodeURIComponent(project.name)}`)}
                style={{ 
                  background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', 
                  fontWeight: 700, padding: '12px 24px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              >
                <Activity size={18} />
                Kanban View
              </button>
              <button 
                className="btn" 
                onClick={() => navigate(`/admin/projects/${project.id}/team`)}
                style={{ 
                  background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', 
                  fontWeight: 700, padding: '12px 24px', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              >
                <Users size={18} />
                Manage Team
              </button>
            </div >
          </div >
        </motion.div >

  {/* Stats Row - Minimalist Design */ }
  < div className = "overview-stats-grid" >
  {
    mainStats.map((stat, idx) => (
      <motion.div
        key={idx}
        variants={itemVariants}
        whileHover={{ y: -4 }}
        style={{
          background: 'var(--bg-card)', padding: '20px', borderRadius: 20, border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 12, boxShadow: 'var(--shadow-sm)',
          position: 'relative', overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `${stat.color}05`, borderRadius: '0 0 0 80px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ padding: 10, background: `${stat.color}15`, borderRadius: 12, color: stat.color }}>
            <stat.icon size={20} />
          </div>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</span>
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{stat.value}</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{stat.desc}</p>
        </div>
      </motion.div>
    ))
  }
        </div >

  <div className="overview-layout-grid">

    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Status Distribution Visualization */}
      <motion.div variants={itemVariants} className="card overview-card-responsive">
        <div className="admin-card-header" style={{ border: 'none', padding: 0, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <TrendingUp size={20} style={{ color: 'var(--admin-accent)' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Bug Status Distribution</h3>
          </div>
        </div>

        <div className="overview-distribution-grid">
          <div className="overview-distribution-bars">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(statusDistribution).map(([status, count]) => (
                <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600 }}>{status}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{count} bugs ({stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%)</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      style={{
                        height: '100%',
                        background: status === 'Open' ? 'var(--info)' :
                          status === 'In Progress' ? 'var(--warning)' :
                            status === 'Done' ? 'var(--success)' : 'var(--admin-accent)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'var(--bg-primary)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', border: '8px solid var(--admin-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 900 }}>{stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%</span>
            </div>
            <h4 style={{ margin: '0 0 4px 0' }}>Efficiency Score</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bug resolution rate for this project</p>
          </div>
        </div>
      </motion.div>

      {/* Recent Bugs Table */}
      <motion.div variants={itemVariants} className="card">
        <div className="admin-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity size={20} style={{ color: 'var(--admin-accent)' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Activity Log</h3>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/bugs?project=${encodeURIComponent(project.name)}`)}>
            View All Bugs <ChevronRight size={14} />
          </button>
        </div>

        <div className="overview-table-container">
          <table className="overview-activity-table">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '16px 16px 16px 0', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', width: '50%' }}>Bug Info</th>
                <th style={{ textAlign: 'left', padding: '16px 16px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', width: '20%' }}>Priority</th>
                <th style={{ textAlign: 'left', padding: '16px 16px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', width: '20%' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '16px 0 16px 16px', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', width: '10%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {bugs.slice(0, 6).map((bug, i) => (
                <tr key={bug.id} style={{ borderBottom: i === bugs.slice(0, 6).length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                  <td style={{ padding: '16px 16px 16px 0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{bug.title}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bug.bugKey} • Reported {formatSafeDate(bug.createdAt)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 16px' }}>
                    <span className={`badge badge-${bug.priority?.toLowerCase() || 'low'}`} style={{ fontSize: '0.65rem' }}>
                      {bug.priority}
                    </span>
                  </td>
                  <td style={{ padding: '16px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: bug.status === 'Done' ? 'var(--success)' : bug.status === 'Open' ? 'var(--danger)' : 'var(--warning)' }} />
                      {bug.status}
                    </div>
                  </td>
                  <td style={{ padding: '16px 0 16px 16px', textAlign: 'right' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '4px 8px' }}
                      onClick={() => navigate(`/qa/bugs/${bug.id}`)}
                    >
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {bugs.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: 60, textAlign: 'center' }}>
                    <Info size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 12 }} />
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>No activity recorded yet for this project.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Team Members Panel */}
      <motion.div variants={itemVariants} className="card" style={{ height: 'fit-content' }}>
        <div className="admin-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={18} style={{ color: 'var(--admin-accent)' }} />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Project Team</h3>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--admin-accent)' }}>{allUsers.length}</span>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {allUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12, transition: 'background 0.2s' }} className="hover-bg">
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'var(--admin-accent-light)',
                  color: 'var(--admin-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  border: '2px solid white',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {(u.displayName || u.email).slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.displayName || u.email}</p>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>{u.role}</p>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} title="Online" />
              </div>
            ))}
            {allUsers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No members assigned</p>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/projects/${project.id}/team`)}>Manage Team</button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Quick Actions Panel - Modern Glass */}
      <motion.div variants={itemVariants} className="overview-quick-actions-card">
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 200, height: 200, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
        <h3 style={{ margin: '0 0 24px 0', fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Project Control</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn"
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', textAlign: 'left', padding: '16px', borderRadius: 16,
              display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, transition: 'all 0.2s'
            }}
            onClick={() => navigate(`/admin/projects/${project.id}/team`)}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <Users size={18} /> Manage Team Access
          </button>
          <button
            className="btn"
            style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'white', textAlign: 'left', padding: '16px', borderRadius: 16,
              display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, transition: 'all 0.2s'
            }}
            onClick={() => navigate('/admin/bugs')}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <Search size={18} /> Audit All Issues
          </button>

          <button
            className="btn"
            onClick={() => setShowReportModal(true)}
            style={{
              background: 'var(--admin-accent)', border: 'none',
              color: 'white', textAlign: 'center', padding: '16px', borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontWeight: 800, marginTop: 8,
              boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
            }}
          >
            <TrendingUp size={18} /> Generate Full Report
          </button>
        </div>
      </motion.div>

    </div>

  </div>

{/* Team Management Modal removed in favor of dedicated page */ }

      </motion.div >

  <AnimatePresence>
    {showReportModal && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 24,
        }}
        onClick={() => setShowReportModal(false)}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          style={{
            background: 'var(--bg-card)',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            borderRadius: '24px',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{
            padding: '24px 32px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--bg-primary)'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Project Quality Audit Report</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Executive overview and bug logging analysis for <strong>{project.name}</strong>
              </p>
            </div>
            <button
              className="btn btn-ghost"
              style={{ padding: 8, borderRadius: '50%', color: 'var(--text-muted)' }}
              onClick={() => setShowReportModal(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Body */}
          <div style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Meta details */}
            <div className="report-modal-meta">
              <div>Report Generated: <strong style={{ color: 'var(--text-primary)' }}>{new Date().toLocaleString()}</strong></div>
              <div>Created Date: <strong style={{ color: 'var(--text-primary)' }}>{formatSafeDate(project.createdAt)}</strong></div>
              <div>Generated By: <strong style={{ color: 'var(--text-primary)' }}>{userProfile?.displayName || userProfile?.email || 'Admin'}</strong></div>
            </div>

            {/* Stats Grid */}
            <div className="report-modal-stats">
              {[
                { label: 'Total Bugs', value: stats.total, color: 'var(--admin-accent)' },
                { label: 'Active Issues', value: stats.active, color: 'var(--warning)' },
                { label: 'Resolved Issues', value: stats.resolved, color: 'var(--success)' },
                { label: 'Resolution Rate', value: `${stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%`, color: 'var(--info)' }
              ].map((s, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-primary)',
                  padding: 16,
                  borderRadius: 16,
                  textAlign: 'center',
                  border: '1px solid var(--border-light)'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Bug summary table preview */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700 }}>Bugs Audit Logs ({bugs.length})</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 1 }}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Key</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Title</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Priority</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700 }}>Reporter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bugs.map((bug, i) => (
                      <tr key={bug.id} style={{ borderBottom: i === bugs.length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--admin-accent)' }}>{bug.bugKey || 'N/A'}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{bug.title}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge badge-${bug.priority?.toLowerCase() || 'low'}`} style={{ fontSize: '0.65rem' }}>
                            {bug.priority}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span className={`badge badge-${bug.status?.toLowerCase().replace(/\s+/g, '') || 'open'}`} style={{ fontSize: '0.65rem' }}>
                            {bug.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{bug.reportedByName || 'N/A'}</td>
                      </tr>
                    ))}
                    {bugs.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No bugs logged for this project yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '20px 32px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            background: 'var(--bg-primary)'
          }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowReportModal(false)}
              style={{ borderRadius: 12 }}
            >
              Close
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportCSV}
              style={{ borderRadius: 12, gap: 8, display: 'flex', alignItems: 'center' }}
            >
              <FileSpreadsheet size={16} /> Export CSV
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePrintReport}
              style={{ borderRadius: 12, gap: 8, display: 'flex', alignItems: 'center' }}
            >
              <Printer size={16} /> Print / PDF Report
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
    </div >
  );
}
