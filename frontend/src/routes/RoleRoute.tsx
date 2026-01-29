import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const RoleRoute = ({
  allowed,
  children,
}: {
  allowed: string[];
  children: JSX.Element;
}) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;

  if (!allowed.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default RoleRoute;
