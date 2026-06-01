import { Link } from 'react-router-dom';
import { ArrowLeft, Lock, FileText, ChevronRight } from 'lucide-react';

const sections = [
  {
    id: 1, title: 'Introduction',
    content: `Qualia ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, share, and protect your personal information when you use the Qualia platform — a cloud-based Quality Assurance and Bug Management SaaS platform.\n\nThis Policy applies to all users of the Platform, including visitors, registered users, administrators, and team members. By using the Platform, you consent to the practices described in this Privacy Policy.\n\nIf you do not agree with this Policy, please discontinue your use of the Platform.`
  },
  {
    id: 2, title: 'Information We Collect',
    content: `Account & Registration Information: When you sign up, we collect your full name, email address, password (hashed), organization name, country, and optional GST number.\n\nSubscription & Billing Information: We collect your selected subscription plan, billing cycle, and payment metadata. Payment card details are processed and stored securely by Razorpay — we do not store raw card numbers.\n\nPlatform Usage Data: We collect data you create and upload on the Platform, including bug reports, test cases, project details, screenshots, file attachments, comments, mentions, and activity logs.\n\nTechnical & Device Data: We automatically collect IP address, browser type and version, operating system, device type, session duration, pages visited, and other diagnostic data.\n\nCommunication Data: If you contact our support team or interact via email, we retain those communications.\n\nAI Feature Data: When you use AI-powered features, your input data (e.g., screenshot metadata, bug descriptions) is processed to generate outputs.`
  },
  {
    id: 3, title: 'How We Use Your Information',
    content: `We use the information we collect to:\n\n• Provide, operate, maintain, and improve the Platform and its features\n• Process payments, manage subscriptions, and send billing communications\n• Send transactional emails (account confirmations, password resets, invitations)\n• Send product updates, feature announcements, and service notifications\n• Power AI-driven features including bug generation and test case suggestions\n• Generate anonymized, aggregated analytics to understand usage patterns\n• Respond to support requests and troubleshoot issues\n• Detect, prevent, and address security threats, fraud, and abuse\n• Comply with applicable legal obligations and regulatory requirements\n• Enforce our Terms and Conditions\n\nWe do not sell your personal data to third parties.`
  },
  {
    id: 4, title: 'Legal Basis for Processing',
    content: `We process your personal data on the following legal bases:\n\nContractual Necessity: Processing required to provide the Platform services you have subscribed to, including account management, billing, and service delivery.\n\nLegitimate Interests: Processing necessary for our legitimate business interests, such as fraud prevention, security monitoring, improving the Platform, and internal analytics, provided such interests are not overridden by your rights.\n\nLegal Obligation: Processing required to comply with applicable laws, including tax obligations, data protection regulations, and law enforcement requests.\n\nConsent: Where required, we process your data based on your explicit consent (e.g., marketing communications). You may withdraw consent at any time.`
  },
  {
    id: 5, title: 'Data Sharing and Disclosure',
    content: `We may share your information with:\n\nService Providers: Third-party vendors who help us operate the Platform, including cloud hosting providers (e.g., Google Firebase/Cloud), payment processors (Razorpay), email service providers, and analytics tools. These providers are contractually bound to protect your data.\n\nWithin Your Organization: Your data may be visible to other members of your Workspace based on their assigned roles and permissions as configured by your Administrator.\n\nLegal Requirements: We may disclose your information if required by law, regulation, court order, or governmental authority.\n\nBusiness Transfers: In the event of a merger, acquisition, or sale of all or part of our assets, your information may be transferred to the acquiring entity, subject to the same privacy protections.\n\nWe do not share your personal data with advertisers or data brokers.`
  },
  {
    id: 6, title: 'Cookies and Tracking',
    content: `We use cookies and similar tracking technologies to enhance your experience on the Platform.\n\nEssential Cookies: Required for the Platform to function. They enable authentication, session management, and security features. You cannot opt out of essential cookies.\n\nAnalytics Cookies: Help us understand how the Platform is used, identify issues, and improve performance. We use anonymized data from these cookies.\n\nPreference Cookies: Remember your settings and preferences to provide a personalized experience.\n\nYou can manage cookie preferences through your browser settings. Disabling certain cookies may affect Platform functionality.`
  },
  {
    id: 7, title: 'Data Security',
    content: `We implement industry-standard security measures to protect your data, including:\n\n• Encryption of data in transit using TLS/HTTPS\n• Encryption of sensitive data at rest\n• Role-based access controls limiting data access to authorized personnel\n• Regular security assessments and vulnerability scanning\n• Secure software development lifecycle (SDLC) practices\n• Employee security training and background checks\n• Incident response and breach notification procedures\n\nWhile we employ these measures, no system is completely secure. In the event of a confirmed data breach, we will notify you in accordance with applicable law.`
  },
  {
    id: 8, title: 'Data Retention',
    content: `We retain your personal data for as long as your account is active and as needed to provide the Platform services.\n\nUpon account termination or cancellation, we retain your data for 30 days to allow for account recovery or data export. After this period, your data is permanently deleted from active systems.\n\nEncrypted backup copies may persist for up to 90 days in disaster recovery systems before being permanently deleted.\n\nCertain data may be retained longer as required by applicable law, tax regulations, or legal proceedings.\n\nYou may request deletion of your data at any time by contacting privacy@qualia.app. We will process deletion requests within 30 days, subject to legal retention obligations.`
  },
  {
    id: 9, title: 'Your Rights',
    content: `Depending on your location and applicable law, you may have the following rights regarding your personal data:\n\nRight of Access: Request a copy of the personal data we hold about you.\n\nRight to Rectification: Request correction of inaccurate or incomplete personal data.\n\nRight to Erasure: Request deletion of your personal data, subject to legal retention obligations.\n\nRight to Data Portability: Request your data in a structured, machine-readable format.\n\nRight to Restrict Processing: Request that we limit how we use your data in certain circumstances.\n\nRight to Object: Object to processing based on legitimate interests or for direct marketing.\n\nRight to Withdraw Consent: Withdraw consent for processing where consent was the legal basis.\n\nTo exercise any of these rights, contact us at privacy@qualia.app. We will respond within 30 days.`
  },
  {
    id: 10, title: 'AI Features and Data',
    content: `When you use AI-powered features on the Platform (such as AI bug generation or test case suggestions), the data you input is processed by AI models to generate outputs.\n\nWe implement reasonable measures to protect the confidentiality of your data during AI processing. Your data is not shared with third-party AI model providers in a way that identifies you or your organization.\n\nAI Outputs are generated computationally and may be inaccurate or incomplete. You are solely responsible for reviewing and validating AI Outputs before relying on them.`
  },
  {
    id: 11, title: 'Third-Party Services',
    content: `The Platform integrates with or links to third-party services. These services have their own privacy policies that govern how they collect and use your data:\n\nRazorpay (Payment Processing): Handles payment card data in accordance with PCI-DSS standards. See razorpay.com/privacy for details.\n\nGoogle Firebase / Google Cloud: Provides cloud infrastructure, database, authentication, and storage services. See policies.google.com/privacy for details.\n\nEmail Service Providers: Used for transactional and notification emails.\n\nWe encourage you to review the privacy policies of any third-party services you interact with through the Platform.`
  },
  {
    id: 12, title: 'International Data Transfers',
    content: `Qualia is based in India. Your data may be processed and stored on servers located in India and other countries where our cloud infrastructure providers maintain data centers.\n\nIf you are located outside India, please be aware that your data may be transferred to and processed in countries with different data protection laws than your home country.\n\nWe implement appropriate safeguards for international data transfers, including contractual protections with our service providers.`
  },
  {
    id: 13, title: "Children's Privacy",
    content: `The Platform is not directed to children under the age of 18. We do not knowingly collect personal data from individuals under 18 years of age.\n\nIf you believe a child under 18 has provided us with personal data without parental consent, please contact us at privacy@qualia.app and we will take steps to delete such information.`
  },
  {
    id: 14, title: 'Changes to This Policy',
    content: `We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, or applicable laws. We will notify you of material changes by:\n\n• Sending an email to the address associated with your account\n• Displaying a prominent notice on the Platform\n\nThe "Last Updated" date at the top of this Policy reflects when it was most recently revised. Your continued use of the Platform after any changes constitutes your acceptance of the updated Policy.`
  },
  {
    id: 15, title: 'Compliance with Indian Law',
    content: `Qualia is committed to compliance with applicable Indian data protection laws, including:\n\nThe Information Technology Act, 2000 and the IT (Amendment) Act, 2008, which provide the foundational legal framework for data protection in India.\n\nThe Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.\n\nThe Digital Personal Data Protection Act, 2023 (DPDPA), which establishes comprehensive rights for data principals and obligations for data fiduciaries.\n\nWe act as a Data Fiduciary under the DPDPA and are committed to fulfilling our obligations regarding notice, consent, purpose limitation, data minimization, accuracy, storage limitation, and security.`
  },
  {
    id: 16, title: 'Contact Us',
    content: `If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact:\n\nPrivacy Officer / Data Protection Contact\nCompany: [Company Legal Name]\nAddress: [Registered Address, Ahmedabad, Gujarat, India]\nPrivacy Email: privacy@qualia.app\nSupport Email: support@qualia.app\nLegal Email: legal@qualia.app\nWebsite: https://www.qualia.app\n\nWe aim to respond to all privacy-related inquiries within 30 days.`
  },
];

