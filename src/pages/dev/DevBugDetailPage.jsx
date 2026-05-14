import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MessageSquare, Paperclip, Clock, User,
  CheckCircle2, AlertTriangle, Send, Play, ChevronRight,
  Tag, Zap, Hash, History, Monitor, Smartphone, Server, Edit3, Trash2,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Topbar from '../../components/Topbar';
import { getBug, updateBug, addComment, updateComment, deleteComment, createNotification, getProjects } from '../../services/firestoreService';
import { useAuth } from '../../contexts/AuthContext';
import { getValidStatusTransitions } from '../../utils/statusRules';
import toast from 'react-hot-toast';

const STATUS_FLOW = [
  { key: 'Open',        label: 'Open',        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)'  },
  { key: 'In Progress', label: 'In Progress',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  { key: 'Done',        label: 'Done',         color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.3)'  },
];

const STATUS_STYLES = {
  Open:         { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)'  },
  'In Progress': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
  Done:         { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)'  },
  Resolved:     { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)'  },
  Reopen:       { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
  Reopened:     { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.3)'   },
  Reproduced:   { color: '#ec4899', bg: 'rgba(236,72,153,0.1)',  border: 'rgba(236,72,153,0.3)'  },
};

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
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null,
    isDanger: true,
  });

  const triggerConfirm = (title, message, onConfirm, isDanger = true) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText: isDanger ? 'Delete' : 'Confirm',
      cancelText: 'Cancel',
      onConfirm,
      isDanger,
    });
  };

  const canChangeStatus = userProfile?.role === 'Admin' || 
                          bug?.reportedBy === currentUser?.uid || 
                          bug?.assigneeId === currentUser?.uid;

  useEffect(() => {
    const load = async () => {
      try {
        const [data, projects] = await Promise.all([
          getBug(id),
          getProjects(currentUser.uid, userProfile?.role)
        ]);

        if (userProfile?.role !== 'Admin') {
          const isMember = projects.some(p => p.id === data.projectId);
          if (!isMember) {
            toast.error('You do not have permission to view this bug');
            navigate('/dev');
            return;
          }
        }
        setBug(data);
      } catch (err) {
        console.error("Error loading bug details (dev):", err);
        toast.error('Bug not found');
        navigate('/dev');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser && userProfile) {
      load();
    }
  }, [id, currentUser, userProfile, navigate]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === bug.status) return;
    setUpdatingStatus(newStatus);
    try {
      await updateBug(id, { status: newStatus }, userProfile?.displayName || currentUser?.displayName);
      setBug((b) => ({ ...b, status: newStatus }));
      toast.success(`Status updated → ${newStatus}`);
      if (bug.reportedBy && bug.reportedBy !== currentUser.uid) {
        await createNotification({
          userId: bug.reportedBy, bugId: id,
          message: `<strong>${userProfile?.displayName || currentUser?.displayName || 'Developer'}</strong> changed <strong>${bug.title}</strong> to <strong>${newStatus}</strong>`,
          type: 'status_change',
        });
      }
    } catch (err) {
      console.error("Error changing bug status (dev):", err);
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
        authorName: userProfile?.displayName || currentUser?.displayName || 'Developer',
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
          message: `<strong>${userProfile?.displayName || currentUser?.displayName || 'Developer'}</strong> commented on <strong>${bug.title}</strong>`,
          type: 'comment',
        });
      }
    } catch (err) {
      console.error("Error adding comment (dev):", err);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCommentEdit = async (commentId) => {
    if (!editingCommentText.trim()) return;
    setSavingComment(true);
    try {
      await updateComment(id, commentId, editingCommentText.trim());
      const updatedBug = await getBug(id);
      setBug(updatedBug);
      setEditingCommentId(null);
      setEditingCommentText('');
      toast.success('Comment updated successfully');
    } catch (err) {
      console.error("Error updating comment (dev):", err);
      toast.error('Failed to update comment');
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    triggerConfirm(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action is permanent and cannot be undone.',
      async () => {
        try {
          await deleteComment(id, commentId);
          const updatedBug = await getBug(id);
          setBug(updatedBug);
          toast.success('Comment deleted successfully');
        } catch (err) {
          console.error("Error deleting comment (dev):", err);
          toast.error('Failed to delete comment');
        }
      },
      true
    );
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

  const flowItems = [...STATUS_FLOW];
  if (!STATUS_FLOW.some(s => s.key === bug.status)) {
    const style = STATUS_STYLES[bug.status] || { color: 'var(--text-primary)', bg: 'var(--bg-secondary)', border: 'var(--border)' };
    flowItems.unshift({
      key: bug.status,
      label: bug.status,
      color: style.color,
      bg: style.bg,
      border: style.border
    });
  }

  return (
    <>
      <Topbar 
        title="Bug Details" 
        subtitle={`Reviewing ${bug?.bugKey || 'BUG'} — ${bug?.status}`}
      />

      {/* Unified Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="modal-overlay" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>
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
                background: confirmDialog.isDanger ? 'linear-gradient(135deg, #fee2e2, #fecaca)' : 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
                border: confirmDialog.isDanger ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: confirmDialog.isDanger ? '0 4px 14px rgba(239,68,68,0.15)' : '0 4px 14px rgba(99,102,241,0.15)',
              }}>
                <Trash2 size={22} style={{ color: confirmDialog.isDanger ? '#dc2626' : 'var(--primary)' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {confirmDialog.title}
                </h3>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '20px 28px', background: 'var(--bg-secondary)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, textAlign: 'center' }}>
                {confirmDialog.message}
              </p>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', gap: 10, padding: '16px 24px',
              background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)',
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                style={{ flex: 1, borderRadius: 10, fontWeight: 600, justifyContent: 'center' }}
              >
                {confirmDialog.cancelText}
              </button>
              <button
                onClick={async () => {
                  if (confirmDialog.onConfirm) {
                    await confirmDialog.onConfirm();
                  }
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                style={{
                  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, padding: '10px 20px', borderRadius: 10,
                  background: confirmDialog.isDanger ? '#dc2626' : 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: '0.875rem',
                  border: 'none', cursor: 'pointer',
                  boxShadow: confirmDialog.isDanger ? '0 4px 14px rgba(220,38,38,0.3)' : '0 4px 14px rgba(99,102,241,0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

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
          style={{ marginBottom: 24, gap: 8, fontWeight: 600, padding: '10px 20px', borderRadius: 12, display: 'flex', alignItems: 'center' }}
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
                {flowItems.map((s, i) => {
                  const isCurrent = bug.status === s.key;
                  const isValid = validTransitions.includes(s.key);
                  const isUpdating = updatingStatus === s.key;

                  return (
                    <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        onClick={() => isValid && canChangeStatus && handleStatusChange(s.key)}
                        disabled={!!updatingStatus || (!isValid && !isCurrent) || !canChangeStatus}
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
                      {i < flowItems.length - 1 && (
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

            {/* Platform & Environment */}
            <div className="detail-section">
              <p className="detail-section-title">
                <Monitor size={14} /> Environment & Platform
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Platform</p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {bug.platform === 'Mobile' ? <Smartphone size={14} /> : bug.platform === 'API' ? <Server size={14} /> : <Monitor size={14} />}
                    {bug.platform || 'Web'}
                  </p>
                </div>
                {bug.platform === 'Web' && (
                  <>
                    {bug.browser && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Browser</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{bug.browser}</p>
                      </div>
                    )}
                    {bug.osWeb && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>OS</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{bug.osWeb}</p>
                      </div>
                    )}
                  </>
                )}
                {bug.platform === 'Mobile' && (
                  <>
                    {bug.deviceModel && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Device</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{bug.deviceModel}</p>
                      </div>
                    )}
                    {bug.appVersion && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>App Version</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{bug.appVersion}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Bug Journey Timeline */}
            <div className="detail-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <p className="detail-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <History size={14} /> Bug Journey Timeline
                </p>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '4px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}
                  onClick={() => setShowHistory(!showHistory)}
                  title={showHistory ? "Hide history" : "Show history"}
                >
                  {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{showHistory ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              {showHistory && (
                <div style={{ position: 'relative', paddingLeft: 24, marginTop: 10 }}>
                  <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: 'var(--border)', borderRadius: 1 }}></div>
                  {(bug.history || []).slice().reverse().map((event, i) => (
                    <div key={i} style={{ position: 'relative', marginBottom: 20 }}>
                      <div style={{
                        position: 'absolute', left: -21, top: 4, width: 10, height: 10,
                        borderRadius: '50%', background: event.type === 'status' ? 'var(--dev-accent)' : 'var(--border)',
                        border: '2px solid var(--bg-card)', zIndex: 1
                      }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{event.details}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>by <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{event.user}</span></p>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {event.timestamp ? formatDistanceToNow(new Date(event.timestamp), { addSuffix: true }) : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                      <div className="comment-body" style={{ flex: 1 }}>
                        <div className="comment-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="comment-author" style={{ fontWeight: 600 }}>{c.authorName}</span>
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
                            {c.updatedAt && (
                              <span className="comment-time" style={{ fontSize: '0.7rem', fontStyle: 'italic', opacity: 0.8 }}>
                                (edited)
                              </span>
                            )}
                          </div>
                          {(c.authorId === currentUser?.uid || userProfile?.role === 'Admin') && editingCommentId !== c.id && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '2px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditingCommentText(c.text);
                                }}
                                title="Edit comment"
                              >
                                <Edit3 size={11} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '2px 8px', height: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444' }}
                                onClick={() => handleDeleteComment(c.id)}
                                title="Delete comment"
                              >
                                <Trash2 size={11} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 500 }}>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {editingCommentId === c.id ? (
                          <div style={{ marginTop: 8 }}>
                            <textarea
                              className="form-control"
                              value={editingCommentText}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                              rows={3}
                              style={{ width: '100%', marginBottom: 8, padding: '8px 12px', fontSize: '0.9rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-main)', resize: 'vertical' }}
                              placeholder="Edit your comment..."
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditingCommentText('');
                                }}
                                disabled={savingComment}
                                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handleSaveCommentEdit(c.id)}
                                disabled={savingComment || !editingCommentText.trim()}
                                style={{
                                  fontSize: '0.8rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4,
                                  background: 'var(--dev-accent)', borderColor: 'var(--dev-accent)'
                                }}
                              >
                                {savingComment ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="comment-text" style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{c.text}</p>
                        )}
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
                background: STATUS_STYLES[bug.status]?.bg || 'var(--bg-secondary)',
                border: `1px solid ${STATUS_STYLES[bug.status]?.border || 'var(--border)'}`,
                color: STATUS_STYLES[bug.status]?.color || 'var(--text-primary)',
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
