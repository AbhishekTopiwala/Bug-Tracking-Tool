import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, ChevronRight } from 'lucide-react';

const sections = [
  {
    id: 1, title: 'Introduction',
    content: `These Terms and Conditions ("Terms") constitute a legally binding agreement between you and Qualia, a cloud-based Quality Assurance and Bug Management platform. By creating an account, accessing the Platform, or subscribing to any plan, you acknowledge that you have read, understood, and agree to be bound by these Terms.\n\nIf you are entering into these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind such entity. Your continued use of the Platform following any modifications constitutes your acceptance of the revised Terms.`
  },
  {
    id: 2, title: 'Definitions',
    content: `"Qualia" refers to the cloud-based QA and Bug Management software platform and all related services.\n\n"Platform" means the Qualia web application, APIs, integrations, and all associated services.\n\n"User" means any individual who accesses or uses the Platform.\n\n"Customer" means any individual or entity subscribing to a paid plan.\n\n"Organization" means a company or team that creates and manages a workspace on the Platform.\n\n"Workspace" means a dedicated environment within the Platform containing projects, bugs, test cases, and team members.\n\n"Subscription" means the plan selected by the User for accessing the Platform's features.\n\n"Content" means all data, text, images, screenshots, files, and materials uploaded through the Platform.\n\n"Administrator" means a User with administrative privileges within an Organization or Workspace.`
  },
  {
    id: 3, title: 'Eligibility',
    content: `You must be at least 18 years of age to create an account or use the Platform. By using the Platform, you represent that you meet this age requirement.\n\nIf using the Platform on behalf of an organization, you represent that you are authorized to bind that organization to these Terms and that the organization is a legally constituted entity.\n\nThe Platform is designed primarily for business and professional use related to software quality assurance, testing, and project management.`
  },
  {
    id: 4, title: 'Account Registration',
    content: `To access most features, you must create an Account by providing accurate and complete registration information, including your full name, valid email address, and password.\n\nYou agree to provide truthful, accurate, current, and complete information and to update such information promptly. Qualia reserves the right to suspend or terminate any Account containing false or misleading information.\n\nYou are responsible for maintaining the confidentiality of your Account credentials and for all activities that occur under your Account. You must notify Qualia immediately of any unauthorized use or security breach.`
  },
  {
    id: 5, title: 'User Responsibilities & Acceptable Use',
    content: `You agree to use the Platform only for lawful purposes and must not:\n\n• Engage in any activity that violates applicable laws or regulations\n• Attempt to gain unauthorized access to the Platform or other users' accounts\n• Decompile, disassemble, or reverse engineer the Platform\n• Upload malicious code, viruses, or harmful software\n• Use automated means (bots, scrapers) to collect data without consent\n• Send unsolicited messages or spam through the Platform\n• Engage in deceptive, fraudulent, or impersonating activities\n• Interfere with or disrupt the integrity or performance of the Platform\n\nQualia reserves the right to investigate violations and take appropriate action, including account suspension or termination.`
  },
  {
    id: 6, title: 'Subscription Plans',
    content: `Free Plan: Provides limited access to Platform features with restrictions on projects, bugs, test cases, team members, and storage. Qualia may modify or discontinue the Free Plan at any time.\n\nStarter & Growth Plans: Paid plans billed monthly or annually, unlocking additional features and higher usage limits as described on our pricing page.\n\nEach plan includes specific usage limits. Exceeding limits may result in service restrictions or a requirement to upgrade your plan.`
  },
  {
    id: 7, title: 'Billing and Payments',
    content: `All payments are processed through Razorpay. By subscribing, you agree to Razorpay's Terms of Service and Privacy Policy. Qualia does not directly store your payment card information.\n\nPaid subscriptions are billed on a recurring basis (monthly or annually). You authorize Qualia and Razorpay to charge your payment method at the start of each billing cycle.\n\nAll prices are exclusive of applicable taxes (GST, VAT, etc.), which will be added to invoices as required by law. If payment fails, Qualia may suspend access until the balance is resolved.\n\nQualia reserves the right to modify pricing with at least 30 days' prior written notice. Your continued use after a price change constitutes acceptance.`
  },
  {
    id: 8, title: 'Renewals and Cancellations',
    content: `All paid subscriptions automatically renew at the end of each billing cycle unless cancelled prior to the renewal date.\n\nYou may cancel your subscription at any time through billing settings or by contacting support. Upon cancellation, your subscription remains active until the end of the current billing period, after which your account is downgraded to the Free Plan.\n\nUpgrades take effect immediately with prorated billing. Downgrades take effect at the next billing cycle with no prorated refunds.`
  },
  {
    id: 9, title: 'Refund Policy',
    content: `All payments are generally non-refundable due to the nature of digital SaaS services.\n\nMonthly Plans: No refunds are issued. You may cancel anytime and retain access until the billing period ends.\n\nAnnual Plans: Refund requests may be submitted within 7 days of the initial purchase or renewal, subject to minimal usage and good faith. Requests after this window will not be entertained.\n\nExceptional circumstances (extended outages, billing errors, duplicate charges) are reviewed case-by-case at Qualia's sole discretion.\n\nApproved refunds are processed within 14 business days to the original payment method.`
  },
  {
    id: 10, title: 'Intellectual Property Rights',
    content: `The Platform, including all software, code, algorithms, databases, user interfaces, designs, logos, and documentation, is the exclusive property of Qualia and protected by applicable intellectual property laws.\n\n"Qualia" and all related names, logos, and slogans are trademarks of Qualia. You may not use such marks without prior written permission.\n\nYou are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Platform during your subscription term.\n\nAny suggestions, feedback, or ideas you provide to Qualia are hereby assigned to Qualia, which may use them freely without obligation or compensation.`
  },
  {
    id: 11, title: 'User Content and Data',
    content: `You retain all ownership rights in the data and content you upload to the Platform. Qualia does not claim ownership of your data.\n\nBy uploading content, you grant Qualia a limited license to use, process, and transmit it solely for: providing and improving the Platform, providing technical support, generating anonymized analytics, and complying with applicable laws.\n\nYou warrant that you have all necessary rights to submit your data and that doing so does not violate any third-party rights or applicable laws.`
  },
  {
    id: 12, title: 'AI Features',
    content: `The Platform may include AI-powered features that generate suggestions, bug descriptions, test cases, and other outputs ("AI Outputs"). AI Outputs are intended to assist your workflow, not replace professional judgment.\n\nAI Outputs may be inaccurate, incomplete, or contextually inappropriate. Machine learning models are probabilistic and may produce errors. Qualia does not guarantee the accuracy or reliability of any AI Outputs.\n\nYou are solely responsible for reviewing and validating all AI Outputs before relying on them. AI Outputs do not constitute legal, professional, or technical advice.\n\nAI FEATURES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.`
  },
  {
    id: 13, title: 'Privacy and Data Protection',
    content: `Your use of the Platform is governed by our Privacy Policy. By using the Platform, you consent to the data practices described therein.\n\nQualia processes personal data in accordance with applicable data protection laws, including the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023 (India), and where applicable, the GDPR.\n\nYou are responsible for ensuring your use of the Platform complies with all applicable data protection laws in your jurisdiction.`
  },
  {
    id: 14, title: 'Service Availability',
    content: `Qualia targets 99.9% uptime but does not guarantee uninterrupted availability. This is a goal, not an SLA, unless separately agreed upon in writing under a Custom Agreement.\n\nQualia will provide advance notice of scheduled maintenance where possible. Unexpected outages will be resolved with commercially reasonable efforts.\n\nQualia is not liable for service interruptions caused by maintenance, force majeure events, third-party providers, your network issues, or your violation of these Terms.`
  },
  {
    id: 15, title: 'Beta Features',
    content: `Qualia may offer beta or experimental features ("Beta Features") for testing purposes. Beta Features may not be fully functional, stable, or complete.\n\nBETA FEATURES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. Qualia makes no representations regarding their reliability or performance.\n\nYour use of Beta Features is at your own risk. Qualia may modify, suspend, or discontinue Beta Features at any time without notice.`
  },
  {
    id: 16, title: 'Third-Party Services',
    content: `The Platform integrates with third-party services including Razorpay (payments), email providers, and cloud hosting. Your use of third-party services is governed by their respective terms and privacy policies.\n\nQualia is not responsible for the availability, accuracy, or functionality of any third-party services. The inclusion of third-party services does not constitute an endorsement by Qualia.`
  },
  {
    id: 17, title: 'Security',
    content: `Qualia implements industry-standard security measures including encryption of data in transit and at rest, role-based access controls, regular security assessments, and network security monitoring.\n\nYou are responsible for maintaining the security of your Account credentials, enabling available security features, and promptly notifying Qualia of any suspected security incidents.\n\nNo system is completely secure. Qualia does not guarantee that the Platform will be free from security vulnerabilities or cyber threats.`
  },
  {
    id: 18, title: 'Suspension and Termination',
    content: `Qualia may suspend your Account without prior notice if you breach these Terms, your use poses a security risk, your payment is overdue, or as required by law.\n\nQualia may remove Content that violates these Terms or is otherwise objectionable at its sole discretion.\n\nUpon termination, your right to access the Platform ceases immediately. Your data will be handled per the Data Retention section. Sections on Intellectual Property, Liability, Indemnification, Governing Law, and Dispute Resolution survive termination.`
  },
  {
    id: 19, title: 'Data Retention and Deletion',
    content: `Qualia retains your data for the duration of your active subscription. Following termination, data is retained for 30 days to allow for recovery or export, then permanently deleted from active systems.\n\nBackup copies may persist for up to 90 days in encrypted backup systems for disaster recovery purposes only.\n\nYou may request account closure and data deletion by contacting support@qualia.app. Qualia may retain data as required by applicable law or legal proceedings.`
  },
  {
    id: 20, title: 'Disclaimer of Warranties',
    content: `THE PLATFORM AND ALL SERVICES ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.\n\nTO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, QUALIA EXPRESSLY DISCLAIMS ALL WARRANTIES INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, AND RELIABILITY.\n\nQUALIA DOES NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.`
  },
  {
    id: 21, title: 'Limitation of Liability',
    content: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, QUALIA SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, BUSINESS, OR GOODWILL.\n\nQUALIA'S TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT PAID BY YOU IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) ₹1,000.\n\nTHESE LIMITATIONS APPLY REGARDLESS OF THE THEORY OF LIABILITY AND EVEN IF QUALIA HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`
  },
  {
    id: 22, title: 'Indemnification',
    content: `You agree to indemnify, defend, and hold harmless Qualia and its directors, officers, employees, and agents from and against all claims, damages, losses, and expenses (including attorney's fees) arising from: your use of the Platform, your violation of these Terms, your violation of any applicable law, your Content or Data, or any misrepresentation made by you.\n\nQualia reserves the right to assume exclusive defense of any matter subject to indemnification at your expense.`
  },
  {
    id: 23, title: 'Force Majeure',
    content: `Neither party shall be liable for failure or delay caused by events beyond reasonable control, including natural disasters, acts of war or terrorism, government actions, labor disputes, telecommunications or power failures, cyberattacks, or third-party provider failures.\n\nIf a Force Majeure Event continues for more than 60 consecutive days, either party may terminate these Terms upon written notice.`
  },
  {
    id: 24, title: 'Modifications to Terms',
    content: `Qualia may modify these Terms at any time. Material changes will be communicated via email or a prominent notice on the Platform at least 30 days before taking effect.\n\nYour continued use of the Platform after the effective date constitutes acceptance of the revised Terms.`
  },
  {
    id: 25, title: 'Governing Law & Dispute Resolution',
    content: `These Terms are governed by the laws of India, without regard to conflict of law principles.\n\nDisputes shall first be resolved through good-faith negotiation (30 days). If unresolved, disputes shall be submitted to binding arbitration under the Arbitration and Conciliation Act, 1996 (India), conducted in Ahmedabad, Gujarat, India, in English.\n\nTO THE MAXIMUM EXTENT PERMITTED BY LAW, YOU WAIVE YOUR RIGHT TO PARTICIPATE IN ANY CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.`
  },
  {
    id: 26, title: 'General Provisions',
    content: `Entire Agreement: These Terms, together with the Privacy Policy and any applicable Order Form, constitute the entire agreement between you and Qualia regarding the Platform.\n\nSeverability: If any provision is held invalid or unenforceable, it shall be modified minimally or severed, with remaining provisions continuing in full force.\n\nWaiver: Failure to enforce any provision does not constitute a waiver. Rights and remedies are cumulative.\n\nNotices: Qualia will send notices to the email address associated with your Account. Direct legal notices to legal@qualia.app.`
  },
  {
    id: 27, title: 'Contact Information',
    content: `For questions about these Terms, please contact us:\n\nCompany Name: [Company Legal Name]\nRegistered Address: [Registered Address, Ahmedabad, Gujarat, India]\nSupport Email: support@qualia.app\nLegal Email: legal@qualia.app\nSecurity Email: security@qualia.app\nWebsite: https://www.qualia.app`
  },
];

