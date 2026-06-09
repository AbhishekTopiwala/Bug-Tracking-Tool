import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, X, ChevronDown, ArrowRight,
  Zap, Shield, Globe, Terminal, Layers, Bot,
  Users, Calculator, TrendingDown, Star, Sparkles, Package
} from 'lucide-react';
import { PLANS, AI_CREDIT_PACKS, calculatePlanCost } from '../services/paymentService';
import '../styles/pricing.css';

/* ── FAQ data ──────────────────────────────────────────────────────────────── */
const FAQ_ITEMS = [
  {
    q: 'How does per-user pricing work?',
    a: 'You pay only for the users you actually have active in your workspace. If you have 3 users on the Pro plan, you pay ₹297/month. Add a 4th user? Your bill becomes ₹396/month. No user minimums, no forced tiers.',
  },
  {
    q: 'What counts as an "active user"?',
    a: 'An active user is anyone who has accepted their invite and has access to your workspace. You can remove users at any time — billing adjusts automatically with prorated credits.',
  },
  {
    q: 'How does the 20% annual discount work?',
    a: 'On annual billing you pay ₹79/user/month (Pro) or ₹159/user/month (Business) — billed as a single upfront payment. This saves you 20% compared to monthly billing.',
  },
  {
    q: 'How does AI bug generation work?',
    a: 'When your QA team uploads a screenshot, our AI engine analyzes visual elements, extracts metadata, reconstructs user paths, and auto-generates a structured bug ticket — complete with a title, steps to reproduce, severity rating, and root-cause summary.',
  },
  {
    q: 'What are AI Credit Add-Ons?',
    a: 'Need more AI power? Purchase additional credits at any time. Credits roll over for 30 days. Packs: 500 credits for ₹199, 2,000 credits for ₹699, or 10,000 credits for ₹2,499.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes! Free Sandbox is permanently free (up to 5 users). Pro and Business plans come with a 14-day free trial — no credit card required.',
  },
  {
    q: 'How does Qualia compare to Jira in cost?',
    a: 'Jira charges $8.15/user/month (Standard) with a minimum of 1 user — that\'s about ₹680/user. Qualia Pro is just ₹99/user/month — that\'s ~85% cheaper, with built-in AI bug generation that Jira doesn\'t offer at any price.',
  },
];

/* ── Feature comparison data ───────────────────────────────────────────────── */
const COMPARE_ROWS = [
  { group: 'Users & Projects' },
  { label: 'Users', vals: ['Up to 5', 'Unlimited', 'Unlimited', 'Unlimited'] },
  { label: 'Projects', vals: ['2', '10', '20', 'Unlimited'] },
  { group: 'AI & Reporting' },
  { label: 'AI Bug Reports', note: 'Limits reset monthly', vals: ['30/mo org', '100/user/mo', '250/user/mo', 'Unlimited'] },
  { label: 'AI Credit Add-Ons', vals: [false, true, true, true] },
  { label: 'Test Case Management', vals: [false, true, true, true] },
  { group: 'Collaboration' },
  { label: 'Kanban Board', vals: ['Basic', 'Full', 'Full', 'Custom'] },
  { label: 'Bug Tracking', vals: [false, true, true, true] },
  { label: 'Email Notifications', vals: [false, true, true, true] },
  { label: 'Role-Based Access Control', vals: [false, false, true, true] },
  { group: 'Integrations & API' },
  { label: 'API Access', vals: [false, false, true, true] },
  { label: 'Webhooks', vals: [false, false, true, true] },
  { label: 'Custom Workflows', vals: [false, false, true, true] },
  { group: 'Analytics' },
  { label: 'Analytics', vals: ['—', 'Basic', 'Advanced', 'Custom'] },
  { label: 'Audit Logs', vals: [false, false, false, true] },
  { group: 'Security & Support' },
  { label: 'Support', vals: ['Community', 'Email', 'Priority', 'SLA + Dedicated'] },
  { label: 'SSO / SAML', vals: [false, false, false, true] },
  { label: 'Private Cloud / On-Premise', vals: [false, false, false, true] },
  { label: 'Advanced Security Controls', vals: [false, false, false, true] },
];

