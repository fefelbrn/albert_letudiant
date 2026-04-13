import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/lib/auth";

type Props = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: Props) => {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
