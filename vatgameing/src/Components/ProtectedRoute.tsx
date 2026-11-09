import "../styles/auth.css";
import { Navigate, Outlet } from "react-router";
import NavBar from "./navBar.tsx";
import { useAuth } from "../hooks/useAuth.ts";

function ProtectedRoute() {
  const { user, profile } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <>
        <NavBar />
        <main className="auth-page">
          <p className="auth-error" role="alert">
            We couldn't load your account. Check your connection and refresh
            the page.
          </p>
        </main>
      </>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
