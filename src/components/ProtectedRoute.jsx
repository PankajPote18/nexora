import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Gates the consumer app behind a demo session (see useAuth.js) — a single
// hardcoded account (mobile 9999999999, OTP 1234), no real backend auth.
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
