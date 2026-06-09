import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Search, Filter, RefreshCw, Shield,
  UserPlus, UserX, UserCheck, Trash2, Settings, FolderKanban,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgAuditLogs } from '../../services/orgService';

const ACTION_META = {
  INVITE_ADMIN:    { label: 'Admin Invited',          icon: UserPlus,   color: '#3B82F6' },
  DEACTIVATE_ADMIN:{ label: 'Admin Deactivated',      icon: UserX,      color: '#F59E0B' },
  ACTIVATE_ADMIN:  { label: 'Admin Activated',        icon: UserCheck,  color: '#10B981' },
  REMOVE_ADMIN:    { label: 'Admin Removed',          icon: Trash2,     color: '#EF4444' },
  UPDATE_ADMIN:    { label: 'Admin Updated',          icon: Shield,     color: '#8B5CF6' },
  UPDATE_SETTINGS: { label: 'Settings Updated',       icon: Settings,   color: '#7C3AED' },
  ARCHIVE_PROJECT: { label: 'Project Archived',       icon: FolderKanban, color: '#94A3B8' },
  TRANSFER_PROJECT:{ label: 'Project Transferred',    icon: FolderKanban, color: '#6366F1' },
};

function timeAgo(date) {
  if (!date) return '—';
  const now = Date.now();
  const diff = now - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function OrgAuditLogsPage() {
  const { userProfile } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    if (!userProfile?.organizationId) return;
    try {
      const data = await getOrgAuditLogs(userProfile.organizationId);
      setLogs(data);
    } catch (e) {
      console.error('[OrgAuditLogs]', e);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.organizationId]);

  useEffect(() => {
    if (userProfile?.organizationId) load();
  }, [userProfile?.organizationId, load]);

  const filtered = logs.filter(log => {
    const matchSearch = !search || [log.actorName, log.actorEmail, log.targetName, log.action]
      .some(v => (v || '').toLowerCase().includes(search.toLowerCase()));
    const matchAction = filterAction === 'all' || log.action === filterAction;
    return matchSearch && matchAction;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const uniqueActions = [...new Set(logs.map(l => l.action))];

  return (
    <div className="org-container">
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title"><ClipboardList size={24} style={{ color: 'var(--org-purple)' }} /> Audit Logs</h1>
          <p className="org-page-subtitle">Track all administrative actions and configuration changes.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>{logs.length} total events</span>
          <button className="org-btn-secondary" onClick={load} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input type="text" placeholder="Search by actor, action, target..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: '100%', height: 42, paddingLeft: 42, border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10, fontSize: '0.88rem', background: '#fff', outline: 'none' }} />
        </div>
        <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          style={{ height: 42, padding: '0 32px 0 14px', border: '1px solid rgba(226,232,240,0.8)', borderRadius: 10, fontSize: '0.85rem', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="all">All Actions</option>
          {uniqueActions.map(a => (
            <option key={a} value={a}>{ACTION_META[a]?.label || a}</option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      <div className="org-card" style={{ padding: 0 }}>
        <table className="org-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Actor</th>
              <th>Target</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i}>
                  {[1, 2, 3, 4].map(j => <td key={j}><div className="skeleton" style={{ height: 18, borderRadius: 4, width: j === 1 ? 140 : 80 }} /></td>)}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 56, color: '#94A3B8' }}>
                <ClipboardList size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>
                  {logs.length === 0 ? 'No audit events yet' : 'No logs match your filters'}
                </p>
                <p style={{ fontSize: '0.8rem', margin: '4px 0 0' }}>
                  {logs.length === 0 ? 'Actions like inviting admins or archiving projects will appear here.' : 'Try adjusting your search or filter.'}
                </p>
              </td></tr>
            ) : (
              paginated.map(log => {
                const meta = ACTION_META[log.action] || { label: log.action, icon: Shield, color: '#64748B' };
                const Icon = meta.icon;
                return (
                  <tr key={log.id}>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '5px 10px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700,
                        background: `${meta.color}10`, color: meta.color, border: `1px solid ${meta.color}20`,
                        whiteSpace: 'nowrap',
                      }}>
                        <Icon size={11} /> {meta.label}
                      </span>
                    </td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', margin: 0 }}>{log.actorName || '—'}</p>
                        {log.actorEmail && <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '1px 0 0' }}>{log.actorEmail}</p>}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#334155', margin: 0 }}>{log.targetName || '—'}</p>
                        {log.targetType && <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '1px 0 0', textTransform: 'capitalize' }}>{log.targetType}</p>}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.82rem', color: '#334155', margin: 0 }}>{timeAgo(log.timestamp)}</p>
                        <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '1px 0 0' }}>
                          {log.timestamp ? log.timestamp.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid rgba(226,232,240,0.6)', background: 'rgba(248,250,252,0.6)', borderRadius: '0 0 18px 18px' }}>
            <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600 }}>
              Page {page} of {totalPages} · {filtered.length} events
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid rgba(226,232,240,0.8)', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, fontWeight: 600, fontSize: '0.82rem', color: '#334155' }}>
                Next
              </button>
            </div>
          </div>
        )}
        {filtered.length <= PAGE_SIZE && (
          <div style={{ padding: '12px 20px', background: 'rgba(248,250,252,0.6)', borderTop: '1px solid rgba(226,232,240,0.6)', fontSize: '0.78rem', color: '#94A3B8', borderRadius: '0 0 18px 18px' }}>
            Showing {paginated.length} of {filtered.length} events
          </div>
        )}
      </div>
    </div>
  );
}
