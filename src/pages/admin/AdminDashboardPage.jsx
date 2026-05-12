import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Code2, TestTube2, Crown, Bug, FolderOpen,
  TrendingUp, ShieldCheck, Activity, ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminTopbar from '../../components/AdminTopbar';
import { fetchAllUsers } from '../../services/teamService';
import { getAllBugs } from '../../services/firestoreService';
import { getProjects } from '../../services/firestoreService';

export default function AdminDashboardPage() {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [u, b, p] = await Promise.all([fetchAllUsers(), getAllBugs(), getProjects()]);
        setUsers(u.filter((x) => x.isActive !== false));
        setBugs(b);
        setProjects(p);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalMembers = users.length;
  const totalAdmins = users.filter((u) => u.role === 'Admin').length;
  const totalDevs = users.filter((u) => u.role === 'Developer').length;
  const totalQA = users.filter((u) => u.role === 'QA').length;

  const openBugs = bugs.filter((b) => b.status === 'Open').length;
  const activeBugs = bugs.filter((b) => ['Open', 'In Progress', 'Reopened'].includes(b.status)).length;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const stats = [
    { label: 'Total Members', value: totalMembers, icon: Users, color: 'var(--admin-accent)', bg: 'rgba(91,108,255,0.1)', link: '/admin/team' },
    { label: 'Developers', value: totalDevs, icon: Code2, color: 'var(--info)', bg: 'var(--info-light)', link: '/admin/team' },
    { label: 'QA Engineers', value: totalQA, icon: TestTube2, color: 'var(--success)', bg: 'var(--success-light)', link: '/admin/team' },
    { label: 'Active Bugs', value: activeBugs, icon: Bug, color: 'var(--warning)', bg: 'var(--warning-light)', link: null },
    { label: 'Projects', value: projects.length, icon: FolderOpen, color: '#0EA5E9', bg: 'rgba(14,165,233,0.1)', link: '/admin/projects' },
    { label: 'Admins', value: totalAdmins, icon: Crown, color: '#5B6CFF', bg: 'rgba(91,108,255,0.1)', link: '/admin/team' },
  ];

  const recentUsers = [...users].slice(0, 5);

  return (
    <>
      <AdminTopbar 
        title="Admin Overview" 
        subtitle={`${greeting}, ${currentUser?.displayName?.split(' ')[0] || 'Admin'} 👋 — Here's your organization overview.`}
      />
      <div className="page-container" style={{ padding: '40px', maxWidth: '1600px', margin: '0 auto', paddingTop: 24 }}>

        {/* ── Stats Grid Redesigned ── */}
        <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
          {stats.map(({ label, value, icon: Icon, color, bg, link }) => (
            <motion.div
              key={label}
              whileHover={{ y: -8, boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
              className={`admin-stat-card ${link ? 'admin-stat-card--link' : ''}`}
              onClick={() => link && navigate(link)}
              style={{ 
                background: 'var(--bg-card)', padding: '24px', borderRadius: 28, border: '1px solid var(--border-light)',
                display: 'flex', alignItems: 'center', gap: 20, cursor: link ? 'pointer' : 'default', transition: 'all 0.3s'
              }}
            >
              <div style={{ 
                width: 56, height: 56, borderRadius: 16, background: bg, 
                color: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 8px 16px ${color}15`
              }}>
                <Icon size={24} />
              </div>
              <div style={{ flex: 1 }}>
                {loading
                  ? <div className="skeleton" style={{ width: 48, height: 32, borderRadius: 6, marginBottom: 4 }} />
                  : <p style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>{value}</p>
                }
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</p>
              </div>
              {link && <ArrowRight size={16} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />}
            </motion.div>
          ))}
        </div>

        {/* ── Bottom Row ── */}
        <div className="admin-bottom-grid">
          {/* Recent Members */}
          <div className="card admin-recent-card">
            <div className="admin-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Activity size={16} style={{ color: 'var(--admin-accent)' }} />
                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Recent Members</h3>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/team')}>
                View all <ArrowRight size={12} />
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton" style={{ height: 60, borderRadius: 16 }} />
                ))}
              </div>
            ) : (
              <div className="admin-member-list" style={{ padding: '0 24px 24px' }}>
                {recentUsers.map((u) => {
                  const initials = (u.name || u.email || '?').slice(0, 2).toUpperCase();
                  const roleColors = { Admin: 'var(--admin-accent)', Developer: '#3b82f6', QA: '#10b981' };
                  return (
                    <motion.div 
                      key={u.id} 
                      whileHover={{ x: 4, background: 'var(--bg-primary)' }}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: 16, padding: '12px', 
                        borderRadius: 16, transition: 'all 0.2s', cursor: 'pointer' 
                      }}
                      onClick={() => navigate('/admin/team')}
                    >
                      <div style={{ 
                        width: 44, height: 44, borderRadius: 12, 
                        background: roleColors[u.role] || 'var(--text-muted)', 
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                      }}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0 }}>{u.name || u.email.split('@')[0]}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>{u.email}</p>
                      </div>
                      <span style={{ 
                        fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: 8,
                        background: `${roleColors[u.role]}15`, color: roleColors[u.role], textTransform: 'uppercase'
                      }}>
                        {u.role}
                      </span>
                    </motion.div>
                  );
                })}
                {recentUsers.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No members yet
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Role Distribution */}
          <div className="card admin-dist-card">
            <div className="admin-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TrendingUp size={16} style={{ color: 'var(--admin-accent)' }} />
                <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Role Distribution</h3>
              </div>
            </div>
            <div className="admin-dist-list">
              {[
                { label: 'Administrators', count: totalAdmins, color: '#5B6CFF', icon: Crown },
                { label: 'Developers', count: totalDevs, color: 'var(--info)', icon: Code2 },
                { label: 'QA Engineers', count: totalQA, color: 'var(--success)', icon: TestTube2 },
              ].map(({ label, count, color, icon: Icon }) => {
                const pct = totalMembers > 0 ? Math.round((count / totalMembers) * 100) : 0;
                return (
                  <div key={label} className="admin-dist-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <Icon size={14} style={{ color }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.85rem', fontWeight: 700, color }}>{count}</span>
                    </div>
                    <div className="admin-dist-bar-bg">
                      <div
                        className="admin-dist-bar-fill"
                        style={{ width: loading ? '0%' : `${pct}%`, background: color }}
                      />
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{pct}% of team</p>
                  </div>
                );
              })}
            </div>

            <button
              className="btn btn-primary btn-sm"
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
              onClick={() => navigate('/admin/team')}
            >
              <Users size={14} />
              Manage Team
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
