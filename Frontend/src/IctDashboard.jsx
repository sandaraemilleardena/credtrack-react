import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./IctDashboard.css";
import IctQuickTools from "./components/IctQuickTools";

const ictQuickActions = [
  { id: 'create', title: 'Create staff account', detail: 'Set a role and initial password', icon: 'users' },
  { id: 'access', title: 'Unlock account', detail: 'Restore access after a login lock', icon: 'key' },
  { id: 'support', title: 'Resolve support ticket', detail: 'Update status and add a work note', icon: 'support' },
  { id: 'maintenance', title: 'Schedule maintenance', detail: 'Plan a service window', icon: 'tools' },
  { id: 'health', title: 'Run diagnostics', detail: 'Check current service connectivity', icon: 'pulse' },
  { id: 'protection', title: 'Review protection', detail: 'Check recovery and security status', icon: 'shield' },
];

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

// Register these paths in your existing React Router. Override through routes or onNavigate.
const DEFAULT_ROUTES = {
  overview: "/ict-dashboard",
  access: "/ict-user-access",
  support: "/ict-technical-support",
  maintenance: "/ict-system-maintenance",
  protection: "/ict-data-protection",
  settings: "/ict-settings",
};

// =========================================================
// ICT DASHBOARD
// =========================================================
export default function IctDashboard({
  snapshot,
  onAction,
  onLogout,
  onNavigate,
  routes = {},
  logoSrc = "/logo.png",
}) {
  const navigate = useNavigate();

  const data = snapshot ?? DEMO;
  const demo = !snapshot;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const active = "overview";
  const [menu, setMenu] = useState(null);
  const [notice, setNotice] = useState("");
  const tasks = data.maintenance ?? [];
  const [action, setAction] = useState(null);
  const dialogRef = useRef(null);
  const actionTrigger = useRef(null);
  const lockedAccounts = (data.accounts ?? []).filter(account => /locked/i.test(account.status));
  const openTickets = (data.tickets ?? []).filter(ticket => !["Resolved", "Closed"].includes(ticket.status));

  useEffect(() => {
    if (!action) return;
    const dialog = dialogRef.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, [action]);

  function openAction(type = "quick") {
    if (!action) actionTrigger.current = document.activeElement;
    setMenu(null);
    setAction(type);
  }

  function closeAction() {
    setAction(null);
    requestAnimationFrame(() => actionTrigger.current?.focus());
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
  function jump(id, requestedAction) {
    const section = ({ health: "maintenance", infrastructure: "protection", security: "access" })[id] || id;
    setSidebarOpen(false);
    setMenu(null);
    setAction(null);
    if (onNavigate) { onNavigate(section, requestedAction); return; }
    const path = routes[section] || DEFAULT_ROUTES[section];
    if (path) navigate(path, { state: requestedAction ? { action: requestedAction } : null });
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
  // SIGN OUT
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

  const taskCount =
    tasks.filter(
      (task) => !task.done && !["Completed", "Cancelled"].includes(task.status)
    ).length;

  const operational = services.length - issues;
  const availability = services.length ? Math.round(operational / services.length * 100) : 0;
  const recentEvents = (data.events ?? []).slice(0, 3);
  const attention = [
    ...(data.backupConfigured === false ? [{id: 'backup-setup', title: 'Verify backup and recovery setup', detail: 'No configured backup is reported for this deployment.', label: 'Recovery readiness', icon: 'shield', route: 'protection'}] : []),
    ...lockedAccounts.map(account => ({id: 'lock-' + account.id, title: account.name, detail: account.status + ' · ' + account.username, label: 'Account locked', icon: 'key', route: 'access'})),
    ...openTickets.filter(ticket => ticket.priority === 'High').map(ticket => ({id: 'ticket-' + ticket.id, title: ticket.subject, detail: ticket.requester + ' · ' + ticket.status, label: 'Urgent support', icon: 'support', route: 'support'})),
    ...services.filter((service) => service.status !== "Operational").map((service) => ({ id: "service-" + service.id, title: service.name, detail: service.detail || "Review the latest service status.", label: service.status, icon: "pulse", route: "health" })),
    ...tasks.filter((task) => !task.done && !["Completed", "Cancelled"].includes(task.status) && task.priority === "High").map((task) => ({ id: "task-" + task.id, title: task.title, detail: task.detail, label: "High priority", icon: "tools", route: "maintenance" })),
  ];
  const quickActions = ictQuickActions;

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
                    ICT PERSONNEL
                  </strong>

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
            <div><div className="ov-eyebrow">ICT WORKSPACE <span>/</span> OVERVIEW</div><h1>Dashboard</h1><p>Account access, support incidents, and system reliability.</p></div>
            <button type="button" className="ov-primary" onClick={() => openAction("quick")}><Icon name="plus" />Quick actions</button>
          </section>
          <div role="status" aria-live="polite" className={notice ? "ov-notice" : "ict-sr-only"}>{notice}</div>

          <section className="ov-intro" aria-label="Operations overview">
            <div className="ov-intro-copy"><span className="ov-pill"><span aria-hidden="true" />ICT PERSONNEL</span><h2>Keep CredTrack<br /> running securely.</h2><p>Manage user access, resolve support issues, and keep CredTrack reliable and protected.</p><div className="ov-intro-foot"><Icon name="shield" width="16" height="16" /><span>Technical operations & account management</span></div></div>
            <div className="ov-readiness"><div className="ov-readiness-head"><span>SERVICE CHECKS</span><span className={`ov-status ${issues ? "attention" : ""}`}>{!services.length ? "No data" : issues ? "Needs attention" : "Operational"}</span></div><div className="ov-readiness-body"><div className="ov-ring" style={{ "--availability": availability + "%" }} role="img" aria-label={`${operational} of ${services.length} checks operational`}><div><strong>{services.length ? availability + "%" : "—"}</strong><span>operational</span></div></div><div><strong className="ov-service-count">{operational}<span> / {services.length}</span></strong><p>checks operational</p><button className="ov-text-link" onClick={() => openAction("health")}>View system health <Icon name="chevron" width="14" height="14" /></button></div></div><p className="ov-readiness-note">{demo ? "Sample readings · not a live monitoring feed" : data.updatedAt ? `Last reported: ${data.updatedAt}` : "No update timestamp reported"}</p></div>
          </section>

          <section className="ov-metrics" aria-label="Key operational metrics">
            {[
              { label: "Locked accounts", value: lockedAccounts.length, detail: `${data.activeUsers ?? "—"} active accounts · review access`, icon: "key", target: "access" },
              { label: "Open support tickets", value: openTickets.length, detail: `${openTickets.filter(t => t.priority === "High").length} high priority`, icon: "support", target: "support" },
              { label: "Open maintenance", value: taskCount, detail: "Tasks awaiting completion", icon: "tools", target: "maintenance" },
              { label: "Latest backup", value: data.backupStatus || "—", detail: data.lastBackup || "No backup reported", icon: "shield", target: "protection" },
            ].map((metric) => <button type="button" className="ov-metric" key={metric.label} onClick={() => openAction(metric.target)}><div className="ov-metric-head"><span>{metric.label}</span><span className="ov-icon"><Icon name={metric.icon} /></span></div><strong>{metric.value}</strong><div className="ov-metric-foot"><span>{metric.detail}</span><Icon name="chevron" width="13" height="13" /></div></button>)}
          </section>

          <section className="ov-section" aria-labelledby="ov-quick-title"><div className="ov-section-heading"><div><h2 id="ov-quick-title">Quick actions</h2><p>Complete routine ICT tasks without leaving your dashboard.</p></div><span className="ov-small-label">YOUR TOOLS</span></div><div className="ov-actions">{quickActions.map((action) => <button type="button" className="ov-action" key={action.id} onClick={() => openAction(action.id)}><div className="ov-action-top"><span className="ov-action-icon"><Icon name={action.icon} width="22" height="22" /></span><span className="ov-action-arrow" aria-hidden="true">+</span></div><strong>{action.title}</strong><span>{action.detail}</span></button>)}</div></section>

                    <div className="ov-lower-grid">
            <section className="ov-panel" aria-labelledby="ov-attention-title"><div className="ov-panel-heading"><h2 id="ov-attention-title">Needs attention</h2><span className="ov-count">{attention.length} items</span></div><div className="ov-attention-list">{attention.slice(0,3).map((item) => <button type="button" className="ov-attention-item" key={item.id} onClick={() => openAction(item.route)}><span className="ov-warning-icon"><Icon name={item.icon} width="18" height="18" /></span><span className="ov-item-copy"><span className="ov-item-label">{item.label}</span><strong>{item.title}</strong><span>{item.detail}</span></span><Icon name="chevron" width="15" height="15" /></button>)}{!attention.length && <div className="ov-empty"><Icon name="check" /><strong>{services.length || tasks.length ? "Nothing urgent reported" : "No operational data reported"}</strong><p>{services.length || tasks.length ? "No service alerts or high-priority tasks in the current snapshot." : "Connect your services to display an operations overview."}</p></div>}</div><div className="ov-panel-footer"><span>{attention.length > 3 ? `Showing 3 of ${attention.length} priority items` : "Service alerts and high-priority tasks"}</span><button className="ov-text-link" onClick={() => openAction("maintenance")}>Schedule maintenance <Icon name="chevron" width="13" height="13" /></button></div></section>
            <section className="ov-panel" id="ict-activity" tabIndex={-1} aria-labelledby="ov-recent-title"><div className="ov-panel-heading"><h2 id="ov-recent-title">Recent activity</h2><span className="ov-small-label">LATEST EVENTS</span></div><ol className="ov-timeline">{recentEvents.map((event) => <li key={event.id}><span className={`ov-event-dot ${event.level === "Warning" ? "warning" : event.level === "Success" ? "success" : event.level === "Error" ? "error" : ""}`} aria-hidden="true" /><div><div className="ov-event-heading"><strong>{event.title}</strong><span>{event.level || "Info"}</span></div><p>{event.detail}</p><small>{event.time || "Time not reported"}</small></div></li>)}</ol>{!recentEvents.length && <div className="ov-empty"><Icon name="clock" /><strong>No recent activity</strong><p>Reported technical events will appear here.</p></div>}<div className="ov-panel-footer"><span>Latest {recentEvents.length} reported events</span><span>Account, support & system events</span></div></section>
          </div>
          <div className="ov-lower-grid ix-work-queues">
            <section className="ov-panel" aria-labelledby="ict-ticket-queue"><div className="ov-panel-heading"><h2 id="ict-ticket-queue">Support queue</h2><span className="ov-count">{openTickets.length} open</span></div><div className="ix-panel-body">{openTickets.slice(0, 4).map(ticket => <button className="ix-queue-row" key={ticket.id} onClick={() => openAction('support')}><span><strong>{ticket.subject}</strong><small>{ticket.requester} · {ticket.status}</small></span><span className="ov-item-label">{ticket.priority}</span></button>)}{!openTickets.length && <p>No support tickets need action.</p>}</div></section>
            <section className="ov-panel" aria-labelledby="ict-maintenance-queue"><div className="ov-panel-heading"><h2 id="ict-maintenance-queue">Maintenance schedule</h2><span className="ov-count">{taskCount} outstanding</span></div><div className="ix-panel-body">{tasks.filter(task => !task.done && !['Completed', 'Cancelled'].includes(task.status)).slice(0, 4).map(task => <div className="ix-task" key={task.id}><span className="ix-task-dot"><Icon name="tools" width="15" /></span><div><strong>{task.title}</strong><small>{task.service || 'Service not specified'} · {task.status || 'Pending'}</small><small>{task.startsAt ? new Date(task.startsAt).toLocaleString() : task.detail}</small></div></div>)}{!taskCount && <p>No outstanding maintenance tasks.</p>}<button className="ov-text-link" onClick={() => openAction('maintenance')}>Schedule a service window</button></div></section>
          </div>
          <footer className="ov-footer"><span>CredTrack <span aria-hidden="true">·</span> ICT Operations</span><span>{demo ? "Demo workspace · sample data" : "Operations overview"}</span></footer>
        </main>
        {action && (
          <dialog ref={dialogRef} className="ix-modal" aria-labelledby="quick-title" onCancel={event => { event.preventDefault(); closeAction(); }}>
            <div className="ix-modal-heading"><span className="ov-action-icon"><Icon name="plus" /></span><button className="ix-close" onClick={closeAction} aria-label="Close quick actions"><Icon name="close" /></button></div>
            <h2 id="quick-title">{action === 'quick' ? 'Quick actions' : quickActions.find(item => item.id === action)?.title}</h2>
            <p id="ix-modal-description">{action === 'quick' ? 'Choose a task to complete here.' : quickActions.find(item => item.id === action)?.detail}</p>
            {action === 'quick' ? <div className="ix-modal-actions">{quickActions.map(item => (
              <button key={item.id} onClick={() => openAction(item.id)}><span className="ov-action-icon"><Icon name={item.icon} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><Icon name="chevron" width="16" /></button>
            ))}</div> : <IctQuickTools key={action} action={action} data={data} onAction={onAction} onClose={closeAction} />}
          </dialog>
        )}

      </div>
    </div>
  );
}

