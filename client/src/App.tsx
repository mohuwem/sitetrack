import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import WorkerSignIn from "./pages/AuthPages/WorkerSignIn";
import WorkerSignUp from "./pages/AuthPages/WorkerSignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import AppLayout from "./layout/AppLayout";
import WorkerLayout from "./layout/WorkerLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import Tasks from "./pages/Tasks";
import Projects from "./pages/Projects";
import Reports from "./pages/Reports";
import Workers from "./pages/Workers";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import LandingPage from "./pages/LandingPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import RoleRoute from "./components/auth/RoleRoute";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import UpdatePassword from "./pages/AuthPages/UpdatePassword";
import WorkLogs from "./pages/WorkLogs";
import WorkerDashboard from "./pages/Worker/WorkerDashboard";
import WorkerTasks from "./pages/Worker/WorkerTasks";
import WorkerAttendance from "./pages/Worker/WorkerAttendance";
import WorkerProfile from "./pages/Worker/WorkerProfile";
import BrickCalculator from "./pages/Utilities/BrickCalculator";
import UtilitiesHub from "./pages/Utilities/UtilitiesHub";

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Public Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth Pages — Manager */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Auth Pages — Worker */}
        <Route path="/worker/signin" element={<WorkerSignIn />} />
        <Route path="/worker/signup" element={<WorkerSignUp />} />

        {/* Public utilities — no auth required */}
        <Route path="/utilities" element={<UtilitiesHub />} />
        <Route path="/utilities/brick-calculator" element={<BrickCalculator />} />

        {/* Protected + Manager-only routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={["manager"]} redirectTo="/worker-dashboard" />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Home />} />
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/workers" element={<Workers />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/worklogs" element={<WorkLogs />} />
            </Route>
          </Route>

          {/* Protected + Worker-only routes */}
          <Route element={<RoleRoute allowedRoles={["worker"]} redirectTo="/dashboard" />}>
            <Route element={<WorkerLayout />}>
              <Route path="/worker-dashboard" element={<WorkerDashboard />} />
              <Route path="/worker/tasks" element={<WorkerTasks />} />
              <Route path="/worker/attendance" element={<WorkerAttendance />} />
              <Route path="/worker/profile" element={<WorkerProfile />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
    </AuthProvider>
    </ErrorBoundary>
  );
}
