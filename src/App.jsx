import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './styles/global.css';
import './styles/components.css';
import './styles/developer.css';
import './styles/admin.css';
import './styles/super-admin.css';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { subscribeToNotifications } from './services/firestoreService';

// Shared components
import Sidebar from './components/Sidebar';
import DevSidebar from './components/DevSidebar';
import AdminSidebar from './components/AdminSidebar';
import SuperAdminSidebar from './components/super-admin/SuperAdminSidebar';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';

// Lazy-loaded Auth pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));

// Lazy-loaded QA Portal pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BugsListPage = lazy(() => import('./pages/BugsListPage'));
const BugFormPage = lazy(() => import('./pages/BugFormPage'));
const BugDetailPage = lazy(() => import('./pages/BugDetailPage'));
const AIGeneratorPage = lazy(() => import('./pages/AIGeneratorPage'));
const TestCasesPage = lazy(() => import('./pages/TestCasesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));

// Lazy-loaded Developer Portal pages
const DevDashboardPage = lazy(() => import('./pages/dev/DevDashboardPage'));
const DevBugsBoardPage = lazy(() => import('./pages/dev/DevBugsBoardPage'));
const DevBugDetailPage = lazy(() => import('./pages/dev/DevBugDetailPage'));

// Lazy-loaded Admin Portal pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const TeamManagementPage = lazy(() => import('./pages/admin/TeamManagementPage'));
const ProjectOverviewPage = lazy(() => import('./pages/admin/ProjectOverviewPage'));
const ProjectTeamPage = lazy(() => import('./pages/admin/ProjectTeamPage'));
const PublicProjectPage = lazy(() => import('./pages/PublicProjectPage'));

// Lazy-loaded Super Admin Portal pages
const SuperAdminDashboardPage = lazy(() => import('./pages/super-admin/SuperAdminDashboardPage'));
const OrganizationsManagementPage = lazy(() => import('./pages/super-admin/OrganizationsManagementPage'));
const SubscriptionsManagementPage = lazy(() => import('./pages/super-admin/SubscriptionsManagementPage'));
const AIAnalyticsPage = lazy(() => import('./pages/super-admin/AIAnalyticsPage'));
const SystemHealthPage = lazy(() => import('./pages/super-admin/SystemHealthPage'));
const GlobalSettingsPage = lazy(() => import('./pages/super-admin/GlobalSettingsPage'));
const UserManagementPage = lazy(() => import('./pages/super-admin/UserManagementPage'));

import { Loader2 } from 'lucide-react';

function PageLoader() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      color: 'var(--text-secondary)'
    }}>
      <div className="spinner spinner-lg" style={{ marginBottom: 16 }} />
      <p style={{ fontWeight: 600, fontSize: '0.95rem', letterSpacing: '0.02em', color: 'var(--text-muted)' }}>Loading Workspace...</p>
    </div>
  );
}


// ── Root redirect based on role ──────────────────────────────────────────────
function RootRedirect() {
  const { currentUser, userProfile, loading, isSuperAdmin, isAdmin } = useAuth();

  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;

  if (!userProfile) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        <Loader2 size={32} className="spin" style={{ marginBottom: 16, color: 'var(--accent)' }} />
        <p style={{ fontWeight: 500 }}>Initializing your workspace...</p>
      </div>
    );
  }

  if (isSuperAdmin) return <Navigate to="/super-admin" replace />;
  if (userProfile.role === 'Developer') return <Navigate to="/dev" replace />;
  if (isAdmin) return <Navigate to="/admin" replace />;
  return <Navigate to="/qa" replace />;
}

