import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './styles/global.css';
import './styles/components.css';
import './styles/developer.css';
import './styles/admin.css';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { subscribeToNotifications } from './services/firestoreService';

// Shared components
import Sidebar from './components/Sidebar';
import DevSidebar from './components/DevSidebar';
import AdminSidebar from './components/AdminSidebar';
import PrivateRoute from './components/PrivateRoute';
import RoleRoute from './components/RoleRoute';

// Auth pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CloudinaryDemo from './pages/CloudinaryDemo';

// QA Portal pages
import DashboardPage from './pages/DashboardPage';
import BugsListPage from './pages/BugsListPage';
import BugFormPage from './pages/BugFormPage';
import BugDetailPage from './pages/BugDetailPage';
import AIGeneratorPage from './pages/AIGeneratorPage';
import TestCasesPage from './pages/TestCasesPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import ProjectsPage from './pages/ProjectsPage';

// Developer Portal pages
import DevDashboardPage from './pages/dev/DevDashboardPage';
import DevBugsBoardPage from './pages/dev/DevBugsBoardPage';
import DevBugDetailPage from './pages/dev/DevBugDetailPage';

// Admin Portal pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import TeamManagementPage from './pages/admin/TeamManagementPage';
import ProjectOverviewPage from './pages/admin/ProjectOverviewPage';
import ProjectTeamPage from './pages/admin/ProjectTeamPage';
import { Loader2 } from 'lucide-react';

// ── Root redirect based on role ──────────────────────────────────────────────
function RootRedirect() {
  const { currentUser, userProfile, loading } = useAuth();

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

  if (userProfile.role === 'Developer') return <Navigate to="/dev" replace />;
  if (userProfile.role === 'Admin')     return <Navigate to="/admin" replace />;
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
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
function AppLayout() {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);

  if (isAuthPage) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/cloudinary-demo" element={<CloudinaryDemo />} />
      </Routes>
    );
  }

  return (
    <Routes>
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
            <RoleRoute allowedRoles={['Admin']} redirectTo="/">
              <AdminPortal />
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
      <Route path="/cloudinary-demo" element={<CloudinaryDemo />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppLayout />
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
