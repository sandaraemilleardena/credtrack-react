import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ictSystemMaintenance.css";

const paths = {
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",

  support:
    "M3 14v-3a9 9 0 0 1 18 0v3 M3 12h4v7H3z M17 12h4v7h-4z M19 19v2h-7",

  settings:
    "M4 7h16 M4 17h16 M8 4v6 M16 14v6",

  plus:
    "M12 5v14 M5 12h14",

  search:
    "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",

  key:
    "M14 7a5 5 0 1 0 0 6l7-7-3-3-7 7",

  dashboard:
    "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",

  pulse:
    "M2 12h5l3-8 4 16 3-8h5",

  tools:
    "M14 5a5 5 0 0 0-6 6L3 16a3 3 0 0 0 5 5l5-5a5 5 0 0 0 6-6l-4 3-4-4z",

  server:
    "M3 3h18v7H3z M3 14h18v7H3z M7 6.5h.01 M7 17.5h.01 M12 6.5h5 M12 17.5h5",

  shield:
    "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7z M8 12l3 3 5-6",

  clock:
    "M12 8v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",

  bell:
    "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4",

  menu:
    "M4 6h16 M4 12h16 M4 18h16",

  close:
    "m6 6 12 12 M18 6 6 18",

  chevron:
    "m9 5 7 7-7 7",

  down:
    "m6 9 6 6 6-6",

  logout:
    "M9 4H4v16h5 M9 12h12 m-5-5 5 5-5 5",

  check:
    "m5 12 4 4L19 6",

  refresh:
    "M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 13-3l2 3 M4 16l2 3a8 8 0 0 0 13-3",
};

function Icon({ name, ...props }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.server} />
    </svg>
  );
}

const navigation = [
  {
    id: "overview",
    label: "Dashboard",
    icon: "dashboard",
  },
  {
    id: "access",
    label: "User Access",
    icon: "users",
  },
  {
    id: "support",
    label: "Technical Support",
    icon: "support",
  },
  {
    id: "maintenance",
    label: "System Maintenance",
    icon: "tools",
  },
  {
    id: "protection",
    label: "Data Protection",
    icon: "shield",
  },
  {
    id: "settings",
    label: "Settings",
    icon: "settings",
  },
];

const DEFAULT_ROUTES = {
  overview: "/ict-dashboard",
  access: "/ict-user-access",
  support: "/ict-technical-support",
  maintenance: "/ict-system-maintenance",
  protection: "/ict-data-protection",
  settings: "/ict-settings",
};

function formatDate(value) {
  if (!value) return "Not reported";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not reported";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function badgeTone(value) {
  const tones = {
    Operational: "green",
    Completed: "green",
    Verified: "green",
    Enabled: "green",
    Running: "blue",
    Scheduled: "blue",
    Queued: "blue",
    Degraded: "amber",
    Pending: "amber",
    Failed: "red",
    Cancelled: "neutral",
  };

  return tones[value] || "neutral";
}

function localInputTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
}

const MAINTENANCE_STATES = [
  "Scheduled",
  "Running",
  "Completed",
  "Cancelled",
];

function maintenanceDemo() {
  const at = (days, hour) => {
    const date = new Date();

    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);

    return date.toISOString();
  };

  return {
    checkedAt: null,

    services: [
      {
        id: "web",
        name: "Web application",
        description: "Sign-in and staff workspace",
        status: "Operational",
        latency: "128 ms",
      },
      {
        id: "api",
        name: "Application API",
        description: "Application service requests",
        status: "Operational",
        latency: "94 ms",
      },
      {
        id: "database",
        name: "Database",
        description: "Connection availability",
        status: "Operational",
        latency: "32 ms",
      },
      {
        id: "mail",
        name: "Email delivery",
        description: "Account and notification emails",
        status: "Degraded",
        latency: "1,240 ms",
      },
    ],

    tasks: [
      {
        id: "MT-012",
        title: "Review email delivery delays",
        service: "Email delivery",
        startsAt: new Date(
          new Date().getTime() - 30 * 60000
        ).toISOString(),
        duration: 60,
        owner: "ICT Personnel",
        impact: "No downtime expected",
        status: "Running",
        notes:
          "Investigating the provider connection and retry queue.",
      },

      {
        id: "MT-013",
        title: "Apply application updates",
        service: "Web application",
        startsAt: at(1, 17),
        duration: 45,
        owner: "ICT Personnel",
        impact: "Brief interruption",
        status: "Scheduled",
        notes:
          "Review the release checklist and confirm a recent backup first.",
      },

      {
        id: "MT-014",
        title: "Database connection review",
        service: "Database",
        startsAt: at(3, 16),
        duration: 30,
        owner: "ICT Personnel",
        impact: "No downtime expected",
        status: "Scheduled",
        notes:
          "Review connection health and resource usage.",
      },

      {
        id: "MT-011",
        title: "Monthly service review",
        service: "All services",
        startsAt: at(-1, 16),
        duration: 30,
        owner: "ICT Personnel",
        impact: "No downtime expected",
        status: "Completed",
        notes:
          "Review completed. Email latency was recorded for follow-up.",
      },
    ],
  };
}

