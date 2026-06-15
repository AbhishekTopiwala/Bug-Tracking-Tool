import { useState, useEffect, useCallback } from 'react';
import { Settings, Building2, Shield, Save, Globe, Lock, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getOrgSettings, updateOrgSettings } from '../../services/orgService';
import toast from 'react-hot-toast';

export default function OrgSettingsPage() {
  const { currentUser, userProfile } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState({
    name: '', domain: '', industry: '', employeeCount: '',
    ssoEnabled: false, mfaRequired: false, sessionTimeout: 30,
  });

  const load = useCallback(async () => {
    if (!userProfile?.organizationId) return;
    try {
      const data = await getOrgSettings(userProfile.organizationId);
      setOrg(data);
      const loaded = {
        name: data.name || '',
        domain: data.domain || '',
        industry: data.industry || '',
        employeeCount: data.employeeCount || '',
        // Support both flat and nested settings structures
        ssoEnabled: data.settings?.ssoEnabled ?? data.ssoEnabled ?? false,
        mfaRequired: data.settings?.mfaRequired ?? data.mfaRequired ?? false,
        sessionTimeout: data.settings?.sessionTimeout ?? data.sessionTimeout ?? 30,
      };
      setForm(loaded);
      setIsDirty(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.organizationId]);

  useEffect(() => {
    if (userProfile?.organizationId) load();
  }, [userProfile?.organizationId, load]);

  const updateForm = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Organization name is required'); return; }
    setSaving(true);
    try {
      await updateOrgSettings(userProfile?.organizationId, {
        name: form.name.trim(),
        domain: form.domain.trim(),
        industry: form.industry,
        employeeCount: form.employeeCount,
        settings: {
          ssoEnabled: form.ssoEnabled,
          mfaRequired: form.mfaRequired,
          sessionTimeout: Number(form.sessionTimeout) || 30,
        },
      }, { displayName: currentUser?.displayName, email: currentUser?.email });
      toast.success('Settings saved successfully');
      setIsDirty(false);
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', border: '1px solid rgba(226,232,240,0.8)',
    borderRadius: 10, fontSize: '0.88rem', background: '#FAFBFC', outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  return (
    <div className="org-container">
      <div className="org-page-header">
        <div>
          <h1 className="org-page-title"><Settings size={24} style={{ color: 'var(--org-purple)' }} /> Organization Settings</h1>
          <p className="org-page-subtitle">Manage your organization name, domain, and security settings.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {isDirty && (
            <span style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertCircle size={12} /> Unsaved changes
            </span>
          )}
          <button className="org-btn-secondary" onClick={load} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} /> Reload
          </button>
          <button className="org-btn-primary" onClick={handleSave} disabled={saving || !isDirty}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Org ID Info Banner */}
      {!loading && org && (
        <div style={{ padding: '10px 16px', background: 'rgba(124,58,237,0.04)', borderRadius: 10, border: '1px solid rgba(124,58,237,0.1)', fontSize: '0.78rem', color: '#7C3AED', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={13} /> Organization ID: <code style={{ fontFamily: 'monospace', fontSize: '0.75rem', background: 'rgba(124,58,237,0.08)', padding: '2px 6px', borderRadius: 4, color: '#5B21B6' }}>{userProfile?.organizationId}</code>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12 }} />)}
        </div>
      ) : (
        <div className="org-grid-2">
          {/* General Settings */}
          <div className="org-card">
            <div className="org-card-header">
              <h3 className="org-card-title"><Building2 size={16} style={{ color: 'var(--org-purple)' }} /> General</h3>
            </div>
            <div className="org-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={labelStyle}>Organization Name <span style={{ color: '#EF4444' }}>*</span></label>
                <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)} style={inputStyle} placeholder="Acme Corp" />
              </div>
              <div>
                <label style={labelStyle}>Domain</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                  <input type="text" value={form.domain} onChange={e => updateForm('domain', e.target.value)} style={{ ...inputStyle, paddingLeft: 36 }} placeholder="acme.com" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Industry</label>
                <select value={form.industry} onChange={e => updateForm('industry', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select Industry</option>
                  <option value="Technology">Technology</option>
                  <option value="Finance">Finance</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Education">Education</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Employee Count</label>
                <select value={form.employeeCount} onChange={e => updateForm('employeeCount', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select Range</option>
                  <option value="1-50">1–50</option>
                  <option value="51-200">51–200</option>
                  <option value="201-1000">201–1,000</option>
                  <option value="1001-5000">1,001–5,000</option>
                  <option value="5000+">5,000+</option>
                </select>
              </div>

              {/* Metadata */}
              {org?.createdAt && (
                <div style={{ padding: '12px 0', borderTop: '1px solid rgba(226,232,240,0.5)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Created', value: org.createdAt?.toDate ? org.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                    { label: 'Owner', value: currentUser?.displayName || currentUser?.email || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                      <span style={{ color: '#94A3B8', fontWeight: 600 }}>{label}</span>
                      <span style={{ color: '#334155', fontWeight: 700 }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Security Settings */}
          <div className="org-card">
            <div className="org-card-header">
              <h3 className="org-card-title"><Lock size={16} style={{ color: 'var(--org-purple)' }} /> Security</h3>
            </div>
            <div className="org-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { label: 'Single Sign-On (SSO)', desc: 'Enable SAML/OIDC authentication for your organization', key: 'ssoEnabled' },
                { label: 'MFA Required', desc: 'Require multi-factor authentication for all users', key: 'mfaRequired' },
              ].map(({ label, desc, key }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(226,232,240,0.4)' }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', margin: 0 }}>{label}</p>
                    <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '2px 0 0' }}>{desc}</p>
                  </div>
                  <button
                    onClick={() => updateForm(key, !form[key])}
                    style={{
                      width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                      background: form[key] ? '#7C3AED' : '#E2E8F0', position: 'relative', transition: 'all 0.2s',
                      flexShrink: 0, marginLeft: 16,
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: form[key] ? 25 : 3,
                      transition: 'left 0.2s ease', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }} />
                  </button>
                </div>
              ))}
              <div>
                <label style={labelStyle}>Session Timeout (minutes)</label>
                <input type="number" value={form.sessionTimeout} onChange={e => updateForm('sessionTimeout', e.target.value)}
                  style={inputStyle} min={5} max={480} />
                <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '6px 0 0' }}>
                  Users will be logged out after {form.sessionTimeout} minutes of inactivity. Min: 5, Max: 480.
                </p>
              </div>
              <div style={{ padding: 16, background: 'rgba(124,58,237,0.04)', borderRadius: 12, border: '1px solid rgba(124,58,237,0.08)' }}>
                <p style={{ fontSize: '0.78rem', color: '#7C3AED', fontWeight: 700, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Shield size={12} /> Pro Features
                </p>
                <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  SSO and advanced MFA are available on paid plans. Upgrade to Pro or Business to enable these features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
