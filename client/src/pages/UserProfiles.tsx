import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import PageMeta from "../components/common/PageMeta";

type Toast = { message: string; type: "success" | "error" };

export default function UserProfiles() {
  const { user, updateProfile, changePassword } = useAuth();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName]   = useState(user?.lastName  ?? "");
  const [company, setCompany]     = useState(user?.company   ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPw, setSavingPw]   = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, type: Toast["type"]) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      showToast("First and last name are required.", "error");
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), company: company.trim() });
      showToast("Profile updated successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update profile.", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPw || newPw.length < 8) {
      showToast("New password must be at least 8 characters.", "error");
      return;
    }
    if (newPw !== confirmPw) {
      showToast("Passwords do not match.", "error");
      return;
    }
    setSavingPw(true);
    try {
      await changePassword(newPw);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      showToast("Password changed successfully.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to change password.", "error");
    } finally {
      setSavingPw(false);
    }
  };

  const initials = user
    ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase()
    : "?";

  return (
    <>
      <PageMeta title="My Profile | SiteTrack" description="Manage your SiteTrack account profile" />

      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Profile</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your account details.</p>
        </div>

        {/* Toast */}
        {toast && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400"
          }`}>
            {toast.message}
          </div>
        )}

        {/* Identity banner */}
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            {initials}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {user?.role ?? "manager"}{user?.company ? ` · ${user.company}` : ""}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Profile form */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">Personal Information</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-first" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">First name</label>
                  <input
                    id="prof-first"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="prof-last" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Last name</label>
                  <input
                    id="prof-last"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="prof-email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email address</label>
                <input
                  id="prof-email"
                  type="email"
                  value={user?.email ?? ""}
                  readOnly
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-500 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                />
                <p className="mt-1 text-xs text-gray-400">Email cannot be changed.</p>
              </div>

              <div>
                <label htmlFor="prof-company" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Company / Organisation</label>
                <input
                  id="prof-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Construction Ltd"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {savingProfile ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </div>

          {/* Password form */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <h2 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">Change Password</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Current password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-400">Verification against current password is not enforced on this build.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">New password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingPw || !newPw || !confirmPw}
                  className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {savingPw ? "Changing…" : "Change password"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Account info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Account Details</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Account type", value: user?.role === "manager" ? "Manager" : "Worker" },
              { label: "User ID", value: user?.id ?? "—" },
              { label: "Email", value: user?.email ?? "—" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-gray-500 dark:text-gray-400">{item.label}</p>
                <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90 break-all">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
