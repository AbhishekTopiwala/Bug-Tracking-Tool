import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Wand2, Upload, X, Plus, Minus, Loader2, Image,
  Video, Tag, AlertCircle, Zap, ChevronDown, Trash2
} from 'lucide-react';
import Topbar from '../components/Topbar';
import { generateBugFromNote } from '../services/geminiService';
import { createBug, updateBug, getBug, getUsers, addAttachmentToBug, createNotification, getProjects } from '../services/firestoreService';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { useAuth } from '../contexts/AuthContext';
import { getValidStatusTransitions } from '../utils/statusRules';
import toast from 'react-hot-toast';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const DRAFT_KEY = 'bugtrack_draft';

export default function BugFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const prefilled = location.state?.prefilled;
  const isEditing = Boolean(id);

  const [form, setForm] = useState({
    title: prefilled?.title || '',
    description: prefilled?.description || '',
    stepsToReproduce: prefilled?.stepsToReproduce || [''],
    expectedResult: prefilled?.expectedResult || '',
    actualResult: prefilled?.actualResult || '',
    priority: prefilled?.priority || 'Medium',
    status: 'Open',
    assigneeId: '',
    assigneeName: '',
    tags: [],
    tagInput: '',
    projectId: prefilled?.projectId || '',
    projectName: prefilled?.projectName || '',
  });

  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [aiNote, setAiNote] = useState('');
  const [originalAssigneeId, setOriginalAssigneeId] = useState(null);
  const [originalStatus, setOriginalStatus] = useState('Open');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // Load developers and projects
  useEffect(() => {
    Promise.all([
      getUsers('Developer'),
      getProjects()
    ]).then(([devs, projs]) => {
      setDevelopers(devs);
      setProjects(projs);
    }).catch(() => {
    });
  }, []);

  // Load bug if editing
  useEffect(() => {
    if (isEditing) {
      getBug(id).then((bug) => {
        setOriginalAssigneeId(bug.assigneeId || null);
        setOriginalStatus(bug.status || 'Open');
        setForm({
          title: bug.title || '',
          description: bug.description || '',
          stepsToReproduce: bug.stepsToReproduce?.length ? bug.stepsToReproduce : [''],
          expectedResult: bug.expectedResult || '',
          actualResult: bug.actualResult || '',
          priority: bug.priority || 'Medium',
          status: bug.status || 'Open',
          assigneeId: bug.assigneeId || '',
          assigneeName: bug.assigneeName || '',
          tags: bug.tags || [],
          tagInput: '',
          projectId: bug.projectId || '',
          projectName: bug.projectName || '',
        });
        setInitialLoading(false);
      }).catch(() => {
        toast.error('Failed to load bug for editing');
        const fallbackPath = userProfile?.role === 'Developer' ? '/dev' : '/qa/bugs';
        navigate(fallbackPath);
      });
    }
  }, [id, isEditing, navigate]);

  // Auto-save draft
  useEffect(() => {
    if (isEditing) return; // Don't auto-save drafts when editing
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    }, 1500);
    return () => clearTimeout(timer);
  }, [form, isEditing]);

  // Load draft on mount (only if not prefilled from AI and not editing)
  useEffect(() => {
    if (!prefilled && !isEditing) {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.title) {
            setForm(parsed);
            toast('Draft restored', { icon: '📝' });
          }
        } catch { }
      }
    }
  }, [prefilled, isEditing]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const updateStep = (i, val) => {
    const steps = [...form.stepsToReproduce];
    steps[i] = val;
    setForm((f) => ({ ...f, stepsToReproduce: steps }));
  };

  const addStep = () => setForm((f) => ({ ...f, stepsToReproduce: [...f.stepsToReproduce, ''] }));
  const removeStep = (i) => {
    if (form.stepsToReproduce.length === 1) return;
    setForm((f) => ({ ...f, stepsToReproduce: f.stepsToReproduce.filter((_, idx) => idx !== i) }));
  };

  const addTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && form.tagInput.trim()) {
      e.preventDefault();
      const tag = form.tagInput.trim().toLowerCase();
      if (!form.tags.includes(tag)) {
        setForm((f) => ({ ...f, tags: [...f.tags, tag], tagInput: '' }));
      }
    }
  };
  const removeTag = (tag) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const handleAssignee = (e) => {
    const dev = developers.find((d) => d.uid === e.target.value);
    setForm((f) => ({
      ...f,
      assigneeId: dev?.uid || '',
      assigneeName: dev?.displayName || '',
    }));
  };

  const handleProject = (e) => {
    const project = projects.find((p) => p.id === e.target.value);
    setForm((f) => ({
      ...f,
      projectId: project?.id || '',
      projectName: project?.name || '',
    }));
  };

  const handleFiles = (incoming) => {
    const newFiles = Array.from(incoming);
    setFiles((prev) => [...prev, ...newFiles]);

    const newPreviews = newFiles.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type,
      name: file.name
    }));

    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const removeFile = (i) => {
    const previewToRemove = previews[i];
    if (previewToRemove?.url.startsWith('blob:')) {
      URL.revokeObjectURL(previewToRemove.url);
    }
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  };

  // AI auto-fill
  const handleAIFill = async () => {
    if (!aiNote.trim()) return toast.error('Enter a short note to auto-fill');
    setAiLoading(true);
    try {
      const bug = await generateBugFromNote(aiNote);
      setForm((f) => ({
        ...f,
        title: bug.title,
        description: bug.description,
        stepsToReproduce: bug.stepsToReproduce || [''],
        expectedResult: bug.expectedResult,
        actualResult: bug.actualResult,
        priority: bug.priority || 'Medium',
      }));
      toast.success('Fields auto-filled with AI! ✨');
    } catch {
      toast.error('AI fill failed. Check Gemini API key.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleClear = () => {
    const isFormEmpty = 
      !form.title && 
      !form.description && 
      (!form.stepsToReproduce || (form.stepsToReproduce.length === 1 && !form.stepsToReproduce[0])) &&
      !form.expectedResult &&
      !form.actualResult &&
      !form.assigneeId &&
      (!form.tags || form.tags.length === 0) &&
      files.length === 0;

    if (isFormEmpty) {
      toast('Form is already empty', { icon: 'ℹ️' });
      return;
    }
    
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    setForm({
      title: '',
      description: '',
      stepsToReproduce: [''],
      expectedResult: '',
      actualResult: '',
      priority: 'Medium',
      status: 'Open',
      assigneeId: '',
      assigneeName: '',
      tags: [],
      tagInput: '',
      projectId: '',
      projectName: '',
    });
    setFiles([]);
    setPreviews([]);
    localStorage.removeItem(DRAFT_KEY);
    setShowClearConfirm(false);
    toast.success('Form cleared');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Bug title is required');
    if (!form.description.trim()) return toast.error('Description is required');
    setLoading(true);

    try {
      const bugData = {
        title: form.title.trim(),
        description: form.description.trim(),
        stepsToReproduce: form.stepsToReproduce.filter((s) => s.trim()),
        expectedResult: form.expectedResult.trim(),
        actualResult: form.actualResult.trim(),
        priority: form.priority,
        status: form.status,
        assigneeId: form.assigneeId,
        assigneeName: form.assigneeName,
        tags: form.tags,
        projectId: form.projectId,
        projectName: form.projectName,
      };

      let finalBugId = id;

      if (isEditing) {
        await updateBug(id, bugData);
      } else {
        bugData.reportedBy = currentUser.uid;
        bugData.reportedByName = currentUser.displayName || userProfile?.displayName;
        bugData.attachments = [];
        bugData.comments = [];
        finalBugId = await createBug(bugData);
      }

      // Upload attachments in parallel for better performance using Cloudinary
      if (files.length > 0) {
        const uploadPromises = files.map(async (file) => {
          try {
            const att = await uploadToCloudinary(file);
            return addAttachmentToBug(finalBugId, att);
          } catch (err) {
            console.error("Cloudinary Upload Error:", err);
            // Fallback: if Cloudinary fails, it's better to tell the user but not crash the whole process
            toast.error(`Failed to upload ${file.name}: ${err.message}`);
            return null;
          }
        });
        await Promise.all(uploadPromises);
      }

      // Notify assignee
      if (!isEditing && form.assigneeId) {
        await createNotification({
          userId: form.assigneeId,
          bugId: finalBugId,
          message: `<strong>${currentUser.displayName}</strong> assigned you a new bug: <strong>${form.title}</strong>`,
          type: 'assignment',
        });
      } else if (isEditing && form.assigneeId && form.assigneeId !== originalAssigneeId) {
        await createNotification({
          userId: form.assigneeId,
          bugId: finalBugId,
          message: `<strong>${currentUser.displayName}</strong> assigned a bug to you: <strong>${form.title}</strong>`,
          type: 'assignment',
        });
      }

      if (!isEditing) localStorage.removeItem(DRAFT_KEY);
      toast.success(isEditing ? 'Bug updated successfully! 🐛' : 'Bug reported successfully! 🐛');
      
      const detailPath = userProfile?.role === 'Developer' 
        ? `/dev/bugs/${finalBugId}` 
        : `/qa/bugs/${finalBugId}`;
      
      navigate(detailPath);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} bug: ` + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span>Loading bug details...</span>
      </div>
    );
  }

  return (
    <>
      <Topbar title={isEditing ? 'Edit Bug' : 'Report Bug'} />
      {/* Custom Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)} style={{ zIndex: 3000 }}>
          <div style={{ 
            background: 'var(--bg-card)', 
            padding: '32px', 
            borderRadius: 'var(--radius)', 
            boxShadow: 'var(--shadow-lg)', 
            maxWidth: '420px', 
            width: '90%', 
            textAlign: 'center',
            position: 'relative',
            border: '1px solid var(--border)',
            animation: 'modalSlideUp 0.3s ease-out'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.08)', 
              color: 'var(--danger)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px' 
            }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              marginBottom: 12, 
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}>
              Clear all details?
            </h3>
            <p style={{ 
              fontSize: '0.92rem', 
              color: 'var(--text-secondary)', 
              lineHeight: 1.6, 
              marginBottom: 28 
            }}>
              This will permanently delete your current draft and clear all form fields. This action cannot be undone.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowClearConfirm(false)}
                style={{ justifyContent: 'center', fontWeight: 600, borderRadius: 12, padding: '10px 24px' }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-danger" 
                onClick={confirmClear}
                style={{ justifyContent: 'center', fontWeight: 600, borderRadius: 12, padding: '10px 24px' }}
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="page-container">
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">{isEditing ? 'Edit Bug Details' : 'Report a Bug'}</h1>
            <p className="page-subtitle">
              {isEditing ? 'Update the issue tracking details' : 'Document the issue with full details for faster resolution'}
            </p>
          </div>
          {prefilled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'var(--accent-light)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--accent)' }}>
              <Zap size={14} />
              Pre-filled from AI Generator
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
            {/* Main Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* AI Quick Fill */}
              <div className="ai-panel">
                <div className="ai-label">
                  <Zap size={14} className="ai-sparkle" />
                  AI Quick Fill
                </div>
                <div style={{ display: 'flex' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 'video quality drops to 360p on mobile'"
                    value={aiNote}
                    onChange={(e) => setAiNote(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAIFill())}
                    style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAIFill}
                    disabled={aiLoading}
                    style={{ whiteSpace: 'nowrap', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                  >
                    {aiLoading ? <div className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Wand2 size={16} />}
                    {aiLoading ? 'Filling...' : 'AI Fill'}
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="card">
                <div className="form-group">
                  <label className="form-label">Bug Title *</label>
                  <input
                    id="bug-title"
                    type="text"
                    className="form-control"
                    placeholder="Clear, concise bug title"
                    value={form.title}
                    onChange={update('title')}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div className="card">
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    id="bug-description"
                    className="form-control"
                    placeholder="Detailed description of the bug..."
                    value={form.description}
                    onChange={update('description')}
                    rows={4}
                    required
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <label className="form-label" style={{ margin: 0 }}>Steps to Reproduce</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addStep}>
                    <Plus size={14} /> Add Step
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {form.stepsToReproduce.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="step-bullet">{i + 1}</div>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={`Step ${i + 1}...`}
                        value={step}
                        onChange={(e) => updateStep(i, e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        onClick={() => removeStep(i)}
                        disabled={form.stepsToReproduce.length === 1}
                        style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected / Actual */}
              <div className="grid-2" style={{ gap: 16 }}>
                <div className="card">
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--success)' }}>✓ Expected Result</label>
                    <textarea
                      id="expected-result"
                      className="form-control"
                      placeholder="What should happen..."
                      value={form.expectedResult}
                      onChange={update('expectedResult')}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="card">
                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--danger)' }}>✗ Actual Result</label>
                    <textarea
                      id="actual-result"
                      className="form-control"
                      placeholder="What actually happens..."
                      value={form.actualResult}
                      onChange={update('actualResult')}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className="card">
                <label className="form-label" style={{ marginBottom: 12, display: 'block' }}>
                  Attachments (Screenshots / Videos)
                </label>

                <div
                  className={`upload-zone ${dragging ? 'dragging' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <Upload size={24} style={{ opacity: 0.5 }} />
                    <p>Drag & drop files or <strong style={{ color: 'var(--accent)' }}>click to browse</strong></p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PNG, JPG, GIF, MP4, WebM up to 50MB</p>
                  </div>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFiles(e.target.files)}
                />

                {previews.length > 0 && (
                  <div className="attachment-grid" style={{ marginTop: 16 }}>
                    {previews.map((p, i) => (
                      <div key={i} className="attachment-item" style={{ position: 'relative' }}>
                        {p.type.startsWith('image/') ? (
                          <img src={p.url} alt={p.name} />
                        ) : p.type.startsWith('video/') ? (
                          <video src={p.url} controls />
                        ) : (
                          <div className="attachment-file"><span>{p.name}</span></div>
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          style={{
                            position: 'absolute', top: 6, right: 6,
                            background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                            borderRadius: '50%', width: 22, height: 22,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80 }}>
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Bug Details
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select id="bug-priority" className="form-control form-select" value={form.priority} onChange={update('priority')}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select id="bug-status" className="form-control form-select" value={form.status} onChange={update('status')}>
                      {(isEditing ? getValidStatusTransitions(originalStatus, userProfile?.role) : ['Open']).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Project</label>
                    <select id="bug-project" className="form-control form-select" value={form.projectId} onChange={handleProject}>
                      <option value="">No Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assign Developer</label>
                    <select id="bug-assignee" className="form-control form-select" value={form.assigneeId} onChange={handleAssignee}>
                      <option value="">Unassigned</option>
                      {developers.map((d) => (
                        <option key={d.uid} value={d.uid}>{d.displayName}</option>
                      ))}
                    </select>
                    {developers.length === 0 && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        No developers registered yet
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="form-group">
                    <label className="form-label">Tags</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type tag & press Enter"
                      value={form.tagInput}
                      onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
                      onKeyDown={addTag}
                    />
                    {form.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {form.tags.map((tag) => (
                          <span key={tag} className="tag" style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)}>
                            {tag} <X size={10} />
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Draft indicator & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {!isEditing && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />}
                  {!isEditing ? 'Auto-saving draft...' : ''}
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={handleClear}
                    style={{ color: 'var(--danger)', fontSize: '0.75rem', padding: '4px 8px', height: 'auto' }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              <button
                id="bug-submit"
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? (
                  <><div className="spinner" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> {isEditing ? 'Updating...' : 'Submitting...'}</>
                ) : (
                  <><AlertCircle size={18} /> {isEditing ? 'Update Bug Details' : 'Submit Bug Report'}</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