export default function IctSystemMaintenance({
  snapshot,
  onAction,
  onLogout,
  onNavigate,
  routes = {},
  logoSrc = "/logo.png",
}) {
  const navigate = useNavigate();

  const active = "maintenance";
  const demo = snapshot == null;

  const [localData, setLocalData] = useState(
    maintenanceDemo
  );

  const data = demo
    ? localData
    : snapshot || maintenanceDemo();

  const services = Array.isArray(data.services)
    ? data.services
    : [];

  const tasks = Array.isArray(data.tasks)
    ? data.tasks
    : [];

  const [filter, setFilter] = useState("Active");
  const [day, setDay] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [menu, setMenu] = useState(null);
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const submitting = useRef(false);

  const sidebarRef = useRef(null);
  const openButtonRef = useRef(null);
  const topbarRef = useRef(null);
  const previousMenuTrigger = useRef(null);

  const selectedTask = tasks.find(
    (task) => task.id === selectedId
  );

  const issues = services.filter(
    (service) =>
      service.status !== "Operational"
  ).length;

  const operational = services.filter(
    (service) =>
      service.status === "Operational"
  ).length;

  const scheduled = tasks.filter(
    (task) =>
      task.status === "Scheduled"
  ).length;

  const running = tasks.filter(
    (task) =>
      task.status === "Running"
  ).length;

  const upcoming = [...tasks]
    .filter(
      (task) =>
        task.status === "Scheduled"
    )
    .sort(
      (a, b) =>
        Date.parse(a.startsAt) -
        Date.parse(b.startsAt)
    )[0];

  const days = Array.from(
    { length: 7 },
    (_, index) => {
      const date = new Date();

      date.setDate(
        date.getDate() + index
      );

      return {
        key: localInputTime(date).slice(
          0,
          10
        ),
        label: date.toLocaleDateString(
          undefined,
          {
            weekday: "short",
          }
        ),
        number: date.getDate(),
      };
    }
  );

  const visibleTasks = tasks
    .filter((task) => {
      const statusMatches =
        filter === "All" ||
        (filter === "Active" &&
          ["Scheduled", "Running"].includes(
            task.status
          )) ||
        task.status === filter;

      const dayMatches =
        !day ||
        (task.startsAt &&
          !Number.isNaN(
            Date.parse(task.startsAt)
          ) &&
          localInputTime(
            task.startsAt
          ).startsWith(day));

      return statusMatches && dayMatches;
    })
    .sort(
      (a, b) =>
        Date.parse(a.startsAt) -
        Date.parse(b.startsAt)
    );

  const canAct =
    demo || Boolean(onAction);

  // =========================================================
  // DIALOG CONTROL
  // =========================================================

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (!action) {
      if (dialog.open) {
        dialog.close();
      }

      return;
    }

    const overflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    try {
      if (!dialog.open) {
        dialog.showModal();
      }
    } catch {
      // Prevent dialog state from breaking the page.
    }

    return () => {
      document.body.style.overflow =
        overflow;

      if (dialog.open) {
        try {
          dialog.close();
        } catch {
          // Ignore close errors.
        }
      }
    };
  }, [action]);

  function openAction(value) {
    triggerRef.current =
      document.activeElement;

    setMenu(null);
    setError("");
    setAction(value);
  }

  function closeAction() {
    if (submitting.current) {
      return;
    }

    setAction(null);
    setError("");
  }

  async function perform(
    type,
    payload,
    demoMutation,
    message
  ) {
    if (
      submitting.current ||
      !canAct
    ) {
      return false;
    }

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      if (demo) {
        if (demoMutation) {
          demoMutation();
        }
      } else {
        await onAction(type, payload);
      }

      setNotice(
        demo
          ? `${message} Demo only; no live system changes were made.`
          : "Request accepted. Your connected data source provides the latest status."
      );

      return true;
    } catch (failure) {
      const message =
        failure?.message ||
        "The request could not be completed. Please try again.";

      setError(message);
      setNotice(message);

      return false;
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function logout() {
    try {
      if (!onLogout && !demo) {
        setNotice(
          "Connect onLogout to end your server session."
        );
        return;
      }

      if (onLogout) {
        await onLogout();
      }

      navigate("/", {
        replace: true,
      });
    } catch {
      setNotice(
        "Sign out failed. Please try again."
      );
    }
  }

  function showAlerts() {
    setMenu(null);

    const servicesElement =
      document.getElementById(
        "mt-services"
      );

    if (servicesElement) {
      servicesElement.focus();
      servicesElement.scrollIntoView({
        block: "center",
      });
    }
  }

  function viewTask(task) {
    if (!task) {
      return;
    }

    setSelectedId(task.id);
    openAction("task");
  }

  async function runDiagnostics() {
    const ok = await perform(
      "run-diagnostics",
      {},
      () =>
        setLocalData((previous) => ({
          ...previous,
          checkedAt:
            new Date().toISOString(),
        })),
      "Sample diagnostics refreshed; the email service still needs review."
    );

    if (ok) {
      openAction("diagnostics");
    }
  }

  async function scheduleTask(event) {
    event.preventDefault();

    const values = Object.fromEntries(
      new FormData(
        event.currentTarget
      )
    );

    const title =
      String(values.title || "").trim();

    const owner =
      String(values.owner || "").trim();

    const start =
      Date.parse(values.startsAt);

    const duration = Number(
      values.duration
    );

    if (!title || !owner) {
      setError(
        "Enter a task title and an owner."
      );
      return;
    }

    if (
      !Number.isFinite(start) ||
      start <= new Date().getTime()
    ) {
      setError(
        "Choose a start time in the future."
      );
      return;
    }

    if (
      !Number.isInteger(duration) ||
      duration < 5 ||
      duration > 1440
    ) {
      setError(
        "Use a duration between 5 and 1,440 minutes."
      );
      return;
    }

    const end =
      start + duration * 60000;

    const overlaps = tasks.some(
      (task) => {
        if (
          !["Scheduled", "Running"].includes(
            task.status
          )
        ) {
          return false;
        }

        const taskStart =
          Date.parse(task.startsAt);

        if (!Number.isFinite(taskStart)) {
          return false;
        }

        const taskEnd =
          taskStart +
          Number(task.duration || 0) *
            60000;

        const sameService =
          task.service === values.service ||
          task.service === "All services" ||
          values.service ===
            "All services";

        return (
          sameService &&
          start < taskEnd &&
          end > taskStart
        );
      }
    );

    if (overlaps) {
      setError(
        "This service already has maintenance during that time. Choose another window."
      );
      return;
    }

    const payload = {
      ...values,
      title,
      owner,
      startsAt:
        new Date(start).toISOString(),
      duration,
    };

    const ok = await perform(
      "schedule-maintenance",
      payload,
      () =>
        setLocalData((previous) => ({
          ...previous,
          tasks: [
            ...previous.tasks,
            {
              ...payload,
              id: `MT-DEMO-${new Date().getTime()}`,
              status: "Scheduled",
            },
          ],
        })),
      "Maintenance window added."
    );

    if (ok) {
      setFilter("Active");
      setDay("");
      setAction(null);
    }
  }

  async function updateTask(event) {
    event.preventDefault();

    if (!selectedTask) {
      setError(
        "This maintenance record is no longer available."
      );
      return;
    }

    const values = Object.fromEntries(
      new FormData(
        event.currentTarget
      )
    );

    const status =
      String(values.status || "");

    const notes =
      String(values.notes || "").trim();

    if (
      ["Completed", "Cancelled"].includes(
        status
      ) &&
      !notes
    ) {
      setError(
        "Add a completion or cancellation note."
      );
      return;
    }

    const payload = {
      id: selectedTask.id,
      status,
      notes,
    };

    const ok = await perform(
      "update-maintenance",
      payload,
      () =>
        setLocalData((previous) => ({
          ...previous,
          tasks: previous.tasks.map(
            (task) =>
              task.id === payload.id
                ? {
                    ...task,
                    ...payload,
                  }
                : task
          ),
        })),
      "Maintenance record updated."
    );

    if (ok) {
      setAction(null);
    }
  }

  // =========================================================
  // MOBILE SIDEBAR
  // =========================================================

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const firstButton =
      sidebarRef.current?.querySelector(
        "button:not(:disabled)"
      );

    firstButton?.focus();

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [sidebarOpen]);

  // =========================================================
  // MENU / ESCAPE HANDLING
  // =========================================================

  useEffect(() => {
    function dismiss(event) {
      if (
        !topbarRef.current?.contains(
          event.target
        )
      ) {
        setMenu(null);
      }
    }

    function escape(event) {
      if (
        event.key !== "Escape" ||
        dialogRef.current?.open
      ) {
        return;
      }

      setMenu(null);

      if (sidebarOpen) {
        setSidebarOpen(false);
        openButtonRef.current?.focus();
      } else {
        previousMenuTrigger.current?.focus();
      }
    }

    document.addEventListener(
      "pointerdown",
      dismiss
    );

    document.addEventListener(
      "keydown",
      escape
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        dismiss
      );

      document.removeEventListener(
        "keydown",
        escape
      );
    };
  }, [sidebarOpen]);

  // =========================================================
  // DESKTOP SIDEBAR
  // =========================================================

  useEffect(() => {
    const desktop =
      window.matchMedia(
        "(min-width: 1025px)"
      );

    function closeSidebar() {
      if (desktop.matches) {
        setSidebarOpen(false);
      }
    }

    desktop.addEventListener(
      "change",
      closeSidebar
    );

    return () => {
      desktop.removeEventListener(
        "change",
        closeSidebar
      );
    };
  }, []);

  // =========================================================
  // NAVIGATION
  // =========================================================

  function jump(
    id,
    requestedAction
  ) {
    const section =
      {
        health: "maintenance",
        infrastructure:
          "protection",
        security: "access",
      }[id] || id;

    setSidebarOpen(false);
    setMenu(null);
    setAction(null);

    if (onNavigate) {
      onNavigate(
        section,
        requestedAction
      );
      return;
    }

    const path =
      routes[section] ||
      DEFAULT_ROUTES[section];

    if (path) {
      navigate(path, {
        state: requestedAction
          ? {
              action:
                requestedAction,
            }
          : null,
      });
    }
  }

  // =========================================================
  // SIDEBAR KEYBOARD TRAP
  // =========================================================

  function trapSidebar(event) {
    if (
      !sidebarOpen ||
      event.key !== "Tab"
    ) {
      return;
    }

    const nodes =
      sidebarRef.current?.querySelectorAll(
        "button:not(:disabled)"
      );

    if (!nodes?.length) {
      return;
    }

    const first = nodes[0];
    const last =
      nodes[nodes.length - 1];

    if (
      event.shiftKey &&
      document.activeElement === first
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  const selectedTaskIsFinished =
    selectedTask &&
    ["Completed", "Cancelled"].includes(
      selectedTask.status
    );

  return (
    <div className="ict-dashboard ict-maintenance-page">

      {/* SKIP LINK */}
      <a
        className="ict-skip"
        href="#maintenance-main"
      >
        Skip to system maintenance
      </a>

      {/* SIDEBAR OVERLAY */}
      <button
        type="button"
        className={`principal-sidebar-screen ${
          sidebarOpen ? "show" : ""
        }`}
        aria-label="Close navigation"
        tabIndex={-1}
        onClick={() => {
          setSidebarOpen(false);
          openButtonRef.current?.focus();
        }}
      />

      {/* SIDEBAR */}
      <aside
        ref={sidebarRef}
        id="ict-navigation"
        className={`principal-sidebar ${
          sidebarOpen ? "show" : ""
        }`}
        onKeyDown={trapSidebar}
        aria-label="ICT navigation"
      >

        {/* BRAND */}
        <div className="principal-brand">

          <img
            src={logoSrc}
            alt="PMRMIS-South school logo"
          />

          <div className="principal-brand-text">
            <h2>CredTrack</h2>
            <span>
              PMRMIS–SOUTH
            </span>
          </div>

          <button
            type="button"
            className="principal-mobile-close"
            aria-label="Close navigation"
            onClick={() => {
              setSidebarOpen(false);
              openButtonRef.current?.focus();
            }}
          >
            <Icon name="close" />
          </button>

        </div>

        {/* NAVIGATION */}
        <nav
          className="ict-nav-container"
          aria-label="ICT sections"
        >
          <ul className="principal-nav">

            {navigation.map((item) => (
              <li
                key={item.id}
                className={
                  active === item.id
                    ? "active"
                    : ""
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    jump(item.id)
                  }
                  aria-current={
                    active === item.id
                      ? "page"
                      : undefined
                  }
                >
                  <Icon
                    name={item.icon}
                  />

                  <span>
                    {item.label}
                  </span>

                  {active === item.id && (
                    <Icon
                      name="chevron"
                      width="12"
                      height="12"
                    />
                  )}
                </button>
              </li>
            ))}

          </ul>
        </nav>

      </aside>

      {/* MAIN SHELL */}
      <div
        className="principal-shell"
        inert={
          sidebarOpen
            ? true
            : undefined
        }
      >

        {/* TOP BAR */}
        <header
          ref={topbarRef}
          className="principal-topbar"
        >

          <div className="principal-top-left">

            {/* MOBILE MENU */}
            <button
              type="button"
              ref={openButtonRef}
              className="principal-menu-button"
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              aria-controls="ict-navigation"
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              <Icon name="menu" />
            </button>

            {/* SCHOOL LOGO */}
            <img
              className="principal-school-seal"
              src={logoSrc}
              alt=""
            />

            {/* SCHOOL NAME */}
            <div className="principal-school">

              <strong>
                President Manuel Roxas
                Memorial Integrated
                School – South
              </strong>

              <span>
                Digital Credentials
                Management System
              </span>

            </div>

          </div>

          {/* TOP RIGHT */}
          <div className="principal-top-right">

            {/* NOTIFICATIONS */}
            <div className="principal-notification-wrapper">

              <button
                type="button"
                className="principal-bell"
                aria-label={`Workspace alerts: ${issues}`}
                aria-expanded={
                  menu === "alerts"
                }
                aria-controls="ict-alerts"
                onClick={(event) => {
                  previousMenuTrigger.current =
                    event.currentTarget;

                  setMenu(
                    menu === "alerts"
                      ? null
                      : "alerts"
                  );
                }}
              >

                <Icon name="bell" />

                {issues > 0 && (
                  <b>{issues}</b>
                )}

              </button>

              {menu === "alerts" && (
                <section
                  id="ict-alerts"
                  className="principal-notification-dropdown ict-dropdown"
                  aria-label="Workspace alerts"
                >

                  <h3>
                    Workspace alerts
                  </h3>

                  <p>
                    {issues
                      ? `${issues} item${
                          issues === 1
                            ? ""
                            : "s"
                        } need attention.`
                      : "No alerts reported in this workspace."}
                  </p>

                  <button
                    type="button"
                    className="ict-text-button"
                    onClick={showAlerts}
                  >
                    View workspace alerts
                    <Icon name="chevron" />
                  </button>

                </section>
              )}

            </div>

            {/* ACCOUNT */}
            <div className="principal-profile-wrapper">

              <button
                type="button"
                className="principal-profile"
                aria-expanded={
                  menu === "account"
                }
                aria-controls="ict-account"
                aria-label="ICT personnel account"
                onClick={(event) => {
                  previousMenuTrigger.current =
                    event.currentTarget;

                  setMenu(
                    menu === "account"
                      ? null
                      : "account"
                  );
                }}
              >

                <img
                  src={logoSrc}
                  alt=""
                />

                <div>
                  <strong>
                    ICT Personnel
                  </strong>

                  <small>
                    System Operations
                  </small>
                </div>

                <Icon
                  name="down"
                  width="14"
                />

              </button>

              {menu === "account" && (
                <div
                  id="ict-account"
                  className="principal-profile-dropdown ict-dropdown"
                >

                  <strong>
                    ICT Personnel
                  </strong>

                  <p>
                    Technical operations
                    workspace
                  </p>

                  <button
                    type="button"
                    className="ict-logout"
                    onClick={logout}
                  >
                    <Icon name="logout" />
                    Sign out
                  </button>

                </div>
              )}

            </div>

          </div>

        </header>

        {/* MAIN CONTENT */}
        <main
          className="principal-content ict-overview mt-content"
          id="maintenance-main"
          tabIndex={-1}
        >

          {/* HEADING */}
          <section className="ov-heading">

            <div>
              <div className="ov-eyebrow">
                ICT WORKSPACE{" "}
                <span>/</span> OPERATIONS
              </div>

              <h1>
                System Maintenance
              </h1>

              <p>
                Plan service windows and
                keep the school’s systems
                running smoothly.
              </p>
            </div>

            <button
              type="button"
              className="ov-primary"
              onClick={() =>
                openAction("schedule")
              }
            >
              <Icon name="plus" />
              Schedule maintenance
            </button>

          </section>

          {/* NOTICE */}
          <div
            role="status"
            aria-live="polite"
            className={
              notice
                ? "ov-notice"
                : "ict-sr-only"
            }
          >
            {notice}
          </div>

          {/* COMMAND */}
          <section
            className="mt-command"
            aria-label="Maintenance overview"
          >

            <div className="mt-command-copy">

              <span className="mt-eyebrow">
                <span />
                OPERATIONS DESK
              </span>

              <h2>
                Ready for the next
                <br />
                school day.
              </h2>

              <p>
                A clear plan for updates,
                routine checks, and service
                interruptions.
              </p>

              <button
                type="button"
                className="mt-light-button"
                disabled={
                  busy || !canAct
                }
                onClick={
                  runDiagnostics
                }
              >
                <Icon
                  name="pulse"
                  width="17"
                />

                {busy
                  ? "Checking…"
                  : "Run diagnostics"}
              </button>

              <small>
                {demo
                  ? "Demo readings · no live monitoring"
                  : data.checkedAt
                  ? `Last checked ${formatDate(
                      data.checkedAt
                    )}`
                  : "No check timestamp reported"}
              </small>

            </div>

            <div className="mt-command-stats">

              <div>
                <span>
                  Services operational
                </span>

                <strong>
                  {operational}
                  <small>
                    {" "}
                    / {services.length}
                  </small>
                </strong>

                <span className="mt-stat-caption">
                  {issues
                    ? `${issues} service${
                        issues === 1
                          ? ""
                          : "s"
                      } needs review`
                    : services.length
                    ? "All reported services available"
                    : "No services reported"}
                </span>
              </div>

              <div className="mt-stat-pair">

                <div>
                  <strong>
                    {scheduled}
                  </strong>

                  <span>
                    Scheduled
                  </span>
                </div>

                <div>
                  <strong>
                    {running}
                  </strong>

                  <span>
                    In progress
                  </span>
                </div>

              </div>

            </div>

          </section>

          {/* SERVICE HEALTH */}
          <section
            id="mt-services"
            className="mt-services"
            tabIndex={-1}
            aria-label="Service health"
          >

            {services.map(
              (service) => (
                <article
                  key={service.id}
                  className="mt-service"
                >

                  <div className="mt-service-top">

                    <span className="ov-icon">
                      <Icon
                        name={
                          service.id ===
                          "mail"
                            ? "bell"
                            : "server"
                        }
                      />
                    </span>

                    <span
                      className={`mt-led ${
                        service.status ===
                        "Operational"
                          ? "good"
                          : "warn"
                      }`}
                    />

                    <span className="ict-sr-only">
                      {service.status}
                    </span>

                  </div>

                  <h3>
                    {service.name}
                  </h3>

                  <p>
                    {service.description}
                  </p>

                  <div>
                    <span
                      className={`ix-badge ${badgeTone(
                        service.status
                      )}`}
                    >
                      {service.status}
                    </span>

                    <small>
                      {service.latency ||
                        "No reading"}
                    </small>
                  </div>

                </article>
              )
            )}

            {!services.length && (
              <div className="ov-empty">
                No service readings have
                been reported.
              </div>
            )}

          </section>

          {/* WORKSPACE */}
          <div className="mt-workspace">

            {/* PLANNER */}
            <section
              className="ov-panel mt-planner"
              aria-labelledby="mt-planner-title"
            >

              <div className="ov-panel-heading">

                <div>
                  <h2 id="mt-planner-title">
                    Maintenance planner
                  </h2>

                  <p className="ix-subtitle">
                    Your scheduled work and
                    active maintenance records.
                  </p>
                </div>

                <button
                  type="button"
                  className="ov-text-link"
                  onClick={() => {
                    setDay("");
                    setFilter("All");
                  }}
                >
                  Show all
                </button>

              </div>

              {/* WEEK */}
              <div className="mt-week">

                <button
                  type="button"
                  aria-pressed={!day}
                  className="mt-all-days"
                  onClick={() =>
                    setDay("")
                  }
                >
                  <Icon
                    name="clock"
                    width="18"
                  />

                  <span>
                    All dates
                  </span>
                </button>

                {days.map(
                  (item) => (
                    <button
                      type="button"
                      key={item.key}
                      aria-pressed={
                        day ===
                        item.key
                      }
                      onClick={() =>
                        setDay(
                          day ===
                            item.key
                            ? ""
                            : item.key
                        )
                      }
                    >
                      <span>
                        {item.label}
                      </span>

                      <strong>
                        {item.number}
                      </strong>

                      <i
                        aria-hidden="true"
                        className={
                          tasks.some(
                            (task) =>
                              task.startsAt &&
                              !Number.isNaN(
                                Date.parse(
                                  task.startsAt
                                )
                              ) &&
                              localInputTime(
                                task.startsAt
                              ).startsWith(
                                item.key
                              )
                          )
                            ? "has-work"
                            : ""
                        }
                      />
                    </button>
                  )
                )}

              </div>

              {/* FILTERS */}
              <div
                className="mt-tabs"
                aria-label="Maintenance status filter"
              >

                {[
                  "Active",
                  "Scheduled",
                  "Running",
                  "Completed",
                  "Cancelled",
                  "All",
                ].map(
                  (value) => (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={
                        filter ===
                        value
                      }
                      onClick={() =>
                        setFilter(value)
                      }
                    >
                      {value}
                    </button>
                  )
                )}

              </div>

              {/* TASK LIST */}
              <div className="mt-task-list">

                {visibleTasks.map(
                  (task) => (
                    <button
                      type="button"
                      className="mt-task-card"
                      key={task.id}
                      onClick={() =>
                        viewTask(task)
                      }
                    >

                      <span
                        className={`mt-task-rail ${
                          task.status ===
                          "Running"
                            ? "running"
                            : task.status ===
                              "Completed"
                            ? "completed"
                            : ""
                        }`}
                      />

                      <span className="mt-task-main">

                        <span className="mt-task-meta">
                          {task.id} ·{" "}
                          {task.service}
                        </span>

                        <strong>
                          {task.title}
                        </strong>

                        <span className="mt-task-time">
                          <Icon
                            name="clock"
                            width="13"
                          />

                          {formatDate(
                            task.startsAt
                          )}

                          <span>
                            {" "}
                            ·{" "}
                            {task.duration}{" "}
                            min
                          </span>
                        </span>

                        <span className="mt-task-owner">
                          {task.owner} ·{" "}
                          {task.impact}
                        </span>

                      </span>

                      <span
                        className={`ix-badge ${badgeTone(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>

                      <Icon
                        name="chevron"
                        width="15"
                      />

                    </button>
                  )
                )}

                {!visibleTasks.length && (
                  <div className="mt-empty">

                    <Icon name="check" />

                    <h3>
                      No maintenance in
                      this view
                    </h3>

                    <p>
                      Choose another date or
                      status, or plan a new
                      maintenance window.
                    </p>

                    <button
                      type="button"
                      className="ix-secondary"
                      onClick={() => {
                        setDay("");
                        setFilter("All");
                      }}
                    >
                      Reset view
                    </button>

                  </div>
                )}

              </div>

              <div className="ov-panel-footer">
                <span>
                  {visibleTasks.length}{" "}
                  maintenance records
                </span>

                <span>
                  Times shown in your local
                  timezone
                </span>
              </div>

            </section>

            {/* SIDE PANEL */}
            <aside className="mt-side">

              {/* NEXT WINDOW */}
              <section className="mt-next">

                <span className="ov-pill">
                  NEXT SCHEDULED WINDOW
                </span>

                <span className="mt-next-icon">
                  <Icon
                    name="clock"
                    width="26"
                  />
                </span>

                <h2>
                  {upcoming?.title ||
                    "Your schedule is clear"}
                </h2>

                <p>
                  {upcoming
                    ? formatDate(
                        upcoming.startsAt
                      )
                    : "Add a maintenance window when you’re ready."}
                </p>

                {upcoming && (
                  <dl>

                    <div>
                      <dt>
                        Service
                      </dt>

                      <dd>
                        {upcoming.service}
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Duration
                      </dt>

                      <dd>
                        {upcoming.duration}{" "}
                        minutes
                      </dd>
                    </div>

                    <div>
                      <dt>
                        Impact
                      </dt>

                      <dd>
                        {upcoming.impact}
                      </dd>
                    </div>

                  </dl>
                )}

                <button
                  type="button"
                  className="ov-text-link"
                  onClick={() =>
                    upcoming
                      ? viewTask(upcoming)
                      : openAction(
                          "schedule"
                        )
                  }
                >
                  {upcoming
                    ? "Review this window"
                    : "Schedule maintenance"}

                  <Icon
                    name="chevron"
                    width="14"
                  />
                </button>

              </section>

              {/* CHECKLIST */}
              <section className="mt-checklist">

                <h3>
                  Before you begin
                </h3>

                <p>
                  A short checklist for a
                  smoother update.
                </p>

                <ul>

                  <li>
                    <Icon name="shield" />
                    Confirm a recent backup
                  </li>

                  <li>
                    <Icon name="bell" />
                    Coordinate any service
                    interruption
                  </li>

                  <li>
                    <Icon name="tools" />
                    Prepare your rollback
                    steps
                  </li>

                  <li>
                    <Icon name="check" />
                    Record the result when
                    finished
                  </li>

                </ul>

              </section>

            </aside>

          </div>

          {/* FOOTER */}
          <footer className="ov-footer">

            <span>
              CredTrack · System Maintenance
            </span>

            <span>
              {demo
                ? "Demo session · changes are temporary"
                : "ICT operations workspace"}
            </span>

          </footer>

        </main>

        {/* ===================================================
            MODAL
        =================================================== */}

        <dialog
          ref={dialogRef}
          className="ix-modal mt-modal"
          aria-labelledby="mt-modal-title"
          onCancel={(event) => {
            event.preventDefault();
            closeAction();
          }}
        >

          <div className="ix-modal-heading">

            <span className="ov-action-icon">
              <Icon name="tools" />
            </span>

            <button
              type="button"
              className="ix-close"
              onClick={closeAction}
              disabled={busy}
              aria-label="Close maintenance dialog"
            >
              <Icon name="close" />
            </button>

          </div>

          <h2 id="mt-modal-title">
            {action === "schedule"
              ? "Schedule maintenance"
              : action === "diagnostics"
              ? "Service diagnostics"
              : selectedTask?.title ||
                "Record unavailable"}
          </h2>

          <p id="ix-modal-description">
            {action === "schedule"
              ? "Reserve a service window and document the expected impact."
              : action === "diagnostics"
              ? "Latest reported service readings."
              : "Update the maintenance record as work progresses."}
          </p>

          {/* DIAGNOSTICS */}
          {action === "diagnostics" ? (
            <div className="mt-diagnostics">

              {services.map(
                (service) => (
                  <div key={service.id}>

                    <span>
                      {service.name}

                      <small>
                        {service.latency ||
                          "No latency reported"}
                      </small>
                    </span>

                    <span
                      className={`ix-badge ${badgeTone(
                        service.status
                      )}`}
                    >
                      {service.status}
                    </span>

                  </div>
                )
              )}

              <p className="ix-mode-note">
                {demo
                  ? "Simulated diagnostics. These readings do not describe a live system."
                  : `Reported at: ${formatDate(
                      data.checkedAt
                    )}`}
              </p>

              <button
                type="button"
                className="ov-primary"
                onClick={closeAction}
              >
                Done
              </button>

            </div>
          ) : action === "task" &&
            !selectedTask ? (
            <p>
              This maintenance record is
              no longer available.
            </p>
          ) : (
            <form
              onSubmit={
                action === "schedule"
                  ? scheduleTask
                  : updateTask
              }
            >

              <fieldset
                className="ix-fields"
                disabled={
                  busy ||
                  !canAct ||
                  (action === "task" &&
                    selectedTaskIsFinished)
                }
              >

                {/* SCHEDULE FORM */}
                {action === "schedule" ? (
                  <>
                    <label>
                      Task title

                      <input
                        name="title"
                        required
                        maxLength={160}
                        placeholder="e.g. Application update"
                      />
                    </label>

                    <div className="ix-form-grid">

                      <label>
                        Service

                        <select name="service">
                          <option>
                            All services
                          </option>

                          {services.map(
                            (service) => (
                              <option
                                key={
                                  service.id
                                }
                                value={
                                  service.name
                                }
                              >
                                {
                                  service.name
                                }
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <label>
                        Owner

                        <input
                          name="owner"
                          required
                          maxLength={100}
                          defaultValue="ICT Personnel"
                        />
                      </label>

                    </div>

                    <div className="ix-form-grid">

                      <label>
                        Start time (local)

                        <input
                          name="startsAt"
                          type="datetime-local"
                          required
                          min={localInputTime(
                            new Date().getTime()
                          )}
                        />
                      </label>

                      <label>
                        Duration (minutes)

                        <input
                          name="duration"
                          type="number"
                          defaultValue={30}
                          min={5}
                          max={1440}
                          required
                        />
                      </label>

                    </div>

                    <label>
                      Expected impact

                      <select name="impact">
                        <option>
                          No downtime expected
                        </option>

                        <option>
                          Brief interruption
                        </option>

                        <option>
                          Service unavailable
                        </option>
                      </select>
                    </label>

                    <label>
                      Preparation notes

                      <textarea
                        name="notes"
                        rows={3}
                        maxLength={2000}
                        placeholder="Scope, backup checks, and rollback plan"
                      />
                    </label>
                  </>
                ) : (
                  <>
                    {/* TASK RECORD */}
                    {selectedTask && (
                      <>
                        <div className="mt-record-summary">

                          <span
                            className={`ix-badge ${badgeTone(
                              selectedTask.status
                            )}`}
                          >
                            {
                              selectedTask.status
                            }
                          </span>

                          <p>
                            {
                              selectedTask.service
                            }{" "}
                            ·{" "}
                            {formatDate(
                              selectedTask.startsAt
                            )}{" "}
                            ·{" "}
                            {
                              selectedTask.duration
                            }{" "}
                            min
                          </p>

                          <p>
                            {
                              selectedTask.owner
                            }{" "}
                            ·{" "}
                            {
                              selectedTask.impact
                            }
                          </p>

                          <p>
                            {selectedTask.notes ||
                              "No notes recorded."}
                          </p>

                        </div>

                        <label>
                          Record status

                          <select
                            name="status"
                            defaultValue={
                              selectedTask.status
                            }
                          >
                            {MAINTENANCE_STATES.map(
                              (value) => (
                                <option
                                  key={
                                    value
                                  }
                                  value={
                                    value
                                  }
                                >
                                  {value}
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label>
                          Work notes

                          <textarea
                            name="notes"
                            rows={4}
                            maxLength={3000}
                            defaultValue={
                              selectedTask.notes ||
                              ""
                            }
                          />
                        </label>

                        <p className="ix-hint">
                          Updating this record
                          does not start, stop,
                          or restart any service.
                        </p>
                      </>
                    )}
                  </>
                )}

              </fieldset>

              <p className="ix-mode-note">
                {demo
                  ? "Demo only · No system jobs will run."
                  : canAct
                  ? "Requests go to your connected maintenance service."
                  : "Read-only workspace · Maintenance changes are unavailable."}
              </p>

              <p
                role="alert"
                className={
                  error
                    ? "mt-error"
                    : "ict-sr-only"
                }
              >
                {error}
              </p>

              <div className="ix-modal-footer">

                <button
                  type="button"
                  className="ix-secondary"
                  onClick={closeAction}
                  disabled={busy}
                >
                  Close
                </button>

                {!(
                  action === "task" &&
                  selectedTaskIsFinished
                ) && (
                  <button
                    type="submit"
                    className="ov-primary"
                    disabled={
                      busy || !canAct
                    }
                  >
                    {busy
                      ? "Saving…"
                      : action ===
                        "schedule"
                      ? "Schedule window"
                      : "Save record"}
                  </button>
                )}

              </div>

            </form>
          )}

        </dialog>

      </div>
    </div>
  );
}