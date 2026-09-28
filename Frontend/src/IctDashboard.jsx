import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ictDashboard.css";

const DEMO = {
  updatedAt: null,
  activeUsers: 128,
  pendingAccess: 4,
  backupStatus: "Completed",
  nextBackup: "Tonight, 11:00 PM",
  tickets: [
    { id: "ICT-024", subject: "Unable to sign in", requester: "Maria Santos", category: "Account access", priority: "High", status: "Open", time: "12 min ago" },
    { id: "ICT-023", subject: "Document upload keeps failing", requester: "John Reyes", category: "Upload issue", priority: "Normal", status: "In progress", time: "35 min ago" },
    { id: "ICT-022", subject: "Password reset email delayed", requester: "Ana Cruz", category: "Account access", priority: "High", status: "Open", time: "1 hour ago" },
  ],
  accessRequests: [
    { id: "AR-014", name: "Elena Garcia", detail: "New account · awaiting role approval" },
    { id: "AR-013", name: "Marco Torres", detail: "Role change · approval received" },
  ],
  uptime: "99.98%",
  responseTime: "142 ms",
  storageUsedGB: 34,
  storageTotalGB: 100,
  lastBackup: "Demo backup completed",

  services: [
    {
      id: "web",
      name: "Web application",
      detail: "Application availability",
      status: "Operational",
    },
    {
      id: "api",
      name: "Application API",
      detail: "Service connectivity",
      status: "Operational",
    },
    {
      id: "database",
      name: "Database service",
      detail: "Connectivity only · no record access",
      status: "Operational",
    },
    {
      id: "mail",
      name: "Email delivery",
      detail: "Delivery service status",
      status: "Degraded",
    },
  ],

  maintenance: [
    {
      id: "mail-review",
      title: "Review email delivery delays",
      detail:
        "Check provider connectivity and retry settings.",
      priority: "High",
      done: false,
    },
    {
      id: "storage-review",
      title: "Review storage capacity",
      detail:
        "Review aggregate usage and retention settings.",
      priority: "Normal",
      done: false,
    },
    {
      id: "backup-check",
      title: "Verify backup job status",
      detail:
        "Confirm job completion without opening backup contents.",
      priority: "Normal",
      done: true,
    },
  ],

  events: [
    {
      id: "e1",
      title: "Email service latency increased",
      detail:
        "Service response exceeded the configured threshold.",
      time: "Demo event",
      level: "Warning",
    },
    {
      id: "e2",
      title: "Scheduled backup job completed",
      detail:
        "Job status reported successfully.",
      time: "Demo event",
      level: "Success",
    },
    {
      id: "e3",
      title: "Application health check passed",
      detail:
        "The availability endpoint responded normally.",
      time: "Demo event",
      level: "Info",
    },
  ],
};

