import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, X, ChevronDown, ArrowRight,
  Zap, Shield, Globe, Terminal, Layers,
  Bot
} from 'lucide-react';
import '../styles/pricing.css';

/* ── Constants ─────────────────────────────────────────────────────────── */
const PLANS = [
  {
    id: 'free',
    name: 'Free Sandbox',
    desc: 'For indie developers and proofs of concept',
    monthly: 0,
    yearly: 0,
    cta: 'Start Free',
    ctaStyle: 'outline',
    features: [
      { text: '3 Users', bold: true },
      { text: '2 Projects' },
      { text: '30 AI Bug Reports / month', note: 'Resets monthly' },
      { text: 'Basic Kanban Board' },
      { text: 'Public Bug Sharing' },
      { text: '100 MB Storage' },
      { text: 'Community Support' },
    ],
  },
  {
    id: 'starter',
    name: 'Starter',
    desc: 'For startups and small QA teams',
    monthly: 699,
    yearly: 559,
    cta: 'Start 14-Day Trial',
    ctaStyle: 'solid-accent',
    featured: true,
    features: [
      { text: '5 Users', bold: true },
      { text: '15 Projects' },
      { text: '300 AI Bug Reports / month', note: 'Resets monthly' },
      { text: 'Full Kanban Board' },
      { text: 'Playwright Integration' },
      { text: 'Slack Notifications' },
      { text: 'Email Support' },
      { text: 'Basic Analytics' },
      { text: 'API Access' },
      { text: '5 GB Storage' },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    desc: 'For scaling companies and active QA teams',
    monthly: 2499,
    yearly: 1999,
    cta: 'Get Growth Plan',
    ctaStyle: 'solid-dark',
    features: [
      { text: '25 Users', bold: true },
      { text: 'Unlimited Projects' },
      { text: '2,000 AI Bug Reports / month', note: 'Resets monthly' },
      { text: 'Sprint + Kanban Boards' },
      { text: 'Test Case Management' },
      { text: 'Playwright + Cypress + Selenium' },
      { text: 'CI/CD Integrations' },
      { text: 'Advanced Analytics' },
      { text: 'Priority Support' },
      { text: 'Webhooks' },
      { text: 'Custom Branding' },
      { text: 'Audit Logs' },
      { text: '50 GB Storage' },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    desc: 'For large organizations and enterprise infrastructure',
    monthly: null,
    yearly: null,
    cta: 'Contact Sales',
    ctaStyle: 'outline',
    features: [
      { text: 'Unlimited Users', bold: true },
      { text: 'Unlimited AI Usage' },
      { text: 'SSO / SAML' },
      { text: 'Dedicated Account Manager' },
      { text: 'SLA Support' },
      { text: 'Self Hosting / Private Cloud' },
      { text: 'Advanced Security & Compliance' },
      { text: 'Custom Integrations' },
      { text: 'AI Model Training' },
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: 'How does AI bug generation work?',
    a: 'When your QA team uploads a screenshot, our AI engine analyzes visual elements, extracts metadata, reconstructs user paths, and auto-generates a structured bug ticket — complete with a title, steps to reproduce, severity rating, and root-cause summary.',
  },
  {
    q: 'Can I upgrade anytime?',
    a: "Yes, absolutely. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately and we'll prorate any remaining balance. No long-term contracts — ever.",
  },
  {
    q: 'Do you support Playwright?',
    a: 'Yes. Playwright integration is available starting on the Starter plan. On Growth and above, you also get Cypress and Selenium, plus full CI/CD pipeline hooks.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes. The Free Sandbox tier is permanently free. Starter and Growth plans come with a 14-day trial — no credit card required to start.',
  },
  {
    q: 'Do you offer enterprise deployment?',
    a: 'Our Enterprise plan supports self-hosted, private cloud, and hybrid deployment models. We work with your security team to meet SOC 2, ISO 27001, and custom compliance requirements.',
  },
];

// Comparison table data
const COMPARE_ROWS = [
  { group: 'AI & Reporting' },
  { label: 'AI Bug Reports', note: 'Limits reset monthly', vals: ['30 / mo', '300 / mo', '2,000 / mo', 'Unlimited'] },
  { label: 'Test Case Management', vals: [false, false, true, true] },
  { group: 'Integrations' },
  { label: 'Automation Integrations', vals: ['—', 'Playwright', 'All Frameworks', 'Custom'] },
  { label: 'CI/CD Integrations', vals: [false, false, true, true] },
  { label: 'Webhooks', vals: [false, false, true, true] },
  { label: 'API Access', vals: [false, true, true, true] },
  { group: 'Platform' },
  { label: 'Analytics', vals: ['—', 'Basic', 'Advanced', 'Custom'] },
  { label: 'Storage', vals: ['100 MB', '5 GB', '50 GB', 'Unlimited'] },
  { label: 'Custom Branding', vals: [false, false, true, true] },
  { label: 'Audit Logs', vals: [false, false, true, true] },
  { group: 'Security & Support' },
  { label: 'SSO / SAML', vals: [false, false, false, true] },
  { label: 'Priority Support', vals: [false, false, true, 'SLA'] },
  { label: 'Self Hosting', vals: [false, false, false, true] },
];

/* ── Small Components ──────────────────────────────────────────────────── */
function CheckMark({ yes }) {
  if (yes === false)   return <div className="check-icon-wrap"><X size={16} className="check-no" /></div>;
  if (yes === true)    return <div className="check-icon-wrap"><Check size={16} className="check-yes" strokeWidth={2.5} /></div>;
  return <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{yes}</span>;
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-trigger" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <motion.div
          className="faq-icon"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <ChevronDown size={14} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="faq-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            <p className="faq-answer">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function PricingPage() {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(true);

  const getPrice = (plan) => {
    if (plan.monthly === null) return null;
    return yearly ? plan.yearly : plan.monthly;
  };

  const getSavings = (plan) => {
    if (!plan.monthly || !plan.yearly) return null;
    const saved = (plan.monthly - plan.yearly) * 12;
    return saved > 0 ? `Save ₹${saved.toLocaleString('en-IN')}/yr` : null;
  };

  return (
    <div className="pricing-page">
      <div className="pricing-ambient" />

      {/* ── Navbar ── */}
      <nav className="pricing-nav">
        <div className="pricing-nav-brand" onClick={() => navigate('/')}>
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <circle cx="15" cy="15" r="11" stroke="url(#pg1)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="52 14" />
            <path d="M22 22L29 29" stroke="url(#pg2)" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M19 19L23 23" stroke="#5B6CFF" strokeWidth="3.5" strokeLinecap="round" />
            <defs>
              <linearGradient id="pg1" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#5B6CFF" /><stop offset="1" stopColor="#8F9BFF" />
              </linearGradient>
              <linearGradient id="pg2" x1="22" y1="22" x2="29" y2="29" gradientUnits="userSpaceOnUse">
                <stop stopColor="#5B6CFF" /><stop offset="1" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
          Qualia
        </div>

        <div className="pricing-nav-links">
          <span className="pricing-nav-link" onClick={() => navigate('/')}>Product</span>
          <span className="pricing-nav-link active">Pricing</span>
          <span className="pricing-nav-link">Resources</span>
          <span className="pricing-nav-link">Docs</span>
        </div>

        <div className="pricing-nav-actions">
          <span className="pnav-signin" onClick={() => navigate('/login')}>Sign In</span>
          <button className="pnav-cta" onClick={() => navigate('/signup')}>Get Started</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pricing-hero">
        <motion.div
          className="pricing-hero-label"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Zap size={12} />
          Simple, Transparent Pricing
        </motion.div>

        <motion.h1
          className="pricing-h1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
        >
          AI-Powered QA Workspace<br />
          for <em>Modern Teams</em>
        </motion.h1>

        <motion.p
          className="pricing-sub"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Manage bugs, generate AI-powered reports, track test cases, and streamline
          QA workflows — in one powerful platform.
        </motion.p>

        <motion.div
          className="billing-row"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.22 }}
        >
          <div className="billing-pill">
            <button
              className={`billing-opt ${!yearly ? 'on' : ''}`}
              onClick={() => setYearly(false)}
            >
              Monthly
            </button>
            <button
              className={`billing-opt ${yearly ? 'on' : ''}`}
              onClick={() => setYearly(true)}
            >
              Yearly
            </button>
            <motion.div
              className="billing-slider"
              initial={false}
              animate={{
                left: yearly ? 'calc(50% + 1px)' : '4px',
                width: 'calc(50% - 5px)',
              }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            />
          </div>

          <AnimatePresence mode="wait">
            {yearly && (
              <motion.div
                className="yearly-chip"
                key="chip"
                initial={{ opacity: 0, x: -8, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                🎉 Save 20% with yearly billing
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="pricing-grid">
        {PLANS.map((plan, idx) => {
          const price = getPrice(plan);
          const savings = getSavings(plan);
          return (
            <motion.div
              key={plan.id}
              className={`plan-card ${plan.featured ? 'featured' : ''}`}
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + idx * 0.08 }}
            >
              {plan.featured && <div className="featured-ribbon">Most Popular</div>}

              {/* Plan identity */}
              <div className="pc-name">{plan.name}</div>
              <div className="pc-desc">{plan.desc}</div>

              {/* Pricing */}
              <div className="pc-price-block">
                {price === null ? (
                  <span className="pc-amount custom-price">Custom</span>
                ) : (
                  <>
                    <span className="pc-currency">₹</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${plan.id}-${price}`}
                        className="pc-amount"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {price === 0 ? '0' : price.toLocaleString('en-IN')}
                      </motion.span>
                    </AnimatePresence>
                    <span className="pc-period">/mo</span>
                  </>
                )}
              </div>

              {/* Yearly savings tag */}
              <div className="pc-savings">
                <AnimatePresence mode="wait">
                  {yearly && savings ? (
                    <motion.span
                      key="save"
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                    >
                      ✓ {savings} on yearly billing
                    </motion.span>
                  ) : price === null ? (
                    <motion.span key="custom">Custom contract terms</motion.span>
                  ) : price === 0 ? (
                    <motion.span key="free">Free forever — no credit card</motion.span>
                  ) : (
                    <motion.span key="monthly" style={{ color: 'var(--text-muted)' }}>
                      Switch to yearly to save 20%
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* CTA */}
              <button
                className={`pc-btn ${plan.ctaStyle}`}
                onClick={() => plan.id === 'enterprise' ? window.location.href = 'mailto:sales@qualia.app' : navigate('/signup')}
              >
                {plan.cta}
              </button>

              <div className="pc-divider" />
              <div className="pc-features-label">What's included</div>

              <div className="pc-features">
                {plan.features.map((f, i) => (
                  <div key={i} className={`pc-feature ${f.bold ? 'bold-feature' : ''}`}>
                    <div className="pc-feature-check">
                      <Check size={9} strokeWidth={3} />
                    </div>
                    <span>
                      {f.text}
                      {f.note && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {f.note}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* ── Trust Bar ── */}
      <motion.section
        className="trust-bar"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="trust-bar-inner">
          <div className="trust-bar-label">Trusted by modern QA teams worldwide</div>
          <div className="trust-logos-row">
            {[
              { icon: <Globe size={18} />, name: 'Acme Corp' },
              { icon: <Zap size={18} />, name: 'Blitz IO' },
              { icon: <Layers size={18} />, name: 'StackFlow' },
              { icon: <Shield size={18} />, name: 'SecureNet' },
              { icon: <Terminal size={18} />, name: 'DevSync' },
              { icon: <Bot size={18} />, name: 'Nexus AI' },
            ].map((l) => (
              <div key={l.name} className="trust-logo-item">
                {l.icon}
                {l.name}
              </div>
            ))}
          </div>

          <div className="trust-stats-row">
            {[
              { val: '10M+', lbl: 'Bugs Tracked' },
              { val: '99.9%', lbl: 'Uptime SLA' },
              { val: '50K+', lbl: 'AI Reports Generated' },
            ].map((s) => (
              <div key={s.lbl} className="trust-stat">
                <div className="trust-stat-val">{s.val}</div>
                <div className="trust-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Feature Comparison Table ── */}
      <motion.section
        className="compare-section"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.55 }}
      >
        <h2 className="compare-heading">Compare All Plans</h2>
        <p className="compare-sub">
          Everything side-by-side so you can pick with confidence.
        </p>

        <div className="compare-wrap">
          <table className="compare-tbl">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Free Sandbox</th>
                <th className="col-featured">Starter</th>
                <th>Growth</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, i) => {
                if (row.group) {
                  return (
                    <tr key={i} className="row-group">
                      <td colSpan={5}>{row.group}</td>
                    </tr>
                  );
                }
                return (
                  <tr key={i}>
                    <td>
                      {row.label}
                      {row.note && <span className="tbl-microcopy">{row.note}</span>}
                    </td>
                    <td className="tc"><CheckMark yes={row.vals[0]} /></td>
                    <td className="tc-featured"><CheckMark yes={row.vals[1]} /></td>
                    <td className="tc"><CheckMark yes={row.vals[2]} /></td>
                    <td className="tc"><CheckMark yes={row.vals[3]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* ── FAQ ── */}
      <motion.section
        className="faq-section"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.55 }}
      >
        <h2 className="faq-heading">Frequently Asked Questions</h2>
        {FAQ_ITEMS.map((item) => (
          <FAQItem key={item.q} q={item.q} a={item.a} />
        ))}
      </motion.section>

      {/* ── Final CTA ── */}
      <motion.section
        className="final-cta-section"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5 }}
      >
        <div className="final-cta-tag">Get started today</div>
        <h2 className="final-cta-h2">
          Start Building Better<br />QA Workflows Today
        </h2>
        <p className="final-cta-p">
          Free forever on Sandbox. Upgrade when your team is ready.
        </p>
        <div className="final-cta-actions">
          <button className="fcta-btn-primary" onClick={() => navigate('/signup')}>
            Start Free
            <ArrowRight size={18} />
          </button>
          <button className="fcta-btn-ghost" onClick={() => navigate('/login')}>
            Sign In
          </button>
        </div>
        <div className="fcta-note">No credit card required · Cancel anytime</div>
      </motion.section>
    </div>
  );
}
