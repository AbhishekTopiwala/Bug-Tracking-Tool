import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Paperclip, Clock, User,
  CheckCircle2, AlertTriangle, Send, Play, ChevronRight
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Topbar from '../../components/Topbar';
import { getBug, updateBug, addComment, createNotification } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { getValidStatusTransitions } from '../../utils/statusRules';
import toast from 'react-hot-toast';

const STATUS_FLOW = [
  { key: 'Open', label: 'Open', className: 'status-btn-open', emoji: '🔴' },
  { key: 'In Progress', label: 'In Progress', className: 'status-btn-inprogress', emoji: '🟡' },
  { key: 'Done', label: 'Done', className: 'status-btn-done', emoji: '🟢' },
];

const priorityClass = {
  Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high', Critical: 'badge-critical',
};

export default function DevBugDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    getBug(id)
      .then(setBug)
      .catch(() => { toast.error('Bug not found'); navigate('/dev'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === bug.status) return;
    setUpdatingStatus(true);
    try {
      await updateBug(id, { status: newStatus });
      setBug((b) => ({ ...b, status: newStatus }));
      toast.success(`Status updated → ${newStatus}`);

      // Notify the reporter
      if (bug.reportedBy && bug.reportedBy !== currentUser.uid) {
        await createNotification({
          userId: bug.reportedBy,
          bugId: id,
          message: `<strong>${currentUser.displayName}</strong> changed <strong>${bug.title}</strong> to <strong>${newStatus}</strong>`,
          type: 'status_change',
        });
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await addComment(id, {
        text: comment.trim(),
        authorId: currentUser.uid,
        authorName: currentUser.displayName || userProfile?.displayName,
        authorAvatar: userProfile?.avatar,
        role: 'Developer',
      });
      setComment('');
      const updated = await getBug(id);
      setBug(updated);
      toast.success('Comment added');

      if (bug.reportedBy && bug.reportedBy !== currentUser.uid) {
        await createNotification({
          userId: bug.reportedBy,
          bugId: id,
          message: `<strong>${currentUser.displayName}</strong> commented on <strong>${bug.title}</strong>`,
          type: 'comment',
        });
      }
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner spinner-lg" />
      <span>Loading bug...</span>
    </div>
  );

  if (!bug) return null;

  const createdAt = bug.createdAt?.seconds
    ? format(new Date(bug.createdAt.seconds * 1000), 'MMM d, yyyy · h:mm a')
    : 'Unknown';

  return (
    <>
      <Topbar title="Bug Details" />
      {lightbox && (
        <div className="modal-overlay" style={{ zIndex: 2000 }} onClick={() => setLightbox(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            {lightbox.type?.startsWith('video/') ? (
              <video src={lightbox.url} controls autoPlay style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 'var(--radius)' }} />
            ) : (
              <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 'var(--radius)', objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}

      <div className="page-container">
        <button className="btn btn-ghost" onClick={() => navigate('/dev')} style={{ marginBottom: 24 }}>
          <ArrowLeft size={16} /> Back to My Bugs
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
          {/* Main */}
          <div>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span className={`badge ${priorityClass[bug.priority] || 'badge-medium'}`}>{bug.priority}</span>
                {bug.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 8 }}>
                {bug.title}
              </h1>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Clock size={12} /> {createdAt}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><User size={12} /> Reported by {bug.reportedByName}</span>
                <span>#{id.slice(-8).toUpperCase()}</span>
              </div>
            </div>

            {/* ── Status Flow — Hero element for developers ── */}
            <div style={{ marginBottom: 28, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
                Update Status
              </p>
              <div className="status-flow" style={{ flexWrap: 'wrap', gap: 12 }}>
                {STATUS_FLOW.map((s, i) => {
                  const validTransitions = getValidStatusTransitions(bug.status, 'Developer');
                  const isValid = validTransitions.includes(s.key);
                  const isCurrent = bug.status === s.key;
                  
                  return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      className={`status-btn ${s.className} ${isCurrent ? 'active-status' : ''}`}
                      style={{ opacity: (!isValid && !isCurrent) ? 0.5 : 1, cursor: (!isValid && !isCurrent) ? 'not-allowed' : 'pointer' }}
                      onClick={() => {
                        if (isValid) handleStatusChange(s.key);
                      }}
                      disabled={updatingStatus || (!isValid && !isCurrent)}
                    >
                      <span>{s.emoji}</span>
                      {s.label}
                      {isCurrent && <CheckCircle2 size={14} />}
                    </button>
                    {i < STATUS_FLOW.length - 1 && (
                      <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  );
                })}
              </div>
              {updatingStatus && (
                <p style={{ fontSize: '0.78rem', color: 'var(--dev-accent)', marginTop: 10 }}>Updating...</p>
              )}
            </div>

            {/* Description */}
            <div className="detail-section">
              <p className="detail-section-title"><AlertTriangle size={14} /> Description</p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {bug.description || 'No description provided.'}
              </p>
            </div>

            {/* Steps */}
            {bug.stepsToReproduce?.length > 0 && (
              <div className="detail-section">
                <p className="detail-section-title">Steps to Reproduce</p>
                <div className="steps-list">
                  {bug.stepsToReproduce.map((step, i) => (
                    <div key={i} className="step-item">
                      <div className="step-bullet" style={{ background: 'var(--dev-accent-light)', color: 'var(--dev-accent)' }}>{i + 1}</div>
                      <p className="step-text">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expected / Actual */}
            {(bug.expectedResult || bug.actualResult) && (
              <div className="detail-section">
                <p className="detail-section-title">Results</p>
                <div className="grid-2" style={{ gap: 16 }}>
                  {bug.expectedResult && (
                    <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>✓ Expected</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{bug.expectedResult}</p>
                    </div>
                  )}
                  {bug.actualResult && (
                    <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                      <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>✗ Actual</p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{bug.actualResult}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Attachments */}
            {bug.attachments?.length > 0 && (
              <div className="detail-section">
                <p className="detail-section-title"><Paperclip size={14} /> Attachments ({bug.attachments.length})</p>
                <div className="attachment-grid">
                  {bug.attachments.map((att, i) => (
                    <div key={i} className="attachment-item" onClick={() => setLightbox(att)}>
                      {att.type?.startsWith('image/') ? (
                        <img src={att.url} alt={att.name} />
                      ) : att.type?.startsWith('video/') ? (
                        <div style={{ height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={24} style={{ color: '#fff' }} />
                        </div>
                      ) : (
                        <div className="attachment-file"><Paperclip size={20} /><span>{att.name}</span></div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="detail-section">
              <p className="detail-section-title"><MessageSquare size={14} /> Discussion ({bug.comments?.length || 0})</p>
              {bug.comments?.length > 0 && (
                <div className="comment-list" style={{ marginBottom: 20 }}>
                  {bug.comments.map((c) => (
                    <div key={c.id} className="comment">
                      <img
                        src={c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName || 'U')}&background=${c.role === 'Developer' ? '10b981' : '6366f1'}&color=fff&size=64`}
                        alt={c.authorName}
                        className="comment-avatar"
                      />
                      <div className="comment-body">
                        <div className="comment-header">
                          <span className="comment-author">{c.authorName}</span>
                          <span
                            className="badge"
                            style={{
                              background: c.role === 'Developer' ? 'var(--dev-accent-light)' : 'var(--accent-light)',
                              color: c.role === 'Developer' ? 'var(--dev-accent)' : 'var(--accent)',
                              fontSize: '0.65rem',
                            }}
                          >
                            {c.role}
                          </span>
                          <span className="comment-time">
                            {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : 'Just now'}
                          </span>
                        </div>
                        <p className="comment-text">{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleComment} style={{ display: 'flex', gap: 12 }}>
                <img
                  src={userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'D')}&background=10b981&color=fff`}
                  alt="You"
                  className="comment-avatar"
                />
                <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add a comment or update..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={{ borderColor: comment ? 'rgba(16,185,129,0.4)' : '' }}
                  />
                  <button
                    type="submit"
                    className="btn"
                    style={{ background: 'var(--dev-accent)', color: '#fff', padding: '10px 14px' }}
                    disabled={submitting || !comment.trim()}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar Info */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Bug Info
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bug.projectName && (
                  <div className="info-row">
                    <span className="info-label">Project</span>
                    <span className="info-value" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700 }}>
                      {bug.projectName}
                    </span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">Status</span>
                  <span className={`badge ${bug.status === 'Open' ? 'badge-open' : bug.status === 'In Progress' ? 'badge-inprogress' : bug.status === 'Done' ? 'badge-done' : bug.status === 'Reopened' ? 'badge-reopened' : 'badge-resolved'}`}>
                    {bug.status}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Priority</span>
                  <span className={`badge ${priorityClass[bug.priority] || 'badge-medium'}`}>{bug.priority}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Reporter</span>
                  <span className="info-value" style={{ fontSize: '0.82rem' }}>{bug.reportedByName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Assigned</span>
                  <span className="info-value" style={{ fontSize: '0.82rem', color: 'var(--dev-accent)', fontWeight: 600 }}>
                    You
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Created</span>
                  <span className="info-value" style={{ fontSize: '0.78rem' }}>
                    {bug.createdAt?.seconds
                      ? formatDistanceToNow(new Date(bug.createdAt.seconds * 1000), { addSuffix: true })
                      : 'Unknown'}
                  </span>
                </div>
                {bug.tags?.length > 0 && (
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {bug.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
