import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, Sparkles, ChevronDown, Clock, Zap,
  Check, X, Globe, Terminal, Users, LayoutDashboard,
  Activity, Folder, Plus, MessageSquare
} from 'lucide-react';
import { PLANS, saveSelectedPlan, formatPrice } from '../services/paymentService';


const mockBugs = [
  {
    id: 'auth-error',
    title: 'Broken Google OAuth login on mobile',
    image: '/oauth_mobile_bug.png',
    description: 'User taps the "Sign in with Google" button, but a blank page renders without triggering the OAuth screen. Occurs specifically on Safari/iOS.',
    steps: [
      'Navigate to the login screen on iOS Safari.',
      'Tap the "Sign in with Google" button.',
      'Observe standard loader followed by a permanent blank layout screen.'
    ],
    severity: 'CRITICAL',
    generatedTime: '0.4s'
  },
  {
    id: 'kanban-drag',
    title: 'Kanban board card drop delay',
    image: '/kanban_drag_bug.png',
    description: 'Lag of ~1.2s when dragging cards between "In Progress" and "Done" columns on Chrome Desktop, caused by massive DOM re-renders.',
    steps: [
      'Load the project Kanban board page.',
      'Drag any bug card from "In Progress" to "Done".',
      'Note the UI stutter and lag before card successfully drops.'
    ],
    severity: 'HIGH',
    generatedTime: '0.6s'
  }
];

// pricingPlans now loaded from paymentService — see PLANS constant


const faqData = [
  {
    question: "How does the AI Bug Generator operate?",
    answer: "When QA upload screenshots, our AI engine analyzes visual metadata, OCR bounds, and system details. It cross-references typical user paths to reconstruct clean, standardized title lists and reproduction guidelines with high accuracy."
  },
  {
    question: "Can we create multi-tenant workspaces?",
    answer: "Absolutely. Qualia is built from the ground up to support organizations, team groups, and independent projects. You can easily manage distinct teams, developers, and QA structures under a unified billing layout."
  },
  {
    question: "Is my repository or workspace data secure?",
    answer: "Security is our core value. All screenshots and uploads are safely isolated in access-secured Firestore and Cloud Storage folders. Technical details are never shared or fed into open public LLM datasets."
  }
];

