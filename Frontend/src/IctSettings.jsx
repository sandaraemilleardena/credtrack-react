
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./IctSettings.css";

const paths = {
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87",
  support:
    "M3 14v-3a9 9 0 0 1 18 0v3 M3 12h4v7H3z M17 12h4v7h-4z M19 19v2h-7",
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

  return Number.isNaN(date.getTime())
    ? "Not reported"
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

const SETTINGS_TABS = [
  {
    id: "profile",
    label: "My profile",
    icon: "users",
    description: "Your contact and account details",
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: "dashboard",
    description: "School and display preferences",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: "bell",
    description: "Choose what you hear about",
  },
  {
    id: "security",
    label: "Security",
    icon: "shield",
    description: "Sessions and sign-in preferences",
  },
];

function normalizeSettings(settings = {}) {
  return {
    displayName: "",
    email: "",
    phone: "",
    schoolName: "",
    timezone: "Asia/Manila",
    dateFormat: "MMM D, YYYY",
    rowsPerPage: 10,
    ticketAlerts: true,
    maintenanceAlerts: true,
    backupAlerts: true,
    weeklyDigest: false,
    emailNotifications: false,
    signinAlerts: true,
    sessionMinutes: 30,
    ...settings,
  };
}

function settingsDemo() {
  return {
    settings: normalizeSettings({
      displayName: "ICT Personnel",
      email: "ict@example.edu",
      phone: "",
      schoolName:
        "President Manuel Roxas Memorial Integrated School – South",
    }),

    security: {
      mfaEnabled: true,
      lastPasswordChange: "Demo record",
    },

    sessions: [
      {
        id: "session-current",
        device: "Current browser",
        detail: "Desktop · Current session",
        current: true,
        lastActive: "Active now",
      },
      {
        id: "session-demo",
        device: "School workstation",
        detail: "Desktop browser · Sample session",
        current: false,
        lastActive: "2 hours ago (demo)",
      },
    ],
  };
}

// =========================================================
// ICT SETTINGS COMPONENT
// =========================================================
function IctSettings({
  snapshot,
  onAction,
  onLogout,
  onNavigate,
  routes = {},
  logoSrc = "/logo.png",
}) {
  const navigate = useNavigate();

  const active = "settings";
  const demo = snapshot == null;

  const [localData, setLocalData] = useState(settingsDemo);
  const data = demo ? localData : snapshot;

  const [saved, setSaved] = useState(() =>
    normalizeSettings(data.settings)
  );

  const [draft, setDraft] = useState(() =>
    normalizeSettings(data.settings)
  );

  const [tab, setTab] = useState("profile");
  const [selectedSession, setSelectedSession] = useState(null);
  const [pendingRoute, setPendingRoute] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  const dirty =
    JSON.stringify(saved) !== JSON.stringify(draft);

  const issues =
    data.security?.mfaEnabled === false ? 1 : 0;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menu, setMenu] = useState(null);
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const submitting = useRef(false);

  const canAct =
    demo || Boolean(onAction);

  useEffect(() => {
    if (!action) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }

      document.body.style.overflow = overflow;

      if (triggerRef.current?.isConnected) {
        triggerRef.current.focus();
      }
    };
  }, [action]);

  function openAction(value) {
    triggerRef.current = document.activeElement;
    setMenu(null);
    setError("");
    setAction(value);
  }

  function closeAction() {
    if (!submitting.current) {
      setAction(null);
    }
  }

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

      navigate("/", { replace: true });
    } catch {
      setNotice(
        "Sign out failed. Please try again."
      );
    }
  }

  // =========================================================
  // REFRESH SERVER-BACKED VALUES
  // =========================================================
  useEffect(() => {
    if (!dirty) return;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      warn
    );

    return () =>
      window.removeEventListener(
        "beforeunload",
        warn
      );
  }, [dirty]);

  function showAlerts() {
    setMenu(null);
    setTab("security");
    document
      .getElementById("settings-main")
      ?.focus();
  }

  function change(key, value) {
    if(['schoolName','sessionMinutes','weeklyDigest','emailNotifications'].includes(key)){setNotice('School-wide and delivery policies are managed by Administration or deployment configuration.');return;}
    setDraft((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();

    if (!dirty) return;

    if (
      !draft.displayName.trim() ||
      !draft.schoolName.trim()
    ) {
      setNotice(
        "Enter a display name and school name before saving."
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        draft.email.trim()
      )
    ) {
      setTab("profile");
      setNotice(
        "Enter a valid account email address before saving."
      );
      return;
    }

    const payload = {
      ...draft,
      displayName:
        draft.displayName.trim(),
      email: draft.email.trim(),
      schoolName:
        draft.schoolName.trim(),
      sessionMinutes:
        Number(draft.sessionMinutes),
      rowsPerPage:
        Number(draft.rowsPerPage),
    };

    const ok = await perform(
      "save-settings",
      payload,
      () =>
        setLocalData((previous) => ({
          ...previous,
          settings: payload,
        })),
      "Settings saved for this demo session."
    );

    if (ok) {
      setSaved(payload);
      setDraft(payload);
      setSavedAt(
        new Date().toISOString()
      );
    }
  }

  function discardChanges() {
    setDraft({ ...saved });
    setAction(null);
    setNotice(
      "Unsaved changes discarded."
    );
  }

  function leavePage() {
    const target = pendingRoute;

    setDraft({ ...saved });
    setAction(null);
    setPendingRoute(null);

    if (target) {
      jump(
        target.id,
        target.requestedAction,
        true
      );
    }
  }

  async function accountRequest() {
    if (
      action === "password" &&
      !saved.email
    ) {
      setError(
        "Save an account email before requesting a reset."
      );
      return;
    }

    const type =
      action === "password"
        ? "request-password-reset"
        : action === "mfa"
        ? "request-mfa-setup"
        : "revoke-session";

    if (
      action === "revoke" &&
      (!selectedSession ||
        selectedSession.current)
    ) {
      return;
    }

    const payload =
      action === "revoke"
        ? {
            sessionId:
              selectedSession.id,
          }
        : {
            email: saved.email,
          };

    const ok = await perform(
      type,
      payload,
      () => {
        if (action === "revoke") {
          setLocalData((previous) => ({
            ...previous,
            sessions:
              previous.sessions.filter(
                (session) =>
                  session.id !==
                  selectedSession.id
              ),
          }));
        }
      },
      action === "revoke"
        ? "The sample session was removed."
        : "Demo request recorded. No email was sent or account security changed."
    );

    if (ok) {
      setAction(null);
    }
  }

  const sidebarRef = useRef(null);
  const openButtonRef = useRef(null);
  const topbarRef = useRef(null);
  const previousMenuTrigger =
    useRef(null);

  // =========================================================
  // MOBILE SIDEBAR
  // =========================================================
  useEffect(() => {
    if (!sidebarOpen) return;

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    sidebarRef.current
      ?.querySelector("button")
      ?.focus();

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
  function jump(
    id,
    requestedAction,
    discard = false
  ) {
    if (dirty && !discard) {
      setPendingRoute({
        id,
        requestedAction,
      });

      openAction("leave");
      return;
    }

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

    if (!nodes?.length) return;

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

  const currentTab =
    SETTINGS_TABS.find(
      (item) => item.id === tab
    ) || SETTINGS_TABS[0];

  return (
    <div className="ict-dashboard ict-settings-page">
      {/* SKIP LINK */}
      <a
        className="ict-skip"
        href="#settings-main"
      >
        Skip to settings
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
              ref={openButtonRef}
              className="principal-menu-button"
              aria-label="Open navigation"
              aria-expanded={
                sidebarOpen
              }
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
                    className="ict-text-button"
                    onClick={() =>
                      showAlerts()
                    }
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
          className="principal-content ict-overview st-content"
          id="settings-main"
          tabIndex={-1}
        >
          <section className="ov-heading">
            <div>
              <div className="ov-eyebrow">
                ICT WORKSPACE{" "}
                <span>/</span>{" "}
                PREFERENCES
              </div>

              <h1>Settings</h1>

              <p>
                Make the workspace work for you.
              </p>
            </div>

            <span className="st-page-status">
              <span
                className={
                  dirty ? "unsaved" : ""
                }
              />

              {dirty
                ? "Unsaved changes"
                : savedAt
                ? `Saved ${formatDate(
                    savedAt
                  )}`
                : "Your workspace preferences"}
            </span>
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

          <div className="st-layout">
            <aside className="st-navigation">
              <div className="st-profile-card">
                <span className="st-avatar">
                  {(draft.displayName ||
                    "ICT")
                    .split(" ")
                    .filter(Boolean)
                    .map(
                      (word) =>
                        word[0]
                    )
                    .slice(0, 2)
                    .join("")}
                </span>

                <strong>
                  {draft.displayName ||
                    "Your profile"}
                </strong>

                <span>
                  ICT Personnel
                </span>

                <small>
                  {demo
                    ? "Demo account"
                    : "School workspace"}
                </small>
              </div>

              <nav aria-label="Settings sections">
                {SETTINGS_TABS.map(
                  (item) => (
                    <button
                      key={item.id}
                      aria-current={
                        tab === item.id
                          ? "page"
                          : undefined
                      }
                      onClick={() =>
                        setTab(item.id)
                      }
                    >
                      <Icon
                        name={item.icon}
                        width="18"
                      />

                      <span>
                        {item.label}
                      </span>

                      <Icon
                        name="chevron"
                        width="13"
                      />
                    </button>
                  )
                )}
              </nav>

              <div className="st-help">
                <Icon
                  name="shield"
                  width="18"
                />

                <p>
                  Your role and permissions
                  are managed through approved
                  user access requests.
                </p>

                <button
                  className="ov-text-link"
                  onClick={() =>
                    jump("access")
                  }
                >
                  Open User Access
                  <Icon
                    name="chevron"
                    width="13"
                  />
                </button>
              </div>
            </aside>

            <form
              className="st-form"
              onSubmit={saveSettings}
            >
              <section
                className="st-panel"
                aria-labelledby="st-section-title"
              >
                <div className="st-panel-heading">
                  <span className="st-section-icon">
                    <Icon
                      name={
                        currentTab.icon
                      }
                      width="23"
                    />
                  </span>

                  <div>
                    <h2 id="st-section-title">
                      {currentTab.label}
                    </h2>

                    <p>
                      {
                        currentTab.description
                      }
                    </p>
                  </div>
                </div>

                <fieldset
                  className="st-fields"
                  disabled={
                    busy || !canAct
                  }
                >
                  {/* PROFILE */}
                  {tab === "profile" && (
                    <>
                      <div className="st-section-note">
                        <h3>
                          Personal information
                        </h3>

                        <p>
                          These details identify
                          your ICT account inside
                          CredTrack.
                        </p>
                      </div>

                      <div className="st-form-grid">
                        <label>
                          Display name

                          <input
                            required
                            maxLength={100}
                            value={
                              draft.displayName
                            }
                            onChange={(event) =>
                              change(
                                "displayName",
                                event.target
                                  .value
                              )
                            }
                            autoComplete="name"
                            placeholder="Your display name"
                          />
                        </label>

                        <label>
                          Role

                          <input
                            readOnly
                            value="ICT Personnel"
                            aria-describedby="st-role-help"
                          />
                        </label>
                      </div>

                      <p
                        id="st-role-help"
                        className="st-field-help"
                      >
                        Role changes are handled
                        on the User Access page.
                      </p>

                      <div className="st-form-grid">
                        <label>
                          Account email

                          <input
                            type="email"
                            required
                            maxLength={254}
                            value={
                              draft.email
                            }
                            onChange={(event) =>
                              change(
                                "email",
                                event.target
                                  .value
                              )
                            }
                            autoComplete="email"
                            placeholder="School email address"
                          />
                        </label>

                        <label>
                          Phone (optional)

                          <input
                            type="tel"
                            maxLength={30}
                            value={
                              draft.phone
                            }
                            onChange={(event) =>
                              change(
                                "phone",
                                event.target
                                  .value
                              )
                            }
                            autoComplete="tel"
                            placeholder="Contact number"
                          />
                        </label>
                      </div>

                      <div className="st-info">
                        <Icon name="users" />

                        <p>
                          A new email address must
                          be verified before it can
                          be used for sign-in.
                        </p>
                      </div>
                    </>
                  )}

                  {/* WORKSPACE */}
                  {tab === "workspace" && (
                    <>
                      <div className="st-section-note">
                        <h3>
                          School details
                        </h3>

                        <p>
                          Identify the school
                          workspace and choose
                          your display preferences.
                        </p>
                      </div>

                      <label>
                        School name

                        <input
                          required
                          maxLength={180}
                          value={
                            draft.schoolName
                          }
                          onChange={(event) =>
                            change(
                              "schoolName",
                              event.target
                                .value
                            )
                          }
                        />
                      </label>

                      <div className="st-divider" />

                      <div className="st-section-note">
                        <h3>
                          Display preferences
                        </h3>

                        <p>
                          Choose how dates and
                          lists should appear in
                          your workspace.
                        </p>
                      </div>

                      <div className="st-form-grid">
                        <label>
                          Timezone

                          <select
                            value={
                              draft.timezone
                            }
                            onChange={(event) =>
                              change(
                                "timezone",
                                event.target
                                  .value
                              )
                            }
                          >
                            <option value="Asia/Manila">
                              Asia/Manila
                              (UTC+08:00)
                            </option>

                            <option value="UTC">
                              UTC
                            </option>

                            <option value="Asia/Singapore">
                              Asia/Singapore
                              (UTC+08:00)
                            </option>
                          </select>
                        </label>

                        <label>
                          Date format

                          <select
                            value={
                              draft.dateFormat
                            }
                            onChange={(event) =>
                              change(
                                "dateFormat",
                                event.target
                                  .value
                              )
                            }
                          >
                            <option>
                              MMM D, YYYY
                            </option>

                            <option>
                              DD/MM/YYYY
                            </option>

                            <option>
                              YYYY-MM-DD
                            </option>
                          </select>
                        </label>
                      </div>

                      <label>
                        Rows per page

                        <select
                          value={
                            draft.rowsPerPage
                          }
                          onChange={(event) =>
                            change(
                              "rowsPerPage",
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                        >
                          <option value={10}>
                            10 rows
                          </option>

                          <option value={25}>
                            25 rows
                          </option>

                          <option value={50}>
                            50 rows
                          </option>
                        </select>
                      </label>

                      <div className="st-preview">
                        <span>
                          DATE FORMAT PREVIEW
                        </span>

                        <strong>
                          {draft.dateFormat ===
                          "DD/MM/YYYY"
                            ? "25/09/2026"
                            : draft.dateFormat ===
                              "YYYY-MM-DD"
                            ? "2026-09-25"
                            : "Sep 25, 2026"}
                        </strong>

                        <small>
                          Example only
                        </small>
                      </div>
                    </>
                  )}

                  {/* NOTIFICATIONS */}
                  {tab ===
                    "notifications" && (
                    <>
                      <div className="st-section-note">
                        <h3>
                          Activity notifications
                        </h3>

                        <p>
                          Choose which events
                          should appear in your
                          notification feed.
                        </p>
                      </div>

                      {[
                        {
                          key: "ticketAlerts",
                          title:
                            "Support tickets",
                          detail:
                            "New issues and updates to assigned tickets",
                          icon: "support",
                        },
                        {
                          key: "maintenanceAlerts",
                          title:
                            "Maintenance updates",
                          detail:
                            "Upcoming windows and recorded status changes",
                          icon: "tools",
                        },
                        {
                          key: "backupAlerts",
                          title:
                            "Backup and protection alerts",
                          detail:
                            "Failed jobs and integrity checks that need review",
                          icon: "shield",
                        },
                        {
                          key: "weeklyDigest",
                          title:
                            "Weekly activity summary",
                          detail:
                            "A weekly overview of ICT operations",
                          icon: "clock",
                        },
                      ].map((item) => (
                        <label
                          className="st-toggle-row"
                          key={item.key}
                        >
                          <span className="st-toggle-icon">
                            <Icon
                              name={
                                item.icon
                              }
                            />
                          </span>

                          <span className="st-toggle-copy">
                            <strong>
                              {item.title}
                            </strong>

                            <span>
                              {item.detail}
                            </span>
                          </span>

                          <input
                            type="checkbox"
                            className="st-toggle"
                            role="switch"
                            checked={
                              draft[
                                item.key
                              ]
                            }
                            onChange={(event) =>
                              change(
                                item.key,
                                event.target
                                  .checked
                              )
                            }
                            aria-label={
                              item.title
                            }
                          />
                        </label>
                      ))}

                      <div className="st-divider" />

                      <div className="st-section-note">
                        <h3>
                          Delivery
                        </h3>

                        <p>
                          Notification delivery
                          is handled by your
                          connected app service.
                        </p>
                      </div>

                      <label className="st-toggle-row">
                        <span className="st-toggle-copy">
                          <strong>
                            Email notifications
                          </strong>

                          <span>
                            Also deliver enabled
                            alerts to your verified
                            account email
                          </span>
                        </span>

                        <input
                          type="checkbox"
                          className="st-toggle"
                          role="switch"
                          checked={
                            draft.emailNotifications
                          }
                          onChange={(event) =>
                            change(
                              "emailNotifications",
                              event.target
                                .checked
                            )
                          }
                          aria-label="Email notifications"
                        />
                      </label>

                      <div className="st-info">
                        <Icon name="bell" />

                        <p>
                          Changing these
                          preferences does not
                          send a message. Email
                          delivery becomes active
                          through your backend
                          integration.
                        </p>
                      </div>
                    </>
                  )}

                  {/* SECURITY */}
                  {tab === "security" && (
                    <>
                      <div className="st-section-note">
                        <h3>
                          Sign-in protection
                        </h3>

                        <p>
                          Manage your security
                          preferences and review
                          active sessions.
                        </p>
                      </div>

                      <div className="st-security-row">
                        <div>
                          <strong>
                            Password
                          </strong>

                          <p>
                            Request a secure reset
                            link for your saved
                            account email.
                          </p>
                        </div>

                        <button
                          type="button"
                          className="ix-secondary"
                          onClick={() =>
                            openAction(
                              "password"
                            )
                          }
                        >
                          Request reset
                        </button>
                      </div>

                      <div className="st-security-row">
                        <div>
                          <strong>
                            Two-step verification{" "}
                            <span
                              className={`ix-badge ${
                                data.security
                                  ?.mfaEnabled ===
                                true
                                  ? "green"
                                  : "neutral"
                              }`}
                            >
                              {data.security
                                ?.mfaEnabled ===
                              true
                                ? "Enabled"
                                : data.security
                                    ?.mfaEnabled ===
                                  false
                                ? "Not enabled"
                                : "Not reported"}
                            </span>
                          </strong>

                          <p>
                            Use an additional
                            verification step
                            when signing in.
                          </p>
                        </div>

                        {data.security
                          ?.mfaEnabled !==
                          true && (
                          <button
                            type="button"
                            className="ix-secondary"
                            onClick={() =>
                              openAction("mfa")
                            }
                          >
                            Request setup
                          </button>
                        )}
                      </div>

                      <label className="st-toggle-row">
                        <span className="st-toggle-copy">
                          <strong>
                            New sign-in alerts
                          </strong>

                          <span>
                            Notify me about
                            sign-ins from a new
                            device
                          </span>
                        </span>

                        <input
                          type="checkbox"
                          role="switch"
                          className="st-toggle"
                          checked={
                            draft.signinAlerts
                          }
                          onChange={(event) =>
                            change(
                              "signinAlerts",
                              event.target
                                .checked
                            )
                          }
                          aria-label="New sign-in alerts"
                        />
                      </label>

                      <label>
                        Preferred inactivity
                        timeout

                        <select
                          value={
                            draft.sessionMinutes
                          }
                          onChange={(event) =>
                            change(
                              "sessionMinutes",
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                        >
                          <option value={15}>
                            15 minutes
                          </option>

                          <option value={30}>
                            30 minutes
                          </option>

                          <option value={60}>
                            1 hour
                          </option>
                        </select>

                        <small className="st-field-help">
                          Your school’s session
                          policy determines the
                          allowed inactivity
                          timeout.
                        </small>
                      </label>
                    </>
                  )}
                </fieldset>

                {/* ACTIVE SESSIONS */}
                {tab === "security" && (
                  <section
                    className="st-sessions"
                    aria-labelledby="st-sessions-title"
                  >
                    <h3 id="st-sessions-title">
                      Active sessions
                    </h3>

                    {(data.sessions ?? []).map(
                      (session) => (
                        <div
                          className="st-session"
                          key={session.id}
                        >
                          <span className="st-toggle-icon">
                            <Icon name="server" />
                          </span>

                          <div>
                            <strong>
                              {session.device}
                            </strong>

                            <p>
                              {session.detail}
                            </p>

                            <small>
                              {
                                session.lastActive
                              }
                            </small>
                          </div>

                          {session.current ? (
                            <span className="ix-badge green">
                              This device
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="st-revoke"
                              disabled={
                                busy ||
                                !canAct
                              }
                              onClick={() => {
                                setSelectedSession(
                                  session
                                );
                                openAction(
                                  "revoke"
                                );
                              }}
                            >
                              Sign out
                            </button>
                          )}
                        </div>
                      )
                    )}

                    {!data.sessions?.length && (
                      <p className="st-field-help">
                        No session information
                        has been reported.
                      </p>
                    )}
                  </section>
                )}
              </section>

              {/* SAVE BAR */}
              <div className="st-savebar">
                <div>
                  <strong>
                    {dirty
                      ? "You have unsaved changes"
                      : "All changes saved"}
                  </strong>

                  <span>
                    {demo
                      ? "Demo session · preferences reset on reload"
                      : canAct
                      ? "Changes apply through your connected settings service"
                      : "Read-only workspace · Preference changes are unavailable"}
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    className="ix-secondary"
                    disabled={
                      !dirty || busy
                    }
                    onClick={() =>
                      openAction(
                        "discard"
                      )
                    }
                  >
                    Discard
                  </button>

                  <button
                    className="ov-primary"
                    type="submit"
                    disabled={
                      !dirty ||
                      busy ||
                      !canAct
                    }
                  >
                    {busy
                      ? "Saving…"
                      : "Save changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <footer className="ov-footer">
            <span>
              CredTrack · Settings
            </span>

            <span>
              ICT Personnel workspace
            </span>
          </footer>
        </main>

        {/* MODAL */}
        {action && (
          <dialog
            ref={dialogRef}
            className="ix-modal st-modal"
            aria-labelledby="st-modal-title"
            onCancel={(event) => {
              event.preventDefault();
              closeAction();
            }}
          >
            <div className="ix-modal-heading">
              <span className="ov-action-icon">
                <Icon
                  name={
                    action ===
                      "discard" ||
                    action === "leave"
                      ? "settings"
                      : "shield"
                  }
                />
              </span>

              <button
                className="ix-close"
                onClick={
                  closeAction
                }
                disabled={busy}
                aria-label="Close settings dialog"
              >
                <Icon name="close" />
              </button>
            </div>

            <h2 id="st-modal-title">
              {action === "discard"
                ? "Discard your changes?"
                : action === "leave"
                ? "Leave without saving?"
                : action === "password"
                ? "Request a password reset"
                : action === "mfa"
                ? "Request two-step verification"
                : "Sign out this session?"}
            </h2>

            <p id="ix-modal-description">
              {action === "discard" ||
              action === "leave"
                ? "Your unsaved edits will be removed. Saved preferences stay in place."
                : action === "password"
                ? `Request a reset link for ${
                    saved.email ||
                    "your saved account email"
                  }.`
                : action === "mfa"
                ? "Your connected account service will handle enrollment instructions."
                : `End the ${
                    selectedSession?.device ||
                    "selected"
                  } session. Your current session remains active.`}
            </p>

            {![
              "discard",
              "leave",
            ].includes(action) && (
              <p className="ix-mode-note">
                {demo
                  ? "Demo only · No email is sent and no live sessions change."
                  : "This request is handled by your connected account service."}
              </p>
            )}

            <p
              role="alert"
              className={
                error
                  ? "st-error"
                  : "ict-sr-only"
              }
            >
              {error}
            </p>

            <div className="ix-modal-footer">
              <button
                className="ix-secondary"
                onClick={
                  closeAction
                }
                disabled={busy}
              >
                {action === "discard" ||
                action === "leave"
                  ? "Keep editing"
                  : "Cancel"}
              </button>

              <button
                className="ov-primary"
                disabled={
                  busy ||
                  (![
                    "discard",
                    "leave",
                  ].includes(action) &&
                    !canAct)
                }
                onClick={
                  action === "discard"
                    ? discardChanges
                    : action === "leave"
                    ? leavePage
                    : accountRequest
                }
              >
                {busy
                  ? "Submitting…"
                  : action === "discard"
                  ? "Discard changes"
                  : action === "leave"
                  ? "Discard and leave"
                  : action === "revoke"
                  ? "Sign out session"
                  : "Submit request"}
              </button>
            </div>
          </dialog>
        )}
      </div>
    </div>
  );
}

// =========================================================
// DEFAULT EXPORT
// =========================================================
export default IctSettings;

