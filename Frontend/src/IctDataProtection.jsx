  function addAudit(
    previous,
    title,
    detail
  ) {
    return [
      {
        id: `au-${Date.now()}`,
        title,
        detail,
        createdAt: new Date().toISOString(),
      },
      ...(previous.audit ?? []),
    ];
  }

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./IctDataProtection.css";

// =========================================================
// ICON PATHS
// =========================================================
const paths = {
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 0 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",

  support:
    "M3 14v-3a9 9 0 0 1 18 0v3 M3 12h4v7H3z M17 12h4v7h-4z M19 19v2h-7",

  settings:
    "M4 7h16 M4 17h16 M8 4v6 M16 14v6",

  plus:
    "M12 5v14 M5 12h14",

  search:
    "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",

  dashboard:
    "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",

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

// =========================================================
// DEFAULT ROUTES
// =========================================================
const DEFAULT_ROUTES = {
  overview: "/ict-dashboard",
  access: "/ict-user-access",
  support: "/ict-technical-support",
  maintenance: "/ict-system-maintenance",
  protection: "/ict-data-protection",
  settings: "/ict-settings",
};

// =========================================================
// HELPERS
// =========================================================
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
  return (
    {
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
    }[value] || "neutral"
  );
}

// =========================================================
// DEMO DATA
// =========================================================
function protectionDemo() {
  const ago = (hours) =>
    new Date(
      Date.now() - hours * 3600000
    ).toISOString();

  return {
    storageGB: 34,
    totalGB: 100,

    policy: {
      frequency: "Daily",
      time: "23:00",
      retention: 30,
      destination: "School-managed backup storage",
    },

    controls: [
      {
        id: "at-rest",
        name: "Encryption at rest",
        detail: "Stored backup protection",
        status: "Enabled",
      },
      {
        id: "transit",
        name: "Encrypted transfer",
        detail: "Secure backup connections",
        status: "Enabled",
      },
      {
        id: "audit",
        name: "Audit logging",
        detail: "Record backup and recovery activity",
        status: "Enabled",
      },
    ],

    backupJobs: [
      {
        id: "BK-104",
        scope: "Full system",
        status: "Completed",
        createdAt: ago(10),
        size: "2.4 GB",
        integrity: "Verified",
        source: "Scheduled",
        details:
          "Scheduled backup job completed. Integrity verification recorded.",
      },
      {
        id: "BK-103",
        scope: "Database",
        status: "Completed",
        createdAt: ago(34),
        size: "820 MB",
        integrity: "Not verified",
        source: "Manual",
        details:
          "Manual backup completed. Integrity verification is pending.",
      },
      {
        id: "BK-102",
        scope: "Full system",
        status: "Failed",
        createdAt: ago(58),
        size: "—",
        integrity: "Unavailable",
        source: "Scheduled",
        details:
          "The destination connection timed out. Review connectivity before requesting a new backup.",
      },
      {
        id: "BK-101",
        scope: "Full system",
        status: "Completed",
        createdAt: ago(82),
        size: "2.3 GB",
        integrity: "Verified",
        source: "Scheduled",
        details:
          "Backup completed with no reported errors.",
      },
    ],

    audit: [
      {
        id: "au-1",
        title: "Backup integrity verified",
        detail: "BK-104 · Scheduled verification",
        createdAt: ago(9.8),
      },
      {
        id: "au-2",
        title: "Backup job completed",
        detail: "BK-104 · Full system",
        createdAt: ago(10),
      },
      {
        id: "au-3",
        title: "Backup connection failed",
        detail: "BK-102 · Destination timeout",
        createdAt: ago(58),
      },
    ],
  };
}