// ── QA Portal Layout ─────────────────────────────────────────────────────────
function QAPortal() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, setNotifications);
    return () => unsub();
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="app-layout">
      <Sidebar unreadCount={unreadCount} />
      <div className="main-content">
        <Routes>
          <Route index element={<DashboardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="bugs" element={<BugsListPage />} />
          <Route path="bugs/new" element={<BugFormPage />} />
          <Route path="bugs/:id" element={<BugDetailPage />} />
          <Route path="bugs/:id/edit" element={<BugFormPage />} />
          <Route path="ai-generator" element={<AIGeneratorPage />} />
          <Route path="test-cases" element={<TestCasesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/qa" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// ── Developer Portal Layout ───────────────────────────────────────────────────
function DevPortal() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, setNotifications);
    return () => unsub();
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="app-layout">
      <DevSidebar unreadCount={unreadCount} />
      <div className="main-content">
        <Routes>
          <Route index element={<DevDashboardPage />} />
          <Route path="bugs" element={<DevBugsBoardPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="bugs/new" element={<BugFormPage />} />
          <Route path="bugs/:id" element={<DevBugDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dev" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// ── Admin Portal Layout ───────────────────────────────────────────────────────
function AdminPortal() {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToNotifications(currentUser.uid, setNotifications);
    return () => unsub();
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="app-layout">
      <AdminSidebar unreadCount={unreadCount} />
      <div className="main-content">
        <Routes>
          <Route index element={<AdminDashboardPage />} />
          <Route path="team" element={<TeamManagementPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectOverviewPage />} />
          <Route path="projects/:projectId/team" element={<ProjectTeamPage />} />
          <Route path="bugs" element={<BugsListPage />} />
          <Route path="bugs/new" element={<BugFormPage />} />
          <Route path="bugs/:id" element={<BugDetailPage />} />
          <Route path="bugs/:id/edit" element={<BugFormPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// ── Super Admin Portal Layout ───────────────────────────────────────────────────
function SuperAdminPortal() {
  return (
    <div className="app-layout">
      <SuperAdminSidebar />
      <div className="main-content">
        <Routes>
          <Route index element={<SuperAdminDashboardPage />} />
          <Route path="organizations" element={<OrganizationsManagementPage />} />
          <Route path="subscriptions" element={<SubscriptionsManagementPage />} />
          <Route path="ai-usage" element={<AIAnalyticsPage />} />
          <Route path="health" element={<SystemHealthPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="settings" element={<GlobalSettingsPage />} />
          <Route path="*" element={<Navigate to="/super-admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
function AppLayout() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/invite'].includes(location.pathname);

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/invite" element={<InvitePage />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Public View (No Auth) */}
      <Route path="/public/:projectId" element={<PublicProjectPage />} />

      {/* Root → role-based redirect */}
      <Route path="/" element={<PrivateRoute><RootRedirect /></PrivateRoute>} />

      {/* QA Portal — /qa/* (QA role only) */}
      <Route
        path="/qa/*"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['QA']} redirectTo="/">
              <QAPortal />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      {/* Developer Portal — /dev/* */}
      <Route
        path="/dev/*"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['Developer']} redirectTo="/">
              <DevPortal />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      {/* Admin Portal — /admin/* */}
      <Route
        path="/admin/*"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['Admin', 'org_admin', 'super_admin', 'Superadmin', 'Manager']} redirectTo="/">
              <AdminPortal />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      {/* Super Admin Portal — /super-admin/* */}
      <Route
        path="/super-admin/*"
        element={
          <PrivateRoute>
            <RoleRoute allowedRoles={['super_admin', 'Superadmin']} redirectTo="/">
              <SuperAdminPortal />
            </RoleRoute>
          </PrivateRoute>
        }
      />

      {/* Legacy redirects */}
      <Route path="/bugs/*" element={<PrivateRoute><RootRedirect /></PrivateRoute>} />
      <Route path="/ai-generator" element={<Navigate to="/qa/ai-generator" replace />} />
      <Route path="/test-cases" element={<Navigate to="/qa/test-cases" replace />} />
      <Route path="/notifications" element={<Navigate to="/qa/notifications" replace />} />
      <Route path="/settings" element={<Navigate to="/qa/settings" replace />} />


      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
        <AppLayout />
      </Suspense>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '0.875rem',
            fontFamily: 'Inter, sans-serif',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  );
}
