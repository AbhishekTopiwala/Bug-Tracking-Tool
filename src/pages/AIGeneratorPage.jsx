import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Wand2, Loader2, Copy, CheckCheck, ChevronRight,
  RotateCcw, AlertCircle, ArrowRight
} from 'lucide-react';
import Topbar from '../components/Topbar';
import { generateBugFromNote } from '../services/geminiService';
import { getAllBugs } from '../services/firestoreService';
import toast from 'react-hot-toast';

export default function AIGeneratorPage() {
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();

  const examples = [
    'video selects 360p instead of 720p when auto quality is enabled',
    'login button not responding on mobile Safari when password autofill is used',
    'search results show deleted items when filtering by date',
    'notification count resets to 0 after page refresh even with unread items',
    'PDF export cuts off last page when document exceeds 10 pages',
  ];

  const handleGenerate = async () => {
    if (!note.trim()) return toast.error('Please enter a QA note first');
    setLoading(true);
    setResult(null);
    try {
      const bug = await generateBugFromNote(note);
      setResult(bug);
      setHistory((h) => [{ note, bug, timestamp: new Date() }, ...h.slice(0, 4)]);
      toast.success('Bug report generated! ✨');
    } catch (err) {
      console.error(err);
      toast.error('AI generation failed. Check your Gemini API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    const text = `**${result.title}**\n\nDescription: ${result.description}\n\nSteps:\n${result.stepsToReproduce?.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nExpected: ${result.expectedResult}\nActual: ${result.actualResult}\nPriority: ${result.priority}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const handleUseInReport = () => {
    navigate('/qa/bugs/new', { state: { prefilled: result } });
  };

  return (
    <>
      <Topbar title="AI Bug Generator" subtitle="Turn your quick QA notes into structured, professional bug reports instantly" />
      <div className="page-container">

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Input Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="ai-panel">
              <div className="ai-label">
                <Zap size={14} className="ai-sparkle" />
                Powered by Gemini AI
              </div>

              <div className="form-group">
                <label className="form-label">Your QA Note</label>
                <textarea
                  id="ai-note-input"
                  className="form-control"
                  placeholder="Describe the bug in your own words... e.g. 'video auto-quality picks 360p instead of 720p'"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={5}
                  style={{ resize: 'none' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
                  }}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Press Ctrl+Enter to generate</p>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  id="ai-generate-btn"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={handleGenerate}
                  disabled={loading || !note.trim()}
                >
                  {loading ? (
                    <>
                      <div className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 size={16} />
                      Generate Bug Report
                    </>
                  )}
                </button>
                {note && (
                  <button className="btn btn-secondary btn-icon" onClick={() => { setNote(''); setResult(null); }}>
                    <RotateCcw size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Examples */}
            <div className="card" style={{ padding: 20 }}>
              <h4 style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                💡 Try These Examples
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {examples.map((ex, i) => (
                  <button
                    key={i}
                    className="btn btn-ghost"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '8px 12px', fontSize: '0.82rem', gap: 8 }}
                    onClick={() => setNote(ex)}
                  >
                    <ChevronRight size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="card" style={{ padding: 20 }}>
                <h4 style={{ color: 'var(--text-secondary)', marginBottom: 12, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  🕐 Recent Generations
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {history.map((h, i) => (
                    <button
                      key={i}
                      className="btn btn-ghost"
                      style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '8px 12px', fontSize: '0.8rem' }}
                      onClick={() => { setNote(h.note); setResult(h.bug); }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.bug.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Result Panel */}
          <div>
            {loading && (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{ position: 'relative' }}>
                    <div className="spinner spinner-lg" />
                    <Zap size={18} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>AI is analyzing your note...</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>This takes just a few seconds</p>
                  </div>
                </div>
              </div>
            )}

            {!loading && !result && (
              <div className="empty-state" style={{ padding: 60 }}>
                <Wand2 size={64} />
                <h3>Ready to generate</h3>
                <p>Enter a short QA note on the left and click "Generate Bug Report" to see the magic happen</p>
              </div>
            )}

            {!loading && result && (
              <div className="card animate-slide" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className={`badge badge-${result.priority?.toLowerCase()}`}>{result.priority}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>AI Generated</span>
                    </div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.4 }}>{result.title}</h2>
                  </div>
                  <button className="btn btn-ghost btn-icon" onClick={handleCopy} title="Copy">
                    {copied ? <CheckCheck size={16} style={{ color: 'var(--success)' }} /> : <Copy size={16} />}
                  </button>
                </div>

                <div className="divider" />

                {/* Description */}
                {result.description && (
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      Description
                    </p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{result.description}</p>
                  </div>
                )}

                {/* Steps */}
                {result.stepsToReproduce?.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      Steps to Reproduce
                    </p>
                    <div className="steps-list">
                      {result.stepsToReproduce.map((step, i) => (
                        <div key={i} className="step-item">
                          <div className="step-bullet">{i + 1}</div>
                          <p className="step-text">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expected vs Actual */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      ✓ Expected
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{result.expectedResult}</p>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                      ✗ Actual
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{result.actualResult}</p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    id="ai-use-report-btn"
                    className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={handleUseInReport}
                  >
                    <ArrowRight size={16} />
                    Use in Bug Report
                  </button>
                  <button className="btn btn-secondary" onClick={handleGenerate}>
                    <RotateCcw size={15} />
                    Regenerate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
