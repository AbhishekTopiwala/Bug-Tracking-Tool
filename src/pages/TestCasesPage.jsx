import { useState, useEffect, useRef } from 'react';
import { TestTube2, Wand2, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, AlertTriangle, Copy, CheckCheck, Download, FileSpreadsheet } from 'lucide-react';
import Topbar from '../components/Topbar';
import { generateTestCases } from '../services/geminiService';
import toast from 'react-hot-toast';

const TypeIcon = {
  positive: CheckCircle2,
  negative: XCircle,
  edge: AlertTriangle,
};

const TypeColors = {
  positive: { color: 'var(--success)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  negative: { color: 'var(--danger)', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
  edge: { color: 'var(--warning)', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
};

function TestCaseCard({ tc, type }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { color, bg, border } = TypeColors[type];
  const Icon = TypeIcon[type];

  const handleCopy = (e) => {
    e.stopPropagation();
    const text = `${tc.id}: ${tc.title}\nSteps:\n${tc.steps?.map((s, i) => `${i + 1}. ${s}`).join('\n')}\nExpected: ${tc.expected}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="test-case"
      style={{ borderLeft: `3px solid ${color}`, background: bg, borderTopColor: border, borderRightColor: border, borderBottomColor: border, cursor: 'pointer' }}
      onClick={() => setOpen((v) => !v)}
    >
      <div className="test-case-header">
        <span className="test-case-id" style={{ color }}>{tc.id}</span>
        <Icon size={14} style={{ color }} />
        <span className="test-case-title" style={{ flex: 1 }}>{tc.title}</span>
        <button onClick={handleCopy} className="btn btn-ghost btn-icon" style={{ padding: 4 }}>
          {copied ? <CheckCheck size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
        </button>
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${border}` }} onClick={(e) => e.stopPropagation()}>
          {tc.steps?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Steps
              </p>
              <div className="test-case-steps">
                {tc.steps.map((s, i) => (
                  <div key={i} className="test-case-step">
                    <span className="step-num">{i + 1}.</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {tc.expected && (
            <div>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Expected Result
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{tc.expected}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TestCasesPage() {
  const [feature, setFeature] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('positive');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowExportDropdown(false);
      }
    };
    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  const handleImageChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      setImage({
        file,
        base64: base64Data,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleExportCSV = (allTabs = false) => {
    if (!result) return;
    const casesToExport = allTabs
      ? [
          ...(result.positive || []).map(tc => ({ ...tc, type: 'Positive' })),
          ...(result.negative || []).map(tc => ({ ...tc, type: 'Negative' })),
          ...(result.edge || []).map(tc => ({ ...tc, type: 'Edge' }))
        ]
      : (result[activeTab] || []).map(tc => ({ ...tc, type: activeTab.charAt(0).toUpperCase() + activeTab.slice(1) }));

    if (casesToExport.length === 0) {
      toast.error("No test cases to export");
      return;
    }

    const headers = ["ID", "Title", "Type", "Steps", "Expected Result"];
    const rows = casesToExport.map(tc => [
      tc.id || '',
      tc.title || '',
      tc.type || '',
      tc.steps ? tc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : '',
      tc.expected || ''
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `TestCases_${feature.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'Export'}_${allTabs ? 'All' : activeTab}.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV file downloaded successfully!");
  };

  const examples = [
    'User login with email and password',
    'File upload with size validation',
    'Search functionality with filters',
    'Password reset via email',
    'Video quality auto-selection',
  ];

  const handleGenerate = async () => {
    if (!feature.trim() && !image) {
      return toast.error('Please enter a description or upload an image first');
    }
    setLoading(true);
    setResult(null);
    try {
      const cases = await generateTestCases(
        feature.trim(),
        image ? image.base64 : null,
        image ? image.mimeType : null
      );
      setResult(cases);
      toast.success(`Generated ${(cases.positive?.length || 0) + (cases.negative?.length || 0) + (cases.edge?.length || 0)
        } test cases! 🧪`);
    } catch (err) {
      console.error(err);
      toast.error('Test case generation failed. Check your Gemini API key.');
    } finally {
      setLoading(false);
    }
  };

  const tabs = result ? [
    { key: 'positive', label: `Positive (${result.positive?.length || 0})`, Icon: CheckCircle2, color: 'var(--success)' },
    { key: 'negative', label: `Negative (${result.negative?.length || 0})`, Icon: XCircle, color: 'var(--danger)' },
    { key: 'edge', label: `Edge Cases (${result.edge?.length || 0})`, Icon: AlertTriangle, color: 'var(--warning)' },
  ] : [];

  const activeCases = result?.[activeTab] || [];

  return (
    <>
      <Topbar title="Test Case Generator" subtitle="AI-powered test case generation for positive, negative, and edge cases" />
      <div className="page-container">

        {/* Input Panel */}
        <div className="ai-panel" style={{ marginBottom: 28 }}>
          <div className="ai-label">
            <TestTube2 size={14} className="ai-sparkle" />
            Gemini-Powered Test Generation
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 16 }}>
            {/* Left Column: Description input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', margin: 0 }}>
                <span style={{ fontWeight: 600 }}>Feature Description / Notes</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 400 }}>
                  {image ? 'Optional' : 'Required'}
                </span>
              </label>
              <textarea
                id="tc-feature-input"
                className="form-control"
                placeholder="Describe the feature or write notes about the uploaded website page image..."
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleGenerate();
                  }
                }}
                rows={4}
                style={{ resize: 'none', flex: 1, minHeight: 110 }}
              />
            </div>

            {/* Right Column: Image upload/preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>Website Page Screenshot (Optional)</label>
              {imagePreview ? (
                <div className="attachment-item" style={{ flex: 1, width: '100%', minHeight: 110, maxHeight: 110, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', position: 'relative', overflow: 'hidden' }}>
                  <img src={imagePreview} alt="Screenshot preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    className="attachment-remove-btn"
                    style={{ opacity: 1, transform: 'none', background: 'rgba(239, 68, 68, 0.95)' }}
                    onClick={() => {
                      setImage(null);
                      setImagePreview(null);
                    }}
                  >
                    <XCircle size={14} /> Remove
                  </button>
                </div>
              ) : (
                <div
                  className={`upload-zone ${dragging ? 'dragging' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    if (e.dataTransfer.files?.length > 0) {
                      handleImageChange(e.dataTransfer.files[0]);
                    }
                  }}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px', gap: 6, minHeight: 110, height: '100%' }}
                >
                  <Wand2 size={20} style={{ opacity: 0.5, color: 'var(--accent)' }} />
                  <p style={{ fontSize: '0.78rem', margin: 0, fontWeight: 600 }}>Drag image or <span style={{ color: 'var(--accent)' }}>browse</span></p>
                  <p style={{ fontSize: '0.68rem', margin: 0, color: 'var(--text-muted)' }}>PNG, JPG, WebP</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.length > 0) {
                    handleImageChange(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderTop: '1px solid rgba(91,108,255,0.1)', paddingTop: 16 }}>
            {/* Examples list */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
              {examples.map((ex) => (
                <button
                  key={ex}
                  className="filter-chip"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)' }}
                  onClick={() => setFeature(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* Submit & reset buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              {(feature || imagePreview) && (
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setFeature('');
                    setImage(null);
                    setImagePreview(null);
                  }}
                  style={{ height: 38 }}
                >
                  Clear
                </button>
              )}
              <button
                id="tc-generate-btn"
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={loading || (!feature.trim() && !image)}
                style={{ whiteSpace: 'nowrap', height: 38 }}
              >
                {loading ? (
                  <><div className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', marginRight: 6 }} /> Generating...</>
                ) : (
                  <><Wand2 size={14} style={{ marginRight: 6 }} /> Generate Test Cases</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 60, borderRadius: 'var(--radius-sm)' }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && !result && (
          <div className="empty-state">
            <TestTube2 size={64} />
            <h3>No test cases yet</h3>
            <p>Upload a screenshot of any website page, write a short description, and let our AI generate test cases for you</p>
          </div>
        )}

        {/* Results */}
        {!loading && result && (
          <div>
            {/* Tabs & Export Dropdown Container */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              {/* Tabs */}
              <div className="tabs" style={{ margin: 0, width: 'fit-content' }}>
                {tabs.map(({ key, label, Icon, color }) => (
                  <button
                    key={key}
                    className={`tab ${activeTab === key ? 'active' : ''}`}
                    onClick={() => setActiveTab(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7 }}
                  >
                    <Icon size={14} style={{ color: activeTab === key ? color : 'var(--text-muted)' }} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Export Dropdown */}
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <button
                  id="tc-export-btn"
                  className="btn btn-secondary"
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 'var(--radius-sm)', height: 38 }}
                >
                  <Download size={14} />
                  <span>Export</span>
                </button>

                {showExportDropdown && (
                  <div
                    className="tm-actions-menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      width: 220,
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 300,
                      padding: 6,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      animation: 'slideUp 0.15s ease'
                    }}
                  >
                    <div className="tm-actions-label" style={{ padding: '6px 10px 4px' }}>
                      Export Options
                    </div>
                    <button
                      className="tm-action-item"
                      onClick={() => {
                        handleExportCSV(false);
                        setShowExportDropdown(false);
                      }}
                    >
                      <FileSpreadsheet size={14} style={{ color: 'var(--success)' }} />
                      <span>Current Tab ({activeTab})</span>
                    </button>
                    <button
                      className="tm-action-item"
                      onClick={() => {
                        handleExportCSV(true);
                        setShowExportDropdown(false);
                      }}
                    >
                      <FileSpreadsheet size={14} style={{ color: 'var(--success)' }} />
                      <span>All Generated Tabs</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Test Cases */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeCases.length === 0 ? (
                <div className="empty-state" style={{ padding: 40 }}>
                  <p>No {activeTab} test cases generated</p>
                </div>
              ) : (
                activeCases.map((tc) => (
                  <TestCaseCard key={tc.id} tc={tc} type={activeTab} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
