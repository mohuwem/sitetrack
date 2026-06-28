import { useEffect, useState } from "react";
import { authFetch } from "../../lib/api";

type Task = {
  _id: string;
  title: string;
  site: string;
  status: "Pending" | "In Progress" | "Completed" | "Blocked";
  priority: "High" | "Medium" | "Low";
  dueDate: string;
  assignee: string;
  subtasks: { id: string; title: string; completed: boolean }[];
};

const statusOptions: Task["status"][] = ["Pending", "In Progress", "Completed", "Blocked"];

const statusColor: Record<Task["status"], string> = {
  Pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Blocked: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const priorityColor: Record<Task["priority"], string> = {
  High: "text-red-600 dark:text-red-400",
  Medium: "text-yellow-600 dark:text-yellow-400",
  Low: "text-green-600 dark:text-green-400",
};

export default function WorkerTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<Task["status"] | "All">("All");

  useEffect(() => {
    authFetch("/worker/me")
      .then(async (res) => {
        if (res.status === 404) { setNotLinked(true); setLoading(false); return; }
        const worker = await res.json();
        if (!worker?._id) { setNotLinked(true); setLoading(false); return; }
        return authFetch(`/task?assigneeId=${worker._id}`)
          .then((r) => r.json())
          .then((data: Task[]) => setTasks(Array.isArray(data) ? data : []))
          .catch(() => setError("Failed to load tasks."))
          .finally(() => setLoading(false));
      })
      .catch(() => {
        setError("Failed to load tasks.");
        setLoading(false);
      });
  }, []);

  const updateStatus = async (taskId: string, newStatus: Task["status"]) => {
    setUpdating(taskId);
    try {
      const task = tasks.find((t) => t._id === taskId);
      if (!task) return;
      const res = await authFetch(`/task/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ ...task, status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));
    } catch {
      setError("Failed to update task status.");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === "All" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">My Tasks</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tasks assigned to you.</p>
      </div>

      {/* Not-linked banner */}
      {!loading && notLinked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Account not linked to a worker record</p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Your manager needs to create a worker record with your email address before tasks will appear here.
            Check your Profile tab to see the email your manager should use.
          </p>
        </div>
      )}

      {/* Filter tabs */}
      {!notLinked && <div className="flex gap-2 overflow-x-auto pb-1">
        {(["All", ...statusOptions] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-brand-500 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>}

      {!notLinked && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {!notLinked && (loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filter === "All" ? "No tasks assigned to you yet." : `No ${filter} tasks.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => (
            <div key={task._id} className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{task.site}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[task.status]}`}>
                  {task.status}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                <span>Due: {task.dueDate}</span>
                <span className={`font-medium ${priorityColor[task.priority]}`}>{task.priority} priority</span>
              </div>

              {/* Status update */}
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">Update status:</p>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      disabled={task.status === s || updating === task._id}
                      onClick={() => updateStatus(task._id, s)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        task.status === s
                          ? "bg-brand-500 text-white"
                          : "border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                      }`}
                    >
                      {updating === task._id && task.status !== s ? "…" : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtasks */}
              {task.subtasks.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                  <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-400">Subtasks</p>
                  <div className="space-y-1">
                    {task.subtasks.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className={sub.completed ? "text-green-500" : "text-gray-400"}>
                          {sub.completed ? "✓" : "○"}
                        </span>
                        <span className={sub.completed ? "line-through text-gray-400" : ""}>{sub.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
