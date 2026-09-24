import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PrincipalDashboard.css";

/* =========================================================
   SAMPLE DATA
   ========================================================= */

const initialRequests = [
  {
    id: "REQ-2026-0127",
    name: "Juan Dela Cruz",
    lrn: "136512340001",
    credential: "SF10 Permanent Record",
    date: "July 18, 2026",
    grade: "Grade 12",
    status: "Pending",
    priority: "High",
  },
  {
    id: "REQ-2026-0126",
    name: "Maria Santos",
    lrn: "136512340002",
    credential: "Certificate of Enrollment",
    date: "July 18, 2026",
    grade: "Grade 11",
    status: "Pending",
    priority: "Normal",
  },
  {
    id: "REQ-2026-0125",
    name: "Mark Anthony Cruz",
    lrn: "136512340003",
    credential: "Good Moral Certificate",
    date: "July 17, 2026",
    grade: "Grade 10",
    status: "Approved",
    priority: "Normal",
  },
  {
    id: "REQ-2026-0124",
    name: "Angela Mae Reyes",
    lrn: "136512340004",
    credential: "SF9 Report Card",
    date: "July 17, 2026",
    grade: "Grade 9",
    status: "Approved",
    priority: "Normal",
  },
  {
    id: "REQ-2026-0123",
    name: "Kevin Garcia",
    lrn: "136512340005",
    credential: "Certificate of Appearance",
    date: "July 16, 2026",
    grade: "Grade 8",
    status: "Returned",
    priority: "Normal",
  },
];

const recentActivities = [
  {
    icon: "fa-check",
    title: "Credential approved",
    description: "SF10 for Mark Anthony Cruz was approved.",
    time: "10 minutes ago",
  },
  {
    icon: "fa-file-circle-check",
    title: "Request submitted",
    description: "New SF10 request from Juan Dela Cruz.",
    time: "35 minutes ago",
  },
  {
    icon: "fa-rotate-left",
    title: "Request returned",
    description: "Certificate request returned for correction.",
    time: "1 hour ago",
  },
  {
    icon: "fa-user",
    title: "Student record viewed",
    description: "Student record was accessed.",
    time: "2 hours ago",
  },
];

const authorizedCredentials = [
  "SF9 Report Card",
  "SF10 Permanent Record",
  "Good Moral Certificate",
  "Certificate of Enrollment",
  "Certificate of Appearance",
  "Diploma",
  "Transcript of Records",
];

const completionData = [
  {
    label: "Approved",
    value: 54,
  },
  {
    label: "Pending",
    value: 32,
  },
  {
    label: "Released",
    value: 35,
  },
];

/* =========================================================
   COMPONENT
   ========================================================= */

