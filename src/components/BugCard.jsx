import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Paperclip, Edit3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function BugCard({ bug, hideStatus = false }) {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const basePath = userProfile?.role === 'Admin' ? '/admin' : userProfile?.role === 'Developer' ? '/dev' : '/qa';

  const timeAgo = bug.createdAt?.seconds
    ? formatDistanceToNow(new Date(bug.createdAt.seconds * 1000), { addSuffix: true })
    : 'Recently';

  const bugKey = bug.bugKey || (bug.id?.slice(-6).toUpperCase() || 'BUG');

  const canEdit = userProfile?.role === 'Admin' || bug.reportedBy === currentUser?.uid;

  // Map status to glow colors
  const statusGlow = {
    Open: '#6366f1',
    'In Progress': '#f59e0b',
    Done: '#10b981',
    Resolved: '#8aaad4',
    Reopened: '#ef4444',
    Reopen: '#ef4444',
    Reproduced: '#ec4899',
  };

  return (
    <article
      className="bug-card-premium"
      onClick={() => navigate(`${basePath}/bugs/${bug.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`${basePath}/bugs/${bug.id}`)}
    >
      <div className="bug-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: '1 1 auto' }}>
          <div 
            className="status-dot-glow" 
            style={{ 
              backgroundColor: statusGlow[bug.status] || '#6366f1',
              boxShadow: `0 0 8px ${statusGlow[bug.status] || '#6366f1'}80`
            }} 
          />
          <span className="bug-card-id-text">#{bugKey}</span>
          {bug.projectName && (
            <span className="bug-card-project-pill" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bug.projectName}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {canEdit && (
            <button 
              className="card-edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`${basePath}/bugs/${bug.id}/edit`);
              }}
              title="Edit Bug"
            >
              <Edit3 size={11} />
            </button>
          )}
          <div className={`priority-tag priority-${bug.priority?.toLowerCase() || 'medium'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
            {bug.priority || 'Medium'}
          </div>
        </div>
      </div>

      <h3 className="bug-card-title-premium">{bug.title}</h3>

      {/* Tags */}
      {bug.tags && bug.tags.length > 0 && (
        <div className="bug-card-tags">
          {bug.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="minimal-tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="bug-card-footer-premium" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8, paddingTop: 6, borderTop: '1px dashed var(--border)' }}>
        {bug.assigneeName ? (
          <div className="bug-card-assignee-pill" style={{ padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(bug.assigneeName)}&background=6366f1&color=fff&size=24`}
              alt={bug.assigneeName}
              className="assignee-avatar-sm"
              style={{ width: 14, height: 14 }}
            />
            <span style={{ fontSize: '0.7rem' }}>{bug.assigneeName}</span>
          </div>
        ) : (
          <div className="unassigned-pill" style={{ fontSize: '0.7rem' }}>Unassigned</div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          {!hideStatus && (
            <span className="bug-card-status-text" style={{ fontSize: '0.65rem', marginRight: 4 }}>
              {bug.status}
            </span>
          )}
          {bug.comments?.length > 0 && (
            <div className="meta-icon-group" style={{ fontSize: '0.68rem', gap: 2 }}>
              <MessageSquare size={12} style={{ opacity: 0.7 }} />
              <span>{bug.comments.length}</span>
            </div>
          )}
          {bug.attachments?.length > 0 && (
            <div className="meta-icon-group" style={{ fontSize: '0.68rem', gap: 2 }}>
              <Paperclip size={12} style={{ opacity: 0.7 }} />
              <span>{bug.attachments.length}</span>
            </div>
          )}
          <span className="bug-card-time-text" style={{ fontSize: '0.65rem', opacity: 0.8 }}>{timeAgo}</span>
        </div>
      </div>
    </article>
  );
}
