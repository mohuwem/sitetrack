import { useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "../lib/api";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import { EventResizeDoneArg } from "@fullcalendar/interaction";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";

type PriorityLevel = "High" | "Medium" | "Normal" | "Complete";
type WorkStatus = "Scheduled" | "In Progress" | "Completed" | "Blocked";

interface CalendarEvent extends EventInput {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  extendedProps: {
    calendar: PriorityLevel;
    site: string;
    crew: string;
    status: WorkStatus;
    notes: string;
  };
}

type EventFormState = {
  title: string;
  site: string;
  crew: string;
  status: WorkStatus;
  priority: PriorityLevel;
  startDate: string;
  endDate: string;
  notes: string;
};

const initialFormState: EventFormState = {
  title: "",
  site: "",
  crew: "",
  status: "Scheduled",
  priority: "Normal",
  startDate: "",
  endDate: "",
  notes: "",
};

const priorityThemeMap: Record<PriorityLevel, string> = {
  High: "bg-red-500",
  Medium: "bg-amber-500",
  Normal: "bg-blue-500",
  Complete: "bg-green-500",
};

const priorityBadgeMap: Record<PriorityLevel, string> = {
  High: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  Normal: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  Complete: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
};

const statusBadgeMap: Record<WorkStatus, string> = {
  Scheduled: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  "In Progress": "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  Completed: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  Blocked: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

function formatDateLabel(dateString: string) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(date?: Date | null) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addOneDay(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  date.setDate(date.getDate() + 1);
  return toInputDate(date);
}

function subtractOneDay(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  date.setDate(date.getDate() - 1);
  return toInputDate(date);
}

function isSameOrBefore(startDate: string, endDate: string) {
  if (!startDate || !endDate) return true;
  return new Date(startDate).getTime() <= new Date(endDate).getTime();
}

function isPastDue(dateString: string, status: WorkStatus) {
  if (!dateString || status === "Completed") return false;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return date < today;
}

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [formState, setFormState] = useState<EventFormState>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"All" | PriorityLevel>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | WorkStatus>("All");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const response = await authFetch("/calendar-events");

        if (!response.ok) {
          throw new Error("Failed to load calendar events");
        }

        const raw = (await response.json()) as (CalendarEvent & { _id?: string })[];
        const normalized = Array.isArray(raw)
          ? raw.map((e) => ({ ...e, id: e._id ?? e.id }))
          : [];
        setEvents(normalized);
      } catch (error) {
        setErrorMessage("Unable to load calendar data.");
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !search ||
        event.title.toLowerCase().includes(search) ||
        event.extendedProps.site.toLowerCase().includes(search) ||
        event.extendedProps.crew.toLowerCase().includes(search) ||
        event.extendedProps.notes.toLowerCase().includes(search);

      const matchesPriority =
        priorityFilter === "All" || event.extendedProps.calendar === priorityFilter;

      const matchesStatus =
        statusFilter === "All" || event.extendedProps.status === statusFilter;

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [events, searchTerm, priorityFilter, statusFilter]);

  const sortedUpcomingWork = useMemo(() => {
    return [...filteredEvents]
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 6);
  }, [filteredEvents]);

  const currentWeekCount = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    const day = start.getDay();
    const diffToMonday = (day + 6) % 7;
    start.setDate(now.getDate() - diffToMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return events.filter((event) => {
      const eventDate = new Date(event.start);
      return eventDate >= start && eventDate < end;
    }).length;
  }, [events]);

  const highPriorityCount = useMemo(() => {
    return events.filter((event) => event.extendedProps.calendar === "High").length;
  }, [events]);

  const crewsActiveCount = useMemo(() => {
    return new Set(
      events
        .filter((event) => event.extendedProps.status !== "Completed")
        .map((event) => event.extendedProps.crew)
        .filter(Boolean)
    ).size;
  }, [events]);

  const deliveriesDueCount = useMemo(() => {
    return events.filter((event) =>
      event.title.toLowerCase().includes("delivery")
    ).length;
  }, [events]);

  const blockedCount = useMemo(() => {
    return events.filter((event) => event.extendedProps.status === "Blocked").length;
  }, [events]);

  const resetModalFields = () => {
    setFormState(initialFormState);
    setSelectedEvent(null);
    setErrorMessage("");
  };

  const handleCloseModal = () => {
    closeModal();
    resetModalFields();
  };

  const openCreateModal = (startDate = "", endDate = "") => {
    resetModalFields();
    setFormState((prev) => ({
      ...prev,
      startDate,
      endDate: endDate || startDate,
    }));
    openModal();
  };

  const openEventModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setFormState({
      title: event.title,
      site: event.extendedProps.site || "",
      crew: event.extendedProps.crew || "",
      status: event.extendedProps.status || "Scheduled",
      priority: event.extendedProps.calendar || "Normal",
      startDate: event.start,
      endDate: event.end ? subtractOneDay(event.end) : event.start,
      notes: event.extendedProps.notes || "",
    });
    setErrorMessage("");
    openModal();
  };

  const persistEvent = async (payload: CalendarEvent, method: "POST" | "PUT") => {
    const path = method === "POST"
      ? "/calendar-events"
      : `/calendar-events/${payload.id}`;
    const response = await authFetch(path, {
      method,
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "Failed to save event");
    const saved = data as CalendarEvent & { _id?: string };
    return { ...saved, id: saved._id ?? saved.id } as CalendarEvent;
  };

  const deleteEventOnServer = async (id: string) => {
    const response = await authFetch(`/calendar-events/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "Failed to delete event");
    return data;
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    openCreateModal(
      selectInfo.startStr,
      subtractOneDay(selectInfo.endStr) || selectInfo.startStr
    );
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;

    const normalizedEvent: CalendarEvent = {
      id: event.id,
      title: event.title,
      start: toInputDate(event.start) || event.startStr,
      end: event.end ? toInputDate(event.end) : undefined,
      allDay: event.allDay,
      extendedProps: {
        calendar: event.extendedProps.calendar,
        site: event.extendedProps.site || "",
        crew: event.extendedProps.crew || "",
        status: event.extendedProps.status || "Scheduled",
        notes: event.extendedProps.notes || "",
      },
    };

    openEventModal(normalizedEvent);
  };

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const nextStart = toInputDate(dropInfo.event.start);
    const nextEnd = dropInfo.event.end
      ? subtractOneDay(toInputDate(dropInfo.event.end))
      : nextStart;

    const optimistic: CalendarEvent = {
      id: dropInfo.event.id,
      title: dropInfo.event.title,
      start: nextStart,
      end: addOneDay(nextEnd),
      allDay: true,
      extendedProps: {
        calendar: dropInfo.event.extendedProps.calendar,
        site: dropInfo.event.extendedProps.site || "",
        crew: dropInfo.event.extendedProps.crew || "",
        status: dropInfo.event.extendedProps.status || "Scheduled",
        notes: dropInfo.event.extendedProps.notes || "",
      },
    };

    setEvents((prev) =>
      prev.map((event) => (event.id === optimistic.id ? optimistic : event))
    );

    try {
      await persistEvent(optimistic, "PUT");
    } catch {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === dropInfo.event.id ? { ...event, start: dropInfo.oldEvent.startStr } : event
        )
      );
      setErrorMessage("Unable to save moved event.");
    }
  };

  const handleEventResize = async (resizeInfo: EventResizeDoneArg) => {
    const nextStart = toInputDate(resizeInfo.event.start);
    const nextEnd = resizeInfo.event.end
      ? subtractOneDay(toInputDate(resizeInfo.event.end))
      : nextStart;

    const optimistic: CalendarEvent = {
      id: resizeInfo.event.id,
      title: resizeInfo.event.title,
      start: nextStart,
      end: addOneDay(nextEnd),
      allDay: true,
      extendedProps: {
        calendar: resizeInfo.event.extendedProps.calendar,
        site: resizeInfo.event.extendedProps.site || "",
        crew: resizeInfo.event.extendedProps.crew || "",
        status: resizeInfo.event.extendedProps.status || "Scheduled",
        notes: resizeInfo.event.extendedProps.notes || "",
      },
    };

    setEvents((prev) =>
      prev.map((event) => (event.id === optimistic.id ? optimistic : event))
    );

    try {
      await persistEvent(optimistic, "PUT");
    } catch {
      setErrorMessage("Unable to save resized event.");
    }
  };

  const handleAddOrUpdateEvent = async () => {
    if (!formState.title.trim() || !formState.startDate || !formState.priority) {
      setErrorMessage("Please complete title, start date, and priority.");
      return;
    }

    if (!isSameOrBefore(formState.startDate, formState.endDate || formState.startDate)) {
      setErrorMessage("End date must be the same as or later than start date.");
      return;
    }

    const normalizedEnd = formState.endDate || formState.startDate;
    const calendarEnd = addOneDay(normalizedEnd);

    const payload: CalendarEvent = {
      id: selectedEvent?.id ?? "",
      title: formState.title.trim(),
      start: formState.startDate,
      end: calendarEnd,
      allDay: true,
      extendedProps: {
        calendar: formState.priority,
        site: formState.site.trim(),
        crew: formState.crew.trim(),
        status: formState.status,
        notes: formState.notes.trim(),
      },
    };

    try {
      const saved = await persistEvent(payload, selectedEvent ? "PUT" : "POST");
      setEvents((prev) =>
        selectedEvent
          ? prev.map((event) => (event.id === saved.id ? saved : event))
          : [...prev, saved]
      );
      handleCloseModal();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save event.");
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      await deleteEventOnServer(selectedEvent.id);
      setEvents((prev) => prev.filter((event) => event.id !== selectedEvent.id));
      handleCloseModal();
    } catch {
      setErrorMessage("Unable to delete event.");
    }
  };

  const renderEventContent = (eventInfo: any) => {
    const priority = eventInfo.event.extendedProps.calendar as PriorityLevel;
    const status = eventInfo.event.extendedProps.status as WorkStatus;

    return (
      <div className="flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5">
        <span className={`h-2.5 w-2.5 flex-none rounded-full ${priorityThemeMap[priority]}`} />
        <div className="min-w-0">
          {eventInfo.timeText ? (
            <div className="truncate text-[10px] font-medium opacity-75">
              {eventInfo.timeText}
            </div>
          ) : null}
          <div className="truncate text-xs font-medium">{eventInfo.event.title}</div>
          <div className="truncate text-[10px] opacity-75">{status}</div>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageMeta
        title="SiteTrack Schedule"
        description="SiteTrack construction planning and crew scheduling calendar"
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Schedule
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Plan site work, inspections, deliveries, and crew activity.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled This Week</p>
            <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
              {currentWeekCount}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">High Priority</p>
            <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
              {highPriorityCount}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Crews Active</p>
            <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
              {crewsActiveCount}
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="text-sm text-gray-500 dark:text-gray-400">Deliveries Due</p>
            <p className="mt-2 text-3xl font-semibold text-gray-800 dark:text-white/90">
              {deliveriesDueCount}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-500/10">
            <p className="text-sm text-red-600 dark:text-red-400">Blocked</p>
            <p className="mt-2 text-3xl font-semibold text-red-700 dark:text-red-300">
              {blockedCount}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Search work title, site, crew, or notes"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>

            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as "All" | PriorityLevel)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="All">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Normal">Normal</option>
                <option value="Complete">Complete</option>
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "All" | WorkStatus)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="All">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredEvents.length} of {events.length} work items
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setPriorityFilter("All");
                setStatusFilter("All");
              }}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Clear Filters
            </button>

            <button
              type="button"
              onClick={() => openCreateModal()}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Add Work Item
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            Loading calendar data...
          </div>
        ) : errorMessage && !isOpen ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 xl:col-span-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Work Calendar
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Track planned work items across projects and sites. You can click, drag,
                  or resize entries directly on the calendar.
                </p>
              </div>

              <div className="custom-calendar">
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: "prev,next today addEventButton",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
                  }}
                  customButtons={{
                    addEventButton: {
                      text: "Add Work Item +",
                      click: () => openCreateModal(),
                    },
                  }}
                  events={filteredEvents}
                  selectable
                  editable
                  dayMaxEvents
                  selectMirror
                  select={handleDateSelect}
                  eventClick={handleEventClick}
                  eventDrop={handleEventDrop}
                  eventResize={handleEventResize}
                  eventContent={renderEventContent}
                  height="auto"
                />
              </div>
            </div>
          </div>

          <div className="col-span-12 xl:col-span-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Upcoming Work
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Quick view of planned crew activity and deadlines.
                </p>
              </div>

              <div className="space-y-4">
                {sortedUpcomingWork.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No work items match the current filters.
                    </p>
                  </div>
                ) : (
                  sortedUpcomingWork.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openEventModal(item)}
                      className="block w-full rounded-xl border border-gray-200 p-4 text-left hover:border-brand-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {item.title}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${priorityBadgeMap[item.extendedProps.calendar]}`}
                        >
                          {item.extendedProps.calendar}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {item.extendedProps.site || "No site assigned"}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatDateLabel(item.start)}</span>
                        <span>{item.extendedProps.crew || "No crew"}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusBadgeMap[item.extendedProps.status]}`}
                        >
                          {item.extendedProps.status}
                        </span>

                        {isPastDue(item.start, item.extendedProps.status) && (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                            Overdue
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <Modal
          isOpen={isOpen}
          onClose={handleCloseModal}
          className="max-w-[760px] p-6 lg:p-10"
        >
          <div className="custom-scrollbar flex max-h-[80vh] flex-col overflow-y-auto px-2">
            <div>
              <h5 className="mb-2 text-theme-xl font-semibold text-gray-800 dark:text-white/90 lg:text-2xl">
                {selectedEvent ? "Edit Work Item" : "Add Work Item"}
              </h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Schedule site work, inspections, deliveries, and crew activity.
              </p>
            </div>

            <div className="mt-8 grid gap-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Work Title
                </label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  placeholder="e.g. Lighting installation - Level 2"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Site / Area
                  </label>
                  <input
                    type="text"
                    value={formState.site}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, site: e.target.value }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    placeholder="e.g. Block C"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Crew / Owner
                  </label>
                  <input
                    type="text"
                    value={formState.crew}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, crew: e.target.value }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    placeholder="e.g. Electrical Team B"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Status
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        status: e.target.value as WorkStatus,
                      }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>

                <div>
                  <label className="mb-4 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Priority
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {(["High", "Medium", "Normal", "Complete"] as PriorityLevel[]).map(
                      (level) => (
                        <label
                          key={level}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                            formState.priority === level
                              ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                              : "border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="event-level"
                            value={level}
                            checked={formState.priority === level}
                            onChange={() =>
                              setFormState((prev) => ({ ...prev, priority: level }))
                            }
                            className="sr-only"
                          />
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${priorityThemeMap[level]}`}
                          />
                          {level}
                        </label>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formState.startDate}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formState.endDate}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Notes
                </label>
                <textarea
                  rows={4}
                  value={formState.notes}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  placeholder="Site notes, dependencies, permits, delivery details, or handover comments"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-500/10 dark:text-red-300">
                  {errorMessage}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {selectedEvent ? (
                  <button
                    onClick={handleDeleteEvent}
                    type="button"
                    className="flex w-full justify-center rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-600 sm:w-auto"
                  >
                    Delete Work Item
                  </button>
                ) : (
                  <span className="text-sm text-gray-400 dark:text-gray-500">
                    Create a new scheduled work item
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleCloseModal}
                  type="button"
                  className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
                >
                  Close
                </button>
                <button
                  onClick={handleAddOrUpdateEvent}
                  type="button"
                  className="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
                >
                  {selectedEvent ? "Update Work Item" : "Add Work Item"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default Calendar;