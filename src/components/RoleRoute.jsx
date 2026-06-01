import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonDashboard } from './Skeleton';

/**
 * RoleRoute — restricts access to a specific role.
 * allowedRoles: array of roles that can access this route.
 * redirectTo: where to send unauthorized users.
 */
export default function RoleRoute({ children, allowedRoles, redirectTo = '/' }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  if (!userProfile) {
    // Profile still loading — wait
    return <SkeletonDashboard />;
  }

  if (!allowedRoles.includes(userProfile.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
