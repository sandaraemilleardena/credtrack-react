import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./IctTechnicalSupport.css";

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
// ROUTES
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
// SUPPORT DATA
// =========================================================

const STATUSES = [
  "Open",
  "In progress",
  "Waiting",
  "Resolved",
];

const CATEGORIES = [
  "Account access",
  "Upload issue",
  "System error",
  "Email delivery",
  "Other",
];

const PRIORITIES = [
  "High",
  "Normal",
  "Low",
];

const minutesAgo = (minutes) =>
  new Date(Date.now() - minutes * 60000).toISOString();

const DEMO_TICKETS = [
  {
    id: "ICT-024",
    subject: "Unable to sign in to CredTrack",
    requester: "Maria Santos",
    email: "",
    category: "Account access",
    priority: "High",
    status: "Open",
    assignee: "Unassigned",
    createdAt: minutesAgo(12),
    description:
      "The sign-in page returns an error after entering the account details. The issue started this morning.",
    notes: [],
  },

  {
    id: "ICT-023",
    subject: "Document upload keeps failing",
    requester: "John Reyes",
    email: "",
    category: "Upload issue",
    priority: "Normal",
    status: "In progress",
    assignee: "ICT Personnel",
    createdAt: minutesAgo(35),
    description:
      "A PDF upload stops before completion. The user has tried signing out and signing in again.",
    notes: [
      {
        id: "n1",
        body:
          "Checking the upload service and configured file size limit.",
        author: "ICT Personnel",
        createdAt: minutesAgo(20),
      },
    ],
  },

  {
    id: "ICT-022",
    subject: "Password reset email is delayed",
    requester: "Ana Cruz",
    email: "",
    category: "Email delivery",
    priority: "High",
    status: "Open",
    assignee: "Unassigned",
    createdAt: minutesAgo(65),
    description:
      "The password reset email has not arrived. The user has checked the spam folder.",
    notes: [],
  },

  {
    id: "ICT-021",
    subject: "Error when opening the profile page",
    requester: "Elena Garcia",
    email: "",
    category: "System error",
    priority: "Normal",
    status: "Waiting",
    assignee: "ICT Personnel",
    createdAt: minutesAgo(180),
    description:
      "An intermittent error appears when opening the account profile.",
    notes: [
      {
        id: "n2",
        body:
          "Waiting for the browser version and steps that trigger the error.",
        author: "ICT Personnel",
        createdAt: minutesAgo(120),
      },
    ],
  },

  {
    id: "ICT-020",
    subject: "Account locked after login attempts",
    requester: "Marco Torres",
    email: "",
    category: "Account access",
    priority: "Normal",
    status: "Resolved",
    assignee: "ICT Personnel",
    createdAt: minutesAgo(1440),
    description:
      "The account was locked after several unsuccessful sign-in attempts.",
    notes: [
      {
        id: "n3",
        body:
          "Identity verified through the school process. User confirmed access was restored.",
        author: "ICT Personnel",
        createdAt: minutesAgo(1000),
      },
    ],
  },

  {
    id: "ICT-019",
    subject: "Page layout on a small screen",
    requester: "Carlo Mendoza",
    email: "",
    category: "Other",
    priority: "Low",
    status: "Resolved",
    assignee: "ICT Personnel",
    createdAt: minutesAgo(2880),
    description:
      "The user reported a display issue on a mobile browser.",
    notes: [
      {
        id: "n4",
        body:
          "Updated the layout and confirmed that the affected page is usable.",
        author: "ICT Personnel",
        createdAt: minutesAgo(1600),
      },
    ],
  },
];

// =========================================================
// HELPERS
// =========================================================

