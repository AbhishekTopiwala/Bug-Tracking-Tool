import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Paperclip, Edit3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';


export default function BugCard({ bug }) {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

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
  };

  return (
    <article
      className="bug-card-premium"
      onClick={() => navigate(`/qa/bugs/${bug.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/qa/bugs/${bug.id}`)}
    >
      <div className="bug-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {canEdit && (
            <button 
              className="card-edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/qa/bugs/${bug.id}/edit`);
              }}
              title="Edit Bug"
            >
              <Edit3 size={12} />
            </button>
          )}
          <div className={`priority-tag priority-${bug.priority?.toLowerCase() || 'medium'}`}>
            {bug.priority || 'Medium'}
          </div>
        </div>
      </div>

      <h3 className="bug-card-title-premium">{bug.title}</h3>

      {bug.description && (
        <p className="bug-card-desc-premium">{bug.description}</p>
      )}

      {/* Tags */}
      {bug.tags && bug.tags.length > 0 && (
        <div className="bug-card-tags">
          {bug.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="minimal-tag">{tag}</span>
          ))}
        </div>
      )}

      <div className="bug-card-footer-premium">
        <div className="bug-card-meta-premium">
          {bug.assigneeName ? (
            <div className="bug-card-assignee-pill">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(bug.assigneeName)}&background=6366f1&color=fff&size=32`}
                alt={bug.assigneeName}
                className="assignee-avatar-sm"
              />
              <span>{bug.assigneeName}</span>
            </div>
          ) : (
            <div className="unassigned-pill">Unassigned</div>
          )}
          
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            {bug.comments?.length > 0 && (
              <div className="meta-icon-group">
                <MessageSquare size={14} />
                <span>{bug.comments.length}</span>
              </div>
            )}
            {bug.attachments?.length > 0 && (
              <div className="meta-icon-group">
                <Paperclip size={14} />
                <span>{bug.attachments.length}</span>
              </div>
            )}
          </div>
        </div>
        <div className="bug-card-bottom-row">
          <span className="bug-card-status-text">{bug.status}</span>
          <span className="bug-card-time-text">{timeAgo}</span>
        </div>
      </div>
    </article>
  );
}