/* ── ROI comparison data ───────────────────────────────────────────────────── */
const ROI_ROWS = [
  { feature: 'Starting Price (per user/mo)', qualia: '₹99', jira: '~₹680', note: '85% cheaper' },
  { feature: 'AI Bug Report Generation', qualia: '✓ Built-in', jira: '✗ Not available', note: 'Qualia exclusive' },
  { feature: 'Screenshot-to-Ticket AI', qualia: '✓ Instant', jira: '✗ Manual', note: 'Save hours daily' },
  { feature: 'User minimum requirement', qualia: '✓ None', jira: '✗ Varies by plan', note: 'Pay only what you need' },
  { feature: 'Test Case Management', qualia: '✓ All paid plans', jira: '✗ Add-on required', note: 'Included for free' },
  { feature: 'Setup time', qualia: '< 5 minutes', jira: '1–3 days', note: 'Start instantly' },
];

/* ── Small Components ──────────────────────────────────────────────────────── */
function CheckMark({ yes }) {
  if (yes === false) return <div className="check-icon-wrap"><X size={16} className="check-no" /></div>;
  if (yes === true) return <div className="check-icon-wrap"><Check size={16} className="check-yes" strokeWidth={2.5} /></div>;
  return <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{yes}</span>;
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item">
      <button className="faq-trigger" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <div
          className="faq-icon"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}
        >
          <ChevronDown size={14} />
        </div>
      </button>
      {open && (
        <div className="faq-body">
          <p className="faq-answer">{a}</p>
        </div>
      )}
    </div>
  );
}

