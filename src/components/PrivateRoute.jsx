import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonDashboard } from './Skeleton';

export default function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <SkeletonDashboard />;
  }

  return currentUser ? children : <Navigate to="/login" replace />;
}
