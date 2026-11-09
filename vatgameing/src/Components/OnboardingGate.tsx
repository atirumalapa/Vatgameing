import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../hooks/useAuth.ts";

const CHOICE_PAGE = "/onboarding";

// Wraps every route, so no page can appear before the student type is chosen.
function OnboardingGate() {
  const { user, profile, loading } = useAuth();
  const { pathname } = useLocation();

  // Nothing renders until we know who this is, which also means
  // the pages inside never have to handle a loading state.
  if (loading) return null;

  if (user && profile) {
    const onChoicePage = pathname === CHOICE_PAGE;
    if (!profile.studentType && !onChoicePage) {
      return <Navigate to={CHOICE_PAGE} replace />;
    }
    // Also what moves people on to the Dashboard once they've chosen.
    if (profile.studentType && onChoicePage) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}

export default OnboardingGate;