function displayDate(value) {
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

function tone(value) {
  return (
    {
      High: "red",
      Normal: "neutral",
      Low: "neutral",
      Open: "amber",
      "In progress": "blue",
      Waiting: "neutral",
      Resolved: "green",
    }[value] || "neutral"
  );
}

// =========================================================
// TECHNICAL SUPPORT COMPONENT
// =========================================================

export default function IctTechnicalSupport({
  snapshot,
  onAction,
  onLogout,
  onNavigate,
  routes = {},
  logoSrc = "/logo.png",
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const demo = snapshot == null;
  const active = "support";

  const [localTickets, setLocalTickets] =
    useState(() => DEMO_TICKETS);

  const tickets = demo
    ? localTickets
    : snapshot?.tickets ?? [];

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [menu, setMenu] =
    useState(null);

  const [notice, setNotice] =
    useState("");

  const [query, setQuery] =
    useState("");

  const [status, setStatus] =
    useState("All tickets");

  const [priority, setPriority] =
    useState("All priorities");

  const [category, setCategory] =
    useState("All categories");

  const [sort, setSort] =
    useState("Newest first");

  const [page, setPage] =
    useState(1);

  const [action, setAction] =
    useState(null);

  const [selectedId, setSelectedId] =
    useState(null);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const dialogRef =
    useRef(null);

  const actionTrigger =
    useRef(null);

  const submitting =
    useRef(false);

  const newButtonRef =
    useRef(null);

  const sidebarRef =
    useRef(null);

  const openButtonRef =
    useRef(null);

  const topbarRef =
    useRef(null);

  const previousMenuTrigger =
    useRef(null);

  // =========================================================
  // SELECTED TICKET
  // =========================================================

  const selectedTicket =
    tickets.find(
      (ticket) => ticket.id === selectedId
    );

  // =========================================================
  // TICKET STATISTICS
  // =========================================================

  const issues =
    tickets.filter(
      (ticket) =>
        ticket.priority === "High" &&
        ticket.status !== "Resolved"
    ).length;

  const counts = Object.fromEntries(
    STATUSES.map((value) => [
      value,
      tickets.filter(
        (ticket) => ticket.status === value
      ).length,
    ])
  );

  // =========================================================
  // FILTERED TICKETS
  // =========================================================

  const filtered = tickets
    .filter(
      (ticket) =>
        (status === "All tickets" ||
          ticket.status === status) &&
        (priority === "All priorities" ||
          ticket.priority === priority) &&
        (category === "All categories" ||
          ticket.category === category) &&
        [
          ticket.id,
          ticket.subject,
          ticket.requester,
          ticket.assignee,
        ]
          .join(" ")
          .toLowerCase()
          .includes(
            query.trim().toLowerCase()
          )
    )
    .sort((a, b) => {
      const newest =
        (Date.parse(b.createdAt) || 0) -
        (Date.parse(a.createdAt) || 0);

      if (sort === "Oldest first") {
        return -newest;
      }

      if (sort === "Priority first") {
        return (
          PRIORITIES.indexOf(a.priority) -
            PRIORITIES.indexOf(b.priority) ||
          newest
        );
      }

      return newest;
    });

  // =========================================================
  // PAGINATION
  // =========================================================
  // FIXED:
  // Previously this used "data.settings", but "data"
  // does not exist in this component.
  //
  // We now safely read the setting from "snapshot".
  // If no setting exists, it defaults to 10.
  // =========================================================

  const perPage =
    Number(
      snapshot?.settings?.rowsPerPage
    ) || 10;

  const pageCount = Math.max(
    1,
    Math.ceil(filtered.length / perPage)
  );

  const currentPage =
    Math.min(page, pageCount);

  const visibleTickets =
    filtered.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage
    );

  const canSave =
    demo || Boolean(onAction);

  // =========================================================
  // INTERNAL NOTES
  // =========================================================

  const notes = tickets
    .flatMap((ticket) =>
      (ticket.notes ?? []).map(
        (note) => ({
          ...note,
          ticketId: ticket.id,
          subject: ticket.subject,
        })
      )
    )
    .sort(
      (a, b) =>
        (Date.parse(b.createdAt) || 0) -
        (Date.parse(a.createdAt) || 0)
    )
    .slice(0, 3);

  // =========================================================
  // DIALOG EFFECT
  // =========================================================

  useEffect(() => {
    if (!action) return;

    const dialog =
      dialogRef.current;

    const fallbackTrigger =
      newButtonRef.current;

    const overflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }

      document.body.style.overflow =
        overflow;

      const trigger =
        actionTrigger.current;

      if (trigger?.isConnected) {
        trigger.focus();
      } else {
        fallbackTrigger?.focus();
      }
    };
  }, [action]);

  // =========================================================
  // OPEN NEW TICKET FROM NAVIGATION STATE
  // =========================================================

  useEffect(() => {
    if (
      location.state?.action !==
      "new-ticket"
    ) {
      return;
    }

    actionTrigger.current =
      newButtonRef.current;

    const openTimer =
      setTimeout(
        () => setAction("create"),
        0
      );

    const remainingState = {
      ...location.state,
    };

    delete remainingState.action;

    navigate(
      location.pathname +
        location.search +
        location.hash,
      {
        replace: true,
        state: remainingState,
      }
    );

    return () =>
      clearTimeout(openTimer);
  }, [location, navigate]);

  // =========================================================
  // OPEN TICKET
  // =========================================================

  function openTicket(ticket) {
    if (!ticket) return;

    actionTrigger.current =
      document.activeElement;

    setError("");
    setSelectedId(ticket.id);
    setAction("details");
  }

  // =========================================================
  // CREATE TICKET
  // =========================================================

  function openCreate() {
    actionTrigger.current =
      document.activeElement;

    setError("");
    setAction("create");
  }

  // =========================================================
  // CLOSE MODAL
  // =========================================================

  function closeAction() {
    if (!submitting.current) {
      setAction(null);
    }
  }

  // =========================================================
  // CLEAR FILTERS
  // =========================================================

  function clearFilters() {
    setQuery("");
    setStatus("All tickets");
    setPriority("All priorities");
    setCategory("All categories");
    setSort("Newest first");
    setPage(1);
  }

  // =========================================================
  // SHOW URGENT TICKETS
  // =========================================================

  function showUrgent() {
    clearFilters();

    setPriority("High");
    setStatus("All tickets");
    setMenu(null);

    document
      .getElementById("support-queue")
      ?.focus();

    document
      .getElementById("support-queue")
      ?.scrollIntoView({
        block: "start",
      });
  }

  // =========================================================
  // SUBMIT TICKET
  // =========================================================

  async function submitTicket(event) {
    event.preventDefault();

    if (
      submitting.current ||
      !canSave
    ) {
      return;
    }

    const values =
      Object.fromEntries(
        Array.from(
          new FormData(
            event.currentTarget
          ),
          ([key, value]) => [
            key,
            String(value).trim(),
          ]
        )
      );

    // CREATE VALIDATION
    if (
      action === "create" &&
      (
        !values.subject ||
        !values.requester ||
        !values.description
      )
    ) {
      setError(
        "Enter a requester, issue title, and description."
      );
      return;
    }

    // DETAILS VALIDATION
    if (
      action === "details" &&
      !selectedTicket
    ) {
      setError(
        "This ticket is no longer available."
      );
      return;
    }

    // RESOLUTION NOTE VALIDATION
    if (
      action === "details" &&
      values.status === "Resolved" &&
      selectedTicket.status !== "Resolved" &&
      !values.note
    ) {
      setError(
        "Add a resolution note before marking this ticket as resolved."
      );
      return;
    }

    // NO CHANGE VALIDATION
    if (
      action === "details" &&
      !values.note &&
      values.status ===
        selectedTicket.status &&
      values.priority ===
        selectedTicket.priority &&
      values.assignee ===
        (selectedTicket.assignee ||
          "Unassigned")
    ) {
      setError(
        "Change a field or add an internal note before saving."
      );
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError("");

    try {
      const now =
        new Date().toISOString();

      // CONNECTED MODE
      if (!demo) {
        await onAction(
          action === "create"
            ? "create-ticket"
            : "update-ticket",
          action === "create"
            ? values
            : {
                ...values,
                id: selectedTicket.id,
              }
        );
      }

      // DEMO CREATE
      else if (action === "create") {
        setLocalTickets(
          (previous) => [
            {
              ...values,
              id: `DEMO-${Date.now()}`,
              status: "Open",
              assignee: "Unassigned",
              createdAt: now,
              notes: [],
            },
            ...previous,
          ]
        );

        clearFilters();
      }

      // DEMO UPDATE
      else {
        setLocalTickets(
          (previous) =>
            previous.map(
              (ticket) =>
                ticket.id !==
                selectedTicket.id
                  ? ticket
                  : {
                      ...ticket,
                      status:
                        values.status,
                      priority:
                        values.priority,
                      assignee:
                        values.assignee ||
                        "Unassigned",
                      updatedAt: now,
                      notes:
                        values.note
                          ? [
                              ...(ticket.notes ??
                                []),
                              {
                                id: `note-${Date.now()}`,
                                body:
                                  values.note,
                                author:
                                  "ICT Personnel",
                                createdAt:
                                  now,
                              },
                            ]
                          : ticket.notes ??
                            [],
                    }
            )
        );
      }

      setNotice(
        demo
          ? `${
              action === "create"
                ? "Ticket created"
                : "Ticket updated"
            } in this demo session. Changes clear when the page reloads.`
          : "Request saved. Ticket details refresh through your connected data source."
      );

      setAction(null);
    } catch (failure) {
      setError(
        failure?.message ||
          "Could not save the ticket. Your changes are still here; please try again."
      );
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
      if (
        !onLogout &&
        !demo
      ) {
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
      sidebarRef.current.querySelectorAll(
        "button:not(:disabled)"
      );

    const first = nodes[0];

    const last =
      nodes[nodes.length - 1];

    if (
      event.shiftKey &&
      document.activeElement ===
        first
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement ===
        last
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="ict-dashboard ict-support-page">

      {/* SKIP LINK */}

      <a
        className="ict-skip"
        href="#support-main"
      >
        Skip to technical support
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

            {navigation.map(
              (item) => (
                <li
                  key={item.id}
                  className={
                    active ===
                    item.id
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
                      active ===
                      item.id
                        ? "page"
                        : undefined
                    }
                  >
                    <Icon
                      name={
                        item.icon
                      }
                    />

                    <span>
                      {item.label}
                    </span>

                    {active ===
                      item.id && (
                      <Icon
                        name="chevron"
                        width="12"
                        height="12"
                      />
                    )}
                  </button>
                </li>
              )
            )}

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
                aria-label={`Support alerts: ${issues}`}
                aria-expanded={
                  menu ===
                  "alerts"
                }
                aria-controls="ict-alerts"
                onClick={(
                  event
                ) => {
                  previousMenuTrigger.current =
                    event.currentTarget;

                  setMenu(
                    menu ===
                      "alerts"
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

              {menu ===
                "alerts" && (
                <section
                  id="ict-alerts"
                  className="principal-notification-dropdown ict-dropdown"
                  aria-label="Support alerts"
                >

                  <h3>
                    Support alerts
                  </h3>

                  <p>
                    {issues
                      ? `${issues} high-priority ticket${
                          issues ===
                          1
                            ? ""
                            : "s"
                        } need attention.`
                      : "No high-priority tickets are pending."}
                  </p>

                  <button
                    className="ict-text-button"
                    onClick={() =>
                      showUrgent()
                    }
                  >
                    View priority tickets

                    <Icon
                      name="chevron"
                    />
                  </button>

                </section>
              )}

            </div>

            {/* ACCOUNT */}

            <div className="principal-profile-wrapper">

              <button
                className="principal-profile"
                aria-expanded={
                  menu ===
                  "account"
                }
                aria-controls="ict-account"
                aria-label="ICT personnel account"
                onClick={(
                  event
                ) => {
                  previousMenuTrigger.current =
                    event.currentTarget;

                  setMenu(
                    menu ===
                      "account"
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

              {menu ===
                "account" && (
                <div
                  id="ict-account"
                  className="principal-profile-dropdown ict-dropdown"
                >


                  <button
                    className="ict-logout"
                    onClick={
                      logout
                    }
                  >
                    <Icon
                      name="logout"
                    />
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

        <main
          className="principal-content ict-overview ts-content"
          id="support-main"
          tabIndex={-1}
        >

          {/* PAGE HEADING */}

          <section className="ov-heading">

            <div>
              <div className="ov-eyebrow">
                ICT WORKSPACE{" "}
                <span>/</span>{" "}
                SUPPORT
              </div>

              <h1>
                Technical Support
              </h1>

              <p>
                Track issues, support your users, and keep work moving.
              </p>
            </div>

            <button
              ref={newButtonRef}
              type="button"
              className="ov-primary"
              onClick={
                openCreate
              }
            >
              <Icon name="plus" />
              New ticket
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

          {/* WELCOME */}

          <section
            className="ts-welcome"
            aria-label="Support overview"
          >

            <div className="ts-welcome-icon">
              <Icon
                name="support"
                width="30"
                height="30"
              />
            </div>

            <div>
              <span className="ov-pill">
                YOUR SUPPORT DESK
              </span>

              <h2>
                A little help goes a long way.
              </h2>

              <p>
                Review incoming requests and follow each issue through to resolution.
              </p>
            </div>

            <div className="ts-workload">

              <span
                className={`ix-badge ${
                  issues
                    ? "amber"
                    : "green"
                }`}
              >
                {issues
                  ? `${issues} high-priority ${
                      issues === 1
                        ? "ticket"
                        : "tickets"
                    }`
                  : "No urgent tickets"}
              </span>

              <small>
                {demo
                  ? "Demo workspace · sample tickets"
                  : "Connected support workspace"}
              </small>

            </div>

          </section>

          {/* METRICS */}

          <section
            className="ov-metrics ts-metrics"
            aria-label="Ticket status summary"
          >

            {STATUSES.map(
              (
                value,
                index
              ) => (
                <button
                  className="ov-metric"
                  key={value}
                  onClick={() => {
                    clearFilters();
                    setStatus(
                      value
                    );
                  }}
                  aria-pressed={
                    status ===
                    value
                  }
                >

                  <div className="ov-metric-head">

                    <span>
                      {value ===
                      "Open"
                        ? "Open tickets"
                        : value}
                    </span>

                    <span
                      className={`ov-icon ts-stat-${index}`}
                    >
                      <Icon
                        name={
                          [
                            "support",
                            "tools",
                            "clock",
                            "check",
                          ][
                            index
                          ]
                        }
                      />
                    </span>

                  </div>

                  <strong>
                    {
                      counts[
                        value
                      ]
                    }
                  </strong>

                  <div className="ov-metric-foot">

                    <span>
                      {
                        [
                          "Ready for review",
                          "Currently being handled",
                          "Awaiting more information",
                          "Issues successfully closed",
                        ][
                          index
                        ]
                      }
                    </span>

                    <Icon
                      name="chevron"
                      width="13"
                    />

                  </div>

                </button>
              )
            )}

          </section>

          {/* SUPPORT QUEUE */}

          <section
            className="ov-panel ts-queue"
            id="support-queue"
            tabIndex={-1}
            aria-labelledby="queue-title"
          >

            <div className="ov-panel-heading">

              <div>
                <h2 id="queue-title">
                  Support tickets{" "}
                  <span className="ts-total">
                    {tickets.length}
                  </span>
                </h2>

                <p className="ix-subtitle">
                  Everything you need to manage your support queue.
                </p>
              </div>

              <label className="ts-sort">

                <span className="ict-sr-only">
                  Sort tickets
                </span>

                <select
                  value={sort}
                  onChange={(
                    event
                  ) => {
                    setSort(
                      event.target.value
                    );
                    setPage(1);
                  }}
                >
                  <option>
                    Newest first
                  </option>

                  <option>
                    Oldest first
                  </option>

                  <option>
                    Priority first
                  </option>
                </select>

              </label>

            </div>

            {/* STATUS TABS */}

            <div
              className="ts-status-tabs"
              aria-label="Filter by status"
            >

              {[
                "All tickets",
                ...STATUSES,
              ].map(
                (value) => (
                  <button
                    key={value}
                    aria-pressed={
                      status ===
                      value
                    }
                    onClick={() => {
                      setStatus(
                        value
                      );
                      setPage(1);
                    }}
                  >
                    {value}

                    <span>
                      {value ===
                      "All tickets"
                        ? tickets.length
                        : counts[
                            value
                          ]}
                    </span>

                  </button>
                )
              )}

            </div>

            {/* FILTERS */}

            <div className="ts-filters">

              <label className="ix-search">

                <Icon
                  name="search"
                  width="17"
                />

                <span className="ict-sr-only">
                  Search by ticket, requester, or assignee
                </span>

                <input
                  type="search"
                  value={query}
                  onChange={(
                    event
                  ) => {
                    setQuery(
                      event.target.value
                    );
                    setPage(1);
                  }}
                  placeholder="Search tickets, names, or IDs…"
                />

              </label>

              <label>

                <span className="ict-sr-only">
                  Priority
                </span>

                <select
                  value={priority}
                  onChange={(
                    event
                  ) => {
                    setPriority(
                      event.target.value
                    );
                    setPage(1);
                  }}
                >
                  <option>
                    All priorities
                  </option>

                  {PRIORITIES.map(
                    (value) => (
                      <option
                        key={value}
                      >
                        {value}
                      </option>
                    )
                  )}
                </select>

              </label>

              <label>

                <span className="ict-sr-only">
                  Category
                </span>

                <select
                  value={category}
                  onChange={(
                    event
                  ) => {
                    setCategory(
                      event.target.value
                    );
                    setPage(1);
                  }}
                >
                  <option>
                    All categories
                  </option>

                  {CATEGORIES.map(
                    (value) => (
                      <option
                        key={value}
                      >
                        {value}
                      </option>
                    )
                  )}
                </select>

              </label>

              <button
                className="ov-text-link"
                onClick={
                  clearFilters
                }
              >
                Reset filters
              </button>

            </div>

            {/* TABLE */}

            <div
              className="ix-table-wrap"
              role="region"
              aria-label="Support ticket table"
              tabIndex={0}
            >

              <table className="ix-table ts-table">

                <caption className="ict-sr-only">
                  Filtered support tickets. Select an issue to view and update its details.
                </caption>

                <thead>
                  <tr>

                    <th scope="col">
                      Ticket / issue
                    </th>

                    <th scope="col">
                      Requested by
                    </th>

                    <th scope="col">
                      Priority
                    </th>

                    <th scope="col">
                      Status
                    </th>

                    <th scope="col">
                      Assigned to
                    </th>

                    <th scope="col">
                      Created
                    </th>

                    <th scope="col">
                      <span className="ict-sr-only">
                        Action
                      </span>
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {visibleTickets.map(
                    (ticket) => (
                      <tr
                        key={
                          ticket.id
                        }
                      >

                        <td>

                          <button
                            className="ts-ticket-link"
                            onClick={() =>
                              openTicket(
                                ticket
                              )
                            }
                          >
                            {
                              ticket.subject
                            }
                          </button>

                          <small>
                            {ticket.id}{" "}
                            <span aria-hidden="true">
                              ·
                            </span>{" "}
                            {
                              ticket.category
                            }
                          </small>

                        </td>

                        <td>

                          <div className="ts-person">

                            <span
                              className="ix-avatar"
                              aria-hidden="true"
                            >
                              {(
                                ticket.requester ||
                                "?"
                              )
                                .split(
                                  " "
                                )
                                .map(
                                  (
                                    part
                                  ) =>
                                    part[0]
                                )
                                .slice(
                                  0,
                                  2
                                )
                                .join(
                                  ""
                                )}
                            </span>

                            <span>
                              {
                                ticket.requester
                              }
                            </span>

                          </div>

                        </td>

                        <td>
                          <span
                            className={`ix-badge ${tone(
                              ticket.priority
                            )}`}
                          >
                            {
                              ticket.priority
                            }
                          </span>
                        </td>

                        <td>
                          <span
                            className={`ix-badge ${tone(
                              ticket.status
                            )}`}
                          >
                            {
                              ticket.status
                            }
                          </span>
                        </td>

                        <td>
                          {
                            ticket.assignee ||
                            "Unassigned"
                          }
                        </td>

                        <td className="ts-created">
                          {displayDate(
                            ticket.createdAt
                          )}
                        </td>

                        <td>

                          <button
                            className="ts-view"
                            onClick={() =>
                              openTicket(
                                ticket
                              )
                            }
                            aria-label={`View ticket ${ticket.id}`}
                          >
                            <Icon
                              name="chevron"
                              width="16"
                            />
                          </button>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

            {/* EMPTY STATE */}

            {!visibleTickets.length && (
              <div className="ts-empty">

                <span className="ov-action-icon">
                  <Icon name="search" />
                </span>

                <h3>
                  {tickets.length
                    ? "No tickets match your filters"
                    : "Your support queue is clear"}
                </h3>

                <p>
                  {tickets.length
                    ? "Try another keyword or reset the filters to see all requests."
                    : "New support requests will appear here when they are added."}
                </p>

                <button
                  className="ix-secondary"
                  onClick={
                    tickets.length
                      ? clearFilters
                      : openCreate
                  }
                >
                  {tickets.length
                    ? "Reset filters"
                    : "Create a ticket"}
                </button>

              </div>
            )}

            {/* PAGINATION */}

            <div className="ov-panel-footer ts-pagination">

              <span aria-live="polite">
                {filtered.length
                  ? `Showing ${
                      (currentPage -
                        1) *
                        perPage +
                      1
                    }–${Math.min(
                      currentPage *
                        perPage,
                      filtered.length
                    )} of ${
                      filtered.length
                    } tickets`
                  : "0 tickets"}
              </span>

              <div>

                <button
                  disabled={
                    currentPage ===
                    1
                  }
                  onClick={() =>
                    setPage(
                      currentPage -
                        1
                    )
                  }
                  aria-label="Previous page"
                >
                  ‹
                </button>

                <span>
                  Page{" "}
                  {currentPage}{" "}
                  of{" "}
                  {pageCount}
                </span>

                <button
                  disabled={
                    currentPage ===
                    pageCount
                  }
                  onClick={() =>
                    setPage(
                      currentPage +
                        1
                    )
                  }
                  aria-label="Next page"
                >
                  ›
                </button>

              </div>

            </div>

          </section>

          {/* BOTTOM GRID */}

          <div className="ts-bottom-grid">

            {/* LATEST NOTES */}

            <section
              className="ov-panel"
              aria-labelledby="updates-title"
            >

              <div className="ov-panel-heading">

                <h2 id="updates-title">
                  Latest internal notes
                </h2>

                <span className="ov-small-label">
                  SUPPORT ACTIVITY
                </span>

              </div>

              <div className="ts-notes-preview">

                {notes.map(
                  (note) => (
                    <button
                      key={`${note.ticketId}-${note.id}`}
                      onClick={() =>
                        openTicket(
                          tickets.find(
                            (
                              ticket
                            ) =>
                              ticket.id ===
                              note.ticketId
                          )
                        )
                      }
                    >

                      <span className="ts-note-dot" />

                      <span>

                        <strong>
                          {
                            note.ticketId
                          }{" "}
                          ·{" "}
                          {
                            note.subject
                          }
                        </strong>

                        <span>
                          {
                            note.body
                          }
                        </span>

                        <small>
                          {
                            note.author
                          }{" "}
                          ·{" "}
                          {displayDate(
                            note.createdAt
                          )}
                        </small>

                      </span>

                      <Icon
                        name="chevron"
                        width="14"
                      />

                    </button>
                  )
                )}

                {!notes.length && (
                  <p className="ov-empty">
                    Internal ticket notes will appear here.
                  </p>
                )}

              </div>

            </section>

            {/* SUPPORT GUIDE */}

            <aside className="ts-guide">

              <span className="ov-action-icon">
                <Icon name="check" />
              </span>

              <span className="ov-pill">
                A SIMPLE SUPPORT ROUTINE
              </span>

              <h2>
                Keep every request moving.
              </h2>

              <ol>

                <li>
                  <strong>
                    Review & prioritize
                  </strong>

                  <span>
                    Check the issue, impact, and user details.
                  </span>
                </li>

                <li>
                  <strong>
                    Assign & investigate
                  </strong>

                  <span>
                    Keep progress and internal notes up to date.
                  </span>
                </li>

                <li>
                  <strong>
                    Resolve & document
                  </strong>

                  <span>
                    Add the fix before marking a ticket resolved.
                  </span>
                </li>

              </ol>

            </aside>

          </div>

          {/* FOOTER */}

          <footer className="ov-footer">

            <span>
              CredTrack · Technical Support
            </span>

            <span>
              {demo
                ? "Demo mode · changes stay in this page session"
                : "ICT Personnel workspace"}
            </span>

          </footer>

        </main>

        {/* ===================================================
            TICKET MODAL
        =================================================== */}

        {action && (
          <dialog
            ref={dialogRef}
            className="ix-modal ts-modal"
            aria-labelledby="ticket-modal-title"
            aria-describedby="ticket-modal-description"
            onCancel={(event) => {
              event.preventDefault();
              closeAction();
            }}
          >

            <div className="ix-modal-heading">

              <span className="ov-action-icon">
                <Icon name="support" />
              </span>

              <button
                className="ix-close"
                aria-label="Close ticket"
                onClick={
                  closeAction
                }
                disabled={busy}
              >
                <Icon name="close" />
              </button>

            </div>

            <h2 id="ticket-modal-title">
              {action === "create"
                ? "Create a support ticket"
                : selectedTicket?.id ||
                  "Ticket unavailable"}
            </h2>

            <p id="ticket-modal-description">
              {action === "create"
                ? "Capture the issue so your team can follow it through."
                : "Review the issue and keep its progress up to date."}
            </p>

            {action === "details" &&
            !selectedTicket ? (
              <p>
                This ticket is no longer in the current data. Close this dialog to return to the queue.
              </p>
            ) : (
              <form
                onSubmit={
                  submitTicket
                }
                key={
                  action ===
                  "create"
                    ? "new-ticket"
                    : selectedTicket.id
                }
              >

                <fieldset
                  className="ix-fields"
                  disabled={
                    busy ||
                    !canSave
                  }
                >

                  {/* CREATE FORM */}

                  {action ===
                  "create" ? (
                    <>
                      <div className="ix-form-grid">

                        <label>
                          Requested by

                          <input
                            name="requester"
                            required
                            maxLength={
                              100
                            }
                            autoComplete="name"
                            placeholder="Full name"
                          />
                        </label>

                        <label>
                          Email (optional)

                          <input
                            name="email"
                            type="email"
                            maxLength={
                              254
                            }
                            autoComplete="email"
                            placeholder="School email address"
                          />
                        </label>

                      </div>

                      <label>
                        Issue title

                        <input
                          name="subject"
                          required
                          maxLength={
                            160
                          }
                          placeholder="e.g. Unable to sign in"
                        />
                      </label>

                      <div className="ix-form-grid">

                        <label>
                          Category

                          <select name="category">
                            {CATEGORIES.map(
                              (
                                value
                              ) => (
                                <option
                                  key={
                                    value
                                  }
                                >
                                  {
                                    value
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label>
                          Priority

                          <select
                            name="priority"
                            defaultValue="Normal"
                          >
                            {PRIORITIES.map(
                              (
                                value
                              ) => (
                                <option
                                  key={
                                    value
                                  }
                                >
                                  {
                                    value
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </label>

                      </div>

                      <label>
                        Description

                        <textarea
                          name="description"
                          rows={4}
                          required
                          maxLength={
                            3000
                          }
                          placeholder="What happened? Include error messages and steps to reproduce the issue."
                        />
                      </label>

                      <p className="ix-hint">
                        Include useful technical details. Keep passwords and credential documents out of the description.
                      </p>
                    </>
                  ) : (
                    <>
                      {/* TICKET DETAILS */}

                      <div className="ts-ticket-summary">

                        <span
                          className={`ix-badge ${tone(
                            selectedTicket.status
                          )}`}
                        >
                          {
                            selectedTicket.status
                          }
                        </span>

                        <h3>
                          {
                            selectedTicket.subject
                          }
                        </h3>

                        <div>
                          {
                            selectedTicket.requester
                          }{" "}
                          ·{" "}
                          {
                            selectedTicket.category
                          }
                        </div>

                        <small>
                          {selectedTicket.email ||
                            "No email provided"}{" "}
                          · Created{" "}
                          {displayDate(
                            selectedTicket.createdAt
                          )}
                        </small>

                        <p>
                          {
                            selectedTicket.description ||
                            "No description provided."
                          }
                        </p>

                      </div>

                      <div className="ix-form-grid">

                        <label>
                          Status

                          <select
                            name="status"
                            defaultValue={
                              selectedTicket.status
                            }
                          >
                            {STATUSES.map(
                              (
                                value
                              ) => (
                                <option
                                  key={
                                    value
                                  }
                                >
                                  {
                                    value
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </label>

                        <label>
                          Priority

                          <select
                            name="priority"
                            defaultValue={
                              selectedTicket.priority
                            }
                          >
                            {PRIORITIES.map(
                              (
                                value
                              ) => (
                                <option
                                  key={
                                    value
                                  }
                                >
                                  {
                                    value
                                  }
                                </option>
                              )
                            )}
                          </select>
                        </label>

                      </div>

                      <label>
                        Assigned to

                        <input
                          name="assignee"
                          defaultValue={
                            selectedTicket.assignee ||
                            "Unassigned"
                          }
                          maxLength={
                            100
                          }
                          placeholder="ICT staff member or Unassigned"
                        />
                      </label>

                      <label>
                        Internal note

                        <textarea
                          name="note"
                          rows={3}
                          maxLength={
                            3000
                          }
                          placeholder="Add an update, or explain the fix before resolving the ticket."
                        />
                      </label>

                      <p className="ix-hint">
                        Notes are internal. A resolution note is required when you first mark a ticket resolved.
                      </p>
                    </>
                  )}

                </fieldset>

                {/* NOTE HISTORY */}

                {action ===
                  "details" && (
                  <section
                    className="ts-note-history"
                    aria-label="Internal note history"
                  >

                    <h3>
                      Internal notes{" "}
                      <span>
                        {
                          selectedTicket
                            .notes
                            ?.length ||
                          0
                        }
                      </span>
                    </h3>

                    {(
                      selectedTicket.notes ??
                      []
                    ).map(
                      (note) => (
                        <article
                          key={
                            note.id
                          }
                        >

                          <div>

                            <strong>
                              {note.author ||
                                "ICT Personnel"}
                            </strong>

                            <small>
                              {displayDate(
                                note.createdAt
                              )}
                            </small>

                          </div>

                          <p>
                            {
                              note.body
                            }
                          </p>

                        </article>
                      )
                    )}

                    {!selectedTicket
                      .notes
                      ?.length && (
                      <p>
                        No internal notes yet.
                      </p>
                    )}

                  </section>
                )}

                {/* MODE NOTE */}

                <div className="ix-mode-note">

                  {demo
                    ? "Demo mode · Changes are saved only while this page remains open."
                    : canSave
                    ? "Changes will be sent to your connected ticket service."
                    : "Read-only · Connect onAction to create or update tickets."}

                </div>

                {/* ERROR */}

                <p
                  className={
                    error
                      ? "ts-error"
                      : "ict-sr-only"
                  }
                  role="alert"
                >
                  {error}
                </p>

                {/* MODAL FOOTER */}

                <div className="ix-modal-footer">

                  <button
                    type="button"
                    className="ix-secondary"
                    disabled={busy}
                    onClick={
                      closeAction
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="ov-primary"
                    disabled={
                      busy ||
                      !canSave
                    }
                  >
                    {busy
                      ? "Saving…"
                      : action ===
                        "create"
                      ? "Create ticket"
                      : "Save changes"}
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
