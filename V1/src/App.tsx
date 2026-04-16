import { type ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Navbar } from "./components/layout/Navbar";
import { HomePage } from "./pages/HomePage";
import { LinkagePage } from "./pages/LinkagePage";
import { LoginPage } from "./pages/LoginPage";
import { PrivatePage } from "./pages/PrivatePage";
import { SchoolsPage } from "./pages/SchoolsPage";
import { useAuth } from "./state/AuthContext";

function PrivateRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/private" replace /> : children;
}

export function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/schools" element={<SchoolsPage />} />
        <Route path="/linkage" element={<LinkagePage />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/private"
          element={
            <PrivateRoute>
              <PrivatePage />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}
