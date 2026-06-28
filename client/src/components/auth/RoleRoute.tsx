import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type Props = {
  allowedRoles: Array<"manager" | "worker">;
  redirectTo?: string;
};

export default function RoleRoute({ allowedRoles, redirectTo }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white text-sm text-gray-500 dark:bg-gray-900">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/signin" replace />;

  const effectiveRole: "manager" | "worker" = user.role === "worker" ? "worker" : "manager";

  if (!allowedRoles.includes(effectiveRole)) {
    const fallback = redirectTo ?? (effectiveRole === "worker" ? "/worker-dashboard" : "/dashboard");
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
