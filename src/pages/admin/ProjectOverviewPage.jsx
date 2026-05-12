import { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Code2, TestTube2, Bug, FolderOpen,
  TrendingUp, Activity, ArrowLeft, AlertCircle,
  CheckCircle2, Clock, Calendar, Shield,
  ChevronRight, ExternalLink, Filter, Search,
  AlertTriangle, CheckCircle, Info, Loader2, Link, Copy, Share2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AdminTopbar from '../../components/AdminTopbar';
import { getAllBugs, getProjects, updateProject, getUsers } from '../../services/firestoreService';
import { fetchAllUsers } from '../../services/teamService';
import { toast } from 'react-hot-toast';

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

  const handleCopyPublicLink = () => {
    const url = `${window.location.origin}/public/${project.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Public status link copied to clipboard!');
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
        className="page-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ padding: '40px 60px', maxWidth: '1600px', margin: '0 auto' }}
      >
        {/* Premium Header Section */}
        <motion.div variants={itemVariants} style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Calendar size={16} />
                <span style={{ fontWeight: 600 }}>Started {project.createdAt ? new Date(project.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'N/A'}</span>
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
            
            <div style={{ display: 'flex', gap: 12, paddingBottom: 8 }}>
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
            </div>
          </div>
        </motion.div>

        {/* Stats Row - Minimalist Design */}
        <div className="admin-stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 40 }}>
          {mainStats.map((stat, idx) => (
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
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Status Distribution Visualization */}
            <motion.div variants={itemVariants} className="card" style={{ padding: 32 }}>
              <div className="admin-card-header" style={{ border: 'none', padding: 0, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <TrendingUp size={20} style={{ color: 'var(--admin-accent)' }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Bug Status Distribution</h3>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
                <div style={{ gridColumn: 'span 2' }}>
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

              <div style={{ padding: '0 24px 24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '16px 0', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bug Info</th>
                      <th style={{ textAlign: 'left', padding: '16px 0', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priority</th>
                      <th style={{ textAlign: 'left', padding: '16px 0', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '16px 0', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bugs.slice(0, 6).map((bug, i) => (
                      <tr key={bug.id} style={{ borderBottom: i === bugs.slice(0, 6).length - 1 ? 'none' : '1px solid var(--border-light)' }}>
                        <td style={{ padding: '16px 0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{bug.title}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bug.bugKey} • Reported {new Date(bug.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td style={{ padding: '16px 0' }}>
                          <span className={`badge badge-${bug.priority?.toLowerCase() || 'low'}`} style={{ fontSize: '0.65rem' }}>
                            {bug.priority}
                          </span>
                        </td>
                        <td style={{ padding: '16px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', fontWeight: 600 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: bug.status === 'Done' ? 'var(--success)' : bug.status === 'Open' ? 'var(--danger)' : 'var(--warning)' }} />
                            {bug.status}
                          </div>
                        </td>
                        <td style={{ padding: '16px 0', textAlign: 'right' }}>
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
            <motion.div variants={itemVariants} style={{ 
              padding: 32, borderRadius: 24, 
              background: 'linear-gradient(135deg, #1e1b4b, #312e81)', 
              color: 'white', position: 'relative', overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(30, 27, 75, 0.2)'
            }}>
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
                  style={{ 
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', 
                    color: 'white', textAlign: 'left', padding: '16px', borderRadius: 16,
                    display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, transition: 'all 0.2s'
                  }}
                  onClick={handleCopyPublicLink}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                >
                  <Share2 size={18} /> Share Public Status
                </button>
                <button
                  className="btn"
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

        {/* Team Management Modal removed in favor of dedicated page */}

      </motion.div>
    </div>
  );
}
