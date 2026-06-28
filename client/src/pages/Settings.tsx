import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type PasswordForm = {
  next: string;
  confirm: string;
};

type Toast = { message: string; type: "success" | "error"; visible: boolean };

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout, updateProfile, changePassword } = useAuth();

  const [profile, setProfile] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    company: user?.company ?? "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ next: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const [signOutLoading, setSignOutLoading] = useState(false);

  const [toast, setToast] = useState<Toast>({ message: "", type: "success", visible: false });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError("");
    try {
      await updateProfile(profile);
      showToast("Profile updated successfully");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (passwordForm.next.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(passwordForm.next);
      setPasswordForm({ next: "", confirm: "" });
      showToast("Password updated successfully");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSignOut = () => {
    setSignOutLoading(true);
    logout();
    navigate("/signin");
  };

  const inputCls = "w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white disabled:opacity-50";

  return (
    <div className="space-y-6">
      {toast.visible && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium text-white shadow-lg ${toast.type === "error" ? "bg-red-500" : "bg-green-500"}`}>
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Settings</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Manage your profile, security, and account preferences.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Profile */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Profile</h2>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">Update your display name, role, and organisation.</p>

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">First name</label>
                <input type="text" value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Last name</label>
                <input type="text" value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input type="email" value={user?.email ?? ""} disabled className={inputCls} />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Email cannot be changed here.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Company / Organisation</label>
              <input type="text" value={profile.company} onChange={(e) => setProfile((p) => ({ ...p, company: e.target.value }))} placeholder="e.g. Apex Construction" className={inputCls} />
            </div>
            {profileError && <p className="text-sm text-red-500">{profileError}</p>}
            <button type="submit" disabled={profileSaving}
              className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {profileSaving ? "Saving…" : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Security */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Change Password</h2>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">Choose a strong password of at least 8 characters.</p>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">New password</label>
              <input type="password" value={passwordForm.next} onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))} placeholder="New password" className={inputCls} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm new password</label>
              <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" className={inputCls} />
            </div>
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            <button type="submit" disabled={passwordSaving}
              className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
              {passwordSaving ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>
      </div>

      {/* Account info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Account</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Your account details stored in the SiteTrack database.</p>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          {[
            { label: "Name", value: user ? `${user.firstName} ${user.lastName}` : "—" },
            { label: "Email", value: user?.email ?? "—" },
            { label: "Role", value: user?.role || "Not set" },
            { label: "Company", value: user?.company || "Not set" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
              <p className="mt-1 font-medium text-gray-800 dark:text-white/90 truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* App info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">About SiteTrack</h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Construction site management platform.</p>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          {[
            { label: "Version", value: "1.0.0" },
            { label: "Stack", value: "React · Node.js · MongoDB" },
            { label: "Auth", value: "MongoDB + JWT" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.02]">
              <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
              <p className="mt-1 font-medium text-gray-800 dark:text-white/90">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900/40 dark:bg-white/[0.03]">
        <h2 className="mb-1 text-lg font-semibold text-red-700 dark:text-red-400">Sign Out</h2>
        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">You will be redirected to the sign-in page.</p>
        <button onClick={handleSignOut} disabled={signOutLoading}
          className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
          {signOutLoading ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
