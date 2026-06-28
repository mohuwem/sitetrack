import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";

export default function WorkerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/worker/signin");
  };

  const navLinks = [
    { to: "/worker-dashboard", label: "Dashboard" },
    { to: "/worker/tasks", label: "My Tasks" },
    { to: "/worker/attendance", label: "Attendance" },
    { to: "/worker/profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white">
              S
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">SiteTrack</p>
              <p className="text-xs text-gray-400 leading-none mt-0.5">Worker portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 dark:text-gray-400 sm:block">
              {user?.firstName} {user?.lastName}
            </span>
            <ThemeToggleButton />
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* Bottom tab bar (mobile-first navigation) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto grid max-w-2xl grid-cols-4">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-brand-500"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
