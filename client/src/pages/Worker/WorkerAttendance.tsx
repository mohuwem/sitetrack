import { useEffect, useState } from "react";
import { authFetch } from "../../lib/api";

type AttendanceRecord = {
  _id: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hoursWorked: number;
  status: "Present" | "Absent" | "Late" | "Half Day";
  project: string;
};

const statusColor: Record<string, string> = {
  Present:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Absent:    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Late:      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Half Day":"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function WorkerAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notLinked, setNotLinked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    authFetch("/attendance/my")
      .then(async (res) => {
        if (res.status === 404) { setNotLinked(true); return; }
        if (!res.ok) throw new Error();
        setRecords(await res.json());
      })
      .catch(() => setError("Failed to load attendance records."))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const todayRecord = records.find((r) => r.date === today);

  const handleCheckIn = async () => {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await authFetch("/attendance/checkin", { method: "POST" });
      if (res.status === 409) {
        const data = await res.json();
        if (data.record) setRecords((prev) => [data.record, ...prev.filter((r) => r.date !== today)]);
        return;
      }
      if (!res.ok) throw new Error();
      const record: AttendanceRecord = await res.json();
      setRecords((prev) => [record, ...prev]);
      setSuccess(`Checked in at ${record.checkIn}`);
    } catch {
      setError("Failed to record check-in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await authFetch(`/attendance/${todayRecord._id}/checkout`, { method: "PUT" });
      if (!res.ok) throw new Error();
      const updated: AttendanceRecord = await res.json();
      setRecords((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      setSuccess(`Checked out at ${updated.checkOut} · ${updated.hoursWorked}h logged`);
    } catch {
      setError("Failed to record check-out. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const recent = [...records].slice(0, 10);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Attendance</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Check in daily and view your attendance history.</p>
      </div>

      {/* Today check-in card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Today —{" "}
          {new Date().toLocaleDateString("en-GB", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </p>

        {loading ? (
          <p className="mt-3 text-sm text-gray-400">Loading…</p>
        ) : notLinked ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Your worker profile hasn't been set up yet. Ask your manager to create your worker record using the email address you signed up with.
          </p>
        ) : todayRecord ? (
          <div className="mt-3 space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Checked in at {todayRecord.checkIn}
            </span>
            {todayRecord.checkOut ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Checked out at {todayRecord.checkOut} · {todayRecord.hoursWorked}h logged
              </p>
            ) : (
              <button
                onClick={handleCheckOut}
                disabled={busy}
                className="w-full rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                {busy ? "Recording…" : "Check Out"}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <button
              onClick={handleCheckIn}
              disabled={busy}
              className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {busy ? "Recording…" : "Check In Now"}
            </button>
          </div>
        )}

        {success && <p className="mt-3 text-sm font-medium text-green-600 dark:text-green-400">{success}</p>}
        {error   && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* History */}
      {!loading && !notLinked && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white">Recent History</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400">No attendance records yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((record) => (
                <div
                  key={record._id}
                  className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{record.date}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {record.checkIn  ? `In: ${record.checkIn}`   : ""}
                      {record.checkOut ? ` · Out: ${record.checkOut}` : ""}
                      {record.hoursWorked ? ` · ${record.hoursWorked}h` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[record.status] ?? ""}`}>
                    {record.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