function PrincipalDashboard() {
  const navigate = useNavigate();

  const [requests, setRequests] = useState(initialRequests);
  const [currentRequest, setCurrentRequest] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [toast, setToast] = useState(null);
  const [decisionNote, setDecisionNote] = useState("");

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  /* =========================================================
     DATE
     ========================================================= */

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  /* =========================================================
     HELPERS
     ========================================================= */

  const initials = (name) => {
    if (!name) return "P";

    return name
      .split(" ")
      .filter(Boolean)
      .map((word) => word.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const showToast = (message, type = "success") => {
    setToast({
      message,
      type,
    });
  };

  const goTo = (path) => {
    setSidebarOpen(false);
    setNotificationsOpen(false);
    setProfileOpen(false);
    navigate(path);
  };

  /* =========================================================
     REQUEST HANDLERS
     ========================================================= */

  const openRequest = (request) => {
    setCurrentRequest(request);
    setDecisionNote("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setCurrentRequest(null);
    setDecisionNote("");
  };

  const finishRequest = (requestId, newStatus, message) => {
    setRequests((previousRequests) =>
      previousRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status: newStatus,
            }
          : request
      )
    );

    closeDrawer();
    showToast(message);
  };

  const handleApprove = () => {
    if (!currentRequest) return;

    finishRequest(
      currentRequest.id,
      "Approved",
      `${currentRequest.id} has been approved successfully.`
    );
  };

  const handleReturn = () => {
    if (!currentRequest) return;

    if (!decisionNote.trim()) {
      showToast(
        "Please provide a reason before returning the request.",
        "error"
      );
      return;
    }

    finishRequest(
      currentRequest.id,
      "Returned",
      `${currentRequest.id} has been returned for correction.`
    );
  };

  /* =========================================================
     LOGOUT
     ========================================================= */

  const handleLogout = () => {
    sessionStorage.removeItem("credtrackSession");

    setProfileOpen(false);
    setNotificationsOpen(false);
    setSidebarOpen(false);
    setDrawerOpen(false);

    navigate("/");
  };

  /* =========================================================
     ESCAPE KEY
     ========================================================= */

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setSidebarOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  /* =========================================================
     TOAST AUTO CLOSE
     ========================================================= */

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [toast]);

  /* =========================================================
     BODY SCROLL CONTROL
     ========================================================= */

  useEffect(() => {
    if (drawerOpen || sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen, sidebarOpen]);

  /* =========================================================
     CLICK OUTSIDE DROPDOWNS
     ========================================================= */

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest(".notification-wrapper") &&
        !event.target.closest(".profile-menu")
      ) {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="principal-dashboard">

      {/* =====================================================
          MOBILE SIDEBAR OVERLAY
          ===================================================== */}

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside
        className={`principal-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        {/* BRAND */}
        <div className="principal-brand">
          <div className="principal-brand-logo">
            <img src="/logo.png" alt="PMRMIS-SOUTH Logo" />
          </div>

          <div className="principal-brand-text">
            <strong>CredTrack</strong>
            <span>PMRMIS-SOUTH</span>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="principal-navigation">


          <ul>
            <li>
              <button
                type="button"
                className="principal-nav-item active"
                onClick={() => goTo("/principal-dashboard")}
              >
                <i className="fas fa-chart-pie"></i>
                <span>Dashboard</span>
              </button>
            </li>

            <li>
              <button
                type="button"
                className="principal-nav-item"
                onClick={() => goTo("/principal-approvals")}
              >
                <i className="fas fa-file-signature"></i>
                <span>Credential Approvals</span>
                <span className="nav-badge">7</span>
              </button>
            </li>



            <li>
              <button
                type="button"
                className="principal-nav-item"
                onClick={() => goTo("/principal-reports")}
              >
                <i className="fas fa-chart-column"></i>
                <span>School Reports</span>
              </button>
            </li>

            <li>
              <button
                type="button"
                className="principal-nav-item"
                onClick={() => goTo("/principal-activity")}
              >
                <i className="fas fa-clock-rotate-left"></i>
                <span>Approval History</span>
              </button>
            </li>
          </ul>
        </nav>

      </aside>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <main className="principal-main">

        {/* ===================================================
            TOPBAR
            =================================================== */}

        <header className="principal-topbar">

          {/* MOBILE MENU */}
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <i className="fas fa-bars"></i>
          </button>

          {/* SCHOOL TITLE */}
          <div className="topbar-school">
            <div className="topbar-school-logo">
              <img src="/logo.png" alt="PMRMIS-SOUTH Logo" />
            </div>

            <div className="topbar-school-text">
              <strong>
                President Manuel Roxas Memorial Integrated School – South
              </strong>

              <span>Principal Administration Portal</span>
            </div>
          </div>

          {/* TOPBAR ACTIONS */}
          <div className="topbar-actions">

            {/* NOTIFICATIONS */}
            <div className="notification-wrapper">
              <button
                type="button"
                className="topbar-icon-button"
                onClick={(event) => {
                  event.stopPropagation();
                  setNotificationsOpen((previous) => !previous);
                  setProfileOpen(false);
                }}
                aria-label="Notifications"
              >
                <i className="fas fa-bell"></i>
                <span className="notification-count">3</span>
              </button>

              {notificationsOpen && (
                <div className="notification-dropdown">

                  <div className="dropdown-header">
                    <div>
                      <strong>Notifications</strong>
                      <span>Recent system updates</span>
                    </div>

                    <span className="dropdown-count">3</span>
                  </div>

                  <div className="notification-list">

                    <button
                      type="button"
                      className="notification-item"
                      onClick={() =>
                        goTo("/principal-approvals")
                      }
                    >
                      <div className="notification-icon">
                        <i className="fas fa-file-signature"></i>
                      </div>

                      <div>
                        <strong>New credential request</strong>

                        <span>
                          Juan Dela Cruz submitted an SF10 request.
                        </span>

                        <small>35 minutes ago</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="notification-item"
                      onClick={() =>
                        goTo("/principal-approvals")
                      }
                    >
                      <div className="notification-icon">
                        <i className="fas fa-clock"></i>
                      </div>

                      <div>
                        <strong>Pending approval</strong>

                        <span>
                          4 credential requests require your review.
                        </span>

                        <small>1 hour ago</small>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="notification-item"
                      onClick={() =>
                        goTo("/principal-activity")
                      }
                    >
                      <div className="notification-icon">
                        <i className="fas fa-check"></i>
                      </div>

                      <div>
                        <strong>Credential approved</strong>

                        <span>
                          Mark Anthony Cruz&apos;s credential was approved.
                        </span>

                        <small>2 hours ago</small>
                      </div>
                    </button>

                  </div>

                  <button
                    type="button"
                    className="notification-footer-button"
                    onClick={() =>
                      goTo("/principal-activity")
                    }
                  >
                    View Approval History
                  </button>
                </div>
              )}
            </div>

            {/* PROFILE */}
            <div className="profile-menu">

              <button
                type="button"
                className="profile-button"
                onClick={(event) => {
                  event.stopPropagation();
                  setProfileOpen((previous) => !previous);
                  setNotificationsOpen(false);
                }}
              >
  <img
                  src="/logo.png"
                  alt="Principal profile"
                />

                <div className="profile-info">
                  <strong>Principal</strong>
                  <span>School Principal</span>
                </div>

                <i className="fas fa-chevron-down profile-arrow"></i>
              </button>

              {profileOpen && (
                <div className="profile-dropdown">

      

                  <div className="profile-dropdown-content">

                    <button
                      type="button"
                      className="profile-dropdown-item dropdown-logout"
                      onClick={handleLogout}
                    >
                      <i className="fas fa-right-from-bracket"></i>
                      <span>Logout</span>
                    </button>

                  </div>

                </div>
              )}

            </div>

          </div>
        </header>

        {/* ===================================================
            DASHBOARD CONTENT
            =================================================== */}

        <section className="principal-content">

          {/* PAGE HEADING */}
          <div className="principal-page-heading">

            <div className="heading-text">
              <span className="page-eyebrow">
                PRINCIPAL DASHBOARD
              </span>

              <h1>Good day, Principal!</h1>

              <p>
                Review credential requests, monitor approvals,
                and manage school records.
              </p>
            </div>

            <div className="page-date">
              <i className="far fa-calendar"></i>
              <span>{today}</span>
            </div>

          </div>

          {/* =================================================
              PRIORITY CALLOUT
              ================================================= */}

          <div className="priority-callout">

            <div className="priority-icon">
              <i className="fas fa-file-signature"></i>
            </div>

            <div className="priority-content">
              <span className="priority-label">
                ACTION REQUIRED
              </span>

              <h3>
                4 credential requests are awaiting approval
              </h3>

              <p>
                Review and approve requests before they proceed
                to document preparation and release.
              </p>
            </div>

            <button
              type="button"
              className="priority-button"
              onClick={() =>
                goTo("/principal-approvals")
              }
            >
              Review Requests
              <i className="fas fa-arrow-right"></i>
            </button>

          </div>

          {/* =================================================
              SIGNATURE AREA
              ================================================= */}

          <div className="principal-signature-banner">

            <div className="signature-icon">
              <i className="fas fa-pen-nib"></i>
            </div>

            <div className="signature-content">
              <strong>Principal Authorization</strong>

              <span>
                Your approval authorizes the processing of
                requested school credentials.
              </span>
            </div>

            <div className="signature-status">
              <i className="fas fa-circle-check"></i>
              <span>Authorized</span>
            </div>

          </div>

          {/* =================================================
              METRICS
              ================================================= */}

          <div className="principal-metrics-grid">

            <div className="principal-metric-card">
              <div className="metric-card-icon">
                <i className="fas fa-folder-open"></i>
              </div>

              <div className="metric-card-content">
                <span>Total Requests</span>
                <strong>121</strong>

                <small className="metric-positive">
                  <i className="fas fa-arrow-up"></i>
                  12% from last month
                </small>
              </div>
            </div>

            <div className="principal-metric-card">
              <div className="metric-card-icon pending-icon">
                <i className="fas fa-hourglass-half"></i>
              </div>

              <div className="metric-card-content">
                <span>Pending Approval</span>
                <strong>32</strong>

                <small>
                  4 require your attention
                </small>
              </div>
            </div>

            <div className="principal-metric-card">
              <div className="metric-card-icon approved-icon">
                <i className="fas fa-circle-check"></i>
              </div>

              <div className="metric-card-content">
                <span>Approved</span>
                <strong>54</strong>

                <small>This month</small>
              </div>
            </div>

            <div className="principal-metric-card">
              <div className="metric-card-icon released-icon">
                <i className="fas fa-file-circle-check"></i>
              </div>

              <div className="metric-card-content">
                <span>Released</span>
                <strong>35</strong>

                <small>This month</small>
              </div>
            </div>

          </div>

          {/* =================================================
              FIRST GRID
              ================================================= */}

          <div className="principal-dashboard-grid">

            {/* RECENT REQUESTS */}
            <div className="principal-panel requests-panel">

              <div className="panel-header">

                <div>
                  <span className="panel-eyebrow">
                    CREDENTIAL REQUESTS
                  </span>

                  <h2>Recent Requests</h2>
                </div>

                <button
                  type="button"
                  className="panel-link"
                  onClick={() =>
                    goTo("/principal-approvals")
                  }
                >
                  View All
                  <i className="fas fa-arrow-right"></i>
                </button>

              </div>

              <div className="request-table-wrapper">

                <table className="request-table">

                  <thead>
                    <tr>
                      <th>REQUEST</th>
                      <th>STUDENT</th>
                      <th>CREDENTIAL</th>
                      <th>STATUS</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>

                    {requests.slice(0, 5).map((request) => (
                      <tr key={request.id}>

                        <td>
                          <div className="request-id">
                            {request.id}
                          </div>

                          <span className="request-date">
                            {request.date}
                          </span>
                        </td>

                        <td>
                          <div className="student-cell">

                            <div className="student-avatar">
                              {initials(request.name)}
                            </div>

                            <div>
                              <strong>{request.name}</strong>
                              <span>{request.lrn}</span>
                            </div>

                          </div>
                        </td>

                        <td>
                          <div className="credential-cell">
                            <strong>
                              {request.credential}
                            </strong>

                            <span>
                              {request.grade}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`status-badge ${request.status
                              .toLowerCase()
                              .replace(" ", "-")}`}
                          >
                            <span className="status-dot"></span>
                            {request.status}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="table-action-button"
                            onClick={() =>
                              openRequest(request)
                            }
                            aria-label={`View ${request.id}`}
                          >
                            <i className="fas fa-chevron-right"></i>
                          </button>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            </div>

            {/* COMPLETION */}
            <div className="principal-panel completion-panel">

              <div className="panel-header">

                <div>
                  <span className="panel-eyebrow">
                    REQUEST OVERVIEW
                  </span>

                  <h2>Monthly Completion</h2>
                </div>

                <button
                  type="button"
                  className="panel-more-button"
                  aria-label="More options"
                >
                  <i className="fas fa-ellipsis"></i>
                </button>

              </div>

              <div className="completion-content">

                <div className="completion-circle">

                  <div className="completion-circle-inner">
                    <strong>73%</strong>
                    <span>Completed</span>
                  </div>

                </div>

                <div className="completion-legend">

                  {completionData.map((item) => (
                    <div
                      className="completion-legend-item"
                      key={item.label}
                    >
                      <div>
                        <span
                          className={`legend-dot ${item.label
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        ></span>

                        <span>{item.label}</span>
                      </div>

                      <strong>{item.value}</strong>
                    </div>
                  ))}

                </div>

              </div>

              <div className="completion-footer">

                <span>
                  <i className="fas fa-arrow-up"></i>
                  8.4%
                </span>

                <p>
                  Completion rate compared to last month
                </p>

              </div>

            </div>

          </div>

          {/* =================================================
              SECOND GRID
              ================================================= */}

          <div className="principal-dashboard-grid secondary-grid">

            {/* RECENT ACTIVITY */}
            <div className="principal-panel activity-panel">

              <div className="panel-header">

                <div>
                  <span className="panel-eyebrow">
                    SYSTEM ACTIVITY
                  </span>

                  <h2>Recent Activity</h2>
                </div>

                <button
                  type="button"
                  className="panel-link"
                  onClick={() =>
                    goTo("/principal-activity")
                  }
                >
                  View History
                  <i className="fas fa-arrow-right"></i>
                </button>

              </div>

              <div className="activity-list">

                {recentActivities.map((activity, index) => (
                  <div
                    className="activity-item"
                    key={`${activity.title}-${index}`}
                  >

                    <div className="activity-icon">
                      <i
                        className={`fas ${activity.icon}`}
                      ></i>
                    </div>

                    <div className="activity-details">
                      <strong>{activity.title}</strong>
                      <span>{activity.description}</span>
                    </div>

                    <small>{activity.time}</small>

                  </div>
                ))}

              </div>

            </div>

            {/* AUTHORIZED CREDENTIALS */}
            <div className="principal-panel credentials-panel">

              <div className="panel-header">

                <div>
                  <span className="panel-eyebrow">
                    AUTHORIZATION
                  </span>

                  <h2>Credential Types</h2>
                </div>

                <div className="authorized-icon">
                  <i className="fas fa-shield-halved"></i>
                </div>

              </div>

              <p className="credentials-description">
                Credentials currently authorized for principal
                approval.
              </p>

              <div className="credential-tags">

                {authorizedCredentials.map((credential) => (
                  <span
                    className="credential-tag"
                    key={credential}
                  >
                    <i className="fas fa-check"></i>
                    {credential}
                  </span>
                ))}

              </div>

            </div>

          </div>

        </section>
      </main>

      {/* =====================================================
          REQUEST DRAWER
          ===================================================== */}

      {drawerOpen && currentRequest && (
        <div className="request-drawer-overlay">

          <div
            className="request-drawer-backdrop"
            onClick={closeDrawer}
          ></div>

          <aside className="request-drawer">

            <div className="drawer-header">

              <div>
                <span className="drawer-eyebrow">
                  CREDENTIAL REQUEST
                </span>

                <h2>{currentRequest.id}</h2>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={closeDrawer}
                aria-label="Close request"
              >
                <i className="fas fa-xmark"></i>
              </button>

            </div>

            <div className="drawer-body">

              {/* STUDENT */}
              <div className="drawer-student">

                <div className="drawer-student-avatar">
                  {initials(currentRequest.name)}
                </div>

                <div>
                  <strong>{currentRequest.name}</strong>
                  <span>{currentRequest.lrn}</span>
                </div>

              </div>

              {/* DETAILS */}
              <div className="drawer-section">

                <div className="drawer-section-title">
                  <i className="fas fa-file-lines"></i>
                  <span>Request Details</span>
                </div>

                <div className="drawer-details-grid">

                  <div className="drawer-detail">
                    <span>Credential</span>
                    <strong>
                      {currentRequest.credential}
                    </strong>
                  </div>

                  <div className="drawer-detail">
                    <span>Grade Level</span>
                    <strong>
                      {currentRequest.grade}
                    </strong>
                  </div>

                  <div className="drawer-detail">
                    <span>Date Requested</span>
                    <strong>
                      {currentRequest.date}
                    </strong>
                  </div>

                  <div className="drawer-detail">
                    <span>Priority</span>
                    <strong>
                      {currentRequest.priority}
                    </strong>
                  </div>

                  <div className="drawer-detail">
                    <span>Status</span>

                    <span
                      className={`status-badge ${currentRequest.status
                        .toLowerCase()
                        .replace(" ", "-")}`}
                    >
                      <span className="status-dot"></span>
                      {currentRequest.status}
                    </span>
                  </div>

                </div>

              </div>

              {/* DECISION */}
              <div className="drawer-section">

                <div className="drawer-section-title">
                  <i className="fas fa-comment-dots"></i>
                  <span>Decision Note</span>
                </div>

                <textarea
                  className="decision-textarea"
                  placeholder="Add a note or reason if returning this request..."
                  value={decisionNote}
                  onChange={(event) =>
                    setDecisionNote(event.target.value)
                  }
                ></textarea>

              </div>

            </div>

            {/* DRAWER FOOTER */}
            <div className="drawer-footer">

              <button
                type="button"
                className="drawer-return-button"
                onClick={handleReturn}
              >
                <i className="fas fa-rotate-left"></i>
                Return
              </button>

              <button
                type="button"
                className="drawer-approve-button"
                onClick={handleApprove}
              >
                <i className="fas fa-check"></i>
                Approve Request
              </button>

            </div>

          </aside>
        </div>
      )}

      {/* =====================================================
          TOAST
          ===================================================== */}

      {toast && (
        <div
          className={`principal-toast ${
            toast.type === "error"
              ? "toast-error"
              : ""
          }`}
        >

          <div className="toast-icon">
            <i
              className={`fas ${
                toast.type === "error"
                  ? "fa-circle-exclamation"
                  : "fa-circle-check"
              }`}
            ></i>
          </div>

          <span>{toast.message}</span>

          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Close notification"
          >
            <i className="fas fa-xmark"></i>
          </button>

        </div>
      )}

    </div>
  );
}

export default PrincipalDashboard;
