import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { authFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type CommentItem = {
  id: string;
  author: string;
  message: string;
  createdAt: string;
};

type ActivityType =
  | "system"
  | "comment"
  | "subtask"
  | "reminder"
  | "tag"
  | "recurring"
  | "view";

type ActivityItem = {
  id: string;
  type: ActivityType;
  message: string;
  createdAt: string;
};

type SubtaskItem = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
};

type RecurringPattern =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly"
  | "yearly";

type WorkerOption = {
  _id: string;
  name: string;
};

type Task = {
  _id?: string;
  title: string;
  site: string;
  assignee: string;
  assigneeId?: string;
  projectId?: string | null;
  priority: string;
  dueDate: string;
  status: string;
  createdAt?: string;
  reminderAt?: string;
  tags?: string[];
  subtasks?: SubtaskItem[];
  comments?: CommentItem[];
  activity?: ActivityItem[];
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  recurringInterval?: number;
  parentRecurringTaskId?: string;
};

type TaskForm = {
  title: string;
  site: string;
  assignee: string;
  assigneeId: string;
  priority: string;
  dueDate: string;
  status: string;
  reminderAt: string;
  tags: string;
  recurringPattern: RecurringPattern;
  recurringInterval: string;
};

type ToastState = {
  message: string;
  type: "success" | "error" | "info";
  visible: boolean;
};

type ViewMode = "list" | "board";
type DrawerTab = "overview" | "comments" | "subtasks" | "activity";

type SavedView = {
  id: string;
  name: string;
  searchTerm: string;
  statusFilter: string;
  priorityFilter: string;
  tagFilter: string;
  reminderFilter: string;
  recurringFilter: string;
  sortOrder: "newest" | "oldest" | "due-asc" | "due-desc";
  viewMode: ViewMode;
  createdAt: string;
};

const initialForm: TaskForm = {
  title: "",
  site: "",
  assignee: "",
  assigneeId: "",
  priority: "Medium",
  dueDate: "",
  status: "Pending",
  reminderAt: "",
  tags: "",
  recurringPattern: "none",
  recurringInterval: "1",
};

const boardColumns = ["Pending", "In Progress", "Blocked", "Completed"];
const savedViewsStorageKey = "task-saved-views-v1";

function getStatusStyles(status: string) {
  if (status === "Completed") {
    return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400";
  }

  if (status === "In Progress") {
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
  }

  if (status === "Blocked") {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400";
  }

  return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400";
}

function getPriorityStyles(priority: string) {
  if (priority === "High") {
    return "text-red-600 dark:text-red-400";
  }

  if (priority === "Medium") {
    return "text-orange-600 dark:text-orange-400";
  }

  return "text-green-600 dark:text-green-400";
}

function getPriorityBadgeStyles(priority: string) {
  if (priority === "High") {
    return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";
  }

  if (priority === "Medium") {
    return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";
  }

  return "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300";
}

function formatDate(dateString: string) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(dateString: string) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateTimeLocalValue(dateString?: string) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
}

function isOverdue(dateString: string, status: string) {
  if (!dateString) return false;
  if (status === "Completed") return false;

  const dueDate = new Date(dateString);
  if (Number.isNaN(dueDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function isReminderDue(reminderAt?: string, status?: string) {
  if (!reminderAt) return false;
  if (status === "Completed") return false;

  const reminderDate = new Date(reminderAt);
  if (Number.isNaN(reminderDate.getTime())) return false;

  return reminderDate.getTime() <= Date.now();
}

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, array) => array.indexOf(tag) === index);
}

function buildActivityMessage(field: string, oldValue: string, newValue: string) {
  return `${field} changed from "${oldValue}" to "${newValue}"`;
}

function ensureTaskCollections(task: Task): Task {
  return {
    ...task,
    tags: task.tags ?? [],
    subtasks: task.subtasks ?? [],
    comments: task.comments ?? [],
    activity: task.activity ?? [],
    isRecurring: task.isRecurring ?? false,
    recurringPattern: task.recurringPattern ?? "none",
    recurringInterval: task.recurringInterval ?? 1,
  };
}

function describeRecurringRule(pattern?: RecurringPattern, interval?: number) {
  if (!pattern || pattern === "none") return "Does not repeat";

  const safeInterval = interval && interval > 0 ? interval : 1;

  if (pattern === "weekdays") {
    return safeInterval === 1
      ? "Repeats every weekday"
      : `Repeats every ${safeInterval} weekday cycles`;
  }

  const label =
    pattern === "daily"
      ? "day"
      : pattern === "weekly"
      ? "week"
      : pattern === "monthly"
      ? "month"
      : "year";

  return safeInterval === 1
    ? `Repeats every ${label}`
    : `Repeats every ${safeInterval} ${label}s`;
}

function calculateNextRecurringDueDate(
  currentDueDate: string,
  pattern: RecurringPattern,
  interval: number
) {
  const date = new Date(currentDueDate);
  if (Number.isNaN(date.getTime())) return currentDueDate;

  const safeInterval = interval > 0 ? interval : 1;

  if (pattern === "daily") {
    date.setDate(date.getDate() + safeInterval);
  } else if (pattern === "weekdays") {
    let added = 0;
    while (added < safeInterval) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();
      if (day !== 0 && day !== 6) added += 1;
    }
  } else if (pattern === "weekly") {
    date.setDate(date.getDate() + safeInterval * 7);
  } else if (pattern === "monthly") {
    date.setMonth(date.getMonth() + safeInterval);
  } else if (pattern === "yearly") {
    date.setFullYear(date.getFullYear() + safeInterval);
  }

  return date.toISOString();
}

function calculateNextRecurringReminder(
  currentReminderAt: string | undefined,
  pattern: RecurringPattern,
  interval: number
) {
  if (!currentReminderAt) return undefined;

  const date = new Date(currentReminderAt);
  if (Number.isNaN(date.getTime())) return currentReminderAt;

  const safeInterval = interval > 0 ? interval : 1;

  if (pattern === "daily") {
    date.setDate(date.getDate() + safeInterval);
  } else if (pattern === "weekdays") {
    let added = 0;
    while (added < safeInterval) {
      date.setDate(date.getDate() + 1);
      const day = date.getDay();
      if (day !== 0 && day !== 6) added += 1;
    }
  } else if (pattern === "weekly") {
    date.setDate(date.getDate() + safeInterval * 7);
  } else if (pattern === "monthly") {
    date.setMonth(date.getMonth() + safeInterval);
  } else if (pattern === "yearly") {
    date.setFullYear(date.getFullYear() + safeInterval);
  }

  return date.toISOString();
}