// =========================================================
// MAIN COMPONENT
// =========================================================
export default function IctDataProtection({
  snapshot,
  onAction,
  onLogout,
  onNavigate,
  routes = {},
  logoSrc = "/logo.png",
}) {
  const navigate = useNavigate();

  const active = "protection";
  const demo = snapshot == null;

  const [localData, setLocalData] = useState(
    protectionDemo
  );

  const data = demo ? localData : snapshot;

  const jobs = data?.backupJobs ?? [];
  const controls = data?.controls ?? [];
  const policy = data?.policy ?? {};

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All backups");
  const [selectedId, setSelectedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const selectedJob = jobs.find(
    (job) => job.id === selectedId
  );

  const visibleJobs = jobs
    .filter((job) => {
      const matchesFilter =
        filter === "All backups" ||
        job.status === filter;

      const searchText = [
        job.id,
        job.scope,
        job.source,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchText.includes(
        query.trim().toLowerCase()
      );

      return matchesFilter && matchesSearch;
    })
    .sort(
      (a, b) =>
        (Date.parse(b.createdAt) || 0) -
        (Date.parse(a.createdAt) || 0)
    );

  const completed = jobs.filter(
    (job) => job.status === "Completed"
  );

  const latest = [...completed].sort(
    (a, b) =>
      (Date.parse(b.createdAt) || 0) -
      (Date.parse(a.createdAt) || 0)
  )[0];

  const failedCount = jobs.filter(
    (job) => job.status === "Failed"
  ).length;

  const unverified = completed.filter(
    (job) => job.integrity !== "Verified"
  ).length;

  const issues = failedCount + unverified;

  const storageKnown =
    Number.isFinite(data?.storageGB) &&
    Number.isFinite(data?.totalGB) &&
    data.totalGB > 0 &&
    data.storageGB >= 0;

  const storagePercent = storageKnown
    ? Math.min(
        100,
        Math.round(
          (data.storageGB / data.totalGB) * 100
        )
      )
    : 0;

  const canAct = demo || Boolean(onAction);

  // =========================================================
  // DIALOG
  // =========================================================
  useEffect(() => {
    if (!action) return;

    const dialog = dialogRef.current;

    if (!dialog) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }

      document.body.style.overflow =
        previousOverflow;

      if (triggerRef.current?.isConnected) {
        triggerRef.current.focus();
      }
    };
  }, [action]);

  // =========================================================
  // ACTION MODAL
  // =========================================================
  function openAction(value) {
    triggerRef.current = document.activeElement;

    setMenu(null);
    setError("");
    setAction(value);
  }

  function closeAction() {
    if (!submitting.current) {
      setAction(null);
      setError("");
    }
  }

  // =========================================================
  // ACTION EXECUTION
  // =========================================================
  async function perform(
    type,
    payload,
    demoMutation,
    message
  ) {
    if (submitting.current || !canAct) {
      return false;
    }

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      if (demo) {
        demoMutation?.();
      } else if (onAction) {
        await onAction(type, payload);
      } else {
        throw new Error(
          "This action is unavailable because the system connection is not configured."
        );
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

  // =========================================================
  // LOGOUT
  // =========================================================
  async function logout() {
    try {
      if (onLogout) {
        await onLogout();
      }

      localStorage.removeItem("credtrackSession");
      sessionStorage.clear();

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
  // ALERTS
  // =========================================================
  function showAlerts() {
    setMenu(null);
    setFilter("All backups");
    setQuery("");

    const history =
      document.getElementById("dp-history");

    history?.focus();

    history?.scrollIntoView({
      block: "start",
    });
  }

  // =========================================================
  // VIEW BACKUP
  // =========================================================
  function viewBackup(job) {
    setSelectedId(job.id);
    openAction("details");
  }

  // =========================================================
  // AUDIT
  // =========================================================

  // =========================================================
  // REQUEST BACKUP
  // =========================================================
  async function requestBackup(event) {
    event.preventDefault();

    const values = Object.fromEntries(
      new FormData(event.currentTarget)
    );

    if (!values.reason?.trim()) {
      setError(
        "Add a reason for this backup request."
      );
      return;
    }

    const ok = await perform(
      "request-backup",
      {
        ...values,
        reason: values.reason.trim(),
      },
      () =>
        setLocalData((previous) => {
          const id = `BK-DEMO-${Date.now()}`;

          return {
            ...previous,

            backupJobs: [
              {
                id,
                scope: values.scope,
                status: "Queued",
                createdAt:
                  new Date().toISOString(),
                size: "Pending",
                integrity: "Not verified",
                source: "Manual",
                details: values.reason.trim(),
              },
              ...previous.backupJobs,
            ],

            audit: addAudit(
              previous,
              "Demo backup queued",
              `${id} · ${values.scope}`
            ),
          };
        }),
      "A demo backup job was queued."
    );

    if (ok) {
      setFilter("All backups");
      setQuery("");
      setAction(null);
    }
  }

  // =========================================================
  // VERIFY BACKUP
  // =========================================================
  async function verifyBackup() {
    if (
      !selectedJob ||
      selectedJob.status !== "Completed"
    ) {
      return;
    }

    await perform(
      "verify-backup",
      {
        id: selectedJob.id,
      },
      () =>
        setLocalData((previous) => ({
          ...previous,

          backupJobs: previous.backupJobs.map(
            (job) =>
              job.id === selectedJob.id
                ? {
                    ...job,
                    integrity: "Verified",
                  }
                : job
          ),

          audit: addAudit(
            previous,
            "Demo integrity check recorded",
            selectedJob.id
          ),
        })),
      "Simulated integrity verification recorded."
    );
  }

  // =========================================================
  // COMPLETE DEMO BACKUP
  // =========================================================
  async function completeDemoBackup() {
    if (
      !demo ||
      !selectedJob ||
      selectedJob.status !== "Queued"
    ) {
      return;
    }

    await perform(
      "demo-complete-backup",
      {
        id: selectedJob.id,
      },
      () =>
        setLocalData((previous) => ({
          ...previous,

          backupJobs: previous.backupJobs.map(
            (job) =>
              job.id === selectedJob.id
                ? {
                    ...job,
                    status: "Completed",
                    size: "Demo size",
                    details:
                      `${job.details} · Simulated completion.`,
                  }
                : job
          ),

          audit: addAudit(
            previous,
            "Demo backup completed",
            selectedJob.id
          ),
        })),
      "Demo backup completion simulated."
    );
  }

  // =========================================================
  // RECOVERY TEST
  // =========================================================
  async function recoveryTest(event) {
    event.preventDefault();

    if (
      !selectedJob ||
      selectedJob.status !== "Completed" ||
      selectedJob.integrity !== "Verified"
    ) {
      setError(
        "Use a completed, verified backup for a recovery test."
      );
      return;
    }

    const values = Object.fromEntries(
      new FormData(event.currentTarget)
    );

    if (!values.reason?.trim()) {
      setError(
        "Describe the purpose of this recovery test."
      );
      return;
    }

    const ok = await perform(
      "request-recovery-test",
      {
        id: selectedJob.id,
        target: "isolated-test-environment",
        reason: values.reason.trim(),
      },
      () =>
        setLocalData((previous) => ({
          ...previous,

          audit: addAudit(
            previous,
            "Demo recovery test requested",
            `${selectedJob.id} · Isolated test environment`
          ),
        })),
      "A demo recovery test request was recorded. No data was restored."
    );

    if (ok) {
      setAction(null);
    }
  }

  // =========================================================
  // SAVE POLICY
  // =========================================================
  async function savePolicy(event) {
    event.preventDefault();

    const values = Object.fromEntries(
      new FormData(event.currentTarget)
    );

    const retention = Number(values.retention);

    if (
      !Number.isInteger(retention) ||
      retention < 7 ||
      retention > 365
    ) {
      setError(
        "Enter a retention period from 7 to 365 days."
      );
      return;
    }

    const payload = {
      frequency: values.frequency,
      time: values.time,
      retention,
    };

    const ok = await perform(
      "update-backup-policy",
      payload,
      () =>
        setLocalData((previous) => ({
          ...previous,

          policy: {
            ...previous.policy,
            ...payload,
          },

          audit: addAudit(
            previous,
            "Demo backup policy updated",
            `${payload.frequency} · ${retention} days retention`
          ),
        })),
      "Backup policy updated in this demo."
    );

    if (ok) {
      setAction(null);
    }
  }

  // =========================================================
  // MOBILE SIDEBAR
  // =========================================================
  useEffect(() => {
    if (!sidebarOpen) return;

    const previous =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    sidebarRef.current
      ?.querySelector("button")
      ?.focus();

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [sidebarOpen]);

  // =========================================================
  // MENU / ESCAPE
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
  // NAVIGATION
  // =========================================================
  function jump(id, requestedAction) {
    const section =
      {
        health: "maintenance",
        infrastructure: "protection",
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
              action: requestedAction,
            }
          : null,
      });
    }
  }

  // =========================================================
  // SIDEBAR TAB TRAP
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
    const last = nodes[nodes.length - 1];

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
  // RENDER
  // =========================================================
  return (
    <div className="ict-dashboard ict-protection-page">
      <a
        className="ict-skip"
        href="#protection-main"
      >
        Skip to data protection
      </a>

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

      <aside
        ref={sidebarRef}
        id="ict-navigation"
        className={`principal-sidebar ${
          sidebarOpen ? "show" : ""
        }`}
        onKeyDown={trapSidebar}
        aria-label="ICT navigation"
      >
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
                  <Icon name={item.icon} />

                  <span>{item.label}</span>

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

      <div
        className="principal-shell"
        inert={
          sidebarOpen
            ? true
            : undefined
        }
      >
        <header
          ref={topbarRef}
          className="principal-topbar"
        >
          <div className="principal-top-left">
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

            <img
              className="principal-school-seal"
              src={logoSrc}
              alt=""
            />

            <div className="principal-school">
              <strong>
                President Manuel Roxas Memorial Integrated School – South
              </strong>

              <span>
                Digital Credentials Management System
              </span>
            </div>
          </div>

          <div className="principal-top-right">
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
                  <h3>Workspace alerts</h3>

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

        <main
          className="principal-content ict-overview dp-content"
          id="protection-main"
          tabIndex={-1}
        >
          <section className="ov-heading">
            <div>
              <div className="ov-eyebrow">
                ICT WORKSPACE{" "}
                <span>/</span> SECURITY &amp; BACKUPS
              </div>

              <h1>Data Protection</h1>

              <p>
                Keep backups visible,
                verify their integrity,
                and prepare for recovery.
              </p>
            </div>

            <button
              type="button"
              className="ov-primary"
              onClick={() =>
                openAction("backup")
              }
            >
              <Icon name="plus" />
              Request backup
            </button>
          </section>

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

          <div className="dp-overview">
            <section className="dp-vault">
              <div className="dp-vault-header">
                <span className="dp-shield">
                  <Icon
                    name="shield"
                    width="32"
                    height="32"
                  />
                </span>

                <span className="ov-pill">
                  BACKUP &amp; RECOVERY
                </span>
              </div>

              <h2>
                A recovery plan starts
                <br />
                with a reliable backup.
              </h2>

              <p>
                Review completed jobs and
                verification results before
                requesting a recovery test.
              </p>

              <div className="dp-vault-footer">
                <div>
                  <span>
                    Latest completed backup
                  </span>

                  <strong>
                    {latest
                      ? formatDate(
                          latest.createdAt
                        )
                      : "No completed backup reported"}
                  </strong>
                </div>

                <span
                  className={`ix-badge ${
                    latest?.integrity ===
                    "Verified"
                      ? "green"
                      : "amber"
                  }`}
                >
                  {latest?.integrity ||
                    "No verification data"}
                </span>
              </div>
            </section>

            <section
              className="dp-capacity"
              aria-label="Backup storage"
            >
              <div className="dp-card-top">
                <h2>Backup storage</h2>
                <Icon name="server" />
              </div>

              <div
                className="dp-storage-ring"
                style={{
                  "--storage": `${storagePercent}%`,
                }}
                role="img"
                aria-label={
                  storageKnown
                    ? `${data.storageGB} of ${data.totalGB} GB used`
                    : "Storage reading unavailable"
                }
              >
                <div>
                  <strong>
                    {storageKnown
                      ? `${storagePercent}%`
                      : "—"}
                  </strong>

                  <span>
                    capacity used
                  </span>
                </div>
              </div>

              <p>
                {storageKnown ? (
                  <>
                    <strong>
                      {data.storageGB} GB
                    </strong>{" "}
                    of {data.totalGB} GB used
                  </>
                ) : (
                  "No storage reading reported"
                )}
              </p>

              <small>
                {storageKnown
                  ? `${Math.max(
                      0,
                      data.totalGB -
                        data.storageGB
                    )} GB available`
                  : "Connect storage monitoring"}
              </small>
            </section>
          </div>

          <section
            className="dp-controls"
            aria-label="Reported protection controls"
          >
            {controls.map((control) => (
              <article key={control.id}>
                <span className="dp-control-icon">
                  <Icon
                    name={
                      control.id ===
                      "audit"
                        ? "clock"
                        : "shield"
                    }
                  />
                </span>

                <div>
                  <h3>{control.name}</h3>
                  <p>{control.detail}</p>
                </div>

                <span
                  className={`ix-badge ${badgeTone(
                    control.status
                  )}`}
                >
                  {control.status}
                </span>
              </article>
            ))}

            {!controls.length && (
              <p className="ov-empty">
                Protection controls have not
                been reported.
              </p>
            )}
          </section>

          {issues > 0 && (
            <div className="dp-attention">
              <Icon name="bell" />

              <p>
                <strong>
                  {issues} backup records need
                  review.
                </strong>{" "}
                {failedCount} failed{" "}
                {failedCount === 1
                  ? "job"
                  : "jobs"}{" "}
                and {unverified} completed{" "}
                {unverified === 1
                  ? "backup awaiting"
                  : "backups awaiting"}{" "}
                verification.
              </p>

              <button
                type="button"
                className="ov-text-link"
                onClick={showAlerts}
              >
                Review history
                <Icon
                  name="chevron"
                  width="14"
                />
              </button>
            </div>
          )}

          <div className="dp-workspace">
            <section
              className="ov-panel dp-history"
              id="dp-history"
              tabIndex={-1}
              aria-labelledby="dp-history-title"
            >
              <div className="ov-panel-heading">
                <div>
                  <h2 id="dp-history-title">
                    Backup history
                  </h2>

                  <p className="ix-subtitle">
                    Job results, verification,
                    and recovery readiness.
                  </p>
                </div>

                <span className="ov-count">
                  {jobs.length} jobs
                </span>
              </div>

              <div className="dp-filters">
                <label className="ix-search">
                  <Icon
                    name="search"
                    width="16"
                  />

                  <span className="ict-sr-only">
                    Search backups
                  </span>

                  <input
                    type="search"
                    value={query}
                    onChange={(event) =>
                      setQuery(
                        event.target.value
                      )
                    }
                    placeholder="Search backup ID or scope…"
                  />
                </label>

                <label>
                  <span className="ict-sr-only">
                    Backup status
                  </span>

                  <select
                    value={filter}
                    onChange={(event) =>
                      setFilter(
                        event.target.value
                      )
                    }
                  >
                    {[
                      "All backups",
                      "Completed",
                      "Queued",
                      "Running",
                      "Failed",
                    ].map((value) => (
                      <option
                        key={value}
                        value={value}
                      >
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="dp-backup-list">
                {visibleJobs.map((job) => (
                  <button
                    type="button"
                    className="dp-backup-row"
                    key={job.id}
                    onClick={() =>
                      viewBackup(job)
                    }
                  >
                    <span
                      className={`dp-job-icon ${
                        job.status ===
                        "Failed"
                          ? "failed"
                          : ""
                      }`}
                    >
                      <Icon
                        name={
                          job.status ===
                          "Failed"
                            ? "close"
                            : "server"
                        }
                      />
                    </span>

                    <span className="dp-job-copy">
                      <strong>
                        {job.scope} backup
                      </strong>

                      <span>
                        {job.id} ·{" "}
                        {formatDate(
                          job.createdAt
                        )}
                      </span>

                      <small>
                        {job.source} ·{" "}
                        {job.size ||
                          "Size not reported"}
                      </small>
                    </span>

                    <span className="dp-job-state">
                      <span
                        className={`ix-badge ${badgeTone(
                          job.status
                        )}`}
                      >
                        {job.status}
                      </span>

                      <small>
                        {job.integrity ===
                        "Verified"
                          ? "Integrity verified"
                          : job.status ===
                            "Completed"
                          ? "Verification pending"
                          : job.integrity ||
                            "—"}
                      </small>
                    </span>

                    <Icon
                      name="chevron"
                      width="15"
                    />
                  </button>
                ))}

                {!visibleJobs.length && (
                  <div className="dp-empty">
                    <Icon name="server" />

                    <h3>
                      No backups in this
                      view
                    </h3>

                    <p>
                      Try another filter or
                      request a backup.
                    </p>

                    <button
                      type="button"
                      className="ix-secondary"
                      onClick={() => {
                        setQuery("");
                        setFilter(
                          "All backups"
                        );
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                )}
              </div>

              <div className="ov-panel-footer">
                <span>
                  {visibleJobs.length} jobs
                  shown
                </span>

                <span>
                  {demo
                    ? "Sample backup records"
                    : "Reported backup history"}
                </span>
              </div>
            </section>

            <aside className="dp-policy">
              <div className="dp-card-top">
                <h2>Backup policy</h2>
                <Icon name="clock" />
              </div>

              <p>
                A consistent schedule keeps
                recovery points up to date.
              </p>

              <dl>
                <div>
                  <dt>Frequency</dt>
                  <dd>
                    {policy.frequency ||
                      "Not configured"}
                  </dd>
                </div>

                <div>
                  <dt>Scheduled time</dt>
                  <dd>
                    {policy.time ||
                      "Not configured"}

                    <small>
                      School server timezone
                    </small>
                  </dd>
                </div>

                <div>
                  <dt>Retention</dt>
                  <dd>
                    {policy.retention != null
                      ? `${policy.retention} days`
                      : "Not configured"}
                  </dd>
                </div>

                <div>
                  <dt>Destination</dt>
                  <dd>
                    {policy.destination ||
                      "Not reported"}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                className="ix-secondary"
                onClick={() =>
                  openAction("policy")
                }
              >
                <Icon
                  name="settings"
                  width="16"
                />
                Edit backup policy
              </button>

              <div className="dp-policy-note">
                <Icon
                  name="shield"
                  width="17"
                />

                <span>
                  Recovery tests use an isolated
                  environment. Select a verified
                  backup to get started.
                </span>
              </div>
            </aside>
          </div>

          <section
            className="dp-audit"
            aria-labelledby="dp-audit-title"
          >
            <div>
              <span className="ov-pill">
                ACCOUNTABILITY
              </span>

              <h2 id="dp-audit-title">
                Protection activity
              </h2>

              <p>
                The latest reported backup and
                recovery events.
              </p>
            </div>

            <ol>
              {(data?.audit ?? [])
                .slice(0, 4)
                .map((event) => (
                  <li key={event.id}>
                    <span className="dp-audit-dot" />

                    <div>
                      <strong>
                        {event.title}
                      </strong>

                      <p>
                        {event.detail}
                      </p>

                      <time
                        dateTime={
                          event.createdAt
                        }
                      >
                        {formatDate(
                          event.createdAt
                        )}
                      </time>
                    </div>
                  </li>
                ))}

              {!data?.audit?.length && (
                <li>
                  No protection activity
                  reported.
                </li>
              )}
            </ol>
          </section>

          <footer className="ov-footer">
            <span>
              CredTrack · Data Protection
            </span>

            <span>
              {demo
                ? "Demo data · no live backup storage is connected"
                : "Reported system data"}
            </span>
          </footer>
        </main>

        {action && (
          <dialog
            ref={dialogRef}
            className="ix-modal dp-modal"
            aria-labelledby="dp-modal-title"
            onCancel={(event) => {
              event.preventDefault();
              closeAction();
            }}
          >
            <div className="ix-modal-heading">
              <span className="ov-action-icon">
                <Icon name="shield" />
              </span>

              <button
                type="button"
                className="ix-close"
                onClick={closeAction}
                disabled={busy}
                aria-label="Close protection dialog"
              >
                <Icon name="close" />
              </button>
            </div>

            <h2 id="dp-modal-title">
              {action === "backup"
                ? "Request a backup"
                : action === "policy"
                ? "Backup policy"
                : action === "recovery"
                ? "Request a recovery test"
                : selectedJob?.id ||
                  "Backup unavailable"}
            </h2>

            <p>
              {action === "backup"
                ? "Queue a backup using your configured destination."
                : action === "policy"
                ? "Set the schedule and retention for future backup jobs."
                : action === "recovery"
                ? "Validate recovery in an isolated test environment."
                : "Review this backup’s status and verification details."}
            </p>

            {action === "details" ? (
              selectedJob ? (
                <div className="dp-details">
                  <dl>
                    <div>
                      <dt>Scope</dt>

                      <dd>
                        {selectedJob.scope}
                      </dd>
                    </div>

                    <div>
                      <dt>Status</dt>

                      <dd>
                        <span
                          className={`ix-badge ${badgeTone(
                            selectedJob.status
                          )}`}
                        >
                          {selectedJob.status}
                        </span>
                      </dd>
                    </div>

                    <div>
                      <dt>Created</dt>

                      <dd>
                        {formatDate(
                          selectedJob.createdAt
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt>Size</dt>

                      <dd>
                        {selectedJob.size ||
                          "Not reported"}
                      </dd>
                    </div>

                    <div>
                      <dt>Integrity</dt>

                      <dd>
                        {selectedJob.integrity ||
                          "Not reported"}
                      </dd>
                    </div>
                  </dl>

                  <p className="dp-detail-note">
                    {selectedJob.details ||
                      "No additional details reported."}
                  </p>

                  <p className="ix-mode-note">
                    {demo
                      ? "Sample backup record. No backup files are accessed."
                      : "Actions use your connected backup service."}
                  </p>

                  <p
                    role="alert"
                    className={
                      error
                        ? "dp-error"
                        : "ict-sr-only"
                    }
                  >
                    {error}
                  </p>

                  <div className="dp-detail-actions">
                    {demo &&
                      selectedJob.status ===
                        "Queued" && (
                        <button
                          type="button"
                          className="ov-primary"
                          disabled={busy}
                          onClick={
                            completeDemoBackup
                          }
                        >
                          Complete demo job
                        </button>
                      )}

                    {selectedJob.status ===
                      "Completed" && (
                      <button
                        type="button"
                        className="ix-secondary"
                        disabled={
                          busy ||
                          !canAct ||
                          selectedJob.integrity ===
                            "Verified"
                        }
                        onClick={
                          verifyBackup
                        }
                      >
                        {busy
                          ? "Checking…"
                          : selectedJob.integrity ===
                            "Verified"
                          ? "Integrity verified"
                          : "Verify integrity"}
                      </button>
                    )}

                    {selectedJob.status ===
                      "Completed" &&
                      selectedJob.integrity ===
                        "Verified" && (
                      <button
                        type="button"
                        className="ov-primary"
                        disabled={
                          busy ||
                          !canAct
                        }
                        onClick={() => {
                          setError("");
                          setAction(
                            "recovery"
                          );
                        }}
                      >
                        Recovery test
                      </button>
                    )}

                    <button
                      type="button"
                      className="ix-secondary"
                      disabled={busy}
                      onClick={closeAction}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <p>
                  This backup is no longer
                  in the current snapshot.
                </p>
              )
            ) : (
              <form
                onSubmit={
                  action === "backup"
                    ? requestBackup
                    : action === "policy"
                    ? savePolicy
                    : recoveryTest
                }
              >
                <fieldset
                  className="ix-fields"
                  disabled={
                    busy || !canAct
                  }
                >
                  {action === "backup" && (
                    <>
                      <label>
                        Backup scope

                        <select name="scope">
                          <option>
                            Full system
                          </option>

                          <option>
                            Database
                          </option>

                          <option>
                            Application configuration
                          </option>
                        </select>
                      </label>

                      <label>
                        Reason

                        <textarea
                          name="reason"
                          rows={4}
                          required
                          maxLength={1000}
                          placeholder="e.g. Before the next application update"
                        />
                      </label>

                      <div className="dp-target">
                        <Icon name="server" />

                        <span>
                          Configured
                          destination

                          <strong>
                            {policy.destination ||
                              "Destination managed by your server"}
                          </strong>
                        </span>
                      </div>
                    </>
                  )}

                  {action === "policy" && (
                    <>
                      <div className="ix-form-grid">
                        <label>
                          Frequency

                          <select
                            name="frequency"
                            defaultValue={
                              policy.frequency ||
                              "Daily"
                            }
                          >
                            <option>
                              Daily
                            </option>

                            <option>
                              Weekly
                            </option>
                          </select>
                        </label>

                        <label>
                          Time (server
                          timezone)

                          <input
                            type="time"
                            name="time"
                            required
                            defaultValue={
                              policy.time ||
                              "23:00"
                            }
                          />
                        </label>
                      </div>

                      <label>
                        Retention (days)

                        <input
                          type="number"
                          name="retention"
                          required
                          min={7}
                          max={365}
                          defaultValue={
                            policy.retention ??
                            30
                          }
                        />
                      </label>

                      <p className="ix-hint">
                        Weekly jobs run on the
                        server’s configured
                        backup day. Retention
                        and destination follow
                        your school’s backup
                        policy.
                      </p>
                    </>
                  )}

                  {action === "recovery" && (
                    <>
                      <div className="dp-target">
                        <Icon name="shield" />

                        <span>
                          Recovery target

                          <strong>
                            Isolated test
                            environment
                          </strong>
                        </span>
                      </div>

                      <p className="ix-hint">
                        Backup:{" "}
                        {selectedJob?.id ||
                          "Unavailable"}
                        . This action requests
                        a test; it does not
                        replace production
                        data.
                      </p>

                      <label>
                        Test purpose

                        <textarea
                          name="reason"
                          required
                          rows={4}
                          maxLength={1000}
                          placeholder="What should this recovery test validate?"
                        />
                      </label>
                    </>
                  )}
                </fieldset>

                <p className="ix-mode-note">
                  {demo
                    ? "Demo mode · No backups, deletions, or restores will run."
                    : canAct
                    ? "Requests are handled by your connected backup service."
                    : "Read-only workspace · Backup requests are unavailable."}
                </p>

                <p
                  role="alert"
                  className={
                    error
                      ? "dp-error"
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
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="ov-primary"
                    disabled={
                      busy || !canAct
                    }
                  >
                    {busy
                      ? "Submitting…"
                      : action === "policy"
                      ? "Save policy"
                      : action === "backup"
                      ? "Queue backup"
                      : "Request test"}
                  </button>
                </div>
              </form>
            )}
          </dialog>
        )}
      </div>
    </div>
  );
}