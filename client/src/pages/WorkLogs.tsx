import { useEffect, useState } from "react";
import { authFetch } from "../lib/api";

type WorkLog = {
  _id: string;
  date: string;
  message: string;
  blockers: string;
  createdAt: string;
  workerId: { _id: string; name: string; trade: string; assignedProject?: string } | null;
  projectId: { _id: string; name: string } | null;
};

type DateFilter = "today" | "all";

export default function WorkLogs() {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<DateFilter>("today");
  const [deleting, setDeleting] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    setLoading(true);
    setError("");
    const qs = filter === "today" ? `?date=${today}&limit=100` : "?limit=100";
    authFetch(`/worklog${qs}`)
      .then((r) => r.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load updates."))
      .finally(() => setLoading(false));
  }, [filter]);

  const deleteLog = async (id: string) => {
    setDeleting(id);
    try {
      const res = await authFetch(`/worklog/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLogs((prev) => prev.filter((l) => l._id !== id));
    } catch {
      setError("Failed to delete update.");
    } finally {
      setDeleting(null);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const formatDate = (dateStr: string) => {
    if (dateStr === today) return "Today";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Worker Updates</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Daily notes submitted by your workers.
          </p>
        </div>

        {/* Date filter */}
        <div className="flex gap-2">
          {(["today", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-brand-500 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
              }`}
            >
              {f === "today" ? "Today" : "All time"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading updates…</p>
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {filter === "today" ? "No updates submitted today." : "No updates yet."}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Workers submit notes from their dashboard. They'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log._id}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar-style initials */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                    {log.workerId?.name
                      ? log.workerId.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                      : "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {log.workerId?.name ?? "Unknown worker"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {log.workerId?.trade ?? ""}
                      {log.projectId ? ` · ${log.projectId.name}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400">
                    {formatDate(log.date)}
                    {log.createdAt ? ` · ${formatTime(log.createdAt)}` : ""}
                  </span>
                  <button
                    onClick={() => deleteLog(log._id)}
                    disabled={deleting === log._id}
                    title="Dismiss"
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-500/10"
                  >
                    {deleting === log._id ? (
                      <span className="text-xs">…</span>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Message */}
              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {log.message}
              </p>

              {/* Blockers */}
              {log.blockers && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Blocker</p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">{log.blockers}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
