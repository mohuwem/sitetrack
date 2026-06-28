import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authFetch } from "../../lib/api";

type Task = {
  _id: string;
  title: string;
  site: string;
  status: "Pending" | "In Progress" | "Completed" | "Blocked";
  priority: "High" | "Medium" | "Low";
  dueDate: string;
  assignee: string;
};

const statusColor: Record<Task["status"], string> = {
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [workerLinked, setWorkerLinked] = useState(true);
  const [updateText, setUpdateText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [updateError, setUpdateError] = useState("");

  useEffect(() => {
    authFetch("/worker/me")
      .then((res) => {
        if (res.status === 404) {
          setWorkerLinked(false);
          return null;
        }
        return res.json();
      })
      .then((worker) => {
        if (!worker?._id) {
          setLoading(false);
          return;
        }
        return authFetch(`/task?assigneeId=${worker._id}`)
          .then((r) => r.json())
          .then((data: Task[]) => setTasks(Array.isArray(data) ? data : []))
          .catch(() => setTasks([]))
          .finally(() => setLoading(false));
      })
      .catch(() => {
        setTasks([]);
        setLoading(false);
      });
  }, []);

  const pending = tasks.filter((t) => t.status === "Pending").length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const completed = tasks.filter((t) => t.status === "Completed").length;

  const handleSubmitUpdate = async () => {
    if (!updateText.trim()) return;
    setSubmitting(true);
    setUpdateError("");
    setUpdateSuccess("");
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await authFetch("/worklog", {
        method: "POST",
        body: JSON.stringify({ message: updateText.trim(), date: today }),
      });
      if (res.status === 404) {
        setUpdateError("Your worker profile isn't linked yet. Ask your manager to create your worker record.");
        return;
      }
      if (!res.ok) throw new Error();
      setUpdateText("");
      setUpdateSuccess("Update sent to your manager.");
      setTimeout(() => setUpdateSuccess(""), 4000);
    } catch {
      setUpdateError("Failed to send update. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Good day, {user?.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Here's your work overview for today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pending", value: pending, color: "text-yellow-600 dark:text-yellow-400" },
          { label: "In Progress", value: inProgress, color: "text-blue-600 dark:text-blue-400" },
          { label: "Completed", value: completed, color: "text-green-600 dark:text-green-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Not-linked banner */}
      {!loading && !workerLinked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Account not linked to a worker record</p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Ask your manager to add your email address to a worker record. Once linked, your tasks and attendance will appear here.
            Check your <Link to="/worker/profile" className="underline">Profile</Link> tab for your email address.
          </p>
        </div>
      )}

      {/* Recent tasks */}
      {workerLinked && (
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white">My Tasks</h2>
          <Link to="/worker/tasks" className="text-xs font-medium text-brand-500 hover:text-brand-600">
            View all
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">No tasks assigned to you yet.</p>
            <p className="mt-1 text-xs text-gray-400">Your manager will assign work and it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => (
              <div key={task._id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{task.site}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[task.status]}`}>
                    {task.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">Due: {task.dueDate}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Daily update */}
      {workerLinked && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">Daily Update</h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              Send a quick note to your manager — what you worked on, any blockers, or site observations.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Completed foundation work on Block A. Waiting on steel delivery for Block B."
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                {updateSuccess && <p className="text-green-600 dark:text-green-400">{updateSuccess}</p>}
                {updateError && <p className="text-red-600 dark:text-red-400">{updateError}</p>}
              </div>
              <button
                onClick={handleSubmitUpdate}
                disabled={submitting || !updateText.trim()}
                className="shrink-0 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Send Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/worker/attendance"
            className="rounded-2xl border border-gray-200 bg-white p-4 text-center hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-sm font-medium text-gray-800 dark:text-white">Attendance</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Check in / check out</p>
          </Link>
          <Link
            to="/worker/tasks"
            className="rounded-2xl border border-gray-200 bg-white p-4 text-center hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <p className="text-sm font-medium text-gray-800 dark:text-white">My Tasks</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">View and update tasks</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
