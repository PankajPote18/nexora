import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Gates the consumer app behind a demo session (see useAuth.js) — any phone
// number can log in, no real backend auth. On top of that, a logged-in
// session that hasn't completed checkout yet (see PlansPage.jsx / markPaid)
// is confined to /plans until payment succeeds — everything else (home,
// search, a movie's detail page, /player, ...) bounces back there.
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, hasPaid } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPaid && location.pathname !== '/plans') {
    return <Navigate to="/plans" replace />;
  }

  return children;
};

export default ProtectedRoute;