const QualiaLogo = () => (
  <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="11" stroke="url(#plogo)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="52 14" />
    <path d="M22 22L29 29" stroke="url(#plogop)" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M19 19L23 23" stroke="#5B6CFF" strokeWidth="3.5" strokeLinecap="round" />
    <defs>
      <linearGradient id="plogo" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5B6CFF" /><stop offset="1" stopColor="#8F9BFF" />
      </linearGradient>
      <linearGradient id="plogop" x1="22" y1="22" x2="29" y2="29" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5B6CFF" /><stop offset="1" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
  </svg>
);

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>

      {/* Subtle top glow */}
      <div style={{ position: 'fixed', top: -100, left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: 'radial-gradient(circle, rgba(91,108,255,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, background: 'rgba(248,250,252,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', zIndex: 100, padding: '0 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            <ArrowLeft size={15} /> Back to Home
          </Link>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <QualiaLogo />
            <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>Qualia</span>
          </Link>
          <Link to="/terms" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            Terms &amp; Conditions →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '56px 24px 48px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--accent-light)', border: '1px solid rgba(91,108,255,0.2)', borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
          <Lock size={13} color="var(--accent)" />
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Legal Document</span>
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', color: 'var(--text-primary)' }}>
          Privacy <span style={{ background: 'linear-gradient(135deg, var(--accent), #7B9EF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Policy</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 4px' }}>Effective Date: June 1, 2026 · Last Updated: June 1, 2026</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 520, margin: '8px auto 0', lineHeight: 1.6 }}>
          Your privacy matters to us. This policy explains how Qualia collects, uses, and protects your personal information.
        </p>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px 80px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 40, alignItems: 'start' }}>

          {/* Sticky Sidebar TOC */}
          <aside style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <FileText size={14} color="var(--accent)" />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Contents</span>
              </div>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sections.map(s => (
                  <a key={s.id} href={`#pp-section-${s.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 500, textDecoration: 'none', transition: 'all 0.15s', lineHeight: 1.4 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-light)'; e.currentTarget.style.color = 'var(--accent)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                    <span style={{ width: 18, height: 18, borderRadius: 5, background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{s.id}</span>
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main>
            {/* Commitment banner */}
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '14px 18px', marginBottom: 36, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981' }}>✓</span>
              </div>
              <p style={{ margin: 0, color: '#059669', fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>
                <strong>Our Commitment:</strong> Qualia does not sell your personal data. We process your information only as described in this policy. You have rights over your data and can contact us at any time to exercise them.
              </p>
            </div>

            {/* Sections */}
            {sections.map((section, idx) => (
              <div key={section.id} id={`pp-section-${section.id}`}
                style={{ marginBottom: 0, paddingBottom: 36, borderBottom: idx < sections.length - 1 ? '1px solid var(--border)' : 'none', marginTop: idx === 0 ? 0 : 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-light)', border: '1px solid rgba(91,108,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)' }}>{section.id}</span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{section.title}</h2>
                </div>
                <div style={{ paddingLeft: 46 }}>
                  {section.content.split('\n\n').map((para, i) => (
                    <p key={i} style={{ margin: '0 0 10px', color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                      {para}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {/* CTA */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px', textAlign: 'center', marginTop: 40, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent-light)', border: '1px solid rgba(91,108,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Lock size={20} color="var(--accent)" />
              </div>
              <p style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: 16, fontWeight: 700 }}>Questions about your privacy?</p>
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14 }}>Our privacy team is here to help with any data-related inquiries.</p>
              <a href="mailto:privacy@qualia.app"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#fff', textDecoration: 'none', padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 12px rgba(91,108,255,0.25)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                Contact Privacy Team <ChevronRight size={14} />
              </a>
            </div>

            <div style={{ textAlign: 'center', marginTop: 32, color: 'var(--text-muted)', fontSize: 13 }}>
              © 2026 Qualia. All rights reserved. &nbsp;·&nbsp;
              <Link to="/terms" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Terms &amp; Conditions</Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
