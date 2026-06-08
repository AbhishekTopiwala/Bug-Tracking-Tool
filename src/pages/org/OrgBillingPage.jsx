import { useState, useEffect } from 'react';
import { CreditCard, Package, Calendar, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgSettings } from '../../services/orgService';

export default function OrgBillingPage() {
  const { userProfile } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getOrgSettings(userProfile?.organizationId);
        setOrg(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    if (userProfile?.organizationId) load();
  }, [userProfile?.organizationId]);

  const plan = org?.subscription?.plan || 'free';
  const status = org?.subscription?.status || 'active';
  const userLimit = org?.subscription?.userLimit || 'Unlimited';
  const storageLimit = org?.subscription?.storageLimit || '5 GB';

  return (
    <div className="org-container">
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title"><CreditCard size={24} style={{ color: 'var(--org-purple)' }} /> Billing & Subscription</h1>
          <p className="org-page-subtitle">Manage your subscription plan and billing information.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 18 }} />)}
        </div>
      ) : (
        <>
          {/* Current Plan */}
          <div className="org-card" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.04), rgba(139,92,246,0.02))', border: '1px solid rgba(124,58,237,0.12)' }}>
            <div className="org-card-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                    Current Plan
                  </p>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', margin: '0 0 8px', textTransform: 'capitalize' }}>{plan}</h2>
                  <span className={`org-status-pill ${status === 'active' ? 'org-status-active' : 'org-status-inactive'}`}>
                    {status}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Package size={14} style={{ color: '#64748B' }} />
                      <span style={{ fontSize: '0.85rem', color: '#64748B' }}>User Limit: <strong style={{ color: '#0F172A' }}>{userLimit}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={14} style={{ color: '#64748B' }} />
                      <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Storage: <strong style={{ color: '#0F172A' }}>{storageLimit}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Options */}
          <div className="org-grid-3">
            {[
              { name: 'Starter', price: 'Free', features: ['5 Users', '2 Projects', '1 GB Storage', 'Email Support'], current: plan === 'free' },
              { name: 'Professional', price: '₹2,999/mo', features: ['25 Users', '10 Projects', '10 GB Storage', 'Priority Support', 'API Access'], current: plan === 'professional' },
              { name: 'Enterprise', price: 'Custom', features: ['Unlimited Users', 'Unlimited Projects', '100 GB Storage', 'SSO & MFA', 'Dedicated Support', 'Custom Integrations'], current: plan === 'enterprise' },
            ].map(tier => (
              <div key={tier.name} className="org-card" style={{
                padding: 24,
                border: tier.current ? '2px solid var(--org-purple)' : undefined,
                position: 'relative'
              }}>
                {tier.current && (
                  <span style={{
                    position: 'absolute', top: -1, right: 20, background: '#7C3AED',
                    color: '#fff', fontSize: '0.65rem', fontWeight: 800, padding: '3px 10px',
                    borderRadius: '0 0 6px 6px', textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>Current</span>
                )}
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0F172A', margin: '0 0 4px' }}>{tier.name}</h3>
                <p style={{ fontWeight: 900, fontSize: '1.5rem', color: '#7C3AED', margin: '0 0 16px' }}>{tier.price}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: '#64748B' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button className={tier.current ? 'org-btn-secondary' : 'org-btn-primary'} style={{ width: '100%', justifyContent: 'center' }} disabled={tier.current}>
                  {tier.current ? 'Current Plan' : 'Upgrade'} {!tier.current && <ArrowRight size={14} />}
                </button>
              </div>
            ))}
          </div>

          {/* Billing Contact */}
          <div className="org-card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={16} style={{ color: 'var(--org-purple)' }} /> Billing Information
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { label: 'Contact Name', value: org?.billing?.contactName || 'Not set' },
                { label: 'Contact Email', value: org?.billing?.contactEmail || 'Not set' },
                { label: 'Address', value: org?.billing?.address || 'Not set' },
                { label: 'GST Number', value: org?.billing?.gstNumber || 'Not set' },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: '12px 0', borderBottom: '1px solid rgba(226,232,240,0.4)' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 4px' }}>{label}</p>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
