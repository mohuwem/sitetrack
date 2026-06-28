import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-sm text-gray-500 dark:bg-gray-900">
        Loading...
      </div>
    );
  }

  // user comes from verified JWT. localStorage token is the synchronous fallback
  // for the brief window between login() calling persist() and React committing state.
  const hasToken = !!localStorage.getItem("st_token");

  return user || hasToken ? <Outlet /> : <Navigate to="/signin" replace />;
}