const tourTabs = [
  {
    id: 'qa',
    title: 'QA Workspace',
    heading: 'Robust test management built for QA teams',
    description: 'Organize manual test cases, track regression runs, upload screens/videos, and let AI translate your assets into bug cards immediately. Qualia handles the entire manual validation workflow in one space.',
    features: [
      'Visual screenshot mapping & asset storage.',
      'Custom regression suite generation & test checklists.',
      'Immediate push-to-sprint pipeline directly from failed tests.'
    ],
    preview: (
      <div className="workspace-mockup-container">
        <div className="mock-browser-window">
          {/* Title Bar */}
          <div className="mock-browser-header">
            <div className="mock-window-dots">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <div className="mock-browser-address">qualia.app/workspace/projects</div>
          </div>
          {/* Main App Layout */}
          <div className="mock-app-body">
            {/* Sidebar */}
            <div className="mock-sidebar">
              <div className="mock-sidebar-logo">
                <span className="logo-icon">Q</span>
                <span className="logo-text">Qualia</span>
              </div>
              <div className="mock-sidebar-nav">
                <div className="nav-item"><LayoutDashboard size={13} /> <span>Dashboard</span></div>
                <div className="nav-item active"><Folder size={13} /> <span>Workspaces</span></div>
                <div className="nav-item"><Activity size={13} /> <span>Bugs Board</span></div>
                <div className="nav-item"><Users size={13} /> <span>Members</span></div>
              </div>
            </div>
            {/* Main Area */}
            <div className="mock-main-content">
              <div className="mock-content-header">
                <div>
                  <h4 className="mock-title">Workspaces</h4>
                  <p className="mock-subtitle">Manage testing environments</p>
                </div>
                <button className="mock-btn-primary"><Plus size={11} /> <span>New Project</span></button>
              </div>

              <div className="mock-projects-grid">
                {/* Project Card 1 */}
                <div className="mock-project-card warning">
                  <div className="card-top">
                    <div className="card-icon-title">
                      <div className="folder-icon-wrapper"><Folder size={16} /></div>
                      <div>
                        <h5 className="card-name">Core Web App</h5>
                        <div className="mock-status-indicator">
                          <span className="status-dot dot-orange"></span>
                          <span className="status-label">Action Required</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="card-desc">React web interface and ticketing dashboards.</p>
                  <div className="card-health">
                    <div className="health-labels">
                      <span>PROJECT HEALTH</span>
                      <span>78%</span>
                    </div>
                    <div className="health-bar">
                      <div className="health-fill orange" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                  <div className="card-stats-grid">
                    <div className="stat-box">
                      <div className="stat-val">4</div>
                      <div className="stat-lbl">Open</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-val">14</div>
                      <div className="stat-lbl">Done</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-val">18</div>
                      <div className="stat-lbl">Total</div>
                    </div>
                  </div>
                </div>

                {/* Project Card 2 */}
                <div className="mock-project-card stable">
                  <div className="card-top">
                    <div className="card-icon-title">
                      <div className="folder-icon-wrapper"><Folder size={16} /></div>
                      <div>
                        <h5 className="card-name">iOS Native Client</h5>
                        <div className="mock-status-indicator">
                          <span className="status-dot dot-green"></span>
                          <span className="status-label">Operational</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="card-desc">SwiftUI native code workspace and automated checks.</p>
                  <div className="card-health">
                    <div className="health-labels">
                      <span>PROJECT HEALTH</span>
                      <span>92%</span>
                    </div>
                    <div className="health-bar">
                      <div className="health-fill green" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                  <div className="card-stats-grid">
                    <div className="stat-box">
                      <div className="stat-val">1</div>
                      <div className="stat-lbl">Open</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-val">12</div>
                      <div className="stat-lbl">Done</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-val">13</div>
                      <div className="stat-lbl">Total</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'dev',
    title: 'Developer Portal',
    heading: 'Debug cards packed with rich system context',
    description: 'Bridge the gap between QA and dev teams. Developers get dedicated Kanban sprints, complete step specifications, operating system layers, browser parameters, and contextual crash frames to resolve hotfixes fast.',
    features: [
      'Custom filtered Sprint boards focused solely on code tickets.',
      'Comprehensive specs containing browser, window viewport sizes, and OS info.',
      'Linked development repository branches and pull request integrations.'
    ],
    preview: (
      <div className="workspace-mockup-container">
        <div className="mock-browser-window">
          {/* Title Bar */}
          <div className="mock-browser-header">
            <div className="mock-window-dots">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <div className="mock-browser-address">qualia.app/workspace/sprint</div>
          </div>
          {/* Main App Layout */}
          <div className="mock-app-body">
            {/* Sidebar */}
            <div className="mock-sidebar">
              <div className="mock-sidebar-logo">
                <span className="logo-icon">Q</span>
                <span className="logo-text">Qualia</span>
              </div>
              <div className="mock-sidebar-nav">
                <div className="nav-item"><LayoutDashboard size={13} /> <span>Dashboard</span></div>
                <div className="nav-item"><Folder size={13} /> <span>Workspaces</span></div>
                <div className="nav-item active"><Activity size={13} /> <span>Bugs Board</span></div>
                <div className="nav-item"><Users size={13} /> <span>Members</span></div>
              </div>
            </div>
            {/* Main Area */}
            <div className="mock-main-content">
              <div className="mock-content-header">
                <div>
                  <h4 className="mock-title">Core Web App Board</h4>
                  <p className="mock-subtitle">Sprint Kanban Board</p>
                </div>
                <div className="mock-header-badges">
                  <span className="mock-badge select">Workspace: Core Web App</span>
                  <span className="mock-badge select">Sprint 4</span>
                </div>
              </div>

              {/* Kanban Columns */}
              <div className="mock-kanban-board">
                {/* Column 1: Open */}
                <div className="kanban-col">
                  <div className="col-header">
                    <span className="col-title">OPEN</span>
                    <span className="col-count">2</span>
                  </div>
                  {/* Card 1 */}
                  <div className="kanban-card">
                    <div className="card-meta">
                      <span className="bug-id">Q-104</span>
                      <span className="priority-badge critical">CRITICAL</span>
                    </div>
                    <div className="bug-title">Broken Google OAuth redirect on mobile devices</div>
                    <div className="card-footer">
                      <span className="assignee">👤 Abhishek T.</span>
                      <span className="spec-badge">📱 iOS</span>
                    </div>
                  </div>
                </div>

                {/* Column 2: In Progress */}
                <div className="kanban-col">
                  <div className="col-header">
                    <span className="col-title">IN PROGRESS</span>
                    <span className="col-count">1</span>
                  </div>
                  {/* Card 2 */}
                  <div className="kanban-card">
                    <div className="card-meta">
                      <span className="bug-id">Q-101</span>
                      <span className="priority-badge high">HIGH</span>
                    </div>
                    <div className="bug-title">Kanban board card drop delay on high DOM load</div>
                    <div className="card-footer">
                      <span className="assignee">👤 Developer</span>
                      <span className="spec-badge">💻 Chrome</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Done */}
                <div className="kanban-col">
                  <div className="col-header">
                    <span className="col-title">DONE</span>
                    <span className="col-count">14</span>
                  </div>
                  {/* Card 3 */}
                  <div className="kanban-card done">
                    <div className="card-meta">
                      <span className="bug-id">Q-98</span>
                      <span className="priority-badge resolved">RESOLVED</span>
                    </div>
                    <div className="bug-title line-through">Duplicate organization signup on registration flow</div>
                    <div className="card-footer">
                      <span className="assignee">👤 Admin</span>
                      <span className="spec-badge">🔥 Server</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'admin',
    title: 'Admin Management',
    heading: 'Scalable organization and tenant structures',
    description: 'Easily manage massive QA operations, distinct project boards, organization teams, billing tiers, and usage configurations. Track team resolution metrics and project sprint velocities from one portal.',
    features: [
      'Robust multi-tenant organization setups with project groups.',
      'Complete team roles layout (Admin, Manager, QA, Developer).',
      'Advanced system health checklists and AI token utilization counters.'
    ],
    preview: (
      <div className="workspace-mockup-container">
        <div className="mock-browser-window">
          {/* Title Bar */}
          <div className="mock-browser-header">
            <div className="mock-window-dots">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <div className="mock-browser-address">qualia.app/workspace/admin</div>
          </div>
          {/* Main App Layout */}
          <div className="mock-app-body">
            {/* Sidebar */}
            <div className="mock-sidebar">
              <div className="mock-sidebar-logo">
                <span className="logo-icon">Q</span>
                <span className="logo-text">Qualia</span>
              </div>
              <div className="mock-sidebar-nav">
                <div className="nav-item"><LayoutDashboard size={13} /> <span>Dashboard</span></div>
                <div className="nav-item"><Folder size={13} /> <span>Workspaces</span></div>
                <div className="nav-item"><Activity size={13} /> <span>Bugs Board</span></div>
                <div className="nav-item active"><Users size={13} /> <span>Members</span></div>
              </div>
            </div>
            {/* Main Area */}
            <div className="mock-main-content">
              <div className="mock-content-header">
                <div>
                  <h4 className="mock-title">Qualia Admin Overview</h4>
                  <p className="mock-subtitle">Seat licenses and team controls</p>
                </div>
                <span className="plan-badge">PREMIUM ACTIVE</span>
              </div>

              <div className="mock-admin-layout">
                {/* Admin Stats Sidebar */}
                <div className="mock-admin-stats-side">
                  <div className="mock-admin-stat-card">
                    <span className="stat-lbl">Active Seats</span>
                    <div className="stat-val">24 / 50</div>
                    <div className="mock-progress-mini">
                      <div className="mock-progress-fill" style={{ width: '48%' }}></div>
                    </div>
                  </div>
                  <div className="mock-admin-stat-card">
                    <span className="stat-lbl">AI Generations</span>
                    <div className="stat-val">8,420 / 10k</div>
                    <div className="mock-progress-mini">
                      <div className="mock-progress-fill" style={{ width: '84.2%' }}></div>
                    </div>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="mock-admin-members-list">
                  <div className="mock-members-header">Active Team Members</div>
                  
                  {/* Member 1 */}
                  <div className="mock-member-row">
                    <div className="mock-member-avatar blue">AT</div>
                    <div className="mock-member-details">
                      <div className="mock-member-name">Abhishek Topiwala</div>
                      <div className="mock-member-email">abhishek@qualia.app</div>
                    </div>
                    <span className="mock-role-tag admin">ADMIN</span>
                  </div>

                  {/* Member 2 */}
                  <div className="mock-member-row">
                    <div className="mock-member-avatar green">JD</div>
                    <div className="mock-member-details">
                      <div className="mock-member-name">Jane Doe</div>
                      <div className="mock-member-email">jane@qualia.app</div>
                    </div>
                    <span className="mock-role-tag dev">DEVELOPER</span>
                  </div>

                  {/* Member 3 */}
                  <div className="mock-member-row">
                    <div className="mock-member-avatar orange">SC</div>
                    <div className="mock-member-details">
                      <div className="mock-member-name">Sarah Conner</div>
                      <div className="mock-member-email">sarah@qualia.app</div>
                    </div>
                    <span className="mock-role-tag qa">QA</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    )
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeBug, setActiveBug] = useState(mockBugs[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [showResult, setShowResult] = useState(true);
  const [activeTourTab, setActiveTourTab] = useState(tourTabs[0]);
  const [activeFaq, setActiveFaq] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  const handleSelectBug = (bug) => {
    if (isScanning) return;
    setIsScanning(true);
    setShowResult(false);
    setActiveBug(bug);
    setTimeout(() => { setIsScanning(false); setShowResult(true); }, 1800);
  };

  const handleSelectPlan = (planId, cycle) => {
    saveSelectedPlan(planId, cycle);
    navigate('/signup', { state: { planId, billingCycle: cycle } });
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-glow-top"></div>
      <div className="landing-glow-mid"></div>

      {/* Navigation */}
      <nav className="landing-nav">
        <Link to="/" className="landing-brand">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="15" cy="15" r="11" stroke="url(#qualia-nav-grad)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="52 14" />
            <path d="M22 22L29 29" stroke="url(#qualia-nav-prism)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M19 19L23 23" stroke="#5B6CFF" strokeWidth="3.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="qualia-nav-grad" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#5B6CFF" />
                <stop offset="1" stopColor="#8F9BFF" />
              </linearGradient>
              <linearGradient id="qualia-nav-prism" x1="22" y1="22" x2="29" y2="29" gradientUnits="userSpaceOnUse">
                <stop stopColor="#5B6CFF" />
                <stop offset="1" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
          Qualia
        </Link>
        <div className="landing-nav-links">
          <a href="#playground" className="landing-nav-link">Interactive Demo</a>
          <a href="#tour" className="landing-nav-link">Workspace Tour</a>
          <a href="#comparison" className="landing-nav-link">Why Qualia</a>
          <a href="#pricing" className="landing-nav-link">Pricing</a>
        </div>
        <div className="landing-nav-actions">
          <Link to="/login" className="btn btn-ghost" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Log In</Link>
          <Link to="/signup" className="btn btn-primary" style={{ padding: '10px 22px', borderRadius: '8px' }}>Start Free Trial</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-col items-center"
        >
          <motion.div variants={itemVariants} className="hero-badge">
            <Sparkles size={16} />
            AI-Driven QA & Bug Tracking Pipeline
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="hero-title">
            From visual glance to <br />
            <span className="highlight">structured resolution</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="hero-subtitle">
            Qualia seamlessly bridges the gap between QA Engineers and Developers. Upload screens, automatically construct flawless reproduction steps with AI, track tickets via premium Kanbans, and ship clean releases.
          </motion.p>
          
          <motion.div variants={itemVariants} className="hero-actions">
            <Link to="/signup" className="hero-btn-primary">
              Launch Free Sandbox
              <ArrowRight size={20} />
            </Link>
            <a href="#playground" className="hero-btn-secondary">
              See Interactive Demo
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Interactive Playground Section */}
      <section id="playground" className="landing-playground">
        <div className="section-header">
          <span className="section-tag">Interactive AI Sandbox</span>
          <h2 className="section-title">Experience the AI generator</h2>
          <p className="section-subtitle">
            Select a raw screenshot below to observe how Qualia's deep learning model extracts context and instantly structures it into an engineering-ready bug card.
          </p>
        </div>

        <div className="playground-container">
          <div className="playground-left">
            <div className="playground-selector-section">
              <span className="playground-selector-label">Select Mock Screenshot</span>
              <div className="screenshot-cards-grid">
                {mockBugs.map((bug) => (
                  <div
                    key={bug.id}
                    onClick={() => !isScanning && handleSelectBug(bug)}
                    className={`screenshot-select-card ${activeBug.id === bug.id ? 'active' : ''} ${isScanning ? 'disabled' : ''}`}
                  >
                    <img src={bug.image} alt={bug.title} className="screenshot-select-thumb" />
                    <div className="screenshot-select-info">
                      <div className="screenshot-select-title">
                        {bug.id === 'auth-error' ? 'Mobile OAuth Screen' : 'Kanban Drag Lag'}
                      </div>
                      <div className="screenshot-select-meta">
                        <span className="meta-badge">{bug.id === 'auth-error' ? 'iOS • Safari' : 'macOS • Chrome'}</span>
                        <span className="meta-severity" style={{ 
                          color: bug.severity === 'CRITICAL' ? 'var(--danger)' : '#d97706',
                          fontWeight: 600,
                          fontSize: '0.7rem'
                        }}>
                          {bug.severity}
                        </span>
                      </div>
                    </div>
                    <div className="screenshot-select-indicator"></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mock-browser-frame">
              <div className="mock-browser-header">
                <div className="browser-dots">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                </div>
                <div className="browser-address">
                  {activeBug.id === 'auth-error' ? 'api.qualia.dev/oauth/google' : 'qualia.dev/workspace/sprint-3'}
                </div>
              </div>
              <div className={`mock-upload-area ${isScanning ? 'active' : ''}`}>
                <img 
                  src={activeBug.image} 
                  alt="Mock Bug Screen" 
                  className={`mock-preview-image visible`}
                />
                <div className={`mock-scanner-line ${isScanning ? 'active' : ''}`}></div>
                
                {isScanning && (
                  <div className="scanner-overlay">
                    <Zap size={18} className="spin accent-icon" />
                    <span>Qualia AI Vision Analyzing Viewport...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="playground-right">
            {showResult && !isScanning ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="mock-ai-ticket"
              >
                <div className="ticket-header-meta">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-critical" style={{ 
                      background: activeBug.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245,158,11,0.1)', 
                      color: activeBug.severity === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)',
                      border: 'none'
                    }}>
                      {activeBug.severity}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generated in {activeBug.generatedTime}</span>
                  </div>
                  <Sparkles size={16} color="var(--accent)" />
                </div>

                <div className="ticket-item">
                  <span className="ticket-label">Extracted Title</span>
                  <div className="ticket-value">{activeBug.title}</div>
                </div>

                <div className="ticket-item">
                  <span className="ticket-label">Root Cause Summary</span>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {activeBug.description}
                  </p>
                </div>

                <div className="ticket-item">
                  <span className="ticket-label">Reproduction Steps</span>
                  <ol className="ticket-steps">
                    {activeBug.steps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="feature-tags">
                  <span className="tag-badge">AI Populated</span>
                  <span className="tag-badge">Visual Context Linked</span>
                  <span className="tag-badge">Ready for Sprint</span>
                </div>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--text-muted)' }}>
                <Clock size={32} className="spin" style={{ marginBottom: 12, color: 'var(--accent)' }} />
                <p>Generating technical specification...</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Tour Section */}
      <section id="tour" className="landing-tour">
        <div className="section-header">
          <span className="section-tag">Product Walkthrough</span>
          <h2 className="section-title">Explore the workspace</h2>
          <p className="section-subtitle">
            See the exact interface crafted to remove communication friction across engineering groups.
          </p>
        </div>

        <div className="tour-tabs">
          {tourTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTourTab(tab)}
              className={`tour-tab-btn ${activeTourTab.id === tab.id ? 'active' : ''}`}
            >
              {tab.title}
            </button>
          ))}
        </div>

        <div className="tour-content-panel">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTourTab.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="tour-visual"
            >
              {activeTourTab.preview}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTourTab.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="tour-details"
            >
              <span className="section-tag" style={{ color: 'var(--accent)' }}>Qualia Workspace</span>
              <h3>{activeTourTab.heading}</h3>
              <p>{activeTourTab.description}</p>
              <div className="tour-features-list">
                {activeTourTab.features.map((feature, idx) => (
                  <div key={idx} className="tour-feature-item">
                    <div className="tour-feature-dot"></div>
                    <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* "How it Works" Section */}
      <section id="how-it-works" className="landing-timeline">
        <div className="section-header">
          <span className="section-tag">Engineered for Velocity</span>
          <h2 className="section-title">How Qualia optimizes testing</h2>
          <p className="section-subtitle">
            Say goodbye to endless typing, ambiguous descriptions, and broken communication loops.
          </p>
        </div>

        <div className="timeline-steps">
          <div className="timeline-step">
            <div className="timeline-number">1</div>
            <h3>Capture & Upload</h3>
            <p>
              QA teams simply snap screenshots or crop media straight from the application window. Qualia securely ingests the graphic buffer instantly.
            </p>
          </div>

          <div className="timeline-step">
            <div className="timeline-number">2</div>
            <h3>AI Orchestrates Specs</h3>
            <p>
              Our localized language models read elements, detect layout flaws, write clean reproduction stages, assign severity, and format tickets.
            </p>
          </div>

          <div className="timeline-step">
            <div className="timeline-number">3</div>
            <h3>Devs Review & Resolve</h3>
            <p>
              Engineers open an ultra-focused Kanban lane with stack traces, environment profiles, and reproduction paths to patch errors with zero friction.
            </p>
          </div>
        </div>
      </section>

      {/* Detailed Feature Comparison Grid vs Trad Tools */}
      <section id="comparison" className="landing-matrix">
        <div className="section-header">
          <span className="section-tag">Feature Contrast</span>
          <h2 className="section-title">Why teams upgrade to Qualia</h2>
          <p className="section-subtitle">
            A head-to-head comparison demonstrating how Qualia transforms generic project boards into automated QA pipelines.
          </p>
        </div>

        <div className="matrix-table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Feature Capability</th>
                <th style={{ color: 'var(--accent)' }}>Qualia Workspace</th>
                <th>Traditional Boards (Jira/Trello)</th>
                <th>Legacy Excel/Sheets</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Screenshot & Video Context</td>
                <td style={{ color: 'var(--accent)', fontWeight: 600 }}>Automatic AI Spec Generation</td>
                <td>Manual attachment link only</td>
                <td>No native integration</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Developer Isolated Sprints</td>
                <td><Check size={18} color="var(--success)" style={{ strokeWidth: 3 }} /></td>
                <td><X size={18} color="var(--danger)" style={{ strokeWidth: 3 }} /></td>
                <td><X size={18} color="var(--danger)" style={{ strokeWidth: 3 }} /></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Automatic OS & Browser Layers</td>
                <td><Check size={18} color="var(--success)" style={{ strokeWidth: 3 }} /></td>
                <td>Manual form text entry</td>
                <td><X size={18} color="var(--danger)" style={{ strokeWidth: 3 }} /></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Integrated Test Suite Catalog</td>
                <td><Check size={18} color="var(--success)" style={{ strokeWidth: 3 }} /></td>
                <td>Paid addon required</td>
                <td>Clunky spreadsheet tables</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Seamless Multi-Tenant Orgs</td>
                <td><Check size={18} color="var(--success)" style={{ strokeWidth: 3 }} /></td>
                <td>Complicated tenant configs</td>
                <td><X size={18} color="var(--danger)" style={{ strokeWidth: 3 }} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Core Capabilities & Modules Section */}
      <section className="landing-integrations">
        <div className="section-header">
          <span className="section-tag">Core Modules</span>
          <h2 className="section-title">Fully loaded workspace capabilities</h2>
          <p className="section-subtitle">
            Qualia provides robust out-of-the-box tools designed to cover your entire QA and development lifecycle.
          </p>
        </div>

        <div className="core-modules-grid">
          <div className="core-module-card">
            <Sparkles size={32} color="var(--accent)" className="core-module-icon" />
            <h4>AI Bug Orchestrator</h4>
            <p>
              Generate complete markdown reproduction steps, severity assessments, and technical summaries from visual screenshots in under 1 second.
            </p>
          </div>
          <div className="core-module-card">
            <LayoutDashboard size={32} color="var(--accent)" className="core-module-icon" />
            <h4>Dual-Role Sprint Boards</h4>
            <p>
              Clean Kanban boards partitioned into dedicated QA views and specialized Developer views to eliminate cross-functional noise.
            </p>
          </div>
          <div className="core-module-card">
            <Globe size={32} color="var(--accent)" className="core-module-icon" />
            <h4>Public Board Sharing</h4>
            <p>
              Instantly share real-time project bugs lists and progress trackers with third-party clients via secure public URLs without login requirements.
            </p>
          </div>
          <div className="core-module-card">
            <Users size={32} color="var(--accent)" className="core-module-icon" />
            <h4>Multi-Tenant Organizations</h4>
            <p>
              Add secure organization boundaries, provision team seats, invite developers, and manage separate regression project hubs.
            </p>
          </div>
          <div className="core-module-card">
            <Terminal size={32} color="var(--accent)" className="core-module-icon" />
            <h4>Regression Test Catalog</h4>
            <p>
              Document permanent manual test case catalogs, check off parameters, track execution states, and keep regression documentation completely structured.
            </p>
          </div>
          <div className="core-module-card">
            <Activity size={32} color="var(--accent)" className="core-module-icon" />
            <h4>AI Usage & Health Analytics</h4>
            <p>
              Monitor system logs, manage subscription plans, trace AI utilization metrics, and coordinate global users from a premium Super Admin portal.
            </p>
          </div>
        </div>
      </section>

      {/* Stats ROI Section */}
      <section className="landing-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-number">70%</div>
            <div className="stat-label">Faster Audits</div>
            <div className="stat-desc">Accelerate bug generation and documentation speed.</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">4.5x</div>
            <div className="stat-label">Sprint Speedup</div>
            <div className="stat-desc">Drastically reduce time-to-first-commit for developers.</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">98%</div>
            <div className="stat-label">Clearer Context</div>
            <div className="stat-desc">Virtually eliminate context drop off or missing steps.</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">0</div>
            <div className="stat-label">Setup Overhead</div>
            <div className="stat-desc">Zero manual AI models or keys required out of the box.</div>
          </div>
        </div>
      </section>

      {/* Pricing Matrix Section */}
      <section id="pricing" className="landing-pricing">
        <div className="pricing-container">
          <div className="section-header">
            <span className="section-tag">Simple Pricing</span>
            <h2 className="section-title">AI-Powered QA Workspace for Modern Teams</h2>
            <p className="section-subtitle">
              Manage bugs, generate AI-powered reports, and streamline QA workflows — all in one platform.
              Start free, upgrade as your team grows.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="pricing-cycle-toggle">
            <button
              className={`pricing-cycle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >Monthly</button>
            <button
              className={`pricing-cycle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly
              <span className="pricing-cycle-save">Save 20%</span>
            </button>
          </div>

          <div className="pricing-grid">
            {Object.values(PLANS).filter(plan => plan.active).map((plan) => (
              <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && (
                  <div className="pricing-popular-badge">⭐ Most Popular</div>
                )}
                <div className="pricing-header">
                  <h3>{plan.name}</h3>
                  <p className="pricing-desc">{plan.tagline}</p>
                </div>
                <div className="pricing-price">
                  {plan.monthlyPrice === null ? (
                    <span className="pricing-custom">Custom</span>
                  ) : plan.monthlyPrice === 0 ? (
                    <><span className="pricing-amount">Free</span><span className="pricing-period"> forever</span></>
                  ) : (
                    <>
                      <span className="pricing-amount">
                        {formatPrice(billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice)}
                      </span>
                      <span className="pricing-period">/{billingCycle === 'yearly' ? 'yr' : 'mo'}</span>
                    </>
                  )}
                </div>
                {billingCycle === 'yearly' && plan.yearlyPrice > 0 && plan.monthlyPrice > 0 && (
                  <div className="pricing-yearly-note">
                    ₹{Math.round(plan.yearlyPrice / 12).toLocaleString('en-IN')}/mo · billed annually
                  </div>
                )}
                <div className="pricing-features">
                  {plan.features.map((feature, fIdx) => (
                    <div key={fIdx} className={`pricing-feature ${!feature.included ? 'muted' : ''}`}>
                      {feature.included
                        ? <Check size={15} style={{ color: '#22c55e', flexShrink: 0 }} />
                        : <X size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />}
                      {feature.label}
                    </div>
                  ))}
                </div>
                <button
                  id={`plan-cta-${plan.id}`}
                  className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ textAlign: 'center', display: 'block', fontWeight: 600, width: '100%' }}
                  onClick={() => handleSelectPlan(plan.id, billingCycle)}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="landing-faq">
        <div className="section-header">
          <span className="section-tag">Common Inquiries</span>
          <h2 className="section-title">Frequently asked questions</h2>
          <p className="section-subtitle">
            Find immediate answers on capabilities, security compliance, and licensing questions.
          </p>
        </div>

        <div className="faq-container">
          {faqData.map((faq, index) => (
            <div key={index} className={`faq-item ${activeFaq === index ? 'active' : ''}`}>
              <button className="faq-question" onClick={() => toggleFaq(index)}>
                {faq.question}
                <ChevronDown size={18} className="faq-icon" />
              </button>
              <AnimatePresence initial={false}>
                {activeFaq === index && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="faq-answer" style={{ maxHeight: 'none', paddingBottom: 24, paddingTop: 4 }}>
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="landing-cta">
        <div className="cta-container">
          <div className="cta-glow"></div>
          <h2 className="cta-title">Ready to revolutionize your QA process?</h2>
          <p className="cta-subtitle">
            Start logging bug reports, tracking sprints, and writing flawless tickets today. No credit card required.
          </p>
          <Link to="/signup" className="hero-btn-primary" style={{ padding: '18px 40px' }}>
            Build Your First Workspace
            <ArrowRight size={22} />
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-minimal-inner">
            <div className="footer-left">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="15" cy="15" r="11" stroke="#5B6CFF" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="52 14" />
                <path d="M22 22L29 29" stroke="#3B82F6" strokeWidth="3.5" strokeLinecap="round" />
                <path d="M19 19L23 23" stroke="#5B6CFF" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
              <span className="footer-brand-text">Qualia</span>
              <span className="footer-copyright">© {new Date().getFullYear()} Qualia Inc.</span>
            </div>
            
            <div className="footer-right">
              <div className="footer-links">
                <a href="#playground" className="footer-link">AI Generator</a>
                <a href="#tour" className="footer-link">Workspace</a>
                <a href="#pricing" className="footer-link">Pricing</a>
                <a href="#" className="footer-link">Privacy</a>
                <a href="#" className="footer-link">Terms</a>
              </div>
              
              <div className="footer-separator-vertical"></div>
              
              <div className="footer-status-minimal">
                <span className="status-dot-glow-green"></span>
                <span>All systems operational</span>
              </div>
              
              <div className="footer-separator-vertical"></div>
              
              <div className="footer-socials-minimal">
                <a href="#" className="social-link" aria-label="Twitter">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="GitHub">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="Discord">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </a>
                <a href="#" className="social-link" aria-label="LinkedIn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                    <rect width="4" height="12" x="2" y="9"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