export default function Tasks() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectFilter = searchParams.get("project");
  const projectFilterName = searchParams.get("name");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [actionError, setActionError] = useState("");
  const [formData, setFormData] = useState<TaskForm>(initialForm);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("All");
  const [reminderFilter, setReminderFilter] = useState("All");
  const [recurringFilter, setRecurringFilter] = useState("All");
  const [sortOrder, setSortOrder] = useState<
    "newest" | "oldest" | "due-asc" | "due-desc"
  >("due-asc");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<TaskForm>(initialForm);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("overview");
  const [commentInput, setCommentInput] = useState("");
  const [commentAuthor, setCommentAuthor] = useState(
    user ? `${user.firstName} ${user.lastName}`.trim() : "Site Manager"
  );
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [drawerError, setDrawerError] = useState("");

  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [newSavedViewName, setNewSavedViewName] = useState("");

  const [workers, setWorkers] = useState<WorkerOption[]>([]);

  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "success"
  ) => {
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }

    setToast({ message, type, visible: true });

    toastTimeoutRef.current = window.setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(savedViewsStorageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as SavedView[];
      if (Array.isArray(parsed)) {
        setSavedViews(parsed);
      }
    } catch {
      //
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(savedViewsStorageKey, JSON.stringify(savedViews));
    } catch {
      //
    }
  }, [savedViews]);

  useEffect(() => {
    authFetch("/worker")
      .then((r) => r.json())
      .then((data: WorkerOption[]) => setWorkers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchTasks = async () => {
    try {
      setError("");

      const response = await authFetch("/task");

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      setTasks(data.map(ensureTaskCollections));
    } catch {
      setError("Unable to load tasks from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const selectedTask = useMemo(() => {
    return tasks.find((task) => task._id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  const allTags = useMemo(() => {
    return Array.from(
      new Set(tasks.flatMap((task) => task.tags ?? []).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const openTaskDrawer = (task: Task, tab: DrawerTab = "overview") => {
    if (!task._id) return;

    setSelectedTaskId(task._id);
    setDrawerTab(tab);
    setDrawerError("");
    setNewTagInput("");
  };

  const closeTaskDrawer = () => {
    setSelectedTaskId(null);
    setDrawerTab("overview");
    setCommentInput("");
    setNewSubtaskTitle("");
    setNewTagInput("");
    setDrawerError("");
  };

  const persistFullTaskUpdate = async (taskId: string, nextTask: Task) => {
    const response = await authFetch(`/task/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(nextTask),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update task");
    }

    return ensureTaskCollections(data);
  };

  const createTaskOnServer = async (taskPayload: Task) => {
    const response = await authFetch("/task", {
      method: "POST",
      body: JSON.stringify(taskPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create task");
    }

    return ensureTaskCollections(data);
  };

  const createNextRecurringTask = async (completedTask: Task) => {
    if (!completedTask._id) return;
    if (!completedTask.isRecurring || !completedTask.recurringPattern) return;
    if (completedTask.recurringPattern === "none") return;

    const nextDueDate = calculateNextRecurringDueDate(
      completedTask.dueDate,
      completedTask.recurringPattern,
      completedTask.recurringInterval || 1
    );

    const nextReminderAt = calculateNextRecurringReminder(
      completedTask.reminderAt,
      completedTask.recurringPattern,
      completedTask.recurringInterval || 1
    );

    const nextTaskPayload: Task = {
      title: completedTask.title,
      site: completedTask.site,
      assignee: completedTask.assignee,
      priority: completedTask.priority,
      dueDate: nextDueDate,
      status: "Pending",
      reminderAt: nextReminderAt,
      tags: [...(completedTask.tags ?? [])],
      subtasks: (completedTask.subtasks ?? []).map((subtask) => ({
        ...subtask,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        completed: false,
        createdAt: new Date().toISOString(),
      })),
      comments: [],
      activity: [
        {
          id: `${Date.now()}-recurring-created`,
          type: "recurring",
          message: `New recurring task generated from ${describeRecurringRule(
            completedTask.recurringPattern,
            completedTask.recurringInterval
          )}`,
          createdAt: new Date().toISOString(),
        },
      ],
      isRecurring: true,
      recurringPattern: completedTask.recurringPattern,
      recurringInterval: completedTask.recurringInterval || 1,
      parentRecurringTaskId: completedTask.parentRecurringTaskId || completedTask._id,
    };

    const createdTask = await createTaskOnServer(nextTaskPayload);
    setTasks((prev) => [createdTask, ...prev]);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openEditModal = (task: Task) => {
    setEditingTaskId(task._id || null);
    setEditFormData({
      title: task.title,
      site: task.site,
      assignee: task.assignee,
      assigneeId: task.assigneeId || "",
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
      status: task.status,
      reminderAt: toDateTimeLocalValue(task.reminderAt),
      tags: (task.tags ?? []).join(", "),
      recurringPattern: task.isRecurring
        ? task.recurringPattern || "daily"
        : "none",
      recurringInterval: String(task.recurringInterval || 1),
    });
    setEditError("");
  };

  const closeEditModal = () => {
    setEditingTaskId(null);
    setEditFormData(initialForm);
    setEditError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const parsedTags = parseTags(formData.tags);
      const recurringPattern = formData.recurringPattern;
      const recurringInterval = Math.max(1, Number(formData.recurringInterval || 1));

      const newTaskPayload: Task = {
        title: formData.title,
        site: formData.site,
        assignee: formData.assignee,
        assigneeId: formData.assigneeId || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate,
        status: formData.status,
        reminderAt: formData.reminderAt
          ? new Date(formData.reminderAt).toISOString()
          : undefined,
        tags: parsedTags,
        subtasks: [],
        comments: [],
        activity: [
          {
            id: `${Date.now()}-created`,
            type: "system",
            message: "Task created",
            createdAt: new Date().toISOString(),
          },
          ...(parsedTags.length > 0
            ? [
                {
                  id: `${Date.now()}-tags`,
                  type: "tag" as const,
                  message: `Tags added: ${parsedTags.join(", ")}`,
                  createdAt: new Date().toISOString(),
                },
              ]
            : []),
          ...(formData.reminderAt
            ? [
                {
                  id: `${Date.now()}-reminder`,
                  type: "reminder" as const,
                  message: `Reminder set for ${formatDateTime(
                    new Date(formData.reminderAt).toISOString()
                  )}`,
                  createdAt: new Date().toISOString(),
                },
              ]
            : []),
          ...(recurringPattern !== "none"
            ? [
                {
                  id: `${Date.now()}-recurring`,
                  type: "recurring" as const,
                  message: describeRecurringRule(recurringPattern, recurringInterval),
                  createdAt: new Date().toISOString(),
                },
              ]
            : []),
        ],
        isRecurring: recurringPattern !== "none",
        recurringPattern,
        recurringInterval,
      };

      const createdTask = await createTaskOnServer(newTaskPayload);

      setTasks((prev) => [createdTask, ...prev]);
      setFormData(initialForm);
      setShowForm(false);
      showToast("Task created successfully", "success");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Unable to save task");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!editingTaskId) return;

    setEditSubmitting(true);
    setEditError("");
    setActionError("");

    const existingTask = tasks.find((task) => task._id === editingTaskId);

    if (!existingTask) {
      setEditError("Task not found");
      setEditSubmitting(false);
      return;
    }

    try {
      const parsedTags = parseTags(editFormData.tags);
      const reminderIso = editFormData.reminderAt
        ? new Date(editFormData.reminderAt).toISOString()
        : undefined;

      const recurringPattern = editFormData.recurringPattern;
      const recurringInterval = Math.max(1, Number(editFormData.recurringInterval || 1));
      const recurringActive = recurringPattern !== "none";

      const activityEntries: ActivityItem[] = [];

      if (existingTask.title !== editFormData.title) {
        activityEntries.push({
          id: `${Date.now()}-title`,
          type: "system",
          message: buildActivityMessage("Title", existingTask.title, editFormData.title),
          createdAt: new Date().toISOString(),
        });
      }

      if (existingTask.site !== editFormData.site) {
        activityEntries.push({
          id: `${Date.now()}-site`,
          type: "system",
          message: buildActivityMessage("Site", existingTask.site, editFormData.site),
          createdAt: new Date().toISOString(),
        });
      }

      if (existingTask.assignee !== editFormData.assignee) {
        activityEntries.push({
          id: `${Date.now()}-assignee`,
          type: "system",
          message: buildActivityMessage(
            "Assignee",
            existingTask.assignee,
            editFormData.assignee
          ),
          createdAt: new Date().toISOString(),
        });
      }

      if (existingTask.priority !== editFormData.priority) {
        activityEntries.push({
          id: `${Date.now()}-priority`,
          type: "system",
          message: buildActivityMessage(
            "Priority",
            existingTask.priority,
            editFormData.priority
          ),
          createdAt: new Date().toISOString(),
        });
      }

      if (existingTask.dueDate !== editFormData.dueDate) {
        activityEntries.push({
          id: `${Date.now()}-date`,
          type: "system",
          message: buildActivityMessage(
            "Due date",
            formatDate(existingTask.dueDate),
            formatDate(editFormData.dueDate)
          ),
          createdAt: new Date().toISOString(),
        });
      }

      if (existingTask.status !== editFormData.status) {
        activityEntries.push({
          id: `${Date.now()}-status`,
          type: "system",
          message: buildActivityMessage(
            "Status",
            existingTask.status,
            editFormData.status
          ),
          createdAt: new Date().toISOString(),
        });
      }

      if (existingTask.reminderAt !== reminderIso) {
        activityEntries.push({
          id: `${Date.now()}-reminder`,
          type: "reminder",
          message: reminderIso
            ? `Reminder set for ${formatDateTime(reminderIso)}`
            : "Reminder removed",
          createdAt: new Date().toISOString(),
        });
      }

      if ((existingTask.tags ?? []).join(",") !== parsedTags.join(",")) {
        activityEntries.push({
          id: `${Date.now()}-tags`,
          type: "tag",
          message:
            parsedTags.length > 0
              ? `Tags updated: ${parsedTags.join(", ")}`
              : "All tags removed",
          createdAt: new Date().toISOString(),
        });
      }

      const currentRule = `${existingTask.isRecurring}-${existingTask.recurringPattern}-${existingTask.recurringInterval}`;
      const nextRule = `${recurringActive}-${recurringPattern}-${recurringInterval}`;

      if (currentRule !== nextRule) {
        activityEntries.push({
          id: `${Date.now()}-recurring`,
          type: "recurring",
          message: recurringActive
            ? describeRecurringRule(recurringPattern, recurringInterval)
            : "Recurring rule removed",
          createdAt: new Date().toISOString(),
        });
      }

      const updatedTask: Task = {
        ...existingTask,
        title: editFormData.title,
        site: editFormData.site,
        assignee: editFormData.assignee,
        assigneeId: editFormData.assigneeId || existingTask.assigneeId,
        priority: editFormData.priority,
        dueDate: editFormData.dueDate,
        status: editFormData.status,
        reminderAt: reminderIso,
        tags: parsedTags,
        isRecurring: recurringActive,
        recurringPattern,
        recurringInterval,
        activity: [...(existingTask.activity ?? []), ...activityEntries],
      };

      const savedTask = await persistFullTaskUpdate(editingTaskId, updatedTask);

      setTasks((prev) =>
        prev.map((task) => (task._id === editingTaskId ? savedTask : task))
      );

      closeEditModal();
      showToast("Task updated successfully", "success");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Unable to update task");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleStatusChange = async (
    taskId: string,
    newStatus: string,
    options?: { silent?: boolean }
  ) => {
    setActionError("");

    const currentTask = tasks.find((task) => task._id === taskId);
    if (!currentTask) return;
    if (currentTask.status === newStatus) return;

    const previousTasks = tasks;

    const completingRecurring =
      currentTask.isRecurring &&
      currentTask.recurringPattern &&
      currentTask.recurringPattern !== "none" &&
      currentTask.status !== "Completed" &&
      newStatus === "Completed";

    const optimisticActivity: ActivityItem = {
      id: `${Date.now()}-status`,
      type: "system",
      message: buildActivityMessage("Status", currentTask.status, newStatus),
      createdAt: new Date().toISOString(),
    };

    const optimisticTask: Task = {
      ...currentTask,
      status: newStatus,
      activity: [...(currentTask.activity ?? []), optimisticActivity],
    };

    setTasks((prev) =>
      prev.map((task) => (task._id === taskId ? optimisticTask : task))
    );

    try {
      const savedTask = await persistFullTaskUpdate(taskId, optimisticTask);

      setTasks((prev) =>
        prev.map((task) => (task._id === taskId ? savedTask : task))
      );

      if (completingRecurring) {
        await createNextRecurringTask(savedTask);
      }

      if (!options?.silent) {
        showToast(
          completingRecurring
            ? "Task completed and next recurring task created"
            : `Task status changed to ${newStatus}`,
          "success"
        );
      }
    } catch (err) {
      setTasks(previousTasks);
      setActionError(
        err instanceof Error ? err.message : "Unable to update task status"
      );

      if (!options?.silent) {
        showToast("Status update failed", "error");
      }
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this task?");
    if (!confirmed) return;

    setActionError("");

    try {
      const response = await authFetch(`/task/${taskId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete task");
      }

      setTasks((prev) => prev.filter((task) => task._id !== taskId));

      if (selectedTaskId === taskId) {
        closeTaskDrawer();
      }

      showToast("Task deleted successfully", "success");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to delete task");
    }
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    taskId: string
  ) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleColumnDragOver = (
    e: React.DragEvent<HTMLDivElement>,
    status: string
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(status);
  };

  const handleColumnDragLeave = (
    e: React.DragEvent<HTMLDivElement>,
    status: string
  ) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (!e.currentTarget.contains(relatedTarget)) {
      if (dragOverColumn === status) {
        setDragOverColumn(null);
      }
    }
  };

  const handleColumnDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    status: string
  ) => {
    e.preventDefault();

    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;

    setDragOverColumn(null);
    setDraggedTaskId(null);

    if (!taskId) return;

    const task = tasks.find((item) => item._id === taskId);
    if (!task) return;
    if (task.status === status) return;

    await handleStatusChange(taskId, status, { silent: true });
    showToast(`Task moved to ${status}`, "success");
  };

  const handleAddComment = async () => {
    if (!selectedTask || !selectedTask._id) return;

    if (!commentInput.trim()) {
      setDrawerError("Enter a comment before submitting.");
      return;
    }

    setDrawerError("");

    const timestamp = new Date().toISOString();

    const newComment: CommentItem = {
      id: `${Date.now()}-comment`,
      author: commentAuthor || "Site Manager",
      message: commentInput.trim(),
      createdAt: timestamp,
    };

    const commentActivity: ActivityItem = {
      id: `${Date.now()}-comment-activity`,
      type: "comment",
      message: `${newComment.author} added a comment`,
      createdAt: timestamp,
    };

    const updatedTask: Task = {
      ...selectedTask,
      comments: [...(selectedTask.comments ?? []), newComment],
      activity: [...(selectedTask.activity ?? []), commentActivity],
    };

    try {
      const savedTask = await persistFullTaskUpdate(selectedTask._id, updatedTask);

      setTasks((prev) =>
        prev.map((task) => (task._id === selectedTask._id ? savedTask : task))
      );

      setCommentInput("");
      setDrawerTab("comments");
      showToast("Comment added", "success");
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Unable to add comment");
    }
  };

  const handleAddSubtask = async () => {
    if (!selectedTask || !selectedTask._id) return;

    if (!newSubtaskTitle.trim()) {
      setDrawerError("Enter a subtask title before adding it.");
      return;
    }

    setDrawerError("");

    const timestamp = new Date().toISOString();

    const newSubtask: SubtaskItem = {
      id: `${Date.now()}-subtask`,
      title: newSubtaskTitle.trim(),
      completed: false,
      createdAt: timestamp,
    };

    const subtaskActivity: ActivityItem = {
      id: `${Date.now()}-subtask-activity`,
      type: "subtask",
      message: `Subtask added: ${newSubtask.title}`,
      createdAt: timestamp,
    };

    const updatedTask: Task = {
      ...selectedTask,
      subtasks: [...(selectedTask.subtasks ?? []), newSubtask],
      activity: [...(selectedTask.activity ?? []), subtaskActivity],
    };

    try {
      const savedTask = await persistFullTaskUpdate(selectedTask._id, updatedTask);

      setTasks((prev) =>
        prev.map((task) => (task._id === selectedTask._id ? savedTask : task))
      );

      setNewSubtaskTitle("");
      setDrawerTab("subtasks");
      showToast("Subtask added", "success");
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Unable to add subtask");
    }
  };

  const handleToggleSubtask = async (subtaskId: string) => {
    if (!selectedTask || !selectedTask._id) return;

    const targetSubtask = (selectedTask.subtasks ?? []).find(
      (subtask) => subtask.id === subtaskId
    );

    if (!targetSubtask) return;

    const timestamp = new Date().toISOString();

    const updatedSubtasks = (selectedTask.subtasks ?? []).map((subtask) =>
      subtask.id === subtaskId
        ? { ...subtask, completed: !subtask.completed }
        : subtask
    );

    const subtaskActivity: ActivityItem = {
      id: `${Date.now()}-subtask-toggle`,
      type: "subtask",
      message: `${targetSubtask.title} marked ${
        targetSubtask.completed ? "incomplete" : "complete"
      }`,
      createdAt: timestamp,
    };

    const updatedTask: Task = {
      ...selectedTask,
      subtasks: updatedSubtasks,
      activity: [...(selectedTask.activity ?? []), subtaskActivity],
    };

    try {
      const savedTask = await persistFullTaskUpdate(selectedTask._id, updatedTask);

      setTasks((prev) =>
        prev.map((task) => (task._id === selectedTask._id ? savedTask : task))
      );

      showToast("Subtask updated", "success");
    } catch (err) {
      setDrawerError(
        err instanceof Error ? err.message : "Unable to update subtask"
      );
    }
  };

  const handleAddTagToTask = async () => {
    if (!selectedTask || !selectedTask._id) return;

    const tag = newTagInput.trim();

    if (!tag) {
      setDrawerError("Enter a tag before adding it.");
      return;
    }

    if ((selectedTask.tags ?? []).includes(tag)) {
      setDrawerError("That tag already exists on this task.");
      return;
    }

    setDrawerError("");

    const timestamp = new Date().toISOString();

    const updatedTask: Task = {
      ...selectedTask,
      tags: [...(selectedTask.tags ?? []), tag],
      activity: [
        ...(selectedTask.activity ?? []),
        {
          id: `${Date.now()}-tag`,
          type: "tag",
          message: `Tag added: ${tag}`,
          createdAt: timestamp,
        },
      ],
    };

    try {
      const savedTask = await persistFullTaskUpdate(selectedTask._id, updatedTask);

      setTasks((prev) =>
        prev.map((task) => (task._id === selectedTask._id ? savedTask : task))
      );

      setNewTagInput("");
      showToast("Tag added", "success");
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Unable to add tag");
    }
  };

  const handleRemoveTagFromTask = async (tagToRemove: string) => {
    if (!selectedTask || !selectedTask._id) return;

    const timestamp = new Date().toISOString();

    const updatedTask: Task = {
      ...selectedTask,
      tags: (selectedTask.tags ?? []).filter((tag) => tag !== tagToRemove),
      activity: [
        ...(selectedTask.activity ?? []),
        {
          id: `${Date.now()}-tag-remove`,
          type: "tag",
          message: `Tag removed: ${tagToRemove}`,
          createdAt: timestamp,
        },
      ],
    };

    try {
      const savedTask = await persistFullTaskUpdate(selectedTask._id, updatedTask);

      setTasks((prev) =>
        prev.map((task) => (task._id === selectedTask._id ? savedTask : task))
      );

      showToast("Tag removed", "success");
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Unable to remove tag");
    }
  };

  const handleSaveCurrentView = () => {
    const name = newSavedViewName.trim();

    if (!name) {
      showToast("Enter a name for the saved view", "error");
      return;
    }

    const nextView: SavedView = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      searchTerm,
      statusFilter,
      priorityFilter,
      tagFilter,
      reminderFilter,
      recurringFilter,
      sortOrder,
      viewMode,
      createdAt: new Date().toISOString(),
    };

    setSavedViews((prev) => [nextView, ...prev]);
    setNewSavedViewName("");
    showToast("Saved view created", "success");
  };

  const handleApplySavedView = (view: SavedView) => {
    setSearchTerm(view.searchTerm);
    setStatusFilter(view.statusFilter);
    setPriorityFilter(view.priorityFilter);
    setTagFilter(view.tagFilter);
    setReminderFilter(view.reminderFilter);
    setRecurringFilter(view.recurringFilter);
    setSortOrder(view.sortOrder);
    setViewMode(view.viewMode);
    showToast(`Applied view: ${view.name}`, "success");
  };

  const handleDeleteSavedView = (viewId: string) => {
    setSavedViews((prev) => prev.filter((view) => view.id !== viewId));
    showToast("Saved view removed", "success");
  };

  const filteredTasks = useMemo(() => {
    const searchValue = searchTerm.toLowerCase().trim();

    const result = tasks.filter((task) => {
      const matchesSearch =
        searchValue === "" ||
        task.title.toLowerCase().includes(searchValue) ||
        task.site.toLowerCase().includes(searchValue) ||
        task.assignee.toLowerCase().includes(searchValue) ||
        (task.tags ?? []).some((tag) => tag.toLowerCase().includes(searchValue));

      const matchesProject = !projectFilter || (task.projectId != null && String(task.projectId) === projectFilter);
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;
      const matchesTag = tagFilter === "All" || (task.tags ?? []).includes(tagFilter);

      const matchesReminder =
        reminderFilter === "All" ||
        (reminderFilter === "With Reminder" && !!task.reminderAt) ||
        (reminderFilter === "Reminder Due" &&
          isReminderDue(task.reminderAt, task.status)) ||
        (reminderFilter === "No Reminder" && !task.reminderAt);

      const matchesRecurring =
        recurringFilter === "All" ||
        (recurringFilter === "Recurring" && !!task.isRecurring) ||
        (recurringFilter === "Not Recurring" && !task.isRecurring) ||
        (recurringFilter === "Daily" && task.recurringPattern === "daily") ||
        (recurringFilter === "Weekdays" && task.recurringPattern === "weekdays") ||
        (recurringFilter === "Weekly" && task.recurringPattern === "weekly") ||
        (recurringFilter === "Monthly" && task.recurringPattern === "monthly") ||
        (recurringFilter === "Yearly" && task.recurringPattern === "yearly");

      return (
        matchesProject &&
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesTag &&
        matchesReminder &&
        matchesRecurring
      );
    });

    const priorityRank: Record<string, number> = {
      High: 0,
      Medium: 1,
      Low: 2,
    };

    return [...result]
      .sort((a, b) => {
        if (sortOrder === "newest") {
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        }

        if (sortOrder === "oldest") {
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          );
        }

        if (sortOrder === "due-desc") {
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        }

        if (sortOrder === "due-asc") {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }

        return 0;
      })
      .sort((a, b) => {
        const overdueA = isOverdue(a.dueDate, a.status) ? 0 : 1;
        const overdueB = isOverdue(b.dueDate, b.status) ? 0 : 1;
        if (overdueA !== overdueB) return overdueA - overdueB;

        const reminderDueA = isReminderDue(a.reminderAt, a.status) ? 0 : 1;
        const reminderDueB = isReminderDue(b.reminderAt, b.status) ? 0 : 1;
        if (reminderDueA !== reminderDueB) return reminderDueA - reminderDueB;

        return priorityRank[a.priority] - priorityRank[b.priority];
      });
  }, [
    tasks,
    searchTerm,
    statusFilter,
    priorityFilter,
    tagFilter,
    reminderFilter,
    recurringFilter,
    sortOrder,
  ]);

  const boardData = useMemo(() => {
    return boardColumns.map((column) => ({
      status: column,
      tasks: filteredTasks.filter((task) => task.status === column),
    }));
  }, [filteredTasks]);

  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter((task) => task.status === "In Progress").length;
  const completedTasks = tasks.filter((task) => task.status === "Completed").length;
  const pendingTasks = tasks.filter((task) => task.status === "Pending").length;
  const overdueTasks = tasks.filter((task) => isOverdue(task.dueDate, task.status)).length;
  const dueReminderTasks = tasks.filter((task) =>
    isReminderDue(task.reminderAt, task.status)
  ).length;
  const recurringTasksCount = tasks.filter((task) => task.isRecurring).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Tasks
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Track site work, reminders, recurring tasks, subtasks, and saved views in
          one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
          <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
            {totalTasks}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
          <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
            {inProgressTasks}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
            {completedTasks}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
            {pendingTasks}
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-500/10">
          <p className="text-sm text-red-600 dark:text-red-400">Overdue</p>
          <p className="mt-2 text-3xl font-semibold text-red-700 dark:text-red-300">
            {overdueTasks}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-500/10">
          <p className="text-sm text-amber-700 dark:text-amber-300">Reminders Due</p>
          <p className="mt-2 text-3xl font-semibold text-amber-700 dark:text-amber-200">
            {dueReminderTasks}
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900/40 dark:bg-indigo-500/10">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">Recurring</p>
          <p className="mt-2 text-3xl font-semibold text-indigo-700 dark:text-indigo-200">
            {recurringTasksCount}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-5 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Saved Views
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Save filter combinations and reopen them instantly.
                </p>
              </div>
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={newSavedViewName}
                onChange={(e) => setNewSavedViewName(e.target.value)}
                placeholder="View name, e.g. Weekly recurring"
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleSaveCurrentView}
                className="rounded-xl bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600"
              >
                Save Current View
              </button>
            </div>

            <div className="space-y-3">
              {savedViews.length > 0 ? (
                savedViews.map((view) => (
                  <div
                    key={view.id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        {view.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {view.viewMode} view, status {view.statusFilter}, priority{" "}
                        {view.priorityFilter}, tag {view.tagFilter}, reminder{" "}
                        {view.reminderFilter}, recurring {view.recurringFilter}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApplySavedView(view)}
                        className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedView(view.id)}
                        className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No saved views yet. Create one from your current filters.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Workspace
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Switch between list and board views for the same filtered tasks.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex rounded-xl border border-gray-300 p-1 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    viewMode === "list"
                      ? "bg-brand-500 text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  List View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("board")}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    viewMode === "board"
                      ? "bg-brand-500 text-white"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                  }`}
                >
                  Board View
                </button>
              </div>

              <button
                onClick={() => setShowForm((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                {showForm ? "Close Form" : "Add Task"}
              </button>
            </div>
          </div>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 grid gap-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
          >
            <input
              type="text"
              name="title"
              placeholder="Task title"
              value={formData.title}
              onChange={handleChange}
              required
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />

            <input
              type="text"
              name="site"
              placeholder="Site"
              value={formData.site}
              onChange={handleChange}
              required
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />

            <select
              value={formData.assigneeId}
              onChange={(e) => {
                const worker = workers.find((w) => w._id === e.target.value);
                setFormData((prev) => ({
                  ...prev,
                  assigneeId: e.target.value,
                  assignee: worker ? worker.name : "",
                }));
              }}
              required
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="">Select worker</option>
              {workers.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>

            <div className="grid gap-4 sm:grid-cols-3">
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>

              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleChange}
                required
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="datetime-local"
                name="reminderAt"
                value={formData.reminderAt}
                onChange={handleChange}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />

              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="Tags, comma separated"
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <select
                name="recurringPattern"
                value={formData.recurringPattern}
                onChange={handleChange}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <input
                type="number"
                min={1}
                name="recurringInterval"
                value={formData.recurringInterval}
                onChange={handleChange}
                placeholder="Repeat interval"
                disabled={formData.recurringPattern === "none"}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            {submitError && <p className="text-sm text-red-500">{submitError}</p>}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save Task"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormData(initialForm);
                  setSubmitError("");
                }}
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="mb-6 grid gap-4 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <input
              type="text"
              placeholder="Search by task, site, assignee, or tag"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="All">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={recurringFilter}
              onChange={(e) => setRecurringFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="All">All Recurring States</option>
              <option value="Recurring">Recurring</option>
              <option value="Not Recurring">Not Recurring</option>
              <option value="Daily">Daily</option>
              <option value="Weekdays">Weekdays</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
        </div>

        <div className="mb-4 grid gap-4 xl:grid-cols-4">
          <div>
            <select
              value={reminderFilter}
              onChange={(e) => setReminderFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="All">All Reminder States</option>
              <option value="With Reminder">With Reminder</option>
              <option value="Reminder Due">Reminder Due</option>
              <option value="No Reminder">No Reminder</option>
            </select>
          </div>

          <div>
            <select
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(
                  e.target.value as "newest" | "oldest" | "due-asc" | "due-desc"
                )
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="due-asc">Due date: Soonest first</option>
              <option value="due-desc">Due date: Latest first</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          <div className="xl:col-span-2">
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("All");
                setPriorityFilter("All");
                setTagFilter("All");
                setReminderFilter("All");
                setRecurringFilter("All");
                setSortOrder("due-asc");
                setSearchParams({});
              }}
              className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {projectFilter && (
          <div className="mb-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/30 dark:text-brand-400">
              Project: {projectFilterName ?? projectFilter}
              <button
                type="button"
                onClick={() => setSearchParams({})}
                className="ml-0.5 rounded-full p-0.5 hover:bg-brand-100 dark:hover:bg-brand-500/20"
                title="Clear project filter"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </p>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTagFilter(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    tagFilter === tag
                      ? "bg-brand-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.08]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {viewMode === "board" && !loading && !error && filteredTasks.length > 0 && (
          <div className="mb-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50/60 px-4 py-3 dark:border-gray-700 dark:bg-white/[0.02]">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Drag a task card and drop it into another column to change status.
            </p>
          </div>
        )}

        {actionError && <p className="pb-4 text-sm text-red-500">{actionError}</p>}

        {loading && (
          <p className="py-6 text-sm text-gray-500 dark:text-gray-400">
            Loading tasks...
          </p>
        )}

        {error && <p className="py-6 text-sm text-red-500">{error}</p>}

        {!loading && !error && tasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No tasks found yet in MongoDB.
            </p>
          </div>
        )}

        {!loading && !error && tasks.length > 0 && filteredTasks.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No tasks match your current search or filters.
            </p>
          </div>
        )}

        {!loading && !error && filteredTasks.length > 0 && viewMode === "list" && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Task
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Site
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Assignee
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Priority
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Due
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Reminder
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Recurs
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Tags
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Progress
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredTasks.map((task) => {
                  const overdue = isOverdue(task.dueDate, task.status);
                  const reminderDue = isReminderDue(task.reminderAt, task.status);
                  const subtasks = task.subtasks ?? [];
                  const completedSubtasks = subtasks.filter(
                    (subtask) => subtask.completed
                  ).length;

                  return (
                    <tr
                      key={task._id || task.title}
                      className={`border-b border-gray-100 dark:border-gray-800 ${
                        overdue ? "bg-red-50/70 dark:bg-red-500/10" : ""
                      }`}
                    >
                      <td className="px-3 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        <button
                          type="button"
                          onClick={() => openTaskDrawer(task)}
                          className="flex items-center gap-2 text-left hover:text-brand-500"
                        >
                          <span>{task.title}</span>
                          {overdue && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                              Overdue
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {task.site}
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {task.assignee}
                      </td>

                      <td
                        className={`px-3 py-4 text-sm font-medium ${getPriorityStyles(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </td>

                      <td
                        className={`px-3 py-4 text-sm ${
                          overdue
                            ? "font-semibold text-red-600 dark:text-red-400"
                            : "text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {formatDate(task.dueDate)}
                      </td>

                      <td className="px-3 py-4 text-xs">
                        {task.reminderAt ? (
                          <span
                            className={`rounded-full px-2.5 py-1 font-medium ${
                              reminderDue
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                                : "bg-gray-100 text-gray-700 dark:bg-white/[0.05] dark:text-gray-300"
                            }`}
                          >
                            {formatDateTime(task.reminderAt)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">None</span>
                        )}
                      </td>

                      <td className="px-3 py-4 text-xs text-gray-600 dark:text-gray-400">
                        {task.isRecurring ? (
                          <span className="rounded-full bg-indigo-100 px-2.5 py-1 font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                            {describeRecurringRule(
                              task.recurringPattern,
                              task.recurringInterval
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">No</span>
                        )}
                      </td>

                      <td className="px-3 py-4 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex max-w-[180px] flex-wrap gap-2">
                          {(task.tags ?? []).length > 0 ? (
                            task.tags?.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-gray-100 px-2.5 py-1 font-medium dark:bg-white/[0.05]"
                              >
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span>No tags</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-4 text-xs text-gray-600 dark:text-gray-400">
                        {subtasks.length > 0 ? (
                          <span>
                            {completedSubtasks}/{subtasks.length} subtasks
                          </span>
                        ) : (
                          <span>No subtasks</span>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <select
                          value={task.status}
                          onChange={(e) =>
                            task._id ? handleStatusChange(task._id, e.target.value) : null
                          }
                          className={`rounded-full px-3 py-1 text-xs font-medium outline-none ${getStatusStyles(
                            task.status
                          )}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openTaskDrawer(task)}
                            className="rounded-lg bg-gray-700 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                          >
                            View
                          </button>
                          <button
                            onClick={() => openEditModal(task)}
                            className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              task._id ? handleDeleteTask(task._id) : null
                            }
                            className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && filteredTasks.length > 0 && viewMode === "board" && (
          <div className="grid gap-4 xl:grid-cols-4">
            {boardData.map((column) => (
              <div
                key={column.status}
                onDragOver={(e) => handleColumnDragOver(e, column.status)}
                onDragLeave={(e) => handleColumnDragLeave(e, column.status)}
                onDrop={(e) => handleColumnDrop(e, column.status)}
                className={`rounded-2xl border p-4 transition ${
                  dragOverColumn === column.status
                    ? "border-brand-500 bg-brand-50/50 dark:border-brand-400 dark:bg-brand-500/10"
                    : "border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.02]"
                }`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                      {column.status}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {column.tasks.length} task{column.tasks.length === 1 ? "" : "s"}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(
                      column.status
                    )}`}
                  >
                    {column.tasks.length}
                  </span>
                </div>

                <div className="min-h-[120px] space-y-3">
                  {column.tasks.length === 0 && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center dark:border-gray-700 dark:bg-white/[0.03]">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Drop a task here
                      </p>
                    </div>
                  )}

                  {column.tasks.map((task) => {
                    const overdue = isOverdue(task.dueDate, task.status);
                    const reminderDue = isReminderDue(task.reminderAt, task.status);
                    const isDragging = draggedTaskId === task._id;
                    const subtasks = task.subtasks ?? [];
                    const completedSubtasks = subtasks.filter(
                      (subtask) => subtask.completed
                    ).length;

                    return (
                      <div
                        key={task._id || `${column.status}-${task.title}`}
                        draggable={Boolean(task._id)}
                        onDragStart={(e) =>
                          task._id ? handleDragStart(e, task._id) : null
                        }
                        onDragEnd={handleDragEnd}
                        className={`rounded-2xl border bg-white p-4 shadow-sm transition dark:bg-gray-900/60 ${
                          overdue
                            ? "border-red-200 dark:border-red-900/40"
                            : "border-gray-200 dark:border-gray-800"
                        } ${isDragging ? "opacity-40 ring-2 ring-brand-400" : ""}`}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => openTaskDrawer(task)}
                            className="text-left"
                          >
                            <h4 className="text-sm font-semibold text-gray-800 hover:text-brand-500 dark:text-white/90">
                              {task.title}
                            </h4>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {task.site}
                            </p>
                          </button>

                          <div className="flex flex-col gap-1">
                            {overdue && (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                                Overdue
                              </span>
                            )}
                            {reminderDue && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                Reminder
                              </span>
                            )}
                            {task.isRecurring && (
                              <span className="rounded-full bg-indigo-100 px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                                Repeat
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mb-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getPriorityBadgeStyles(
                              task.priority
                            )}`}
                          >
                            {task.priority}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${getStatusStyles(
                              task.status
                            )}`}
                          >
                            {task.status}
                          </span>
                          {(task.tags ?? []).slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:bg-white/[0.05] dark:text-gray-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                          <p>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Assignee
                            </span>{" "}
                            {task.assignee}
                          </p>
                          <p className={overdue ? "font-semibold text-red-600 dark:text-red-400" : ""}>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Due
                            </span>{" "}
                            {formatDate(task.dueDate)}
                          </p>
                          <p>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Subtasks
                            </span>{" "}
                            {subtasks.length > 0
                              ? `${completedSubtasks}/${subtasks.length}`
                              : "None"}
                          </p>
                          <p>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Repeats
                            </span>{" "}
                            {task.isRecurring
                              ? describeRecurringRule(
                                  task.recurringPattern,
                                  task.recurringInterval
                                )
                              : "No"}
                          </p>
                        </div>

                        <div className="mt-4 space-y-3">
                          <select
                            value={task.status}
                            onChange={(e) =>
                              task._id ? handleStatusChange(task._id, e.target.value) : null
                            }
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Blocked">Blocked</option>
                          </select>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openTaskDrawer(task)}
                              className="flex-1 rounded-lg bg-gray-700 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600"
                            >
                              View
                            </button>
                            <button
                              onClick={() => openEditModal(task)}
                              className="flex-1 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-600"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                task._id ? handleDeleteTask(task._id) : null
                              }
                              className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white hover:bg-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Edit Task
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Update task details, reminders, tags, and recurring rule.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="grid gap-4">
              <input
                type="text"
                name="title"
                placeholder="Task title"
                value={editFormData.title}
                onChange={handleEditChange}
                required
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />

              <input
                type="text"
                name="site"
                placeholder="Site"
                value={editFormData.site}
                onChange={handleEditChange}
                required
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />

              <select
                value={editFormData.assigneeId}
                onChange={(e) => {
                  const worker = workers.find((w) => w._id === e.target.value);
                  setEditFormData((prev) => ({
                    ...prev,
                    assigneeId: e.target.value,
                    assignee: worker ? worker.name : "",
                  }));
                }}
                required
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select worker</option>
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>

              <div className="grid gap-4 sm:grid-cols-3">
                <select
                  name="priority"
                  value={editFormData.priority}
                  onChange={handleEditChange}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <input
                  type="date"
                  name="dueDate"
                  value={editFormData.dueDate}
                  onChange={handleEditChange}
                  required
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />

                <select
                  name="status"
                  value={editFormData.status}
                  onChange={handleEditChange}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Blocked">Blocked</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="datetime-local"
                  name="reminderAt"
                  value={editFormData.reminderAt}
                  onChange={handleEditChange}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />

                <input
                  type="text"
                  name="tags"
                  value={editFormData.tags}
                  onChange={handleEditChange}
                  placeholder="Tags, comma separated"
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  name="recurringPattern"
                  value={editFormData.recurringPattern}
                  onChange={handleEditChange}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>

                <input
                  type="number"
                  min={1}
                  name="recurringInterval"
                  value={editFormData.recurringInterval}
                  onChange={handleEditChange}
                  placeholder="Repeat interval"
                  disabled={editFormData.recurringPattern === "none"}
                  className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>

              {editError && <p className="text-sm text-red-500">{editError}</p>}

              <div className="mt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editSubmitting ? "Updating..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={closeEditModal}
                  className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-[55] flex justify-end bg-black/40">
          <div className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-gray-950">
            <div className="border-b border-gray-200 px-6 py-5 dark:border-gray-800">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusStyles(
                        selectedTask.status
                      )}`}
                    >
                      {selectedTask.status}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${getPriorityBadgeStyles(
                        selectedTask.priority
                      )}`}
                    >
                      {selectedTask.priority}
                    </span>
                    {isOverdue(selectedTask.dueDate, selectedTask.status) && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                        Overdue
                      </span>
                    )}
                    {isReminderDue(selectedTask.reminderAt, selectedTask.status) && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                        Reminder Due
                      </span>
                    )}
                    {selectedTask.isRecurring && (
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                        {describeRecurringRule(
                          selectedTask.recurringPattern,
                          selectedTask.recurringInterval
                        )}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                    {selectedTask.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Site {selectedTask.site} • Assignee {selectedTask.assignee}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeTaskDrawer}
                  className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.05]"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(selectedTask.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-white/[0.05] dark:text-gray-300"
                  >
                    {tag}
                  </span>
                ))}
                {(selectedTask.tags ?? []).length === 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    No tags yet
                  </span>
                )}
              </div>

              <div className="mt-5 grid grid-cols-4 gap-2 rounded-2xl bg-gray-50 p-1 dark:bg-white/[0.03]">
                {[
                  { key: "overview", label: "Overview" },
                  { key: "comments", label: "Comments" },
                  { key: "subtasks", label: "Subtasks" },
                  { key: "activity", label: "Activity" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setDrawerTab(tab.key as DrawerTab)}
                    className={`rounded-xl px-3 py-2 text-xs font-medium ${
                      drawerTab === tab.key
                        ? "bg-brand-500 text-white"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.05]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {drawerError && (
                <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300">
                  {drawerError}
                </p>
              )}

              {drawerTab === "overview" && (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <h4 className="mb-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                      Task Summary
                    </h4>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Assignee
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                          {selectedTask.assignee}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Due Date
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                          {formatDate(selectedTask.dueDate)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Reminder
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                          {selectedTask.reminderAt
                            ? formatDateTime(selectedTask.reminderAt)
                            : "No reminder set"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Repeats
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                          {selectedTask.isRecurring
                            ? describeRecurringRule(
                                selectedTask.recurringPattern,
                                selectedTask.recurringInterval
                              )
                            : "No recurring rule"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Created
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                          {selectedTask.createdAt
                            ? formatDateTime(selectedTask.createdAt)
                            : "Unknown"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Comments
                        </p>
                        <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
                          {(selectedTask.comments ?? []).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        Tags
                      </h4>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {(selectedTask.tags ?? []).length > 0 ? (
                        selectedTask.tags?.map((tag) => (
                          <div
                            key={tag}
                            className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-white/[0.05] dark:text-gray-300"
                          >
                            <span>{tag}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTagFromTask(tag)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No tags yet.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="Add tag"
                        className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddTagToTask}
                        className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "comments" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="grid gap-3">
                      <input
                        type="text"
                        value={commentAuthor}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        placeholder="Author"
                        className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <textarea
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="Write a comment"
                        rows={4}
                        className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddComment}
                        className="w-fit rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                      >
                        Add Comment
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(selectedTask.comments ?? []).length > 0 ? (
                      [...(selectedTask.comments ?? [])]
                        .slice()
                        .reverse()
                        .map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                                {comment.author}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDateTime(comment.createdAt)}
                              </p>
                            </div>
                            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                              {comment.message}
                            </p>
                          </div>
                        ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No comments yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {drawerTab === "subtasks" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Subtask title"
                        className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddSubtask}
                        className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                        Checklist
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(selectedTask.subtasks ?? []).filter((s) => s.completed).length}/
                        {(selectedTask.subtasks ?? []).length} complete
                      </p>
                    </div>

                    <div className="space-y-3">
                      {(selectedTask.subtasks ?? []).length > 0 ? (
                        selectedTask.subtasks?.map((subtask) => (
                          <label
                            key={subtask.id}
                            className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
                          >
                            <input
                              type="checkbox"
                              checked={subtask.completed}
                              onChange={() => handleToggleSubtask(subtask.id)}
                              className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                            />
                            <div className="flex-1">
                              <p
                                className={`text-sm ${
                                  subtask.completed
                                    ? "text-gray-400 line-through dark:text-gray-500"
                                    : "text-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {subtask.title}
                              </p>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Added {formatDateTime(subtask.createdAt)}
                              </p>
                            </div>
                          </label>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            No subtasks yet for this task.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === "activity" && (
                <div className="space-y-3">
                  {(selectedTask.activity ?? []).length > 0 ? (
                    [...(selectedTask.activity ?? [])]
                      .slice()
                      .reverse()
                      .map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  item.type === "comment"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                                    : item.type === "subtask"
                                    ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                                    : item.type === "reminder"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                                    : item.type === "tag"
                                    ? "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300"
                                    : item.type === "recurring"
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                                    : item.type === "view"
                                    ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300"
                                    : "bg-gray-100 text-gray-700 dark:bg-white/[0.05] dark:text-gray-300"
                                }`}
                              >
                                {item.type}
                              </span>
                              <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                                {item.message}
                              </p>
                            </div>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTime(item.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-10 text-center dark:border-gray-700">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No activity history yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="fixed bottom-5 right-5 z-[70]">
          <div
            className={`min-w-[260px] rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-500/10 dark:text-green-300"
                : toast.type === "error"
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300"
                : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-500/10 dark:text-blue-300"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{toast.message}</span>

              <button
                type="button"
                onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
                className="text-xs font-semibold opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}