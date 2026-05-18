import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bug, CheckCircle2, Clock, AlertTriangle,
  Folder, ArrowRight, Activity, MessageSquare,
  GitPullRequest, Zap, TrendingUp, Users
} from 'lucide-react';
import Topbar from '../components/Topbar';
import { subscribeToBugs, getProjects, subscribeToNotifications } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

const PRIORITY_COLOR = {
  Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
  High:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  Medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  Low:      { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
};

const STATUS_COLOR = {
  Open:         { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'In Progress':{ color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  Done:         { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Resolved:     { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  Reopen:       { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  Reproduced:   { color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
};

function ProjectHealthCard({ project, bugs, onClick }) {
  const projectBugs = bugs.filter(b => b.projectId === project.id);
  const total = projectBugs.length;
  const resolved = projectBugs.filter(b => ['Done', 'Resolved'].includes(b.status)).length;
  const open = projectBugs.filter(b => b.status === 'Open').length;
  const inProgress = projectBugs.filter(b => b.status === 'In Progress').length;
  const critical = projectBugs.filter(b => b.priority === 'Critical' && !['Done','Resolved'].includes(b.status)).length;
  const progress = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const healthColor = progress >= 80 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.12)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Folder size={16} style={{ color: '#6366f1' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{project.name}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{total} bugs total</div>
          </div>
        </div>
        <ArrowRight size={15} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 4 }} />
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Resolution Progress</span>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: healthColor }}>{progress}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${healthColor}, ${healthColor}cc)`,
            borderRadius: 99,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: 'rgba(59,130,246,0.06)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#3b82f6' }}>{open}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Open</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(245,158,11,0.06)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>{inProgress}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active</div>
        </div>
        <div style={{ flex: 1, background: 'rgba(16,185,129,0.06)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>{resolved}</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Done</div>
        </div>
        {critical > 0 && (
          <div style={{ flex: 1, background: 'rgba(239,68,68,0.06)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{critical}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Critical</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SingleProjectDashboardView({ project, bugs, navigate }) {
  const projectBugs = bugs.filter(b => b.projectId === project.id);
  const total = projectBugs.length;
  const resolved = projectBugs.filter(b => ['Done', 'Resolved'].includes(b.status)).length;
  const open = projectBugs.filter(b => b.status === 'Open').length;
  const inProgress = projectBugs.filter(b => b.status === 'In Progress').length;
  const critical = projectBugs.filter(b => b.priority === 'Critical' && !['Done','Resolved'].includes(b.status)).length;
  const progress = total > 0 ? Math.round((resolved / total) * 100) : 0;
  
  const high = projectBugs.filter(b => b.priority === 'High' && !['Done','Resolved'].includes(b.status)).length;
  const medium = projectBugs.filter(b => b.priority === 'Medium' && !['Done','Resolved'].includes(b.status)).length;
  const low = projectBugs.filter(b => b.priority === 'Low' && !['Done','Resolved'].includes(b.status)).length;

  const healthColor = progress >= 80 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444';
  const healthStatus = progress >= 80 ? 'Healthy' : progress >= 50 ? 'Needs Attention' : 'Critical State';

  // Get top 3 urgent active bugs (Critical or High priority first)
  const urgentBugs = [...projectBugs]
    .filter(b => !['Done', 'Resolved'].includes(b.status))
    .sort((a, b) => {
      const weight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      const weightA = weight[a.priority] || 0;
      const weightB = weight[b.priority] || 0;
      if (weightA !== weightB) return weightB - weightA;
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    })
    .slice(0, 3);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(99, 102, 241, 0.03) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: 24,
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
        e.currentTarget.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.02)';
      }}
    >
      {/* Decorative background glow */}
      <div style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifycontent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)',
            flexShrink: 0,
          }}>
            <Folder size={22} style={{ color: '#6366f1', margin: 'auto' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)', lineHeight: 1 }}>{project.name}</span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: healthColor,
                background: `${healthColor}12`,
                padding: '3px 8px',
                borderRadius: 99,
                border: `1px solid ${healthColor}25`
              }}>
                {healthStatus}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Active Project Console • <strong>{total}</strong> bugs tracked
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/qa/bugs/new?project=${encodeURIComponent(project.name)}`)}
            style={{
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.25)'; }}
          >
            <Bug size={14} /> Report Bug
          </button>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate(`/qa/bugs?project=${encodeURIComponent(project.name)}`)}
            style={{
              padding: '8px 14px',
              fontSize: '0.78rem',
              fontWeight: 600,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            View Board <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Internal Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, alignItems: 'stretch' }}>
        
        {/* Left Column - Metrics and Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Progress Bar Container */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light, rgba(0,0,0,0.04))', borderRadius: 14, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Overall Resolution Progress</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: healthColor }}>{progress}%</span>
            </div>
            <div style={{ height: 8, background: 'rgba(0,0,0,0.05)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${healthColor} 0%, ${healthColor}cc 100%)`,
                borderRadius: 99,
                transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              <strong>{resolved}</strong> out of <strong>{total}</strong> issues resolved. Let's get this to 100%!
            </p>
          </div>

          {/* Status Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>{open}</div>
              <div style={{ fontSize: '0.68rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>Open</div>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', lineHeight: 1 }}>{inProgress}</div>
              <div style={{ fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>Active</div>
            </div>
            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{resolved}</div>
              <div style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>Done</div>
            </div>
          </div>

          {/* Priority Quick View Banner */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Unresolved:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' }}>
              {critical > 0 && (
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', borderRadius: 6 }}>
                  {critical} Critical
                </span>
              )}
              {high > 0 && (
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '2px 6px', borderRadius: 6 }}>
                  {high} High
                </span>
              )}
              {medium > 0 && (
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 6 }}>
                  {medium} Med
                </span>
              )}
              {low > 0 && (
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', background: 'rgba(148,163,184,0.1)', padding: '2px 6px', borderRadius: 6 }}>
                  {low} Low
                </span>
              )}
              {critical === 0 && high === 0 && medium === 0 && low === 0 && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: 6 }}>
                  No Unresolved Bugs! ✨
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Actionable Urgent Bugs List */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-light, rgba(0,0,0,0.04))', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Activity size={14} style={{ color: '#6366f1' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>Action Needed</span>
          </div>

          {urgentBugs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', margin: 'auto' }}>
              <CheckCircle2 size={24} style={{ color: '#10b981', opacity: 0.6, marginBottom: 8, display: 'inline-block' }} />
              <p style={{ fontSize: '0.78rem', margin: 0, fontWeight: 600 }}>All clean!</p>
              <p style={{ fontSize: '0.7rem', margin: '2px 0 0', opacity: 0.7 }}>No active unresolved bugs found.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'center' }}>
              {urgentBugs.map(bug => {
                const pc = PRIORITY_COLOR[bug.priority] || PRIORITY_COLOR.Medium;
                const sc = STATUS_COLOR[bug.status] || STATUS_COLOR.Open;
                return (
                  <div
                    key={bug.id}
                    onClick={() => navigate(`/qa/bugs/${bug.id}`)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {bug.bugKey}
                        </span>
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          color: pc.color,
                          background: pc.bg,
                          padding: '1px 4px',
                          borderRadius: 4
                        }}>
                          {bug.priority}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {bug.title}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: sc.color,
                      background: sc.bg,
                      padding: '2px 6px',
                      borderRadius: 4,
                      flexShrink: 0
                    }}>
                      {bug.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function ActivityItem({ notif, navigate }) {
  const timeAgo = notif.createdAt?.seconds
    ? formatDistanceToNow(new Date(notif.createdAt.seconds * 1000), { addSuffix: true })
    : 'just now';

  const icon = notif.type === 'status_change'
    ? <GitPullRequest size={13} style={{ color: '#6366f1' }} />
    : notif.type === 'comment'
    ? <MessageSquare size={13} style={{ color: '#f59e0b' }} />
    : <Activity size={13} style={{ color: '#10b981' }} />;

  const iconBg = notif.type === 'status_change'
    ? 'rgba(99,102,241,0.08)'
    : notif.type === 'comment'
    ? 'rgba(245,158,11,0.08)'
    : 'rgba(16,185,129,0.08)';

  return (
    <div 
      onClick={() => notif.bugId && navigate(`/qa/bugs/${notif.bugId}`)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '12px 10px',
        borderRadius: 12,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        cursor: notif.bugId ? 'pointer' : 'default',
        background: !notif.read ? 'rgba(99, 102, 241, 0.02)' : 'transparent',
      }}
      onMouseEnter={e => {
        if (notif.bugId) {
          e.currentTarget.style.background = 'var(--bg-secondary)';
          e.currentTarget.style.transform = 'translateX(4px)';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = !notif.read ? 'rgba(99, 102, 241, 0.02)' : 'transparent';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <div style={{
        width: 30, 
        height: 30, 
        borderRadius: '50%',
        background: iconBg,
        border: '3px solid var(--bg-card)', 
        boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        flexShrink: 0, 
        marginTop: 1,
        position: 'relative',
        zIndex: 2,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="activity-message"
          style={{ 
            fontSize: '0.8rem', 
            color: 'var(--text-secondary)', 
            lineHeight: 1.45,
          }}
          dangerouslySetInnerHTML={{ __html: notif.message }}
        />
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{timeAgo}</span>
          {!notif.read && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#6366f1' }} />
              <span style={{ color: '#6366f1', fontWeight: 700 }}>New</span>
            </>
          )}
        </div>
      </div>
      {!notif.read && (
        <div style={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%', 
          background: '#6366f1', 
          boxShadow: '0 0 8px rgba(99, 102, 241, 0.6)',
          flexShrink: 0, 
          marginTop: 12,
          position: 'relative',
          zIndex: 2,
        }} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [bugs, setBugs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userProfile) return;
    const unsub = subscribeToBugs((data) => {
      setBugs(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userProfile]);

  useEffect(() => {
    if (!currentUser || !userProfile) return;
    setProjectsLoading(true);
    getProjects(currentUser.uid, userProfile.role)
      .then(setProjects)
      .finally(() => setProjectsLoading(false));
  }, [currentUser, userProfile?.role]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, (notifs) => {
      setNotifications(notifs.slice(0, 15));
    });
    return () => unsub();
  }, [currentUser]);

  const myBugs = useMemo(() => {
    const myProjectIds = projects.map(p => p.id);
    const isAdmin = ['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role);
    if (isAdmin) return bugs;
    return bugs.filter(b => myProjectIds.includes(b.projectId));
  }, [bugs, projects, userProfile?.role]);

  const stats = useMemo(() => ({
    total: myBugs.length,
    open: myBugs.filter(b => b.status === 'Open').length,
    inProgress: myBugs.filter(b => b.status === 'In Progress').length,
    resolved: myBugs.filter(b => ['Done', 'Resolved'].includes(b.status)).length,
    critical: myBugs.filter(b => b.priority === 'Critical' && !['Done','Resolved'].includes(b.status)).length,
  }), [myBugs]);

  // Needs verification: bugs reporter by me that are Done/Resolved
  const needsVerification = useMemo(() =>
    myBugs.filter(b => b.reportedBy === currentUser?.uid && ['Done', 'Resolved'].includes(b.status)).slice(0, 4),
    [myBugs, currentUser]
  );

  const firstName = userProfile?.displayName?.split(' ')[0] || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    { label: 'Total Bugs', value: stats.total, icon: Bug, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Open', value: stats.open, icon: AlertTriangle, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  ];

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle={`${greeting}, ${firstName} 👋 — Here's your QA pipeline summary`}
      />
      <div className="page-container" style={{ paddingTop: 24, paddingBottom: 40 }}>

        {/* Stats Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 28 }}>
          {statCards.map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-icon" style={{ background: s.bg }}>
                <s.icon size={20} color={s.color} />
              </div>
              <div className="stat-info">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Main 2-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

          {/* LEFT — Project Health Cards */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>My Projects</h2>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>Health overview across all your assigned projects</p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/qa/projects')}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            {projectsLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16 }} />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="empty-state" style={{ padding: '48px 24px' }}>
                <Folder size={48} style={{ opacity: 0.3 }} />
                <h3 style={{ fontSize: '1rem' }}>No projects assigned</h3>
                <p style={{ fontSize: '0.85rem' }}>Ask your Admin to add you to a project.</p>
              </div>
            ) : projects.length === 1 ? (
              <SingleProjectDashboardView
                project={projects[0]}
                bugs={myBugs}
                navigate={navigate}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
                {projects.map(project => (
                  <ProjectHealthCard
                    key={project.id}
                    project={project}
                    bugs={myBugs}
                    onClick={() => navigate(`/qa/bugs?project=${encodeURIComponent(project.name)}`)}
                  />
                ))}
              </div>
            )}

            {/* Needs Verification Section */}
            {needsVerification.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Needs Your Verification</h2>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>Bugs you reported that developers marked as resolved</p>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {needsVerification.map(bug => {
                    const pc = PRIORITY_COLOR[bug.priority] || PRIORITY_COLOR.Medium;
                    const sc = STATUS_COLOR[bug.status] || {};
                    return (
                      <div
                        key={bug.id}
                        onClick={() => navigate(`/qa/bugs/${bug.id}`)}
                        style={{
                          background: 'var(--bg-card)', border: '1px solid var(--border)',
                          borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.transform = 'translateX(3px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: 3 }}>{bug.bugKey}</div>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bug.title}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pc.color, background: pc.bg, padding: '3px 8px', borderRadius: 6 }}>{bug.priority}</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: sc.color, background: sc.bg, padding: '3px 8px', borderRadius: 6 }}>{bug.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Live Activity Feed */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 20,
            position: 'sticky',
            top: 100,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={16} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>Live Activity</h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>Real-time updates on your bugs</p>
              </div>
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={{
                  marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 700,
                  background: '#6366f1', color: '#fff',
                  padding: '2px 8px', borderRadius: 99,
                }}>
                  {notifications.filter(n => !n.read).length} new
                </span>
              )}
            </div>

            {notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                <Zap size={32} style={{ opacity: 0.25, marginBottom: 10 }} />
                <p style={{ fontSize: '0.82rem', margin: 0 }}>No activity yet.</p>
                <p style={{ fontSize: '0.75rem', margin: '4px 0 0', opacity: 0.7 }}>Updates will appear here when Devs act on your bugs.</p>
              </div>
            ) : (
              <div style={{ 
                maxHeight: 520, 
                overflowY: 'auto', 
                marginRight: -4, 
                paddingRight: 4,
                position: 'relative',
              }}>
                {/* Timeline vertical connector track */}
                <div style={{
                  position: 'absolute',
                  left: 23, // center of 30px icon with 10px list padding + 15px half-width
                  top: 16,
                  bottom: 16,
                  width: 2,
                  background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.02) 100%)',
                  pointerEvents: 'none',
                }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {notifications.slice(0, 2).map(n => (
                    <ActivityItem 
                      key={n.id} 
                      notif={n} 
                      navigate={navigate} 
                    />
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => navigate('/qa/notifications')}
              style={{
                width: '100%', marginTop: 16, padding: '9px 0',
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: 10, cursor: 'pointer', fontSize: '0.8rem',
                fontWeight: 600, color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#6366f1';
                e.currentTarget.style.color = '#6366f1';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.06)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              View All Notifications <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
