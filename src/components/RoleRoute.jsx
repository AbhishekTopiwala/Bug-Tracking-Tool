import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * RoleRoute — restricts access to a specific role.
 * allowedRoles: array of roles that can access this route.
 * redirectTo: where to send unauthorized users.
 */
export default function RoleRoute({ children, allowedRoles, redirectTo = '/' }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span>Checking access...</span>
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  if (!userProfile) {
    // Profile still loading — wait
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span>Loading profile...</span>
      </div>
    );
  }

  if (!allowedRoles.includes(userProfile.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