const QualiaLogo = () => (
  <svg width="26" height="26" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="15" cy="15" r="11" stroke="url(#tlogo)" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="52 14" />
    <path d="M22 22L29 29" stroke="url(#tlogop)" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M19 19L23 23" stroke="#5B6CFF" strokeWidth="3.5" strokeLinecap="round" />
    <defs>
      <linearGradient id="tlogo" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5B6CFF" /><stop offset="1" stopColor="#8F9BFF" />
      </linearGradient>
      <linearGradient id="tlogop" x1="22" y1="22" x2="29" y2="29" gradientUnits="userSpaceOnUse">
        <stop stopColor="#5B6CFF" /><stop offset="1" stopColor="#3B82F6" />
      </linearGradient>
    </defs>
  </svg>
);

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Inter', sans-serif" }}>

      {/* Subtle top glow — matches landing page */}
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
          <Link to="/privacy" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
            Privacy Policy →
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '56px 24px 48px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--accent-light)', border: '1px solid rgba(91,108,255,0.2)', borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
          <Shield size={13} color="var(--accent)" />
          <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Legal Document</span>
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px', color: 'var(--text-primary)' }}>
          Terms &amp; <span style={{ background: 'linear-gradient(135deg, var(--accent), #7B9EF8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Conditions</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 4px' }}>Effective Date: June 1, 2026 · Last Updated: June 1, 2026</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 520, margin: '8px auto 0', lineHeight: 1.6 }}>
          Please read these Terms carefully before using the Qualia platform. By accessing or using our services, you agree to be bound by these Terms.
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
                  <a key={s.id} href={`#section-${s.id}`}
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
            {/* Important banner */}
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 12, padding: '14px 18px', marginBottom: 36, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#EF4444' }}>!</span>
              </div>
              <p style={{ margin: 0, color: '#DC2626', fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>
                <strong>Important:</strong> By creating an account or using the Qualia Platform, you agree to these Terms and Conditions. If you do not agree, do not access or use the Platform.
              </p>
            </div>

            {/* Sections */}
            {sections.map((section, idx) => (
              <div key={section.id} id={`section-${section.id}`}
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
                <Shield size={20} color="var(--accent)" />
              </div>
              <p style={{ margin: '0 0 6px', color: 'var(--text-primary)', fontSize: 16, fontWeight: 700 }}>Have questions about our Terms?</p>
              <p style={{ margin: '0 0 20px', color: 'var(--text-secondary)', fontSize: 14 }}>Our legal team is happy to clarify anything in this document.</p>
              <a href="mailto:legal@qualia.app"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--accent)', color: '#fff', textDecoration: 'none', padding: '10px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 12px rgba(91,108,255,0.25)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                Contact Legal Team <ChevronRight size={14} />
              </a>
            </div>

            <div style={{ textAlign: 'center', marginTop: 32, color: 'var(--text-muted)', fontSize: 13 }}>
              © 2026 Qualia. All rights reserved. &nbsp;·&nbsp;
              <Link to="/privacy" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
