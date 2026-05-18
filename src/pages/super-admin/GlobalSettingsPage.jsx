import { useState } from 'react';
import { 
  Settings, KeyRound, ShieldAlert, Sliders, Mail, 
  HelpCircle, Eye, EyeOff, Save, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function GlobalSettingsPage() {
  const [loading, setLoading] = useState(false);
  
  // Settings Forms States
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [signupDisabled, setSignupDisabled] = useState(false);
  
  const [apiKeys, setApiKeys] = useState({
    razorpayId: 'rzp_live_8Xf9s2mKl8D92s',
    razorpaySecret: '••••••••••••••••••••••••••••',
    geminiKey: '••••••••••••••••••••••••••••',
    emailjsService: 'service_q9s3k81',
    emailjsTemplate: 'template_r8w4v9s'
  });

  const [smtpSettings, setSmtpSettings] = useState({
    host: 'smtp.sendgrid.net',
    port: '587',
    user: 'apikey',
    sender: 'invitations@qualia-qa.com'
  });

  const [limits, setLimits] = useState({
    freeLimit: 10000,
    proLimit: 50000,
    enterpriseLimit: 250000
  });

  // Reveal triggers
  const [showSecret, setShowSecret] = useState({
    razorpaySecret: false,
    geminiKey: false
  });

  const toggleReveal = (field) => {
    setShowSecret(prev => ({ ...prev, [field]: !prev[field] }));
    // Update key placeholder to mock key value if revealed
    if (!showSecret[field]) {
      setApiKeys(prev => ({
        ...prev,
        [field]: field === 'razorpaySecret' ? 'sk_rzp_live_k9W8s2m8Xj4Kz8w9D8s' : 'AIzaSyCh-Gemini-9s2kK18s2Km8Xz7W1q'
      }));
    } else {
      setApiKeys(prev => ({
        ...prev,
        [field]: '••••••••••••••••••••••••••••'
      }));
    }
  };

  const handleSave = (section) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success(`${section} settings updated successfully`);
    }, 600);
  };

  return (
    <div className="sa-container">
      {/* Header */}
      <header className="sa-header">
        <div className="sa-title-area">
          <h1 className="sa-title">
            <Settings size={24} style={{ color: 'var(--sa-rose)' }} />
            Global Settings
          </h1>
          <p className="sa-subtitle">Configure centralized platform features, adjust third-party api allocations, SMTP configs, and plan limits</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 28 }}>
        {/* Left Side: System Control Switches */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div className="sa-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={18} style={{ color: 'var(--sa-rose)' }} />
              Platform Controls
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Maintenance Toggle */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', display: 'block' }}>Maintenance Mode</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3, display: 'block', marginTop: 2 }}>
                    Restrict tenant logins and show an offline notice during upgrades.
                  </span>
                </div>
                <input 
                  type="checkbox" 
                  checked={maintenanceMode}
                  onChange={(e) => {
                    setMaintenanceMode(e.target.checked);
                    toast.success(`Maintenance mode ${e.target.checked ? 'activated' : 'deactivated'}`);
                  }}
                  style={{ width: 42, height: 22, accentColor: 'var(--sa-rose)', cursor: 'pointer' }}
                />
              </div>

              {/* Signup Disabled Toggle */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderTop: '1px solid rgba(226, 232, 240, 0.6)', paddingTop: 16 }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', display: 'block' }}>Disable Signups</label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3, display: 'block', marginTop: 2 }}>
                    Temporarily block new organizations from registering on the platform.
                  </span>
                </div>
                <input 
                  type="checkbox" 
                  checked={signupDisabled}
                  onChange={(e) => {
                    setSignupDisabled(e.target.checked);
                    toast.success(`Tenant registrations ${e.target.checked ? 'disabled' : 'enabled'}`);
                  }}
                  style={{ width: 42, height: 22, accentColor: 'var(--sa-rose)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          <div className="sa-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={18} style={{ color: 'var(--sa-amber)' }} />
              AI Token Quotas
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                  <span>Free Trial limit</span>
                  <span>{limits.freeLimit.toLocaleString()} tokens</span>
                </div>
                <input 
                  type="range" 
                  min="5000" 
                  max="20000" 
                  step="1000" 
                  value={limits.freeLimit}
                  onChange={(e) => setLimits({ ...limits, freeLimit: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--sa-amber)' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                  <span>Premium Pro limit</span>
                  <span>{limits.proLimit.toLocaleString()} tokens</span>
                </div>
                <input 
                  type="range" 
                  min="20000" 
                  max="100000" 
                  step="5000" 
                  value={limits.proLimit}
                  onChange={(e) => setLimits({ ...limits, proLimit: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--sa-indigo)' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                  <span>Enterprise limit</span>
                  <span>{limits.enterpriseLimit.toLocaleString()} tokens</span>
                </div>
                <input 
                  type="range" 
                  min="100000" 
                  max="500000" 
                  step="10000" 
                  value={limits.enterpriseLimit}
                  onChange={(e) => setLimits({ ...limits, enterpriseLimit: parseInt(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--sa-rose)' }}
                />
              </div>

              <button 
                onClick={() => handleSave('Token Quota')}
                className="btn btn-primary"
                style={{ background: 'var(--sa-rose)', borderColor: 'var(--sa-rose)', width: '100%', borderRadius: 12, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <Save size={14} />
                Save Quotas
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Credentials & Service Configs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* API Credentials */}
          <div className="sa-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={18} style={{ color: 'var(--sa-indigo)' }} />
              API Key Credentials
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Razorpay Client ID */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Razorpay API key</label>
                <input 
                  type="text" 
                  value={apiKeys.razorpayId}
                  disabled
                  style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0 12px', fontSize: '0.8rem', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}
                />
              </div>

              {/* Razorpay Secret Key */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Razorpay Secret Client key</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    value={apiKeys.razorpaySecret}
                    disabled
                    style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0 42px 0 12px', fontSize: '0.8rem', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}
                  />
                  <button 
                    onClick={() => toggleReveal('razorpaySecret')}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer' }}
                  >
                    {showSecret.razorpaySecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Gemini API Key */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Gemini LLM engine key</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    value={apiKeys.geminiKey}
                    disabled
                    style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0 42px 0 12px', fontSize: '0.8rem', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}
                  />
                  <button 
                    onClick={() => toggleReveal('geminiKey')}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94A3B8', cursor: 'pointer' }}
                  >
                    {showSecret.geminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* EmailJS key values */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>EmailJS Service ID</label>
                  <input 
                    type="text" 
                    value={apiKeys.emailjsService}
                    disabled
                    style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0 12px', fontSize: '0.8rem', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>EmailJS Template ID</label>
                  <input 
                    type="text" 
                    value={apiKeys.emailjsTemplate}
                    disabled
                    style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0 12px', fontSize: '0.8rem', background: '#F8FAFC', color: '#0F172A', fontWeight: 600 }}
                  />
                </div>
              </div>

              <button 
                onClick={() => handleSave('API Keys')}
                className="btn btn-secondary"
                style={{ width: '100%', borderRadius: 12, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}
              >
                <ShieldCheck size={14} />
                Validate Credentials
              </button>
            </div>
          </div>

          {/* SMTP Settings */}
          <div className="sa-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={18} style={{ color: 'var(--sa-rose)' }} />
              SMTP Transactional Mail
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Host Server</label>
                <input 
                  type="text" 
                  value={smtpSettings.host}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
                  style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0 12px', fontSize: '0.8rem', color: '#0F172A', fontWeight: 600 }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Port</label>
                <input 
                  type="text" 
                  value={smtpSettings.port}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
                  style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0 12px', fontSize: '0.8rem', color: '#0F172A', fontWeight: 600 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Username Credentials</label>
                <input 
                  type="text" 
                  value={smtpSettings.user}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
                  style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0 12px', fontSize: '0.8rem', color: '#0F172A', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>Authorized Sender Address</label>
                <input 
                  type="text" 
                  value={smtpSettings.sender}
                  onChange={(e) => setSmtpSettings({ ...smtpSettings, sender: e.target.value })}
                  style={{ width: '100%', height: 40, borderRadius: 10, border: '1px solid rgba(226, 232, 240, 0.8)', padding: '0 12px', fontSize: '0.8rem', color: '#0F172A', fontWeight: 600 }}
                />
              </div>
            </div>

            <button 
              onClick={() => handleSave('SMTP Server')}
              className="btn btn-primary"
              style={{ background: 'var(--sa-rose)', borderColor: 'var(--sa-rose)', width: '100%', borderRadius: 12, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Save size={14} />
              Save SMTP Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
