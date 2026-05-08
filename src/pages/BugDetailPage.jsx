import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Trash2, MessageSquare, Paperclip,
  Clock, User, Tag, AlertTriangle, CheckCircle2, Send,
  ExternalLink, Play
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Topbar from '../components/Topbar';
import {
  getBug, updateBug, deleteBug, addComment, createNotification
} from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { getValidStatusTransitions } from '../utils/statusRules';
import toast from 'react-hot-toast';
import { Cloudinary } from '@cloudinary/url-gen';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { AdvancedImage } from '@cloudinary/react';

const cld = new Cloudinary({ cloud: { cloudName: 'dhtotljvn' } });

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

const statusClass = { 
  Open: 'badge-open', 
  'In Progress': 'badge-inprogress', 
  Done: 'badge-done', 
  Resolved: 'badge-resolved', 
  Reopened: 'badge-reopened', 
  Reopen: 'badge-reopen', 
  Reproduced: 'badge-reproduced' 
};
const priorityClass = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high', Critical: 'badge-critical' };

export default function BugDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();

  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getBug(id);
        
        // Security check for QA role: only see your own bugs
        if (userProfile?.role === 'QA' && data.reportedBy !== currentUser?.uid) {
          toast.error('You do not have permission to view this bug');
          navigate('/qa/dashboard');
          return;
        }

        setBug(data);
      } catch {
        toast.error('Bug not found');
        navigate('/qa/dashboard');
      } finally {
        setLoading(false);
      }
    };
    if (userProfile) load();
  }, [id, userProfile, currentUser, navigate]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateBug(id, { status: newStatus });
      setBug((b) => ({ ...b, status: newStatus }));
      setEditingStatus(false);
      toast.success(`Status updated to ${newStatus}`);

      // Notify reporter
      if (bug.reportedBy && bug.reportedBy !== currentUser.uid) {
        await createNotification({
          userId: bug.reportedBy,
          bugId: id,
          message: `<strong>${userProfile?.displayName || currentUser?.displayName || 'QA'}</strong> changed the status of <strong>${bug.title}</strong> to <strong>${newStatus}</strong>`,
          type: 'status_change',
        });
      }
      
      // Notify assignee
      if (bug.assigneeId && bug.assigneeId !== currentUser.uid) {
        await createNotification({
          userId: bug.assigneeId,
          bugId: id,
          message: `<strong>${userProfile?.displayName || currentUser?.displayName || 'QA'}</strong> changed the status of <strong>${bug.title}</strong> to <strong>${newStatus}</strong>`,
          type: 'status_change',
        });
      }
    } catch (err) {
      console.error("Error changing bug status:", err);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteBug(id);
      toast.success('Bug deleted');
      navigate('/qa/bugs');
    } catch (err) {
      console.error("Error deleting bug:", err);
      toast.error('Failed to delete bug');
      setDeleting(false);
      setShowDeleteConfirm(false);
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
        authorName: userProfile?.displayName || currentUser?.displayName || 'QA',
        authorAvatar: userProfile?.avatar,
        role: userProfile?.role || 'QA',
      });
      setComment('');
      const updated = await getBug(id);
      setBug(updated);
      toast.success('Comment added');

      // Notify others
      const notifyId = bug.assigneeId && bug.assigneeId !== currentUser.uid
        ? bug.assigneeId
        : bug.reportedBy !== currentUser.uid
        ? bug.reportedBy
        : null;
      if (notifyId) {
        await createNotification({
          userId: notifyId,
          bugId: id,
          message: `<strong>${userProfile?.displayName || currentUser?.displayName || 'QA'}</strong> commented on <strong>${bug.title}</strong>`,
          type: 'comment',
        });
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span>Loading bug details...</span>
      </div>
    );
  }

  if (!bug) return null;

  const createdAt = bug.createdAt?.seconds
    ? format(new Date(bug.createdAt.seconds * 1000), 'MMM d, yyyy · h:mm a')
    : 'Unknown date';

  const timeAgo = bug.createdAt?.seconds
    ? formatDistanceToNow(new Date(bug.createdAt.seconds * 1000), { addSuffix: true })
    : '';

  return (
    <>
      <Topbar title="Bug Details" />
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div
            className="modal"
            style={{ maxWidth: 400, borderRadius: 20, overflow: 'hidden' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — centered */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '32px 32px 20px', gap: 14, background: 'var(--bg-card)',
              borderBottom: '1px solid var(--border)',
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(239,68,68,0.15)',
              }}>
                <Trash2 size={22} style={{ color: '#dc2626' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Delete Bug
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                  This action is <strong style={{ color: 'var(--danger)' }}>permanent</strong> and cannot be undone
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 28px', background: 'var(--bg-secondary)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, textAlign: 'center' }}>
                You're about to delete{' '}
                <span style={{
                  fontWeight: 700, color: '#dc2626',
                  background: 'rgba(220,38,38,0.08)', padding: '1px 8px',
                  borderRadius: 6, fontSize: '0.85rem',
                }}>
                  #{bug.bugKey || bug.id?.slice(-6).toUpperCase()}
                </span>
                . All comments and attachments will be permanently removed.
              </p>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', gap: 10, padding: '16px 24px',
              background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)',
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                style={{ flex: 1, borderRadius: 10, fontWeight: 600, justifyContent: 'center' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '10px 20px', borderRadius: 10,
                  background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                  border: 'none', cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(220,38,38,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {deleting
                  ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> Deleting...</>
                  : <><Trash2 size={14} /> Delete Bug</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="modal-overlay"
          onClick={() => setLightbox(null)}
          style={{ zIndex: 2000 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 'var(--radius)' }}>
            {lightbox.type?.startsWith('video/') ? (
              <video src={lightbox.url} controls autoPlay style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 'var(--radius)' }} />
            ) : (
              <img src={lightbox.url} alt={lightbox.name} style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 'var(--radius)', objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}

      <div className="page-container">
        {/* Back + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <button className="btn btn-secondary" style={{ borderRadius: 12, padding: '10px 20px', fontWeight: 600, gap: 8 }} onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            {(userProfile?.role === 'Admin' || bug.reportedBy === currentUser.uid) && (
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/qa/bugs/${id}/edit`)}
                style={{ borderRadius: 12, padding: '10px 24px', fontWeight: 600, gap: 8 }}
              >
                <Edit3 size={16} /> Edit
              </button>
            )}
            {(userProfile?.role === 'Admin' || bug.reportedBy === currentUser.uid) && (
              <button 
                className="btn btn-danger" 
                onClick={() => setShowDeleteConfirm(true)}
                style={{ borderRadius: 12, padding: '10px 24px', fontWeight: 600, gap: 8 }}
              >
                <Trash2 size={16} /> Delete
              </button>
            )}
          </div>
        </div>

        <div className="bug-detail-layout">
          {/* Main Content */}
          <div>
            {/* Title + Badges */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <span className={`badge ${statusClass[bug.status] || 'badge-open'}`}>{bug.status}</span>
                <span className={`badge ${priorityClass[bug.priority] || 'badge-medium'}`}>{bug.priority}</span>
                {bug.tags?.map((tag) => <span key={tag} className="tag">{tag}</span>)}
              </div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                #{bug.bugKey || (bug.id?.slice(-6).toUpperCase() || 'BUG')}
              </span>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.3, marginBottom: 10 }}>
                {bug.title}
              </h1>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Clock size={12} /> {createdAt}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <User size={12} /> {bug.reportedByName || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="detail-section">
              <p className="detail-section-title">
                <AlertTriangle size={14} /> Description
              </p>
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
                      <div className="step-bullet">{i + 1}</div>
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
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                        ✓ Expected
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{bug.expectedResult}</p>
                    </div>
                  )}
                  {bug.actualResult && (
                    <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                        ✗ Actual
                      </p>
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
                        att.publicId ? (
                          <AdvancedImage 
                            cldImg={cld.image(att.publicId).format('auto').quality('auto').resize(auto().gravity(autoGravity()).width(300).height(300))} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <img src={att.url} alt={att.name} />
                        )
                      ) : att.type?.startsWith('video/') ? (
                        <div style={{ position: 'relative', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={24} style={{ color: '#fff' }} />
                          <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: '0.68rem', color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4 }}>
                            {att.name}
                          </span>
                        </div>
                      ) : (
                        <div className="attachment-file">
                          <Paperclip size={20} />
                          <span>{att.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="detail-section">
              <p className="detail-section-title">
                <MessageSquare size={14} /> Discussion ({bug.comments?.length || 0})
              </p>

              {bug.comments?.length > 0 ? (
                <div className="comment-list" style={{ marginBottom: 20 }}>
                  {bug.comments.map((c) => (
                    <div key={c.id} className="comment">
                      <img
                        src={c.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName || 'U')}&background=6366f1&color=fff&size=64`}
                        alt={c.authorName}
                        className="comment-avatar"
                      />
                      <div className="comment-body">
                        <div className="comment-header">
                          <span className="comment-author">{c.authorName}</span>
                          <span className={`badge badge-${c.role === 'Developer' ? 'inprogress' : 'open'}`} style={{ fontSize: '0.65rem' }}>{c.role}</span>
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
                  No comments yet. Start the discussion!
                </div>
              )}

              {/* Add Comment */}
              <form onSubmit={handleComment} style={{ display: 'flex', gap: 12 }}>
                <img
                  src={userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || 'U')}&background=6366f1&color=fff`}
                  alt="You"
                  className="comment-avatar"
                />
                <div style={{ flex: 1, display: 'flex', gap: 10 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || !comment.trim()}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Status
              </h4>

              {!editingStatus ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className={`badge ${statusClass[bug.status] || 'badge-open'}`} style={{ fontSize: '0.8rem', padding: '6px 14px' }}>
                    {bug.status}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingStatus(true)}>
                    <Edit3 size={13} /> Change
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {getValidStatusTransitions(bug.status, userProfile?.role).map((s) => (
                    <button
                      key={s}
                      className={`btn btn-ghost`}
                      style={{
                        justifyContent: 'flex-start',
                        background: bug.status === s ? 'var(--accent-light)' : '',
                        color: bug.status === s ? 'var(--accent)' : '',
                        fontSize: '0.85rem',
                      }}
                      onClick={() => handleStatusChange(s)}
                    >
                      {bug.status === s && <CheckCircle2 size={14} />}
                      {s}
                    </button>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
                    <button 
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'var(--text-muted)', 
                        fontSize: '0.75rem', 
                        cursor: 'pointer', 
                        fontWeight: 500,
                        padding: '4px 8px',
                        transition: 'color 0.2s'
                      }} 
                      onClick={() => setEditingStatus(false)}
                      onMouseOver={(e) => e.target.style.color = 'var(--text-primary)'}
                      onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                Details
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bug.projectName && (
                  <div className="info-row">
                    <span className="info-label">Project</span>
                    <span className="info-value" style={{ fontWeight: 700, color: 'var(--primary)' }}>{bug.projectName}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="info-label">Priority</span>
                  <span className={`badge ${priorityClass[bug.priority] || 'badge-medium'}`}>{bug.priority}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Assignee</span>
                  <span className="info-value">
                    {bug.assigneeName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(bug.assigneeName)}&background=6366f1&color=fff&size=32`}
                          style={{ width: 20, height: 20, borderRadius: '50%' }}
                          alt={bug.assigneeName}
                        />
                        {bug.assigneeName}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                    )}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Reporter</span>
                  <span className="info-value">{bug.reportedByName || 'Unknown'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Created</span>
                  <span className="info-value" style={{ fontSize: '0.82rem' }}>{timeAgo}</span>
                </div>
                {bug.tags?.length > 0 && (
                  <div className="info-row" style={{ flexDirection: 'column', gap: 6 }}>
                    <span className="info-label">Tags</span>
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
