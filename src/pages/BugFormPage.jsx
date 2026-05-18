import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Wand2, Upload, X, Plus, Minus, Loader2,
  Tag, AlertCircle, Zap, ChevronDown, Trash2,
  Play, Paperclip, ArrowLeft, Monitor, Smartphone, Server, Sparkles
} from 'lucide-react';
import Topbar from '../components/Topbar';
import { generateBugFromNote } from '../services/geminiService';
import { createBug, updateBug, getBug, getUsers, addAttachmentToBug, createNotification, getProjects } from '../services/firestoreService';
import { uploadToCloudinary, cld } from '../services/cloudinaryService';
import { useAuth } from '../contexts/AuthContext';
import { getValidStatusTransitions } from '../utils/statusRules';
import { auto } from "@cloudinary/url-gen/actions/resize";
import { autoGravity } from "@cloudinary/url-gen/qualifiers/gravity";
import { AdvancedImage } from "@cloudinary/react";
import toast from 'react-hot-toast';

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const PLATFORMS = ['Web', 'Mobile', 'API'];
const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera', 'Other'];
const OS_WEB = ['Windows 11', 'Windows 10', 'macOS', 'Linux', 'ChromeOS'];
const OS_MOBILE = ['Android 14', 'Android 13', 'Android 12', 'iOS 17', 'iOS 16', 'iOS 15'];
const NETWORKS = ['WiFi', '4G/LTE', '5G', '3G', 'Other'];
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const RESOLUTIONS = ['1920x1080', '1440x900', '1366x768', '1280x800', '2560x1440', 'Other'];

// Smart tag keyword map
const TAG_KEYWORDS = {
  '#frontend': ['button', 'ui', 'layout', 'css', 'style', 'responsive', 'modal', 'dropdown', 'form', 'input', 'display', 'design', 'page', 'screen'],
  '#backend': ['api', 'server', 'endpoint', 'database', 'query', 'timeout', 'service', 'data', 'fetch', 'response'],
  '#auth': ['login', 'logout', 'password', 'session', 'token', 'permission', 'access', 'sign', 'auth', 'unauthorized'],
  '#mobile': ['android', 'ios', 'mobile', 'app', 'phone', 'tablet', 'swipe', 'gesture', 'touch'],
  '#payment': ['payment', 'checkout', 'stripe', 'invoice', 'billing', 'cart', 'price', 'amount', 'charge'],
  '#performance': ['slow', 'lag', 'timeout', 'freeze', 'crash', 'memory', 'load', 'speed', 'hang'],
  '#security': ['xss', 'injection', 'vulnerability', 'exposed', 'leak', 'bypass', 'attack'],
};

function suggestTags(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  return Object.entries(TAG_KEYWORDS)
    .filter(([, keywords]) => keywords.some(k => text.includes(k)))
    .map(([tag]) => tag);
}

const DRAFT_KEY = 'bugtrack_draft';

