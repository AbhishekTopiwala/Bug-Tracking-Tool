import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Trash2, MessageSquare, Paperclip,
  Clock, User, Tag, AlertTriangle, CheckCircle2, Send,
  ExternalLink, Play, X, Activity, History, Monitor, Smartphone, Server,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import Topbar from '../components/Topbar';
import {
  getBug, updateBug, deleteBug, addComment, updateComment, deleteComment, createNotification, removeAttachmentFromBug, getProjects
} from '../services/firestoreService';
import { cld } from '../services/cloudinaryService';
import { useAuth } from '../contexts/AuthContext';
import { getValidStatusTransitions } from '../utils/statusRules';
import toast from 'react-hot-toast';
import { auto } from '@cloudinary/url-gen/actions/resize';
import { autoGravity } from '@cloudinary/url-gen/qualifiers/gravity';
import { AdvancedImage } from '@cloudinary/react';

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

  useEffect(() => {
    const load = async () => {
      try {
        const [data, projects] = await Promise.all([
          getBug(id),
          getProjects(currentUser.uid, userProfile?.role)
        ]);

        if (!['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role)) {
          const isMember = projects.some(p => p.id === data.projectId);
          if (!isMember) {
            toast.error('You do not have permission to view this bug');
            const unauthorizedPath = userProfile?.role === 'Developer' ? '/dev' : '/qa/dashboard';
            navigate(unauthorizedPath);
            return;
          }
        }

        setBug(data);
      } catch {
        toast.error('Bug not found');
        const isAdmin = ['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role);
        const errorPath = isAdmin ? '/admin' : userProfile?.role === 'Developer' ? '/dev' : '/qa/dashboard';
        navigate(errorPath);
      } finally {
        setLoading(false);
      }
    };
    if (userProfile) load();
  }, [id, userProfile, currentUser, navigate]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateBug(id, { status: newStatus }, userProfile?.displayName || currentUser?.displayName);
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
      const isAdmin = ['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role);
      const bugsPath = isAdmin ? '/admin/bugs' : userProfile?.role === 'Developer' ? '/dev/bugs' : '/qa/bugs';
      navigate(bugsPath);
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
      console.error("Error updating comment:", err);
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
          console.error("Error deleting comment:", err);
          toast.error('Failed to delete comment');
        }
      },
      true
    );
  };

  const handleRemoveAttachment = (att) => {
    triggerConfirm(
      'Remove Attachment',
      `Are you sure you want to remove the attachment "${att.name || 'this file'}"?`,
      async () => {
        try {
          await removeAttachmentFromBug(id, att);
          setBug((b) => ({
            ...b,
            attachments: b.attachments.filter((a) => a.url !== att.url)
          }));
          toast.success('Attachment removed');
        } catch (err) {
          console.error("Error removing attachment:", err);
          toast.error('Failed to remove attachment');
        }
      },
      true
    );
  };

  const handleClearAllAttachments = () => {
    triggerConfirm(
      'Remove All Attachments',
      'Are you sure you want to remove ALL attachments from this bug? This action is permanent.',
      async () => {
        try {
          await updateBug(id, { attachments: [] });
          setBug((b) => ({ ...b, attachments: [] }));
          toast.success('All attachments removed');
        } catch (err) {
          console.error("Error clearing attachments:", err);
          toast.error('Failed to clear attachments');
        }
      },
      true
    );
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
      <Topbar 
        title="Bug Details" 
        subtitle={`Tracking ${bug?.bugKey || 'BUG'} — ${bug?.status}`}
      />
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

      <div className="page-container" style={{ paddingTop: 16 }}>
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
                {bug.platform === 'API' && (
                  <>
                    {bug.httpMethod && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Method</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6366f1' }}>{bug.httpMethod}</p>
                      </div>
                    )}
                    {bug.responseCode && (
                      <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Status Code</p>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: bug.responseCode.startsWith('2') ? 'var(--success)' : 'var(--danger)' }}>{bug.responseCode}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              {bug.apiEndpoint && (
                <div style={{ marginTop: 12, background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Endpoint</p>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, fontFamily: 'monospace', wordBreak: 'break-all' }}>{bug.apiEndpoint}</p>
                </div>
              )}
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
                        borderRadius: '50%', background: event.type === 'status' ? '#6366f1' : 'var(--border)',
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
                  {!bug.history?.length && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No history recorded yet.</p>
                  )}
                </div>
              )}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p className="detail-section-title" style={{ margin: 0 }}>
                    <Paperclip size={14} /> Attachments ({bug.attachments.length})
                  </p>
                  {((['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role)) || bug.reportedBy === currentUser.uid) && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={handleClearAllAttachments}
                      style={{ color: 'var(--danger)', height: 'auto', padding: '4px 8px' }}
                    >
                      <Trash2 size={14} /> Clear All
                    </button>
                  )}
                </div>
                <div className="attachment-grid">
                  {bug.attachments.map((att, i) => (
                    <div key={i} className="attachment-item" onClick={() => setLightbox(att)} style={{ position: 'relative' }}>
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
                      {((['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role)) || bug.reportedBy === currentUser.uid) && (
                        <button
                          type="button"
                          className="attachment-remove-btn"
                          onClick={(e) => { e.stopPropagation(); handleRemoveAttachment(att); }}
                          title="Remove attachment"
                        >
                          <X size={14} />
                          <span>Remove</span>
                        </button>
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
                      <div className="comment-body" style={{ flex: 1 }}>
                        <div className="comment-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className="comment-author" style={{ fontWeight: 600 }}>{c.authorName}</span>
                            <span className={`badge badge-${c.role === 'Developer' ? 'inprogress' : 'open'}`} style={{ fontSize: '0.65rem' }}>{c.role}</span>
                            <span className="comment-time">
                              {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : 'Just now'}
                            </span>
                            {c.updatedAt && (
                              <span className="comment-time" style={{ fontSize: '0.7rem', fontStyle: 'italic', opacity: 0.8 }}>
                                (edited)
                              </span>
                            )}
                          </div>
                          {(c.authorId === currentUser?.uid || (['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role))) && editingCommentId !== c.id && (
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
                                style={{ fontSize: '0.8rem', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 4 }}
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
            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ borderRadius: 12, padding: '10px 20px', fontWeight: 600, gap: 8 }}
                onClick={() => navigate(-1)}
              >
                <ArrowLeft size={16} /> Back
              </button>

              {((['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role)) || bug.reportedBy === currentUser.uid) && (
                <>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const isAdmin = ['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role);
                      const basePath = isAdmin ? '/admin' : userProfile?.role === 'Developer' ? '/dev' : '/qa';
                      navigate(`${basePath}/bugs/${id}/edit`);
                    }}
                    style={{ borderRadius: 12, padding: '10px 20px', fontWeight: 600, gap: 8 }}
                  >
                    <Edit3 size={16} /> Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{ borderRadius: 12, padding: '10px 20px', fontWeight: 600, gap: 8 }}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </>
              )}
            </div>

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
                  {((['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role)) || bug.reportedBy === currentUser?.uid || bug.assigneeId === currentUser?.uid) && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingStatus(true)}>
                      <Edit3 size={13} /> Change
                    </button>
                  )}
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
