import { useState, useEffect } from 'react';
import { Palette, Upload, Check, Globe, Layout, ShieldCheck, Loader2 } from 'lucide-react';
import Topbar from '../../components/Topbar';
import { getBrandingSettings, updateBrandingSettings } from '../../services/firestoreService';
import { uploadToCloudinary } from '../../services/cloudinaryService';
import toast from 'react-hot-toast';

export default function BrandingSettingsPage() {
  const [settings, setSettings] = useState({
    portalName: 'Qapture',
    primaryColor: '#6366f1',
    logoUrl: '',
    supportEmail: '',
    publicViewEnabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getBrandingSettings();
        setSettings(data);
        setLogoPreview(data.logoUrl || '');
      } catch (error) {
        toast.error('Failed to load branding settings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalLogoUrl = settings.logoUrl;
      if (logoFile) {
        const result = await uploadToCloudinary(logoFile);
        finalLogoUrl = result.url;
      }

      const updated = { ...settings, logoUrl: finalLogoUrl };
      await updateBrandingSettings(updated);
      toast.success('Branding settings updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner spinner-lg" />
      <span>Loading customization tools...</span>
    </div>
  );

  return (
    <>
      <Topbar title="Portal Customization" subtitle="Manage your brand identity and portal settings" />
      
      <div className="page-container" style={{ maxWidth: 800 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Brand Identity Card */}
          <div className="card" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 10, background: 'rgba(99,102,241,0.1)', color: '#6366f1', borderRadius: 12 }}>
                <Palette size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Brand Identity</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="form-group">
                <label className="form-label">Portal Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={settings.portalName}
                  onChange={(e) => setSettings({...settings, portalName: e.target.value})}
                  placeholder="e.g. Qapture"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Primary Brand Color</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input 
                    type="color" 
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                    style={{ width: 44, height: 44, padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none' }}
                  />
                  <input 
                    type="text" 
                    className="form-control" 
                    value={settings.primaryColor}
                    onChange={(e) => setSettings({...settings, primaryColor: e.target.value})}
                    placeholder="#6366f1"
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Portal Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 20, background: 'var(--bg-secondary)', borderRadius: 16, border: '1px dashed var(--border)' }}>
                <div style={{ width: 80, height: 80, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <Layout size={32} style={{ opacity: 0.2 }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Upload high-resolution logo</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 14 }}>Recommended size 512x512px. PNG or SVG preferred.</p>
                  <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    <Upload size={14} /> Replace Logo
                    <input type="file" hidden accept="image/*" onChange={handleLogoChange} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Access & Visibility Card */}
          <div className="card" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 10, background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 12 }}>
                <Globe size={20} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Public Visibility</h3>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: 16 }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, margin: 0 }}>Enable Client Public View</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: 4 }}>Allow clients to view project progress via shareable links</p>
              </div>
              <label className="switch" style={{ transform: 'scale(1.1)' }}>
                <input 
                  type="checkbox" 
                  checked={settings.publicViewEnabled}
                  onChange={(e) => setSettings({...settings, publicViewEnabled: e.target.checked})}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="form-group" style={{ marginTop: 24 }}>
              <label className="form-label">Support Email Address</label>
              <input 
                type="email" 
                className="form-control" 
                value={settings.supportEmail}
                onChange={(e) => setSettings({...settings, supportEmail: e.target.value})}
                placeholder="support@yourcompany.com"
              />
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>This email will be displayed on the public status pages for feedback</p>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>Discard Changes</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave} 
              disabled={saving}
              style={{ padding: '12px 32px', minWidth: 160 }}
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="spin" /> Saving...
                </>
              ) : (
                <>
                  <Check size={18} /> Save Branding
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .switch { position: relative; display: inline-block; width: 44px; height: 22px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border); transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #10b981; }
        input:checked + .slider:before { transform: translateX(22px); }
      `}</style>
    </>
  );
}
