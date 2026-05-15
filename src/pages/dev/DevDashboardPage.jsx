import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, Bug, Code2, Zap, Circle,
  ChevronRight, MessageSquare, Plus, Bell, Folder, Star, Activity, ArrowUpRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Topbar from '../../components/Topbar';
import { subscribeToBugs, getProjects } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';

export default function DevDashboardPage() {
  const [allBugs, setAllBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignedProjectIds, setAssignedProjectIds] = useState([]);

  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const unsub = subscribeToBugs((bugs) => {
      setAllBugs(bugs);
      setLoading(false);
    });

    getProjects(currentUser.uid, userProfile?.role).then(projs => {
      setAssignedProjectIds(projs.map(p => p.id));
    });

    return () => unsub();
  }, [currentUser, userProfile]);

  const baseBugs = useMemo(() => {
    // Developers see all bugs in projects they are assigned to
    return allBugs.filter(b => assignedProjectIds.includes(b.projectId));
  }, [allBugs, assignedProjectIds]);

  // Calculations for developer analytics
  const stats = useMemo(() => {
    const active = baseBugs.filter((b) => ['Open', 'In Progress', 'Reopen', 'Reproduced'].includes(b.status)).length;
    const resolved = baseBugs.filter((b) => ['Done', 'Resolved'].includes(b.status)).length;
    const critical = baseBugs.filter((b) => b.priority === 'Critical' && !['Done', 'Resolved'].includes(b.status)).length;
    
    // Quality rating = 100 - (reopen rate)
    const reopenedCount = baseBugs.filter((b) => b.status === 'Reopen').length;
    const totalDoneAndResolved = baseBugs.filter((b) => ['Done', 'Resolved', 'Reopen'].includes(b.status)).length;
    const qualityRate = totalDoneAndResolved > 0 
      ? Math.round(100 - (reopenedCount / totalDoneAndResolved * 100)) 
      : 100;

    return {
      active,
      resolved,
      critical,
      qualityRate
    };
  }, [baseBugs]);

  // Find the single highest priority active bug to display in "Focus Mode"
  const focusBug = useMemo(() => {
    const active = baseBugs.filter(b => ['In Progress', 'Open', 'Reopen', 'Reproduced'].includes(b.status));
    if (active.length === 0) return null;

    const priorityWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    return [...active].sort((a, b) => {
      const weightA = priorityWeight[a.priority] || 2;
      const weightB = priorityWeight[b.priority] || 2;
      if (weightA !== weightB) return weightB - weightA;
      if (a.status === 'In Progress' && b.status !== 'In Progress') return -1;
      if (b.status === 'In Progress' && a.status !== 'In Progress') return 1;
      return 0;
    })[0];
  }, [baseBugs]);

  // Group active bugs by Project for a clean breakdown list
  const projectBreakdown = useMemo(() => {
    const projects = {};
    baseBugs.forEach((bug) => {
      if (!bug.projectName) return;
      if (!projects[bug.projectName]) {
        projects[bug.projectName] = { name: bug.projectName, active: 0, resolved: 0 };
      }
      if (['Done', 'Resolved'].includes(bug.status)) {
        projects[bug.projectName].resolved += 1;
      } else {
        projects[bug.projectName].active += 1;
      }
    });
    return Object.values(projects).slice(0, 3);
  }, [baseBugs]);

  // Compile a live feed of recent comments on developer's assigned bugs
  const recentActivities = useMemo(() => {
    const list = [];
    baseBugs.forEach((bug) => {
      if (bug.comments && Array.isArray(bug.comments)) {
        bug.comments.forEach((c) => {
          list.push({
            id: `${bug.id}-comment-${c.createdAt?.seconds || Math.random()}`,
            bugId: bug.id,
            bugTitle: bug.title,
            bugKey: bug.bugKey || bug.id.slice(-6).toUpperCase(),
            author: c.authorName || 'QA Member',
            text: c.text,
            createdAt: c.createdAt,
            date: c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000) : new Date(),
          });
        });
      }
    });
    return list.sort((a, b) => b.date - a.date).slice(0, 4);
  }, [baseBugs]);

  const firstName = userProfile?.displayName?.split(' ')[0] || 'Developer';

  return (
    <>
      <Topbar 
        title="Developer Dashboard" 
        subtitle={`Welcome back, ${firstName} 👋 — You have ${stats.active} active tickets assigned.`}
      />
      <div className="page-container" style={{ paddingBottom: 40, paddingTop: 24 }}>

        {/* Metrics Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 28
        }}>
          {/* Active Bugs */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{stats.active}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active Tickets</div>
            </div>
          </div>

          {/* Resolved Bugs */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(34,197,94,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{stats.resolved}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resolved All-Time</div>
            </div>
          </div>

          {/* Code Quality Rating */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={18} style={{ color: '#6366f1' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{stats.qualityRate}%</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quality Rating</div>
            </div>
          </div>

          {/* Critical SLA */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{stats.critical}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Critical SLA</div>
            </div>
          </div>
        </div>

        {/* Dashboard 2-Column Content Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 24, alignItems: 'start' }}>
          
          {/* LEFT SIDE: Focus Mode + Projects breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* 🎯 Active Focus Task */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Highlight background glow */}
              <div style={{
                position: 'absolute', top: -40, right: -40, width: 140, height: 140,
                background: 'radial-gradient(circle, var(--dev-accent-light) 0%, transparent 70%)',
                opacity: 0.5, pointerEvents: 'none'
              }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={15} style={{ color: 'var(--dev-accent)' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                    Current Focus Priority
                  </span>
                </div>
                {focusBug && (
                  <span className={`priority-tag priority-${focusBug.priority.toLowerCase()}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                    {focusBug.priority}
                  </span>
                )}
              </div>

              {loading ? (
                <div className="skeleton" style={{ height: 110, borderRadius: 12 }} />
              ) : focusBug ? (
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.4 }}>
                    {focusBug.title}
                  </h3>
                  
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4 }}>
                      #{focusBug.bugKey || focusBug.id.slice(-6).toUpperCase()}
                    </span>
                    {focusBug.projectName && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--dev-accent)', background: 'var(--dev-accent-light)', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                        {focusBug.projectName}
                      </span>
                    )}
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Assigned {focusBug.createdAt?.seconds ? formatDistanceToNow(new Date(focusBug.createdAt.seconds * 1000), { addSuffix: true }) : 'Recently'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/dev/bugs/${focusBug.id}`)}
                      style={{ fontSize: '0.8rem', padding: '10px 18px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      Inspect Bug <ChevronRight size={14} />
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/dev/bugs`)}
                      style={{ fontSize: '0.8rem', padding: '10px 18px', borderRadius: 10 }}
                    >
                      View All Board
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--dev-accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={24} style={{ color: 'var(--dev-accent)' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 4 }}>All Caught Up! 🎉</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 280, margin: '0 auto', lineHeight: 1.5 }}>
                      No active tickets require your focus right now. Go enjoy your clean dashboard!
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 📂 My Assigned Projects Grid */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 24,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Folder size={16} style={{ color: 'var(--dev-accent)' }} /> My Active Projects
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Contributions
                </span>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="skeleton" style={{ height: 50, borderRadius: 10 }} />
                  <div className="skeleton" style={{ height: 50, borderRadius: 10 }} />
                </div>
              ) : projectBreakdown.length === 0 ? (
                <div style={{ padding: '16px 0', textTransform: 'none', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No projects with active assigned bugs found.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {projectBreakdown.map((proj) => (
                    <div
                      key={proj.name}
                      onClick={() => navigate(`/dev/bugs?project=${encodeURIComponent(proj.name)}`)}
                      style={{
                        padding: '12px 16px', background: 'var(--bg-secondary)',
                        borderRadius: 12, border: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--dev-accent)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateX(0px)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--dev-accent)' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{proj.name}</span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#f59e0b' }}>{proj.active}</strong> Active
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: '#22c55e' }}>{proj.resolved}</strong> Resolved
                        </span>
                        <ArrowUpRight size={14} style={{ opacity: 0.4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Action Center + Recent comments timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* ⚡ Quick Action Shortcuts */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 24,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 16 }}>
                ⚡ Workspace Actions
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/dev/notifications')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem' }}
                >
                  <Bell size={15} style={{ color: 'var(--dev-accent)' }} /> View My Alerts
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/dev/projects')}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem' }}
                >
                  <Folder size={15} style={{ color: 'var(--dev-accent)' }} /> All Project Directories
                </button>
              </div>
            </div>

            {/* 💬 Recent Activity Timeline */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              padding: 24,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} style={{ color: 'var(--dev-accent)' }} /> Collaborative Feed
              </h3>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
                  <div className="skeleton" style={{ height: 40, borderRadius: 8 }} />
                </div>
              ) : recentActivities.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No recent comments on your bugs yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                  {recentActivities.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => navigate(`/dev/bugs/${act.bugId}`)}
                      style={{ display: 'flex', gap: 12, cursor: 'pointer', position: 'relative' }}
                    >
                      {/* Avatar / Icon wrapper */}
                      <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={12} style={{ color: 'var(--dev-accent)' }} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {act.author}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {formatDistanceToNow(act.date, { addSuffix: true })}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          💬 "{act.text}"
                        </p>
                        <div style={{ fontSize: '0.68rem', color: 'var(--dev-accent)', fontWeight: 600 }}>
                          #{act.bugKey} · {act.bugTitle}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </>
  );
}
