import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Paperclip, Clock, User,
  CheckCircle2, AlertTriangle, Send, Play, ChevronRight,
  Tag, Zap, Hash
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Topbar from '../../components/Topbar';
import { getBug, updateBug, addComment, createNotification } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { getValidStatusTransitions } from '../../utils/statusRules';
import toast from 'react-hot-toast';

const STATUS_FLOW = [
  { key: 'Open',        label: 'Open',        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)'  },
  { key: 'In Progress', label: 'In Progress',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { key: 'Done',        label: 'Done',         color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)'  },
];

const PRIORITY_COLOR = {
  Critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  High:     { color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)' },
  Medium:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  Low:      { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)' },
};

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
  const [updatingStatus, setUpdatingStatus] = useState(null); // stores the key being updated
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    getBug(id)
      .then(setBug)
      .catch(() => { toast.error('Bug not found'); navigate('/dev'); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === bug.status) return;
    setUpdatingStatus(newStatus);
    try {
      await updateBug(id, { status: newStatus });
      setBug((b) => ({ ...b, status: newStatus }));
      toast.success(`Status updated → ${newStatus}`);
      if (bug.reportedBy && bug.reportedBy !== currentUser.uid) {
        await createNotification({
          userId: bug.reportedBy, bugId: id,
          message: `<strong>${currentUser.displayName}</strong> changed <strong>${bug.title}</strong> to <strong>${newStatus}</strong>`,
          type: 'status_change',
        });
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(null);
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
          userId: bug.reportedBy, bugId: id,
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
      <span>Loading bug details...</span>
    </div>
  );

  if (!bug) return null;

  const createdAt = bug.createdAt?.seconds
    ? format(new Date(bug.createdAt.seconds * 1000), 'MMM d, yyyy · h:mm a')
    : 'Unknown';

  const validTransitions = getValidStatusTransitions(bug.status, 'Developer');
  const pColor = PRIORITY_COLOR[bug.priority] || PRIORITY_COLOR.Medium;

  return (
    <>
      <Topbar title="Bug Details" />

      {/* Lightbox */}
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
        {/* Back Button */}
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/dev')}
          style={{ marginBottom: 24, gap: 8, fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back to My Bugs
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

          {/* ── Main Content ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Bug Header Card */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '24px 28px',
            }}>
              {/* Priority + Tags */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`badge ${priorityClass[bug.priority] || 'badge-medium'}`}>{bug.priority}</span>
                {bug.tags?.map((t) => (
                  <span key={t} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: '0.72rem', fontWeight: 600, padding: '3px 9px',
                    borderRadius: 6, background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)', color: 'var(--text-muted)',
                  }}>
                    <Tag size={10} /> {t}
                  </span>
                ))}
              </div>

              {/* Title */}
              <h1 style={{
                fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em',
                lineHeight: 1.3, marginBottom: 14, color: 'var(--text-primary)',
              }}>
                {bug.title}
              </h1>

              {/* Meta row */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <Hash size={12} />
                  <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                    {bug.bugKey || id.slice(-8).toUpperCase()}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <Clock size={12} /> {createdAt}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <User size={12} /> Reported by {bug.reportedByName}
                </span>
              </div>
            </div>

            {/* ── Status Flow — Primary action for developers ── */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 16, padding: '22px 28px',
            }}>
              <p style={{
                fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Zap size={12} style={{ color: 'var(--dev-accent)' }} /> Update Status
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {STATUS_FLOW.map((s, i) => {
                  const isCurrent = bug.status === s.key;
                  const isValid = validTransitions.includes(s.key);
                  const isUpdating = updatingStatus === s.key;

                  return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => isValid && handleStatusChange(s.key)}
                        disabled={!!updatingStatus || (!isValid && !isCurrent)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          padding: '10px 20px', borderRadius: 10,
                          fontSize: '0.875rem', fontWeight: 700,
                          border: `2px solid ${isCurrent ? s.color : s.border}`,
                          background: isCurrent ? s.bg : 'transparent',
                          color: isCurrent ? s.color : (!isValid ? 'var(--text-muted)' : s.color),
                          cursor: (!isValid && !isCurrent) ? 'not-allowed' : 'pointer',
                          opacity: (!isValid && !isCurrent) ? 0.4 : 1,
                          transform: isCurrent ? 'scale(1.03)' : 'scale(1)',
                          boxShadow: isCurrent ? `0 0 0 3px ${s.color}20` : 'none',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {isUpdating ? (
                          <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2, borderTopColor: s.color, borderColor: `${s.color}40` }} />
                        ) : isCurrent ? (
                          <CheckCircle2 size={14} />
                        ) : null}
                        {s.label}
                      </button>
                      {i < STATUS_FLOW.length - 1 && (
                        <ChevronRight size={16} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                      )}
                    </div>
                  );
                })}
              </div>
              {updatingStatus && (
                <p style={{ fontSize: '0.78rem', color: 'var(--dev-accent)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={12} /> Updating status...
                </p>
              )}
            </div>

            {/* Description */}
            <div className="detail-section">
              <p className="detail-section-title">
                <AlertTriangle size={14} /> Description
              </p>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                {bug.description || 'No description provided.'}
              </p>
            </div>

            {/* Steps to Reproduce */}
            {bug.stepsToReproduce?.length > 0 && (
              <div className="detail-section">
                <p className="detail-section-title">Steps to Reproduce</p>
                <div className="steps-list">
                  {bug.stepsToReproduce.map((step, i) => (
                    <div key={i} className="step-item">
                      <div className="step-bullet" style={{ background: 'var(--dev-accent-light)', color: 'var(--dev-accent)' }}>
                        {i + 1}
                      </div>
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
                <p className="detail-section-title">
                  <Paperclip size={14} /> Attachments ({bug.attachments.length})
                </p>
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

            {/* Comments / Discussion */}
            <div className="detail-section">
              <p className="detail-section-title">
                <MessageSquare size={14} /> Discussion ({bug.comments?.length || 0})
              </p>

              {bug.comments?.length > 0 ? (
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
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700,
                            background: c.role === 'Developer' ? 'var(--dev-accent-light)' : 'var(--accent-light)',
                            color: c.role === 'Developer' ? 'var(--dev-accent)' : 'var(--accent)',
                          }}>
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
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No comments yet. Be the first to add an update.
                </div>
              )}

              {/* Comment Input */}
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
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                      background: comment.trim() ? 'var(--dev-accent)' : 'var(--bg-secondary)',
                      color: comment.trim() ? '#fff' : 'var(--text-muted)',
                      border: 'none', cursor: submitting || !comment.trim() ? 'not-allowed' : 'pointer',
                      opacity: submitting ? 0.7 : 1,
                      transition: 'all 0.2s',
                    }}
                    disabled={submitting || !comment.trim()}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ── Sidebar Info Panel ── */}
          <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Current Status */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 20,
            }}>
              <h4 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Current Status
              </h4>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 10,
                background: (() => {
                  const s = STATUS_FLOW.find(s => s.key === bug.status);
                  return s ? s.bg : 'var(--bg-secondary)';
                })(),
                border: `1px solid ${(() => {
                  const s = STATUS_FLOW.find(s => s.key === bug.status);
                  return s ? s.border : 'var(--border)';
                })()}`,
                color: (() => {
                  const s = STATUS_FLOW.find(s => s.key === bug.status);
                  return s ? s.color : 'var(--text-primary)';
                })(),
                fontWeight: 700, fontSize: '0.875rem',
              }}>
                <CheckCircle2 size={14} />
                {bug.status}
              </div>
            </div>

            {/* Bug Details */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 20,
            }}>
              <h4 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Bug Info
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bug.projectName && (
                  <div className="info-row">
                    <span className="info-label">Project</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--dev-accent)', fontWeight: 700 }}>
                      {bug.projectName}
                    </span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">Priority</span>
                  <span className={`badge ${priorityClass[bug.priority] || 'badge-medium'}`}>{bug.priority}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Reporter</span>
                  <span className="info-value" style={{ fontSize: '0.82rem' }}>{bug.reportedByName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Assigned to</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--dev-accent)', fontWeight: 700 }}>You</span>
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
                  <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                    <span className="info-label" style={{ display: 'block', marginBottom: 8 }}>Tags</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {bug.tags.map((t) => <span key={t} className="tag">{t}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick tip for developer */}
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'var(--dev-accent-light)',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--dev-accent)', fontWeight: 600, lineHeight: 1.5 }}>
                💡 Use the status panel above to move this bug through the workflow. QA will be notified automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
