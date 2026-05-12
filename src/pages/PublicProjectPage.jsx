import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  BarChart3, CheckCircle2, Clock, AlertTriangle, 
  ShieldCheck, ExternalLink, Mail, ArrowRight,
  Monitor, Smartphone, Server
} from 'lucide-react';
import { getPublicProjectData, getBrandingSettings } from '../services/firestoreService';
import { formatDistanceToNow } from 'date-fns';

export default function PublicProjectPage() {
  const { projectId } = useParams();
  const [data, setData] = useState(null);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [projectData, brandingData] = await Promise.all([
          getPublicProjectData(projectId),
          getBrandingSettings()
        ]);
        
        if (!brandingData.publicViewEnabled) {
          setError('Public view is currently disabled for this portal.');
          return;
        }

        setData(projectData);
        setBranding(brandingData);
        
        // Apply primary color
        if (brandingData.primaryColor) {
          document.documentElement.style.setProperty('--accent', brandingData.primaryColor);
        }
      } catch (err) {
        setError('Project not found or access restricted.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  if (loading) return (
    <div className="loading-screen" style={{ background: '#f8fafc' }}>
      <div className="spinner spinner-lg" />
      <span>Fetching project status...</span>
    </div>
  );

  if (error) return (
    <div className="loading-screen" style={{ background: '#f8fafc' }}>
      <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: 16 }} />
      <h2 style={{ fontWeight: 800 }}>{error}</h2>
      <p style={{ color: 'var(--text-muted)' }}>Please contact the project administrator for access.</p>
    </div>
  );

  const { project, bugs } = data;
  const totalBugs = bugs.length;
  const resolvedBugs = bugs.filter(b => b.status === 'Resolved' || b.status === 'Closed').length;
  const progress = totalBugs > 0 ? Math.round((resolvedBugs / totalBugs) * 100) : 0;

  const stats = {
    open: bugs.filter(b => b.status === 'Open' || b.status === 'New').length,
    inProgress: bugs.filter(b => b.status === 'In Progress' || b.status === 'Fixing').length,
    testing: bugs.filter(b => b.status === 'Testing' || b.status === 'Pending Review').length,
    resolved: resolvedBugs
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: 80 }}>
      {/* Header */}
      <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.portalName} style={{ width: 28, height: 28, objectFit: 'contain' }} />
              ) : (
                <ShieldCheck size={24} />
              )}
            </div>
            <div>
              <h1 style={{ fontSize: '1.1rem', fontWeight: 900, margin: 0, color: '#1e293b' }}>{branding.portalName || 'Qapture'}</h1>
              <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', margin: 0 }}>Client Status Portal</p>
            </div>
          </div>
          {branding.supportEmail && (
            <a href={`mailto:${branding.supportEmail}`} className="btn btn-secondary btn-sm" style={{ gap: 8 }}>
              <Mail size={14} /> Get Support
            </a>
          )}
        </div>
      </nav>

      <div className="container" style={{ maxWidth: 1200, margin: '40px auto', padding: '0 24px' }}>
        {/* Project Intro */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', marginBottom: 12, letterSpacing: '-0.02em' }}>{project.name}</h2>
              <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: 700, lineHeight: 1.6 }}>{project.description}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 4 }}>Last update</p>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{format(new Date(), 'MMMM d, yyyy')}</p>
            </div>
          </div>

          {/* Progress Card */}
          <div style={{ background: '#fff', borderRadius: 24, padding: 40, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
                <BarChart3 size={20} style={{ color: 'var(--accent)' }} /> Delivery Progress
              </h3>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)' }}>{progress}%</span>
            </div>
            <div style={{ height: 12, background: '#f1f5f9', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent)', transition: 'width 1s ease-out', borderRadius: 6 }}></div>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{resolvedBugs}</span> items resolved out of <span style={{ fontWeight: 700, color: '#1e293b' }}>{totalBugs}</span> total reported bugs.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginBottom: 48 }}>
          {[
            { label: 'Active Issues', value: stats.open, color: '#f59e0b', icon: Clock },
            { label: 'In Development', value: stats.inProgress, color: '#6366f1', icon: Monitor },
            { label: 'Under QA', value: stats.testing, color: '#8b5cf6', icon: ShieldCheck },
            { label: 'Successfully Fixed', value: stats.resolved, color: '#10b981', icon: CheckCircle2 }
          ].map((stat, i) => (
            <div key={i} style={{ background: '#fff', padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={20} />
              </div>
              <div>
                <p style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>{stat.value}</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', margin: 0 }}>{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bugs List (Snapshot) */}
        <div style={{ background: '#fff', borderRadius: 24, padding: 32, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: 24 }}>Recent Activity Snapshot</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bugs.slice(0, 10).map((bug, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: '#f8fafc', borderRadius: 16, border: '1px solid #f1f5f9' }}>
                <div style={{ 
                  width: 10, height: 10, borderRadius: '50%', 
                  background: bug.status === 'Resolved' ? '#10b981' : bug.status === 'Fixing' ? '#6366f1' : '#f59e0b'
                }}></div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{bug.title}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    <span style={{ fontWeight: 600, color: '#64748b' }}>{bug.bugKey}</span> · {bug.createdAt ? formatDistanceToNow(bug.createdAt.toDate ? bug.createdAt.toDate() : new Date(bug.createdAt), { addSuffix: true }) : 'N/A'}
                  </p>
                </div>
                <div style={{ 
                  padding: '6px 12px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800, 
                  background: '#fff', border: '1px solid #e2e8f0', color: '#64748b', textTransform: 'uppercase'
                }}>
                  {bug.status}
                </div>
              </div>
            ))}
          </div>
          {bugs.length > 10 && (
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.85rem', color: '#94a3b8' }}>
              + {bugs.length - 10} more items in progress
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer style={{ marginTop: 80, textAlign: 'center', padding: '40px 0', borderTop: '1px solid #e2e8f0' }}>
        <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Secure Portal by <span style={{ fontWeight: 800, color: '#64748b' }}>{branding.portalName || 'Qapture'}</span> · © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

// Add some formatting helpers
function format(date, fmt) {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
