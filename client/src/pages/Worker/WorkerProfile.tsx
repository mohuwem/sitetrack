import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authFetch } from "../../lib/api";

type WorkerRecord = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  trade: string;
  skills: string[];
  status: string;
  assignedProject: string;
  employeeId: string;
  startDate: string;
};

async function fetchMyWorkerRecord(workerName: string): Promise<WorkerRecord | null> {
  const meRes = await authFetch("/worker/me");
  if (meRes.ok) return meRes.json();

  const allRes = await authFetch("/worker");
  if (!allRes.ok) return null;
  const all: WorkerRecord[] = await allRes.json();
  return all.find((w) => w.name.toLowerCase() === workerName.toLowerCase()) ?? null;
}

export default function WorkerProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [worker, setWorker] = useState<WorkerRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const workerName = user ? `${user.firstName} ${user.lastName}` : "";

  useEffect(() => {
    fetchMyWorkerRecord(workerName)
      .then(setWorker)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workerName]);

  const fields = worker
    ? [
        { label: "Employee ID", value: worker.employeeId || "—" },
        { label: "Trade", value: worker.trade || "—" },
        { label: "Status", value: worker.status || "—" },
        { label: "Assigned Project", value: worker.assignedProject || "—" },
        { label: "Start Date", value: worker.startDate || "—" },
        { label: "Phone", value: worker.phone || "—" },
      ]
    : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your account and worker details.</p>
      </div>

      {/* Account card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              Worker
            </span>
          </div>
        </div>
      </div>

      {/* Worker record */}
      {loading ? (
        <p className="text-sm text-gray-400">Loading worker details…</p>
      ) : !worker ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Worker profile not linked yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ask your manager to create a worker record using this email address:{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">{user?.email}</span>.
            Once they do, your profile and details will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white">Worker Details</h2>
          <div className="grid grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.label} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-gray-800 dark:bg-white/[0.02]">
                <p className="text-xs text-gray-400">{f.label}</p>
                <p className="mt-0.5 truncate text-sm font-medium text-gray-800 dark:text-white">{f.value}</p>
              </div>
            ))}
          </div>

          {worker.skills.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-gray-400">Skills</p>
              <div className="flex flex-wrap gap-2">
                {worker.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sign out */}
      <div className="rounded-2xl border border-red-200 bg-white p-5 dark:border-red-900/40 dark:bg-white/[0.03]">
        <p className="mb-3 text-sm font-medium text-red-700 dark:text-red-400">Sign Out</p>
        <button
          onClick={() => { logout(); navigate("/worker/signin"); }}
          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