/* ── Team Cost Calculator ──────────────────────────────────────────────────── */
function CostCalculator() {
  const [users, setUsers] = useState(5);
  const [yearly, setYearly] = useState(false);

  const proPricePerUser = yearly ? 79 : 99;
  const bizPricePerUser = yearly ? 159 : 199;

  const proTotal = users * proPricePerUser;
  const bizTotal = users * bizPricePerUser;
  const jiraTotal = Math.round(users * 680); // approx ₹680/user/mo Jira Standard

  const proSavingsVsJira = jiraTotal - proTotal;

  return (
    <section className="calculator-section">
      <div className="calculator-header">
        <div className="pricing-hero-label">
          <Calculator size={13} />
          Team Cost Calculator
        </div>
        <h2 className="calc-heading">See exactly what you'll pay</h2>
        <p className="calc-sub">No surprises. No minimums. Adjust the slider to calculate your team's cost.</p>
      </div>

      <div className="calculator-card">
        <div className="calc-slider-row">
          <div className="calc-slider-label">
            <Users size={16} />
            <span><strong>{users}</strong> {users === 1 ? 'user' : 'users'}</span>
          </div>
          <div className="calc-billing-toggle">
            <button
              className={`calc-toggle-btn ${!yearly ? 'active' : ''}`}
              onClick={() => setYearly(false)}
            >Monthly</button>
            <button
              className={`calc-toggle-btn ${yearly ? 'active' : ''}`}
              onClick={() => setYearly(true)}
            >
              Yearly
              <span className="calc-save-badge">Save 20%</span>
            </button>
          </div>
        </div>

        <input
          type="range"
          min={1}
          max={100}
          value={users}
          onChange={e => setUsers(Number(e.target.value))}
          className="calc-range"
        />
        <div className="calc-range-labels">
          <span>1 user</span>
          <span>100 users</span>
        </div>

        <div className="calc-results">
          <div className="calc-result-card pro">
            <div className="calc-result-plan">Pro Plan</div>
            <div className="calc-result-rate">₹{proPricePerUser}/user/mo</div>
            <div className="calc-result-total">
              ₹{proTotal.toLocaleString('en-IN')}
              <span>/mo</span>
            </div>
            {yearly && (
              <div className="calc-result-annual">₹{(proTotal * 12).toLocaleString('en-IN')}/yr billed annually</div>
            )}
          </div>

          <div className="calc-result-card business">
            <div className="calc-result-plan">Business Plan</div>
            <div className="calc-result-rate">₹{bizPricePerUser}/user/mo</div>
            <div className="calc-result-total">
              ₹{bizTotal.toLocaleString('en-IN')}
              <span>/mo</span>
            </div>
            {yearly && (
              <div className="calc-result-annual">₹{(bizTotal * 12).toLocaleString('en-IN')}/yr billed annually</div>
            )}
          </div>

          <div className="calc-result-card jira-compare">
            <div className="calc-result-plan">Jira Standard (est.)</div>
            <div className="calc-result-rate">~₹680/user/mo</div>
            <div className="calc-result-total" style={{ color: '#ef4444' }}>
              ₹{jiraTotal.toLocaleString('en-IN')}
              <span>/mo</span>
            </div>
            <div className="calc-savings-pill">
              <TrendingDown size={12} />
              Save ₹{proSavingsVsJira.toLocaleString('en-IN')}/mo with Qualia Pro
            </div>
          </div>
        </div>

        <div className="calc-disclaimer">
          * Jira estimate based on Standard plan at approx. ₹680/user/month. Qualia Pro includes AI bug generation — not available in Jira at any price tier.
        </div>
      </div>
    </section>
  );
}

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function PricingPage() {
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(false);

  const getPriceDisplay = (plan) => {
    if (plan.id === 'free') return { amount: '0', period: '/mo', sub: 'Free forever' };
    if (plan.id === 'enterprise') return { amount: null, period: '', sub: 'Custom contract terms' };
    const price = yearly ? (plan.pricePerUserYearly || plan.yearlyPrice) : plan.pricePerUser;
    return {
      amount: price.toString(),
      period: '/user/mo',
      sub: yearly ? `Billed annually — save 20%` : 'Billed monthly · cancel anytime',
    };
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
        <div className="pricing-hero-label">
          <Zap size={12} />
          Per-User Pricing — Pay Only for What You Need
        </div>

        <h1 className="pricing-h1">
          Flexible AI-Powered QA<br />
          <em>Starting at ₹99/user/month</em>
        </h1>

        <p className="pricing-sub">
          No minimum users. No forced plan upgrades. No surprises.
          Add or remove users anytime — billing adjusts automatically.
        </p>

        <div className="pricing-hero-pills">
          <div className="hero-pill">✓ No user minimums</div>
          <div className="hero-pill">✓ Cancel anytime</div>
          <div className="hero-pill">✓ 85% cheaper than Jira</div>
          <div className="hero-pill">✓ Built-in AI</div>
        </div>

        <div className="billing-row">
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
            <div
              className="billing-slider"
              style={{
                left: yearly ? 'calc(50% + 1px)' : '4px',
                width: 'calc(50% - 5px)',
              }}
            />
          </div>

          {yearly && (
            <div className="yearly-chip">
              🎉 Save 20% with yearly billing
            </div>
          )}
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className="pricing-grid">
        {Object.values(PLANS).map((plan) => {
          const display = getPriceDisplay(plan);
          return (
            <div
              key={plan.id}
              className={`plan-card ${plan.popular ? 'featured' : ''}`}
            >
              {plan.popular && <div className="featured-ribbon">Most Popular</div>}

              {/* Plan identity */}
              <div className="pc-name">{plan.name}</div>
              <div className="pc-desc">{plan.tagline}</div>

              {/* Pricing */}
              <div className="pc-price-block">
                {display.amount === null ? (
                  <span className="pc-amount custom-price">Custom</span>
                ) : (
                  <>
                    <span className="pc-currency">₹</span>
                    <span className="pc-amount">
                      {display.amount === '0' ? '0' : Number(display.amount).toLocaleString('en-IN')}
                    </span>
                    <span className="pc-period">{display.period}</span>
                  </>
                )}
              </div>

              <div className="pc-savings">
                <span style={{ color: display.amount === null ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {display.sub}
                </span>
              </div>

              {/* Per-user pricing examples */}
              {plan.isPerUser && (
                <div className="pc-examples">
                  {[1, 5, 10, 25].map(n => {
                    const price = yearly ? (plan.pricePerUserYearly || plan.yearlyPrice) : plan.pricePerUser;
                    return (
                      <div key={n} className="pc-example-row">
                        <span>{n} {n === 1 ? 'user' : 'users'}</span>
                        <span>₹{(price * n).toLocaleString('en-IN')}/mo</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CTA */}
              <button
                className={`pc-btn ${plan.popular ? 'solid-accent' : plan.ctaSecondary ? 'solid-dark' : 'outline'}`}
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
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* ── AI Credit Add-Ons ── */}
      <section className="addons-section">
        <div className="addons-header">
          <div className="pricing-hero-label" style={{ marginBottom: 12 }}>
            <Sparkles size={12} />
            AI Credit Add-Ons
          </div>
          <h2 className="addons-heading">Need more AI power?</h2>
          <p className="addons-sub">Purchase additional AI credits at any time. Unused credits roll over for 30 days.</p>
        </div>
        <div className="addons-grid">
          {AI_CREDIT_PACKS.map(pack => (
            <div key={pack.id} className="addon-card">
              <div className="addon-icon">
                <Package size={20} />
              </div>
              <div className="addon-credits">{pack.label}</div>
              <div className="addon-price">{pack.priceDisplay}</div>
              <div className="addon-rate">
                ₹{(pack.price / pack.credits).toFixed(2)} per credit
              </div>
              <button className="addon-btn" onClick={() => navigate('/signup')}>
                Add Credits
              </button>
            </div>
          ))}
        </div>
        <p className="addons-note">Credits roll over for 30 days · No expiry on bulk packs · Works with Pro and Business plans</p>
      </section>

      {/* ── Team Cost Calculator ── */}
      <CostCalculator />

      {/* ── Trust Bar ── */}
      <section className="trust-bar">
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
      </section>

      {/* ── ROI Comparison vs Jira ── */}
      <section className="roi-section">
        <h2 className="compare-heading">Qualia vs Jira — The Real Cost</h2>
        <p className="compare-sub">
          AI-powered QA at 85% less than Jira, with features Jira doesn't even offer.
        </p>
        <div className="compare-wrap">
          <table className="compare-tbl roi-tbl">
            <thead>
              <tr>
                <th>Feature / Cost</th>
                <th style={{ color: '#5B6CFF' }}>Qualia Pro</th>
                <th>Jira Standard</th>
                <th className="col-featured">Advantage</th>
              </tr>
            </thead>
            <tbody>
              {ROI_ROWS.map((row, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{row.feature}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>{row.qualia}</td>
                  <td style={{ color: '#ef4444' }}>{row.jira}</td>
                  <td className="tc-featured">
                    <span className="roi-badge">{row.note}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Feature Comparison Table ── */}
      <section className="compare-section">
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
                <th>Pro</th>
                <th className="col-featured">Business</th>
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
                    <td className="tc"><CheckMark yes={row.vals[1]} /></td>
                    <td className="tc-featured"><CheckMark yes={row.vals[2]} /></td>
                    <td className="tc"><CheckMark yes={row.vals[3]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Billing Logic Callouts ── */}
      <section className="billing-logic-section">
        <h2 className="compare-heading">How Billing Works</h2>
        <div className="billing-logic-grid">
          {[
            { icon: <Users size={22} />, title: 'Pay for Active Users Only', desc: 'Only users who\'ve accepted their invite count toward your bill. Pending invites are free.' },
            { icon: <Zap size={22} />, title: 'Instant Prorations', desc: 'Add or remove users any time. Credits are automatically applied to your next invoice.' },
            { icon: <Star size={22} />, title: '20% Annual Discount', desc: 'Switch to yearly billing and save 20%. Applies to Pro (₹79/user) and Business (₹159/user).' },
            { icon: <Shield size={22} />, title: 'No Minimums Ever', desc: 'Start with 1 user or 100. There are no forced minimums, seat bundles, or surprise plan upgrades.' },
          ].map(item => (
            <div key={item.title} className="billing-logic-card">
              <div className="billing-logic-icon">{item.icon}</div>
              <h3 className="billing-logic-title">{item.title}</h3>
              <p className="billing-logic-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="faq-section">
        <h2 className="faq-heading">Frequently Asked Questions</h2>
        {FAQ_ITEMS.map((item) => (
          <FAQItem key={item.q} q={item.q} a={item.a} />
        ))}
      </section>

      {/* ── Final CTA ── */}
      <section className="final-cta-section">
        <div className="final-cta-tag">Get started today</div>
        <h2 className="final-cta-h2">
          Start Free. Pay Only<br />for Users You Add.
        </h2>
        <p className="final-cta-p">
          Free Sandbox forever on up to 5 users. Upgrade to Pro at ₹99/user when you're ready.
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
        <div className="fcta-note">No credit card required · Cancel anytime · No user minimums</div>
      </section>
    </div>
  );
}
