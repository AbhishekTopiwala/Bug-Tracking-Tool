import { useState, useEffect } from 'react';
import {
  FileText, Search, UserPlus, UserX, Settings, Shield,
  FolderKanban, Trash2, Activity, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgAuditLogs } from '../../services/orgService';

const ACTION_CONFIG = {
  INVITE_ADMIN: { icon: UserPlus, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: 'Invited Admin' },
  UPDATE_ADMIN: { icon: Settings, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', label: 'Updated Admin' },
  DEACTIVATE_ADMIN: { icon: UserX, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', label: 'Deactivated Admin' },
  ACTIVATE_ADMIN: { icon: RefreshCw, color: '#10B981', bg: 'rgba(16,185,129,0.08)', label: 'Activated Admin' },
  REMOVE_ADMIN: { icon: Trash2, color: '#EF4444', bg: 'rgba(239,68,68,0.08)', label: 'Removed Admin' },
  ARCHIVE_PROJECT: { icon: FolderKanban, color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', label: 'Archived Project' },
  TRANSFER_PROJECT: { icon: FolderKanban, color: '#6366F1', bg: 'rgba(99,102,241,0.08)', label: 'Transferred Project' },
  UPDATE_SETTINGS: { icon: Settings, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: 'Updated Settings' },
};

export default function OrgAuditLogsPage() {
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const data = await getOrgAuditLogs(userProfile?.organizationId);
        setLogs(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    if (userProfile?.organizationId) load();
  }, [userProfile?.organizationId]);

  const filtered = logs.filter(log => {
    const matchSearch = !search ||
      (log.actorName || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.targetName || '').toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === 'all' || log.action === filterAction;
    return matchSearch && matchAction;
  });

  return (
    <div className="org-container">
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title">
            <FileText size={24} style={{ color: 'var(--org-purple)' }} /> Audit Logs
          </h1>
          <p className="org-page-subtitle">Track all administrative actions within your organization.</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input type="text" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 42, paddingLeft: 42, border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10, fontSize: '0.88rem', background: '#fff', outline: 'none' }} />
        </div>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          style={{ height: 42, padding: '0 32px 0 14px', border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10, fontSize: '0.85rem', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Actions</option>
          {Object.entries(ACTION_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Logs List */}
      <div className="org-card">
        <div className="org-card-header">
          <h3 className="org-card-title">
            <Activity size={16} style={{ color: 'var(--org-purple)' }} />
            Activity Timeline
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
            {filtered.length} events
          </span>
        </div>
        <div className="org-card-body" style={{ padding: '8px 24px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 10 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8' }}>
              <FileText size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>No audit logs found</p>
              <p style={{ fontSize: '0.8rem' }}>Actions will appear here as they occur.</p>
            </div>
          ) : (
            filtered.map(log => {
              const config = ACTION_CONFIG[log.action] || {
                icon: Activity, color: '#64748B', bg: 'rgba(100,116,139,0.08)', label: log.action
              };
              const Icon = config.icon;
              const timeStr = log.timestamp instanceof Date
                ? log.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Unknown';

              return (
                <div key={log.id} className="org-audit-item">
                  <div className="org-audit-icon" style={{ background: config.bg, color: config.color }}>
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0F172A', margin: 0 }}>
                      {config.label}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '2px 0 0', lineHeight: 1.4 }}>
                      <strong>{log.actorName}</strong> performed action on <strong>{log.targetName}</strong>
                    </p>
                    <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '4px 0 0', fontWeight: 500 }}>
                      {timeStr}
                    </p>
                  </div>
                  <span style={{
                    padding: '3px 8px', borderRadius: 6, fontSize: '0.65rem',
                    fontWeight: 700, textTransform: 'uppercase', background: config.bg, color: config.color,
                    alignSelf: 'flex-start', marginTop: 2
                  }}>
                    {log.targetType}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
