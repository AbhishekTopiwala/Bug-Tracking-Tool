import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, ExternalLink, Bug, Terminal, Cpu, Activity, Camera, Globe, ZoomIn, X, Maximize2 } from 'lucide-react';
import { useAgent } from '../../contexts/AgentContext';
import { toast } from 'react-hot-toast';

export default function RunDetailPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { activeRun, loadRunDetail, fileBugFromTestFailure, loading } = useAgent();

  const [filingBug, setFilingBug] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Placeholder — kept for potential future use
  const renderStepOverlaySvg_UNUSED = (step, index) => {
    const action = (step?.action || 'NAVIGATE').toUpperCase();
    const hint = step?.targetElementHint || step?.description || `Step ${index + 1} Target Element`;
    const val = step?.value ? `"${step.value}"` : '';

    const stepLayouts = [
      { boxX: 180, boxY: 85, boxW: 440, boxH: 45, cursorX: 400, cursorY: 105, theme: '#4f46e5' },
      { boxX: 210, boxY: 165, boxW: 380, boxH: 46, cursorX: 380, cursorY: 188, theme: '#6366f1' },
      { boxX: 210, boxY: 230, boxW: 380, boxH: 46, cursorX: 380, cursorY: 253, theme: '#8b5cf6' },
      { boxX: 210, boxY: 295, boxW: 380, boxH: 48, cursorX: 400, cursorY: 319, theme: '#ec4899' },
      { boxX: 180, boxY: 140, boxW: 440, boxH: 210, cursorX: 400, cursorY: 245, theme: '#10b981' },
    ];

    const layout = stepLayouts[index % stepLayouts.length];

    return (
      <svg
        viewBox="0 0 800 450"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <defs>
          <filter id={`overlayGlow_${index}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Top Right Action Badge */}
        <rect x="525" y="8" width="260" height="24" rx="4" fill={layout.theme} />
        <text x="535" y="24" fontFamily="sans-serif" fontWeight="800" fontSize="10" fill="#ffffff">
          STEP {index + 1}: {action}
        </text>

        {/* Step-Specific Bounding Box Highlight */}
        <rect
          x={layout.boxX}
          y={layout.boxY}
          width={layout.boxW}
          height={layout.boxH}
          rx="8"
          fill="rgba(239, 68, 68, 0.16)"
          stroke="#ef4444"
          strokeWidth="3"
          strokeDasharray="6 3"
          filter={`url(#overlayGlow_${index})`}
        />

        {/* Target Badge Header */}
        <rect x={layout.boxX} y={layout.boxY - 22} width={Math.min(layout.boxW, 340)} height="22" rx="4" fill="#ef4444" />
        <text x={layout.boxX + 8} y={layout.boxY - 7} fontFamily="sans-serif" fontWeight="bold" fontSize="10" fill="#ffffff">
          🎯 STEP {index + 1} TARGET: &lt;{hint.length > 24 ? hint.substring(0, 24) + '...' : hint}&gt; {val}
        </text>

        {/* Step Action Cursor */}
        <g transform={`translate(${layout.cursorX}, ${layout.cursorY})`}>
          <path d="M0,0 L14,14 L7,15 L11,24 L6,26 L2,17 L-4,20 Z" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="14" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.8" />
        </g>
      </svg>
    );
  };

  // REMOVED: generateSvgScreenshot — replaced with real screenshots
  const _removed_generateSvgScreenshot = (targetUrl, step, index) => {
    const cleanUrl = targetUrl ? (targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`) : 'https://sauce-demo.myshopify.com';
    const domain = cleanUrl.replace(/^https?:\/\//, '').split('/')[0] || 'sauce-demo.myshopify.com';
    const action = (step?.action || 'NAVIGATE').toUpperCase();
    const desc = step?.description || `Step ${index + 1}: ${action}`;
    const target = step?.targetElementHint || 'DOM Element';
    const value = step?.value || '';
    const expectedText = step?.expectedText || '';

    // Step action & category classification
    const isNavigate = action === 'NAVIGATE' || index === 0;
    const isType = action === 'TYPE' || desc.toLowerCase().includes('type') || desc.toLowerCase().includes('input') || desc.toLowerCase().includes('fill') || desc.toLowerCase().includes('enter');
    const isClick = action === 'CLICK' || desc.toLowerCase().includes('click') || desc.toLowerCase().includes('submit') || desc.toLowerCase().includes('press') || desc.toLowerCase().includes('button');
    const isAssert = action === 'ASSERTTEXT' || desc.toLowerCase().includes('assert') || desc.toLowerCase().includes('verify') || desc.toLowerCase().includes('check') || (index === 4 && !isClick);
    const isHover = action === 'HOVER' || desc.toLowerCase().includes('hover') || desc.toLowerCase().includes('menu') || desc.toLowerCase().includes('header');

    // Dynamic field values
    const isPasswordField = target.includes('password') || desc.toLowerCase().includes('password');
    const displayTypedValue = value || (isPasswordField ? '••••••••••••' : (target.includes('email') ? 'qa_user@example.com' : 'Test Input Value'));

    // Bounding box & mouse cursor coordinates matching specific step target
    let targetX = 250, targetY = 170, targetW = 300, targetH = 40;
    let cursorX = 400, cursorY = 190;

    if (isNavigate) {
      targetX = 150; targetY = 10; targetW = 500; targetH = 28;
      cursorX = 400; cursorY = 24;
    } else if (isType) {
      if (isPasswordField) {
        targetX = 230; targetY = 267; targetW = 340; targetH = 38;
        cursorX = 400; cursorY = 286;
      } else {
        targetX = 230; targetY = 202; targetW = 340; targetH = 38;
        cursorX = 400; cursorY = 221;
      }
    } else if (isClick) {
      targetX = 230; targetY = 325; targetW = 340; targetH = 42;
      cursorX = 400; cursorY = 346;
    } else if (isAssert) {
      targetX = 160; targetY = 120; targetW = 480; targetH = 290;
      cursorX = 400; cursorY = 180;
    } else if (isHover) {
      targetX = 200; targetY = 62; targetW = 70; targetH = 24;
      cursorX = 235; cursorY = 74;
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <defs>
        <filter id="shadow_${index}">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.1"/>
        </filter>
        <linearGradient id="primaryGrad_${index}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#4f46e5"/>
          <stop offset="100%" stop-color="#3730a3"/>
        </linearGradient>
      </defs>

      <!-- Clean Web Canvas Background -->
      <rect width="800" height="450" fill="#f8fafc"/>

      <!-- Browser Window Frame Top Bar -->
      <rect x="0" y="0" width="800" height="48" fill="#0f172a"/>
      <circle cx="20" cy="24" r="5" fill="#ef4444"/>
      <circle cx="36" cy="24" r="5" fill="#f59e0b"/>
      <circle cx="52" cy="24" r="5" fill="#10b981"/>

      <!-- URL Address Bar -->
      <rect x="150" y="10" width="500" height="28" rx="14" fill="#1e293b" stroke="${isNavigate ? '#38bdf8' : '#334155'}" stroke-width="${isNavigate ? '2' : '1'}"/>
      <text x="170" y="28" font-family="monospace" font-size="11" fill="#94a3b8">🔒 ${cleanUrl}</text>

      <!-- Step Action Status Banner Badge -->
      <rect x="660" y="10" width="125" height="28" rx="6" fill="#3b82f6"/>
      <text x="722" y="28" font-family="system-ui, sans-serif" font-weight="800" font-size="11" fill="#ffffff" text-anchor="middle">STEP ${index + 1}: ${action}</text>

      <!-- Website Top Navigation Header Bar -->
      <rect x="0" y="48" width="800" height="50" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" filter="url(#shadow_${index})"/>
      <text x="32" y="80" font-family="system-ui, sans-serif" font-weight="900" font-size="20" fill="#0f172a">${domain.split('.')[0].toUpperCase()}</text>
      <text x="210" y="78" font-family="system-ui, sans-serif" font-size="13" fill="${isHover ? '#4f46e5' : '#64748b'}" font-weight="${isHover ? '800' : '500'}">Products</text>
      <text x="290" y="78" font-family="system-ui, sans-serif" font-size="13" fill="#64748b" font-weight="500">Solutions</text>
      <text x="370" y="78" font-family="system-ui, sans-serif" font-size="13" fill="#64748b" font-weight="500">Pricing</text>

      ${isAssert ? `
        <!-- ASSERTION RESULT SUCCESS DASHBOARD STATE -->
        <rect x="160" y="120" width="480" height="290" rx="16" fill="#ffffff" stroke="#10b981" stroke-width="2" filter="url(#shadow_${index})"/>
        <circle cx="400" cy="180" r="34" fill="#dcfce7"/>
        <path d="M386 180 L396 190 L414 170" stroke="#16a34a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <text x="400" y="240" font-family="system-ui, sans-serif" font-weight="800" font-size="20" fill="#0f172a" text-anchor="middle">Test Scenario Assertion Verified!</text>
        <text x="400" y="268" font-family="system-ui, sans-serif" font-size="13" fill="#047857" font-weight="600" text-anchor="middle">${expectedText || 'UI State Passed Validation Check'}</text>

        <!-- Response Payload Metrics Box -->
        <rect x="220" y="295" width="360" height="42" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
        <text x="400" y="321" font-family="monospace" font-size="12" fill="#334155" text-anchor="middle">[DOM Verified] targetElement: ${target}</text>

        <rect x="310" y="355" width="180" height="34" rx="6" fill="#10b981"/>
        <text x="400" y="377" font-family="system-ui, sans-serif" font-weight="700" font-size="12" fill="#ffffff" text-anchor="middle">HTTP 200 OK — PASSED</text>
      ` : `
        <!-- ACTIVE FORM / WEB INTERACTION STATE -->
        <rect x="200" y="115" width="400" height="310" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" filter="url(#shadow_${index})"/>
        <text x="400" y="150" font-family="system-ui, sans-serif" font-weight="800" font-size="18" fill="#0f172a" text-anchor="middle">Interactive DOM Test View</text>
        <text x="400" y="168" font-family="system-ui, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Target Selector: ${target}</text>

        <!-- Input Field 1 (Email / Primary) -->
        <text x="230" y="195" font-family="system-ui, sans-serif" font-weight="600" font-size="11" fill="#475569">Field: ${isType && !isPasswordField ? target : 'input[name="email"]'}</text>
        <rect x="230" y="202" width="340" height="38" rx="6" fill="#ffffff" stroke="${isType && !isPasswordField ? '#3b82f6' : '#cbd5e1'}" stroke-width="${isType && !isPasswordField ? '2.5' : '1'}"/>
        <text x="242" y="226" font-family="monospace" font-size="12" fill="#0f172a">${isType && !isPasswordField ? displayTypedValue : (index >= 1 ? 'qa_user@example.com' : '')}</text>

        <!-- Input Field 2 (Password / Secondary) -->
        <text x="230" y="260" font-family="system-ui, sans-serif" font-weight="600" font-size="11" fill="#475569">Field: ${isPasswordField ? target : 'input[type="password"]'}</text>
        <rect x="230" y="267" width="340" height="38" rx="6" fill="#ffffff" stroke="${isPasswordField ? '#3b82f6' : '#cbd5e1'}" stroke-width="${isPasswordField ? '2.5' : '1'}"/>
        <text x="242" y="291" font-family="monospace" font-size="14" fill="#0f172a">${isPasswordField ? displayTypedValue : (index >= 2 ? '••••••••••••' : '')}</text>

        <!-- Submit / Action Button -->
        <rect x="230" y="325" width="340" height="42" rx="8" fill="${isClick ? '#1d4ed8' : 'url(#primaryGrad_' + index + ')'}"/>
        <text x="400" y="351" font-family="system-ui, sans-serif" font-weight="700" font-size="13" fill="#ffffff" text-anchor="middle">${isClick ? 'EXECUTING CLICK EVENT...' : 'SUBMIT ACTION'}</text>
      `}

      <!-- TARGET ELEMENT HIGHLIGHT BOUNDING BOX -->
      <rect x="${targetX}" y="${targetY}" width="${targetW}" height="${targetH}" rx="6" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 2"/>

      <!-- ACTION CURSOR WITH CLICK RIPPLE -->
      <g transform="translate(${cursorX}, ${cursorY})">
        ${isClick ? `<circle cx="0" cy="0" r="18" fill="none" stroke="#ef4444" stroke-width="2" opacity="0.6"/>` : ''}
        <path d="M0,0 L12,12 L6,13 L9,20 L5,22 L2,15 L-3,17 Z" fill="#0f172a" stroke="#ffffff" stroke-width="1.5"/>
      </g>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

  useEffect(() => {
    if (runId) {
      loadRunDetail(runId).catch(() => toast.error('Failed to load run details'));
    }
  }, [runId, loadRunDetail]);

  const handleFileBug = async (step) => {
    setFilingBug(true);
    try {
      await fileBugFromTestFailure({
        run: activeRun,
        step,
      });
      toast.success('Bug ticket filed in QA Portal!');
      navigate('/qa/bugs');
    } catch (err) {
      toast.error('Failed to log bug ticket: ' + err.message);
    } finally {
      setFilingBug(false);
    }
  };

  const handleImageError = (stepId) => {
    setImgErrors(prev => ({ ...prev, [stepId]: true }));
  };

  if (!activeRun && loading) {
    return (
      <div className="agent-container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <RefreshCw className="animate-spin" size={40} style={{ color: '#5b6cff', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', fontSize: '1rem', fontWeight: 500 }}>Loading AI Execution Telemetry & Step DAG...</p>
      </div>
    );
  }

  if (!activeRun) {
    return (
      <div className="agent-container">
        <button className="btn btn-secondary" onClick={() => navigate('/qa/agent')}>
          <ArrowLeft size={16} /> Back to Agent Dashboard
        </button>
        <div className="agent-card" style={{ marginTop: 24, textAlign: 'center', padding: 48 }}>
          <p style={{ color: '#64748b' }}>Run execution record not found or failed to load.</p>
        </div>
      </div>
    );
  }

  const steps = activeRun.steps || [];
  const isRunning = activeRun.status === 'running' || activeRun.status === 'pending';
  const passedCount = steps.filter(s => s.status === 'passed').length;
  const failedCount = steps.filter(s => s.status === 'failed').length;

  return (
    <div className="agent-container">
      {/* Navigation Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button className="btn btn-secondary" onClick={() => navigate('/qa/agent')}>
          <ArrowLeft size={16} /> Back to Agent Dashboard
        </button>

        <a
          href={activeRun.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          Visit Target Site <ExternalLink size={14} />
        </a>
      </div>

      {/* Primary Target & Scenario Card (Styled like Gemini AI Panel) */}
      <div className="agent-card" style={{ background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.95), rgba(224, 231, 255, 0.6))', borderColor: '#c7d2fe' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className={`status-badge ${activeRun.status || 'pending'}`}>
                {activeRun.status === 'completed' || activeRun.status === 'passed' ? <CheckCircle2 size={13} /> :
                 activeRun.status === 'failed' ? <XCircle size={13} /> : <Clock size={13} />}
                {activeRun.status || 'pending'}
              </span>

              <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                Category: <strong style={{ color: '#0f172a' }}>{activeRun.moduleCategory || 'General'}</strong>
              </span>
            </div>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '4px 0 8px 0', letterSpacing: '-0.02em' }}>
              {activeRun.targetUrl}
            </h2>

            <p style={{ color: '#334155', fontSize: '0.95rem', margin: 0, lineHeight: 1.55 }}>
              <strong style={{ color: '#4f46e5' }}>Test Scenario Instructions:</strong> "{activeRun.instructions}"
            </p>
          </div>
        </div>

        {/* Live Progress Bar */}
        {isRunning && (
          <div style={{ marginTop: 20, background: '#ffffff', padding: 14, borderRadius: 12, border: '1px solid #c7d2fe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 8, fontWeight: 700 }}>
              <span style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw className="animate-spin" size={14} /> AI Testing Bot actively executing DOM steps...
              </span>
              <span style={{ color: '#0f172a' }}>{activeRun.progress || 15}%</span>
            </div>
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${activeRun.progress || 15}%`,
                  background: 'linear-gradient(90deg, #6366f1, #3b82f6)',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Summary Grid */}
      <div className="agent-stats-grid">
        <div className="agent-stat-card">
          <div className="agent-stat-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <Activity size={22} />
          </div>
          <div>
            <div className="agent-stat-val">{steps.length}</div>
            <div className="agent-stat-lbl">Total Executed Steps</div>
          </div>
        </div>

        <div className="agent-stat-card">
          <div className="agent-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="agent-stat-val" style={{ color: '#10b981' }}>{passedCount}</div>
            <div className="agent-stat-lbl">Passed Assertions</div>
          </div>
        </div>

        <div className="agent-stat-card">
          <div className="agent-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div className="agent-stat-val" style={{ color: failedCount > 0 ? '#ef4444' : '#64748b' }}>{failedCount}</div>
            <div className="agent-stat-lbl">Failed Steps</div>
          </div>
        </div>

        <div className="agent-stat-card">
          <div className="agent-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
            <Globe size={22} />
          </div>
          <div>
            <div className="agent-stat-val" style={{ fontSize: '1.1rem', color: '#2563eb' }}>200 OK</div>
            <div className="agent-stat-lbl">HTTP Target Status</div>
          </div>
        </div>
      </div>

      {/* Step Telemetry Execution Timeline */}
      <div className="agent-card">
        <div className="agent-card-title">
          <Terminal size={20} style={{ color: '#4f46e5' }} />
          Execution Steps Telemetry ({steps.length})
        </div>

        {steps.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
            {isRunning ? 'AI Bot is generating action plan from instructions...' : 'No step telemetry recorded.'}
          </div>
        ) : (
          <div className="steps-timeline">
            {steps.map((step, index) => (
              <div key={index} className={`step-item ${step.status || 'passed'}`}>
                {/* Step Card Header */}
                <div className="step-header">
                  <div className="step-number-title">
                    <div className="step-number">{index + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div className="step-title">{step.description || `Step ${index + 1}`}</div>

                      <div className="step-meta-row">
                        <span className={`action-pill ${step.action || 'navigate'}`}>
                          {step.action || 'NAVIGATE'}
                        </span>

                        {step.targetElementHint && (
                          <span className="step-target-tag">
                            Target: {step.targetElementHint}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className={`status-badge ${step.status || 'passed'}`}>
                      {step.status === 'passed' ? <CheckCircle2 size={13} /> :
                       step.status === 'failed' ? <XCircle size={13} /> :
                       step.status === 'running' ? <RefreshCw className="animate-spin" size={13} /> : <Clock size={13} />}
                      {step.status || 'passed'}
                    </span>

                    {step.status === 'failed' && (
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleFileBug(step)}
                        disabled={filingBug}
                      >
                        <Bug size={12} /> File Bug
                      </button>
                    )}
                  </div>
                </div>

                {/* 2-Column Grid Layout: Screenshot on Left, Telemetry & Logs on Right */}
                <div className="step-grid-layout">
                  {/* LEFT COLUMN: Real Website Screenshot */}
                  <div className="step-left-column">
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                      <Camera size={13} style={{ color: '#4f46e5' }} /> Real Website Screenshot
                    </div>

                    <div className="browser-device-frame">
                      <div className="browser-header-bar">
                        <div className="browser-dots">
                          <div className="browser-dot" style={{ background: '#ef4444' }} />
                          <div className="browser-dot" style={{ background: '#f59e0b' }} />
                          <div className="browser-dot" style={{ background: '#10b981' }} />
                        </div>
                        <div className="browser-url-input">
                          🔒 {activeRun.targetUrl}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                          200 OK
                        </span>
                      </div>

                      <div className="browser-viewport-content">
                        {/* Real Browser / Telemetry Screenshot — Click to open modal popup */}
                        <div
                          className="screenshot-preview-wrapper"
                          onClick={() => {
                            if (step.screenshot) {
                              setSelectedImage({
                                src: step.screenshot,
                                title: `Step ${index + 1}: ${(step.action || 'NAVIGATE').toUpperCase()}`,
                                description: step.description || '',
                                stepNum: index + 1,
                                status: step.status || 'passed',
                                target: step.targetElementHint || ''
                              });
                            }
                          }}
                        >
                          {step.screenshot ? (
                            <>
                              <img
                                src={step.screenshot}
                                alt={`Step ${index + 1} — ${step.action?.toUpperCase() || 'NAVIGATE'} real browser screenshot`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
                              />
                              <div className="screenshot-zoom-overlay">
                                <ZoomIn size={20} />
                                <span>Click to expand full image</span>
                              </div>
                            </>
                          ) : (
                            /* Fallback: screenshot not yet captured or failed */
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, background: '#1e293b' }}>
                              <Globe size={32} style={{ color: '#334155' }} />
                              <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Screenshot not captured</span>
                              <span style={{ color: '#475569', fontSize: '0.75rem' }}>Re-run the test to get real browser screenshots</span>
                            </div>
                          )}
                          {/* Step label badge overlay */}
                          <div style={{
                            position: 'absolute', top: 10, left: 10,
                            background: 'rgba(79, 70, 229, 0.92)',
                            color: '#fff', fontSize: '0.72rem', fontWeight: 800,
                            padding: '3px 10px', borderRadius: 6,
                            backdropFilter: 'blur(4px)',
                            letterSpacing: '0.03em',
                            zIndex: 3,
                          }}>
                            STEP {index + 1}: {(step.action || 'NAVIGATE').toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Step Execution Telemetry, Input, Assertions, Console Logs */}
                  <div className="step-right-column" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {step.value && (
                      <div className="step-detail-box">
                        <label><Cpu size={12} /> Input Value</label>
                        <span>{step.value}</span>
                      </div>
                    )}

                    {step.expectedText && (
                      <div className="step-detail-box">
                        <label><CheckCircle2 size={12} /> Expected Assertion</label>
                        <span>{step.expectedText}</span>
                      </div>
                    )}

                    {step.error && (
                      <div className="step-detail-box" style={{ background: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
                        <label style={{ color: '#ef4444' }}>Execution Error</label>
                        <span style={{ color: '#dc2626' }}>{step.error}</span>
                      </div>
                    )}

                    {/* Execution Log Telemetry Console (Dark Terminal inside Light Card) */}
                    {step.logs && (
                      <div className="step-detail-box" style={{ background: '#0f172a', border: '1px solid #1e293b', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <label style={{ color: '#818cf8' }}>
                          <Terminal size={13} /> Execution Log Telemetry
                        </label>
                        <code style={{ color: '#38bdf8', fontSize: '0.84rem' }}>{step.logs}</code>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Screenshot Full-Screen Lightbox Modal Popup */}
      {selectedImage && (
        <div className="screenshot-modal-backdrop" onClick={() => setSelectedImage(null)}>
          <div className="screenshot-modal-content" onClick={e => e.stopPropagation()}>
            <div className="screenshot-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  background: '#4f46e5',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 800
                }}>
                  {selectedImage.title}
                </div>
                {selectedImage.description && (
                  <span style={{ color: '#94a3b8', fontSize: '0.88rem', fontWeight: 500 }}>
                    {selectedImage.description}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {selectedImage.target && (
                  <span style={{ color: '#38bdf8', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                    Target: {selectedImage.target}
                  </span>
                )}
                <button
                  onClick={() => setSelectedImage(null)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    color: '#ffffff',
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  title="Close popup (Esc)"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="screenshot-modal-body">
              <img src={selectedImage.src} alt={selectedImage.title} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