// =========================================================
// ICON PATHS
// =========================================================
const paths = {
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",
  support: "M3 14v-3a9 9 0 0 1 18 0v3 M3 12h4v7H3z M17 12h4v7h-4z M19 19v2h-7",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  plus: "M12 5v14 M5 12h14",
  search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  key: "M14 7a5 5 0 1 0 0 6l7-7-3-3-7 7",

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

// =========================================================
// ICON COMPONENT
// =========================================================
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

// =========================================================
// NAVIGATION
// =========================================================
const navigation = [
  { id: "overview", label: "Dashboard", icon: "dashboard" },
  { id: "access", label: "User Access", icon: "users" },
  { id: "support", label: "Technical Support", icon: "support" },
  { id: "maintenance", label: "System Maintenance", icon: "tools" },
  { id: "protection", label: "Data Protection", icon: "shield" },
  { id: "settings", label: "Settings", icon: "settings" },
];

// onNavigate(section) optionally connects sidebar items to your own routes.
// onAction(type, values) must resolve only after your server accepts an action.
// Supported types: account, reset, ticket, maintenance, backup.
// =========================================================
// ICT DASHBOARD
// =========================================================
export default function IctDashboard({
  snapshot,
  onRunDiagnostics,
  onLogout,
  onNavigate,
  onAction,
  logoSrc = "/logo.png",
}) {
  const navigate = useNavigate();

  const data = snapshot ?? DEMO;
  const demo = !snapshot;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const active = "overview";
  const [menu, setMenu] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const tasks = data.maintenance ?? [];
  const [filter, setFilter] = useState("All tickets");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [localTickets, setLocalTickets] = useState([]);
  const dialogRef = useRef(null);
  const actionTrigger = useRef(null);
  const submitting = useRef(false);
  const tickets = [...(demo ? localTickets : []), ...(data.tickets ?? [])];
  const openTickets = tickets.filter(t => t.status !== "Resolved");
  const visibleTickets = tickets.filter(t => (filter === "All tickets" || t.status === filter) &&
    [t.id, t.subject, t.requester].join(" ").toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!action) return;
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, [action]);

  function openAction(type) {
    const destinations={account:'access',reset:'access',maintenance:'maintenance',backup:'protection',settings:'settings'};if(onNavigate&&destinations[type]){onNavigate(destinations[type]);return;}
    actionTrigger.current = document.activeElement;
    setMenu(null);
    setActionMessage("");
    setAction(type);
  }

  function closeAction() {
    if (submitting.current) return;
    setAction(null);
    actionTrigger.current?.focus();
  }

  async function submitAction(event) {
    event.preventDefault();
    if (submitting.current) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    submitting.current = true;
    setActionBusy(true);
    setActionMessage("");
    try {
      if (onAction) {
        const result = await onAction(action, values);
        setActionMessage(result?.message || "Request accepted. Refresh the connected data to see its latest status.");
      } else if (!demo) {
        setActionMessage("This action is not connected yet. Connect onAction to submit requests.");
      } else {
        if (action === "ticket") {
          setLocalTickets(previous => [{ id: "DEMO-" + Date.now(), subject: values.subject, requester: values.requester, category: values.category, priority: values.priority, status: "Open", time: "Just now" }, ...previous]);
        }
        setActionMessage(action === "ticket" ? "Demo ticket added to this dashboard. It will clear when the page reloads." : "Demo request previewed. No account, schedule, or backup was changed.");
      }
    } catch (error) {
      setActionMessage(error?.message || "The request could not be completed. Please try again.");
    } finally {
      submitting.current = false;
      setActionBusy(false);
    }
  }

  const sidebarRef = useRef(null);
  const openButtonRef = useRef(null);
  const topbarRef = useRef(null);
  const previousMenuTrigger = useRef(null);


  // =========================================================
  // MOBILE SIDEBAR
  // =========================================================
  useEffect(() => {
    if (!sidebarOpen) return;

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    sidebarRef.current
      ?.querySelector("button")
      ?.focus();

    return () => {
      document.body.style.overflow = previous;
    };
  }, [sidebarOpen]);

  // =========================================================
  // MENU / ESCAPE HANDLING
  // =========================================================
  useEffect(() => {
    function dismiss(event) {
      if (
        !topbarRef.current?.contains(event.target)
      ) {
        setMenu(null);
      }
    }

    function escape(event) {
      if (event.key !== "Escape" || dialogRef.current?.open) return;

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
    const desktop = window.matchMedia(
      "(min-width: 1025px)"
    );

    const close = () => {
      if (desktop.matches) {
        setSidebarOpen(false);
      }
    };

    desktop.addEventListener(
      "change",
      close
    );

    return () => {
      desktop.removeEventListener(
        "change",
        close
      );
    };
  }, []);

  // =========================================================
  // NAVIGATION JUMP
  // =========================================================
  // Keep the same navigation UI; detailed work now opens its own page.
  function jump(id) {
    setSidebarOpen(false);
    setMenu(null);
    const section = ({ health: "maintenance", infrastructure: "protection", security: "access", activity: "activity" })[id] || id;
    if (onNavigate) { onNavigate(section); return; }
    if (section === "settings") { openAction("settings"); return; }
    const target = document.getElementById("ict-" + section);
    target?.scrollIntoView({ block: "start", behavior: "smooth" });
    target?.focus({ preventScroll: true });
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
      sidebarRef.current.querySelectorAll(
        "button:not(:disabled)"
      );

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

  // =========================================================
  // RUN DIAGNOSTICS
  // =========================================================
  async function runDiagnostics() {
    if (busy) return;
    setBusy(true);

    try {
      if (!onRunDiagnostics) {
        setNotice(
          demo ? "Demo diagnostics preview completed. No live system check was performed." : "Connect the diagnostics service to run a live check."
        );
      } else {
        const result =
          await onRunDiagnostics();

        setNotice(
          result?.message ||
            "Diagnostics completed."
        );
      }
    } catch {
      setNotice(
        "Diagnostics could not complete. Try again or check the service connection."
      );
    } finally {
      setBusy(false);
    }
  }

  // =========================================================
  // LOGOUT
  // =========================================================
  async function logout() {
    try {
      if (!onLogout && !demo) {
        setNotice(
          "Connect the sign-out handler to end your server session."
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

  // =========================================================
  // CALCULATED VALUES
  // =========================================================
  const services = data.services ?? [];
  const issues =
    services.filter(
      (service) =>
        service.status !== "Operational"
    ).length;

  const storagePercent =
    data.storageTotalGB > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (data.storageUsedGB /
              data.storageTotalGB) *
              100
          )
        )
      : 0;


  const taskCount =
    tasks.filter(
      (task) => !task.done
    ).length;

  const operational = services.length - issues;
  const availability = services.length ? Math.round(operational / services.length * 100) : 0;
  const storageAvailable = Number.isFinite(data.storageUsedGB) && Number.isFinite(data.storageTotalGB) && data.storageTotalGB > 0;
  const recentEvents = (data.events ?? []).slice(0, 3);
  const attention = [
    ...services.filter((service) => service.status !== "Operational").map((service) => ({ id: "service-" + service.id, title: service.name, detail: service.detail || "Review the latest service status.", label: service.status, icon: "pulse", route: "health" })),
    ...tasks.filter((task) => !task.done && task.priority === "High").map((task) => ({ id: "task-" + task.id, title: task.title, detail: task.detail, label: "High priority", icon: "tools", route: "maintenance" })),
  ];
  const quickActions = [
    { id: "account", title: "Create account", detail: "Prepare a user access request", icon: "users" },
    { id: "reset", title: "Reset password", detail: "Request a secure reset link", icon: "key" },
    { id: "ticket", title: "New support ticket", detail: "Log an issue for follow-up", icon: "support" },
    { id: "maintenance", title: "Schedule maintenance", detail: "Plan a service window", icon: "tools" },
    { id: "backup", title: "Request backup", detail: "Protect the latest system data", icon: "shield" },
  ];

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="ict-dashboard">

      {/* SKIP LINK */}
      <a
        className="ict-skip"
        href="#ict-overview"
      >
        Skip to dashboard
      </a>

      {/* SIDEBAR OVERLAY */}
      <button
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

      {/* =====================================================
          SIDEBAR
      ===================================================== */}
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
            <span>PMRMIS–SOUTH</span>
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
                      ? "location"
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

      {/* =====================================================
          MAIN SHELL
      ===================================================== */}
      <div
        className="principal-shell"
        inert={
          sidebarOpen
            ? true
            : undefined
        }
      >

        {/* ===================================================
            TOP BAR
        =================================================== */}
        <header
          ref={topbarRef}
          className="principal-topbar"
        >

          <div className="principal-top-left">

            {/* MOBILE MENU */}
            <button
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
                President Manuel Roxas Memorial Integrated School – South
              </strong>

              <span>
                Digital Credentials Management System
              </span>

            </div>

          </div>

          {/* TOP RIGHT */}
          <div className="principal-top-right">

            {/* SYSTEM NOTIFICATIONS */}
            <div className="principal-notification-wrapper">

              <button
                className="principal-bell"
                aria-label={`System alerts: ${issues}`}
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
                  aria-label="System alerts"
                >

                  <h3>
                    System alerts
                  </h3>

                  <p>
                    {issues
                      ? `${issues} service requires attention.`
                      : "All reported services are operational."}
                  </p>

                  <button
                    className="ict-text-button"
                    onClick={() =>
                      jump("health")
                    }
                  >
                    View system health

                    <Icon name="chevron" />
                  </button>

                </section>
              )}

            </div>

            {/* ACCOUNT */}
            <div className="principal-profile-wrapper">

              <button
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
                    Technical operations workspace
                  </p>

                  <button
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

        {/* ===================================================
            MAIN CONTENT
        =================================================== */}
        <main className="principal-content ict-overview" id="ict-overview" tabIndex={-1}>
          <section className="ov-heading">
            <div><div className="ov-eyebrow">ICT WORKSPACE <span>/</span> OVERVIEW</div><h1>Dashboard</h1><p>Your school’s digital operations, at a glance.</p></div>
            <button type="button" className="ov-primary" onClick={() => openAction("quick")}><Icon name="plus" />Quick actions</button>
          </section>
          <div role="status" aria-live="polite" className={notice ? "ov-notice" : "ict-sr-only"}>{notice}</div>

          <section className="ov-intro" aria-label="Operations overview">
            <div className="ov-intro-copy"><span className="ov-pill"><span aria-hidden="true" />ICT PERSONNEL</span><h2>School operations,<br /> in one view.</h2><p>Manage user access, resolve support issues, and keep CredTrack reliable and protected.</p><div className="ov-intro-foot"><Icon name="shield" width="16" height="16" /><span>Technical operations & account management</span></div></div>
            <div className="ov-readiness"><div className="ov-readiness-head"><span>SERVICE AVAILABILITY</span><span className={`ov-status ${issues ? "attention" : ""}`}>{!services.length ? "No data" : issues ? "Needs attention" : "Operational"}</span></div><div className="ov-readiness-body"><div className="ov-ring" style={{ "--availability": availability + "%" }} role="img" aria-label={`${operational} of ${services.length} services operational`}><div><strong>{services.length ? availability + "%" : "—"}</strong><span>operational</span></div></div><div><strong className="ov-service-count">{operational}<span> / {services.length}</span></strong><p>services operational</p><button className="ov-text-link" onClick={() => jump("health")}>View system health <Icon name="chevron" width="14" height="14" /></button></div></div><p className="ov-readiness-note">{demo ? "Sample readings · not a live monitoring feed" : data.updatedAt ? `Last reported: ${data.updatedAt}` : "No update timestamp reported"}</p></div>
          </section>

          <section className="ov-metrics" aria-label="Key operational metrics">
            {[
              { label: "Active users", value: data.activeUsers ?? "—", detail: `${data.pendingAccess ?? "—"} pending access requests`, icon: "users", target: "access" },
              { label: "Open support tickets", value: openTickets.length, detail: `${openTickets.filter(t => t.priority === "High").length} high priority`, icon: "support", target: "support" },
              { label: "Open maintenance", value: taskCount, detail: "Tasks awaiting completion", icon: "tools", target: "maintenance" },
              { label: "Latest backup", value: data.backupStatus || "—", detail: data.lastBackup || "No backup reported", icon: "shield", target: "protection" },
            ].map((metric) => <button type="button" className="ov-metric" key={metric.label} onClick={() => jump(metric.target)}><div className="ov-metric-head"><span>{metric.label}</span><span className="ov-icon"><Icon name={metric.icon} /></span></div><strong>{metric.value}</strong><div className="ov-metric-foot"><span>{metric.detail}</span><Icon name="chevron" width="13" height="13" /></div></button>)}
          </section>

          <section className="ov-section" aria-labelledby="ov-quick-title"><div className="ov-section-heading"><div><h2 id="ov-quick-title">Quick actions</h2><p>Everyday tasks, a little closer.</p></div><span className="ov-small-label">YOUR TOOLS</span></div><div className="ov-actions">{quickActions.map((action) => <button type="button" className="ov-action" key={action.id} onClick={() => openAction(action.id)}><div className="ov-action-top"><span className="ov-action-icon"><Icon name={action.icon} width="22" height="22" /></span><span className="ov-action-arrow" aria-hidden="true">↗</span></div><strong>{action.title}</strong><span>{action.detail}</span></button>)}</div></section>

                    <section className="ov-panel ix-support" id="ict-support" tabIndex={-1} aria-labelledby="support-title">
            <div className="ov-panel-heading"><div><h2 id="support-title">Technical support</h2><p className="ix-subtitle">A clear view of the issues waiting for you.</p></div><button className="ov-text-link" onClick={() => openAction("ticket")}><Icon name="plus" width="16" /> New ticket</button></div>
            <div className="ix-toolbar"><div className="ix-filters" aria-label="Filter support tickets">{["All tickets", "Open", "In progress", "Resolved"].map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value}</button>)}</div><label className="ix-search"><Icon name="search" width="16" /><span className="ict-sr-only">Search tickets</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tickets…" type="search" /></label></div>
            <div className="ix-table-wrap"><table className="ix-table"><caption className="ict-sr-only">Support ticket overview</caption><thead><tr><th scope="col">Ticket / issue</th><th scope="col">Requested by</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Received</th></tr></thead><tbody>{visibleTickets.map(ticket => <tr key={ticket.id}><td><strong>{ticket.subject}</strong><small>{ticket.id} · {ticket.category}</small></td><td>{ticket.requester}</td><td><span className={`ix-badge ${ticket.priority === "High" ? "red" : "neutral"}`}>{ticket.priority}</span></td><td><span className={`ix-badge ${ticket.status === "Resolved" ? "green" : ticket.status === "Open" ? "amber" : "blue"}`}>{ticket.status}</span></td><td className="ix-time">{ticket.time}</td></tr>)}</tbody></table>{!visibleTickets.length && <div className="ov-empty"><Icon name="support" /><strong>No matching tickets</strong><p>Try another search or create a new support ticket.</p></div>}</div>
            <div className="ov-panel-footer"><span>{visibleTickets.length} ticket{visibleTickets.length !== 1 ? "s" : ""} shown</span><span>{demo ? "Sample support queue" : "Current support snapshot"}</span></div>
          </section>

          <div className="ix-operations-grid">
            <section className="ov-panel" id="ict-access" tabIndex={-1} aria-labelledby="access-title"><div className="ov-panel-heading"><h2 id="access-title">User access</h2><span className="ov-icon"><Icon name="users" /></span></div><div className="ix-panel-body"><div className="ix-summary"><strong>{data.pendingAccess ?? "—"}</strong><div>pending requests<small>Accounts and role changes</small></div></div><div className="ix-request-list">{(data.accessRequests ?? []).slice(0, 2).map(request => <div className="ix-request" key={request.id}><span className="ix-avatar" aria-hidden="true">{request.name.split(" ").map(n => n[0]).slice(0,2).join("")}</span><div><strong>{request.name}</strong><small>{request.detail}</small></div></div>)}{!data.accessRequests?.length && <p className="ix-subtitle">No access requests reported.</p>}</div><p className="ix-hint">Assign roles according to approved access requests.</p></div><div className="ov-panel-footer"><button className="ov-text-link" onClick={() => openAction("account")}>Create account request <Icon name="chevron" width="13" /></button><button className="ov-text-link" onClick={() => openAction("reset")}>Reset password</button></div></section>

            <section className="ov-panel" id="ict-maintenance" tabIndex={-1} aria-labelledby="maintenance-title"><div className="ov-panel-heading"><h2 id="maintenance-title">System maintenance</h2><span className="ov-icon"><Icon name="tools" /></span></div><div className="ix-panel-body"><div className="ix-service-strip"><span className={`ix-badge ${issues ? "amber" : "green"}`}>{services.length ? `${operational}/${services.length} services operational` : "No service data"}</span><span className="ix-subtitle">Uptime {data.uptime || "—"}</span></div>{tasks.slice(0,3).map(task => <div className="ix-task" key={task.id}><span className={`ix-task-dot ${task.done ? "done" : ""}`} aria-hidden="true"><Icon name={task.done ? "check" : "clock"} width="14" height="14" /></span><div><strong>{task.title}</strong><small>{task.done ? "Completed" : `${task.priority || "Normal"} priority · Pending`}</small></div></div>)}{!tasks.length && <p className="ix-subtitle">No maintenance tasks reported.</p>}</div><div className="ov-panel-footer"><button className="ov-text-link" onClick={() => openAction("maintenance")}>Schedule maintenance</button><button className="ov-text-link" onClick={runDiagnostics} disabled={busy}><Icon name="refresh" width="13" />{busy ? "Checking…" : "Run diagnostics"}</button></div></section>

            <section className="ov-panel" id="ict-protection" tabIndex={-1} aria-labelledby="protection-title"><div className="ov-panel-heading"><h2 id="protection-title">Data protection</h2><span className="ov-icon"><Icon name="shield" /></span></div><div className="ix-panel-body"><div className="ix-backup"><span className="ix-backup-icon"><Icon name="shield" width="25" height="25" /></span><div><strong>{data.backupStatus ? `Backup: ${data.backupStatus}` : "Backup status unavailable"}</strong><small>{data.lastBackup || "No backup reported"}</small></div></div><div className="ix-storage-heading"><span>Storage usage</span><strong>{storageAvailable ? `${Math.round(storagePercent)}%` : "—"}</strong></div><div className="ix-progress" role="progressbar" aria-label="Storage used" aria-valuenow={storageAvailable ? Math.round(storagePercent) : undefined} aria-valuemin={0} aria-valuemax={100}><span style={{ width: storageAvailable ? storagePercent + "%" : "0%" }} /></div><p className="ix-subtitle">{storageAvailable ? `${data.storageUsedGB} GB used of ${data.storageTotalGB} GB` : "No storage reading"}</p><div className="ix-next"><Icon name="clock" width="15" /><span>Next backup<strong>{data.nextBackup || "Not reported"}</strong></span></div></div><div className="ov-panel-footer"><span>Backup & recovery</span><button className="ov-text-link" onClick={() => openAction("backup")}>Request backup <Icon name="chevron" width="13" /></button></div></section>
          </div>

          <div className="ov-lower-grid">
            <section className="ov-panel" aria-labelledby="ov-attention-title"><div className="ov-panel-heading"><h2 id="ov-attention-title">Needs attention</h2><span className="ov-count">{attention.length} items</span></div><div className="ov-attention-list">{attention.slice(0,3).map((item) => <button type="button" className="ov-attention-item" key={item.id} onClick={() => jump(item.route)}><span className="ov-warning-icon"><Icon name={item.icon} width="18" height="18" /></span><span className="ov-item-copy"><span className="ov-item-label">{item.label}</span><strong>{item.title}</strong><span>{item.detail}</span></span><Icon name="chevron" width="15" height="15" /></button>)}{!attention.length && <div className="ov-empty"><Icon name="check" /><strong>{services.length || tasks.length ? "Nothing urgent reported" : "No operational data reported"}</strong><p>{services.length || tasks.length ? "No service alerts or high-priority tasks in the current snapshot." : "Connect your services to display an operations overview."}</p></div>}</div><div className="ov-panel-footer"><span>{attention.length > 3 ? `Showing 3 of ${attention.length} priority items` : "Service alerts and high-priority tasks"}</span><button className="ov-text-link" onClick={() => jump("maintenance")}>Open maintenance <Icon name="chevron" width="13" height="13" /></button></div></section>
            <section className="ov-panel" id="ict-activity" tabIndex={-1} aria-labelledby="ov-recent-title"><div className="ov-panel-heading"><h2 id="ov-recent-title">Recent activity</h2><span className="ov-small-label">LATEST EVENTS</span></div><ol className="ov-timeline">{recentEvents.map((event) => <li key={event.id}><span className={`ov-event-dot ${event.level === "Warning" ? "warning" : event.level === "Success" ? "success" : event.level === "Error" ? "error" : ""}`} aria-hidden="true" /><div><div className="ov-event-heading"><strong>{event.title}</strong><span>{event.level || "Info"}</span></div><p>{event.detail}</p><small>{event.time || "Time not reported"}</small></div></li>)}</ol>{!recentEvents.length && <div className="ov-empty"><Icon name="clock" /><strong>No recent activity</strong><p>Reported technical events will appear here.</p></div>}<div className="ov-panel-footer"><span>Latest {recentEvents.length} reported events</span><span>Account, support & system events</span></div></section>
          </div>
          <footer className="ov-footer"><span>CredTrack <span aria-hidden="true">·</span> ICT Operations</span><span>{demo ? "Demo workspace · sample data" : "Operations overview"}</span></footer>
        </main>
        {action && <dialog ref={dialogRef} className="ix-modal" aria-labelledby="ix-modal-title" aria-describedby="ix-modal-description" onCancel={event => { event.preventDefault(); closeAction(); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeAction(); } }}>
          <div className="ix-modal-heading"><span className="ov-action-icon"><Icon name={quickActions.find(item => item.id === action)?.icon || "settings"} /></span><button type="button" className="ix-close" aria-label="Close quick actions" onClick={closeAction} disabled={actionBusy}><Icon name="close" /></button></div>
          <h2 id="ix-modal-title">{action === "quick" ? "What would you like to do?" : action === "settings" ? "Workspace settings" : quickActions.find(item => item.id === action)?.title}</h2>
          <p id="ix-modal-description">{action === "quick" ? "Choose a task to get started." : action === "settings" ? "Your ICT workspace connection details." : "Complete the details below to prepare your request."}</p>
          {action === "quick" ? <div className="ix-modal-actions">{quickActions.map(item => <button key={item.id} onClick={() => { setActionMessage(""); openAction(item.id); }}><span className="ov-action-icon"><Icon name={item.icon} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="chevron" width="16" /></button>)}</div> : action === "settings" ? <div className="ix-settings"><dl><div><dt>Workspace</dt><dd>ICT Personnel</dd></div><div><dt>Data source</dt><dd>{demo ? "Demo snapshot" : "Connected snapshot"}</dd></div><div><dt>Actions</dt><dd>{onAction ? "Handler connected" : "Preview only"}</dd></div></dl><p>Account preferences and notification settings will be available when the Settings page is connected.</p><button className="ov-primary" onClick={closeAction}>Done</button></div> : <form key={action} onSubmit={submitAction}>
            <fieldset disabled={actionBusy} className="ix-fields">
              {action === "account" && <><label>Full name<input name="name" required maxLength={100} autoComplete="name" placeholder="Enter the user’s full name" /></label><label>School email<input name="email" type="email" required autoComplete="email" placeholder="name@school.edu.ph" /></label><label>Requested role<select name="role" defaultValue="" required><option value="" disabled>Select an approved role</option><option>Teacher</option><option>Principal</option><option>Administrator</option><option>ICT Personnel</option></select></label><label>Approval reference<input name="approvalReference" required maxLength={160} placeholder="Approved request ID or reference" /></label><p className="ix-hint">Your server should verify the approval before granting access.</p></>}
              {action === "reset" && <><label>Account email<input name="email" type="email" required autoComplete="email" placeholder="name@school.edu.ph" /></label><label>Support reference<input name="reference" required maxLength={160} placeholder="Related ticket or verified request" /></label><p className="ix-hint">Request a secure reset link. Do not enter or share the user’s password.</p></>}
              {action === "ticket" && <><div className="ix-form-grid"><label>Requested by<input name="requester" required maxLength={100} placeholder="Full name" /></label><label>Priority<select name="priority" defaultValue="Normal"><option>Normal</option><option>High</option><option>Low</option></select></label></div><label>Issue title<input name="subject" required maxLength={160} placeholder="Briefly describe the issue" /></label><label>Category<select name="category"><option>Account access</option><option>Upload issue</option><option>System error</option><option>Other</option></select></label><label>Description<textarea name="description" required maxLength={2000} rows={3} placeholder="What happened? Include steps to reproduce the issue." /></label></>}
              {action === "maintenance" && <><label>Maintenance task<input name="title" required maxLength={160} placeholder="e.g. Application update" /></label><div className="ix-form-grid"><label>Start time (local)<input name="startsAt" type="datetime-local" required /></label><label>Duration (minutes)<input name="durationMinutes" type="number" defaultValue={30} min={5} max={1440} required /></label></div><label>Expected impact<select name="impact"><option>No downtime expected</option><option>Brief service interruption</option><option>System unavailable</option></select></label><label>Notes<textarea name="notes" rows={3} maxLength={2000} placeholder="Scope and planned work" /></label></>}
              {action === "backup" && <><div className="ix-backup-note"><Icon name="shield" /><div><strong>Request a system backup</strong><p>The server will use your configured backup destination and retention policy.</p></div></div><label>Reason<textarea name="reason" rows={3} required maxLength={500} placeholder="e.g. Before scheduled system maintenance" /></label></>}
            </fieldset>
            <div className="ix-mode-note">{onAction ? "Requests will be sent to your connected service." : demo ? "Demo mode · No live system changes will be made." : "Preview only · Action service is not connected."}</div>
            <p role="status" aria-live="polite" className={actionMessage ? "ix-result" : "ict-sr-only"}>{actionMessage}</p>
            <div className="ix-modal-footer"><button type="button" className="ix-secondary" onClick={closeAction} disabled={actionBusy}>Close</button><button type="submit" className="ov-primary" disabled={actionBusy}>{actionBusy ? "Submitting…" : onAction ? "Submit request" : action === "ticket" && demo ? "Add demo ticket" : "Preview request"}</button></div>
          </form>}
        </dialog>}

      </div>
    </div>
  );
}

