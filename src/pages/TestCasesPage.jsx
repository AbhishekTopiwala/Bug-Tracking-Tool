import { useState } from 'react';
import { TestTube2, Wand2, ChevronDown, ChevronUp, Loader2, CheckCircle2, XCircle, AlertTriangle, Copy, CheckCheck } from 'lucide-react';
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
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('positive');

  const examples = [
    'User login with email and password',
    'File upload with size validation',
    'Search functionality with filters',
    'Password reset via email',
    'Video quality auto-selection',
  ];

  const handleGenerate = async () => {
    if (!feature.trim()) return toast.error('Enter a feature description first');
    setLoading(true);
    setResult(null);
    try {
      const cases = await generateTestCases(feature);
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

        {/* Input */}
        <div className="ai-panel" style={{ marginBottom: 28 }}>
          <div className="ai-label">
            <TestTube2 size={14} className="ai-sparkle" />
            Gemini-Powered Test Generation
          </div>

          <div style={{ display: 'flex', marginBottom: 16 }}>
            <input
              id="tc-feature-input"
              type="text"
              className="form-control"
              placeholder="Feature name or description... e.g. 'User registration with email verification'"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              style={{ flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
            />
            <button
              id="tc-generate-btn"
              className="btn btn-primary"
              onClick={handleGenerate}
              disabled={loading || !feature.trim()}
              style={{ whiteSpace: 'nowrap', borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Generating...</>
              ) : (
                <><Wand2 size={16} /> Generate</>
              )}
            </button>
          </div>

          {/* Examples */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {examples.map((ex) => (
              <button
                key={ex}
                className="filter-chip"
                onClick={() => setFeature(ex)}
              >
                {ex}
              </button>
            ))}
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
            <p>Enter a feature description above and let AI generate comprehensive test cases for you</p>
          </div>
        )}

        {/* Results */}
        {!loading && result && (
          <div>
            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 20, width: 'fit-content' }}>
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