export default function BugFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const prefilled = location.state?.prefilled;
  const isEditing = Boolean(id);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const paramProjectName = queryParams.get('project');
  const paramProjectId = queryParams.get('projectId');

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
    // Device template fields
    platform: 'Web',
    browser: '',
    osWeb: '',
    screenResolution: '',
    deviceModel: '',
    osMobile: '',
    appVersion: '',
    network: '',
    apiEndpoint: '',
    httpMethod: '',
    requestPayload: '',
    responseCode: '',
  });
  const [tagSuggestions, setTagSuggestions] = useState([]);

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
  const [existingAttachments, setExistingAttachments] = useState([]);
  
  const fileRef = useRef(null);
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  // Load developers and projects
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    
    Promise.all([
      getUsers('Developer'),
      getProjects(currentUser.uid, userProfile.role)
    ]).then(([devs, projs]) => {
      setDevelopers(devs);
      setProjects(projs);

      // Pre-select project from query parameters if not editing
      if (!isEditing) {
        if (paramProjectId) {
          const matched = projs.find(p => p.id === paramProjectId);
          if (matched) {
            setForm(f => ({ ...f, projectId: matched.id, projectName: matched.name }));
          }
        } else if (paramProjectName) {
          const matched = projs.find(p => p.name.toLowerCase() === paramProjectName.toLowerCase());
          if (matched) {
            setForm(f => ({ ...f, projectId: matched.id, projectName: matched.name }));
          }
        }
      }
    }).catch(() => {
    });
  }, [currentUser, userProfile?.role, paramProjectId, paramProjectName, isEditing]);

  // Load bug if editing
  useEffect(() => {
    if (isEditing) {
      getBug(id).then((bug) => {
        // Security check for QA role: only edit your own bugs
        if (userProfile?.role === 'QA' && bug.reportedBy !== currentUser?.uid) {
          toast.error('You do not have permission to edit this bug');
          const isAdmin = ['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role);
          const dashboardPath = isAdmin ? '/admin' : userProfile?.role === 'Developer' ? '/dev' : '/qa/dashboard';
          navigate(dashboardPath);
          return;
        }

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
          platform: bug.platform || 'Web',
          browser: bug.browser || '',
          osWeb: bug.osWeb || '',
          screenResolution: bug.screenResolution || '',
          deviceModel: bug.deviceModel || '',
          osMobile: bug.osMobile || '',
          appVersion: bug.appVersion || '',
          network: bug.network || '',
          apiEndpoint: bug.apiEndpoint || '',
          httpMethod: bug.httpMethod || '',
          requestPayload: bug.requestPayload || '',
          responseCode: bug.responseCode || '',
        });
        setExistingAttachments(bug.attachments || []);
        setInitialLoading(false);
      }).catch(() => {
        toast.error('Failed to load bug for editing');
        const fallbackPath = userProfile?.role === 'Admin' ? '/admin/bugs' : userProfile?.role === 'Developer' ? '/dev' : '/qa/bugs';
        navigate(fallbackPath);
      });
    }
  }, [id, isEditing, navigate, userProfile, currentUser]);

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

  // Smart tag suggestion when title/description changes
  useEffect(() => {
    const suggested = suggestTags(form.title, form.description)
      .filter(s => !form.tags.includes(s));
    setTagSuggestions(suggested);
  }, [form.title, form.description, form.tags]);

  const addTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && form.tagInput.trim()) {
      e.preventDefault();
      const tag = form.tagInput.trim().startsWith('#')
        ? form.tagInput.trim().toLowerCase()
        : `#${form.tagInput.trim().toLowerCase()}`;
      if (!form.tags.includes(tag)) {
        setForm((f) => ({ ...f, tags: [...f.tags, tag], tagInput: '' }));
      }
    }
  };
  const addTagDirect = (tag) => {
    if (!form.tags.includes(tag)) {
      setForm((f) => ({ ...f, tags: [...f.tags, tag] }));
    }
  };
  const removeTag = (tag) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const handleAssignee = (e) => {
    const dev = developers.find((d) => (d.id || d.uid) === e.target.value);
    setForm((f) => ({
      ...f,
      assigneeId: dev?.id || dev?.uid || '',
      assigneeName: dev?.name || dev?.displayName || dev?.email?.split('@')[0] || '',
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

  const projectDevelopers = useMemo(() => {
    // If no project is selected, still return developers so they can be seen
    // or we can require a project first. 
    // The user requested to see the developer they just added in teams.
    if (!form.projectId) return developers;
    
    // In many workflows, any developer in the organization can be assigned.
    return developers;
  }, [form.projectId, developers]);

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
      platform: 'Web',
      browser: '', osWeb: '', screenResolution: '',
      deviceModel: '', osMobile: '', appVersion: '', network: '',
      apiEndpoint: '', httpMethod: '', requestPayload: '', responseCode: '',
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
    if (!form.projectId) return toast.error('Project assignment is required');
    setLoading(true);

    try {
      // Build device environment metadata
      const deviceMeta = { platform: form.platform };
      if (form.platform === 'Web') {
        if (form.browser) deviceMeta.browser = form.browser;
        if (form.osWeb) deviceMeta.osWeb = form.osWeb;
        if (form.screenResolution) deviceMeta.screenResolution = form.screenResolution;
      } else if (form.platform === 'Mobile') {
        if (form.deviceModel) deviceMeta.deviceModel = form.deviceModel;
        if (form.osMobile) deviceMeta.osMobile = form.osMobile;
        if (form.appVersion) deviceMeta.appVersion = form.appVersion;
        if (form.network) deviceMeta.network = form.network;
      } else if (form.platform === 'API') {
        if (form.apiEndpoint) deviceMeta.apiEndpoint = form.apiEndpoint;
        if (form.httpMethod) deviceMeta.httpMethod = form.httpMethod;
        if (form.requestPayload) deviceMeta.requestPayload = form.requestPayload;
        if (form.responseCode) deviceMeta.responseCode = form.responseCode;
      }

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
        attachments: existingAttachments,
        ...deviceMeta,
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
          message: `<strong>${userProfile?.displayName || currentUser?.displayName || 'QA'}</strong> assigned you a new bug: <strong>${form.title}</strong>`,
          type: 'assignment',
        });
      } else if (isEditing && form.assigneeId && form.assigneeId !== originalAssigneeId) {
        await createNotification({
          userId: form.assigneeId,
          bugId: finalBugId,
          message: `<strong>${userProfile?.displayName || currentUser?.displayName || 'QA'}</strong> assigned a bug to you: <strong>${form.title}</strong>`,
          type: 'assignment',
        });
      }

      if (!isEditing) localStorage.removeItem(DRAFT_KEY);
      toast.success(isEditing ? 'Bug updated successfully! 🐛' : 'Bug reported successfully! 🐛');
      
      const detailPath = userProfile?.role === 'Developer' 
        ? `/dev/bugs/${finalBugId}` 
        : (['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager'].includes(userProfile?.role))
          ? `/admin/bugs/${finalBugId}`
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
      <Topbar 
        title={isEditing ? 'Edit Bug' : 'Report Bug'} 
        subtitle={isEditing ? 'Update the issue tracking details' : 'Document the issue with full details for faster resolution'}
      />
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
      <div className="page-container" style={{ paddingTop: 16 }}>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Attachments (Screenshots / Videos)
                  </label>
                  {previews.length > 0 && (
                    <button 
                      type="button" 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => { setFiles([]); setPreviews([]); }}
                      style={{ color: 'var(--danger)', height: 'auto', padding: '4px 8px' }}
                    >
                      <Trash2 size={14} /> Clear All
                    </button>
                  )}
                </div>

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

                {existingAttachments.length > 0 && (
                  <div className="attachment-grid" style={{ marginTop: 16 }}>
                    {existingAttachments.map((att, i) => (
                      <div key={`exist-${i}`} className="attachment-item" style={{ position: 'relative' }}>
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
                        <button
                          type="button"
                          className="attachment-remove-btn"
                          onClick={(e) => { e.stopPropagation(); setExistingAttachments(prev => prev.filter((_, idx) => idx !== i)); }}
                          title="Remove attachment"
                        >
                          <X size={14} />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {previews.length > 0 && (
                  <div className="attachment-grid" style={{ marginTop: 16 }}>
                    {previews.map((p, i) => (
                      <div key={`new-${i}`} className="attachment-item" style={{ position: 'relative' }}>
                        {p.type.startsWith('image/') ? (
                          <img src={p.url} alt={p.name} />
                        ) : p.type.startsWith('video/') ? (
                          <video src={p.url} controls />
                        ) : (
                          <div className="attachment-file"><span>{p.name}</span></div>
                        )}
                        <button
                          type="button"
                          className="attachment-remove-btn"
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          title="Remove attachment"
                        >
                          <X size={14} />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {prefilled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--accent-light)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                    <Zap size={14} />
                    Pre-filled from AI Generator
                  </div>
                )}
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => navigate(-1)}
                  style={{ borderRadius: 12, padding: '10px 20px', fontWeight: 600, gap: 8, width: '100%', justifyContent: 'center' }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              </div>
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
                    <label className="form-label">Project *</label>
                    <select 
                      id="bug-project" 
                      className="form-control form-select" 
                      value={form.projectId} 
                      onChange={handleProject}
                      required
                    >
                      <option value="">Select a Project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {projects.length === 0 && (
                      <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: 4 }}>
                        You must be assigned to a project first
                      </p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Assign Developer</label>
                    <select 
                      id="bug-assignee" 
                      className="form-control form-select" 
                      value={form.assigneeId} 
                      onChange={handleAssignee}
                      disabled={!form.projectId}
                    >
                      <option value="">Unassigned</option>
                      {projectDevelopers.map((d) => (
                        <option key={d.id} value={d.id}>{d.name || d.displayName || d.email?.split('@')[0]}</option>
                      ))}
                    </select>
                    {!form.projectId ? (
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        Select a project first to see assigned developers
                      </p>
                    ) : projectDevelopers.length === 0 ? (
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        No developers assigned to this project
                      </p>
                    ) : null}
                  </div>

                  {/* Platform / Environment Template */}
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Monitor size={13} /> Platform / Environment
                    </label>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                      {PLATFORMS.map(p => {
                        const Icon = p === 'Web' ? Monitor : p === 'Mobile' ? Smartphone : Server;
                        const active = form.platform === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, platform: p }))}
                            style={{
                              flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
                              border: active ? '2px solid #6366f1' : '1px solid var(--border)',
                              background: active ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
                              color: active ? '#6366f1' : 'var(--text-muted)',
                              fontWeight: 700, fontSize: '0.72rem',
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                              transition: 'all 0.15s',
                            }}
                          >
                            <Icon size={14} />
                            {p}
                          </button>
                        );
                      })}
                    </div>

                    {form.platform === 'Web' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <select className="form-control form-select" value={form.browser} onChange={e => setForm(f => ({ ...f, browser: e.target.value }))}>
                          <option value="">Browser (optional)</option>
                          {BROWSERS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <select className="form-control form-select" value={form.osWeb} onChange={e => setForm(f => ({ ...f, osWeb: e.target.value }))}>
                          <option value="">Operating System (optional)</option>
                          {OS_WEB.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <select className="form-control form-select" value={form.screenResolution} onChange={e => setForm(f => ({ ...f, screenResolution: e.target.value }))}>
                          <option value="">Screen Resolution (optional)</option>
                          {RESOLUTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                    )}
                    {form.platform === 'Mobile' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input className="form-control" placeholder="Device Model (e.g. iPhone 14, Pixel 7)" value={form.deviceModel} onChange={e => setForm(f => ({ ...f, deviceModel: e.target.value }))} />
                        <select className="form-control form-select" value={form.osMobile} onChange={e => setForm(f => ({ ...f, osMobile: e.target.value }))}>
                          <option value="">OS Version (optional)</option>
                          {OS_MOBILE.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <input className="form-control" placeholder="App Version (e.g. 2.1.0)" value={form.appVersion} onChange={e => setForm(f => ({ ...f, appVersion: e.target.value }))} />
                        <select className="form-control form-select" value={form.network} onChange={e => setForm(f => ({ ...f, network: e.target.value }))}>
                          <option value="">Network (optional)</option>
                          {NETWORKS.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                    )}
                    {form.platform === 'API' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input className="form-control" placeholder="Endpoint (e.g. /api/v1/users)" value={form.apiEndpoint} onChange={e => setForm(f => ({ ...f, apiEndpoint: e.target.value }))} />
                        <select className="form-control form-select" value={form.httpMethod} onChange={e => setForm(f => ({ ...f, httpMethod: e.target.value }))}>
                          <option value="">HTTP Method (optional)</option>
                          {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <input className="form-control" placeholder="Response Code (e.g. 500, 404)" value={form.responseCode} onChange={e => setForm(f => ({ ...f, responseCode: e.target.value }))} />
                        <textarea className="form-control" placeholder="Request Payload (optional)" value={form.requestPayload} onChange={e => setForm(f => ({ ...f, requestPayload: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
                      </div>
                    )}
                  </div>


                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tag size={13} /> Tags
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type tag & press Enter"
                      value={form.tagInput}
                      onChange={(e) => setForm((f) => ({ ...f, tagInput: e.target.value }))}
                      onKeyDown={addTag}
                    />
                    {/* AI Suggestions */}
                    {tagSuggestions.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Sparkles size={11} style={{ color: '#6366f1' }} /> Smart suggestions
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {tagSuggestions.map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => addTagDirect(s)}
                              style={{
                                fontSize: '0.7rem', padding: '3px 9px', borderRadius: 99,
                                border: '1px dashed rgba(99,102,241,0.4)',
                                background: 'rgba(99,102,241,0.06)', color: '#6366f1',
                                cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s',
                              }}
                            >
                              + {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {form.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {form.tags.map((tag) => (
                          <span
                            key={tag}
                            onClick={() => removeTag(tag)}
                            style={{
                              fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px',
                              borderRadius: 99, cursor: 'pointer',
                              background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                              border: '1px solid rgba(99,102,241,0.2)',
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              transition: 'all 0.15s',
                            }}
                          >
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
