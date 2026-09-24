import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PrincipalApprovals.css";

/* =========================================================
   SAMPLE REQUESTS
   ========================================================= */

const exampleRequests = [
  {
    id: "REQ-2026-0127",
    name: "Juan Dela Cruz",
    lrn: "136512340001",
    credential: "SF10 Permanent Record",
    verifiedBy: "Andrea Mendoza",
    date: "July 18, 2026",
    grade: "Grade 10 – Rizal",
    purpose: "College Admission",
    priority: "Overdue",
    readyForApproval: true,
  },
  {
    id: "REQ-2026-0126",
    name: "Sophia Garcia",
    lrn: "136512340006",
    credential: "Good Moral Certificate",
    verifiedBy: "Andrea Mendoza",
    date: "July 19, 2026",
    grade: "Grade 9 – Mabini",
    purpose: "Scholarship",
    priority: "Due Today",
    readyForApproval: true,
  },
  {
    id: "REQ-2026-0125",
    name: "Carlo Mendoza",
    lrn: "136512340005",
    credential: "Certificate of Enrollment",
    verifiedBy: "Andrea Mendoza",
    date: "July 20, 2026",
    grade: "Grade 8 – Luna",
    purpose: "School Transfer",
    priority: "Standard",
    readyForApproval: true,
  },
  {
    id: "REQ-2026-0124",
    name: "Bea Navarro",
    lrn: "136512340008",
    credential: "SF9 Report Card",
    verifiedBy: "Andrea Mendoza",
    date: "July 20, 2026",
    grade: "Grade 7 – Bonifacio",
    purpose: "Personal Copy",
    priority: "Standard",
    readyForApproval: true,
  },
  {
    id: "REQ-2026-0123",
    name: "Miguel Torres",
    lrn: "136512340011",
    credential: "SF10 Permanent Record",
    verifiedBy: "Liza Ramos",
    date: "July 18, 2026",
    grade: "Grade 10 – Mabini",
    purpose: "College Admission",
    priority: "Overdue",
    readyForApproval: true,
  },
  {
    id: "REQ-2026-0122",
    name: "Angela Reyes",
    lrn: "136512340014",
    credential: "Certificate of Enrollment",
    verifiedBy: "Liza Ramos",
    date: "July 20, 2026",
    grade: "Grade 11 – STEM",
    purpose: "Scholarship",
    priority: "Due Today",
    readyForApproval: true,
  },
  {
    id: "REQ-2026-0121",
    name: "Daniel Santos",
    lrn: "136512340017",
    credential: "Good Moral Certificate",
    verifiedBy: "Andrea Mendoza",
    date: "July 21, 2026",
    grade: "Grade 12 – HUMSS",
    purpose: "Employment",
    priority: "Standard",
    readyForApproval: true,
  },
];

/* =========================================================
   SAFE LOCAL STORAGE
   ========================================================= */

function readStoredRequests() {
  try {
    const stored = localStorage.getItem(
      "credtrackCredentialRequests"
    );

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (request) =>
        request !== null &&
        typeof request === "object"
    );
  } catch (error) {
    console.error(
      "CredTrack: Failed to read stored credential requests.",
      error
    );

    return [];
  }
}

/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatSubmittedDate(value) {
  if (!value) {
    return "Recently submitted";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently submitted";
  }

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* =========================================================
   CONVERT SUBMITTED REQUEST
   ========================================================= */

function convertSubmittedRequest(request) {
  const isVerified =
    request?.administratorVerification === "Verified";

  return {
    id:
      request?.id ||
      `REQ-${Date.now()}`,

    name:
      request?.fullName ||
      request?.studentName ||
      "Unknown Requester",

    lrn:
      request?.lrn ||
      "No LRN provided",

    credential:
      request?.credential ||
      "Credential Request",

    verifiedBy: isVerified
      ? "Records Administrator"
      : "Waiting for verification",

    date: formatSubmittedDate(
      request?.submittedAt
    ),

    grade:
      request?.details ||
      request?.lastSchoolYear ||
      request?.gradeSection ||
      "Not provided",

    purpose:
      request?.purpose ||
      "Not provided",

    priority: isVerified
      ? "Ready for Approval"
      : "Waiting for Verification",

    readyForApproval: isVerified,

    submittedFromPortal: true,
  };
}

/* =========================================================
   INITIALS
   ========================================================= */

function getInitials(name) {
  if (!name) {
    return "NA";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* =========================================================
   PRINCIPAL APPROVALS
   ========================================================= */

function PrincipalApprovals() {
  const navigate = useNavigate();

  /* =======================================================
     UI STATES
     ======================================================= */

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] =
    useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  /* =======================================================
     FILTERS
     ======================================================= */

  const [searchValue, setSearchValue] = useState("");
  const [credentialFilter, setCredentialFilter] =
    useState("all");
  const [priorityFilter, setPriorityFilter] =
    useState("all");

  /* =======================================================
     REQUESTS
     ======================================================= */

  const [requests, setRequests] = useState([]);
  const [currentRequest, setCurrentRequest] =
    useState(null);

  /* =======================================================
     DECISION NOTE
     ======================================================= */

  const [decisionNote, setDecisionNote] =
    useState("");

  /* =======================================================
     TOAST
     ======================================================= */

  const [toast, setToast] = useState({
    show: false,
    message: "",
  });

  /* =======================================================
     DAILY COUNTS
     ======================================================= */

  const [approvedToday, setApprovedToday] =
    useState(5);

  const [returnedToday, setReturnedToday] =
    useState(1);

  /* =======================================================
     LOAD REQUESTS
     ======================================================= */

  useEffect(() => {
    const storedRequests = readStoredRequests();

    const submittedRequests = storedRequests
      .filter(
        (request) =>
          request.status !== "Rejected" &&
          request.principalApproval !== "Approved"
      )
      .map(convertSubmittedRequest);

    const submittedIds = new Set(
      submittedRequests.map(
        (request) => request.id
      )
    );

    const sampleRequests = exampleRequests
      .filter(
        (request) =>
          !submittedIds.has(request.id)
      )
      .map((request) => ({
        ...request,
        readyForApproval: true,
      }));

    setRequests([
      ...submittedRequests,
      ...sampleRequests,
    ]);
  }, []);

  /* =======================================================
     BODY CLASS
     ======================================================= */

  useEffect(() => {
    document.body.classList.add(
      "principal-approvals-body"
    );

    return () => {
      document.body.classList.remove(
        "principal-approvals-body"
      );
    };
  }, []);

  /* =======================================================
     TODAY
     ======================================================= */

  const today = useMemo(() => {
    return new Date().toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );
  }, []);

  /* =======================================================
     FILTER REQUESTS
     ======================================================= */

  const filteredRequests = useMemo(() => {
    const search =
      searchValue.trim().toLowerCase();

    return requests.filter((request) => {
      const searchableText = `
        ${request.id || ""}
        ${request.name || ""}
        ${request.lrn || ""}
        ${request.credential || ""}
      `.toLowerCase();

      const matchesSearch =
        searchableText.includes(search);

      const matchesCredential =
        credentialFilter === "all" ||
        request.credential ===
          credentialFilter;

      const matchesPriority =
        priorityFilter === "all" ||
        request.priority ===
          priorityFilter;

      return (
        matchesSearch &&
        matchesCredential &&
        matchesPriority
      );
    });
  }, [
    requests,
    searchValue,
    credentialFilter,
    priorityFilter,
  ]);

  /* =======================================================
     COUNTS
     ======================================================= */

  const pendingCount = requests.length;

  const overdueCount = requests.filter(
    (request) =>
      request.priority === "Overdue"
  ).length;

  /* =======================================================
     TOAST
     ======================================================= */

  const showToast = (message) => {
    setToast({
      show: true,
      message,
    });

    window.setTimeout(() => {
      setToast({
        show: false,
        message: "",
      });
    }, 2300);
  };

  /* =======================================================
     UPDATE STORED REQUEST
     ======================================================= */

  const updateStoredRequest = (
    requestId,
    updates
  ) => {
    try {
      const storedRequests =
        readStoredRequests();

      const requestIndex =
        storedRequests.findIndex(
          (request) =>
            request.id === requestId
        );

      if (requestIndex === -1) {
        return;
      }

      const storedRequest =
        storedRequests[requestIndex];

      Object.assign(
        storedRequest,
        updates
      );

      storedRequest.audit =
        Array.isArray(
          storedRequest.audit
        )
          ? storedRequest.audit
          : [];

      storedRequest.audit.unshift({
        at: new Date().toISOString(),
        actor: "Principal",
        action:
          updates.principalApproval ===
          "Approved"
            ? "Credential request approved and authorized"
            : "Credential request returned for correction",
        note: decisionNote || "",
      });

      localStorage.setItem(
        "credtrackCredentialRequests",
        JSON.stringify(storedRequests)
      );
    } catch (error) {
      console.error(
        "CredTrack: Failed to update stored request.",
        error
      );
    }
  };

  /* =======================================================
     OPEN REVIEW
     ======================================================= */

  const openReview = (request) => {
    if (!request?.readyForApproval) {
      showToast(
        "This request is waiting for Administrator verification."
      );
      return;
    }

    setCurrentRequest(request);
    setDecisionNote("");
    setDrawerOpen(true);
  };

  /* =======================================================
     CLOSE REVIEW
     ======================================================= */

  const closeReview = () => {
    setDrawerOpen(false);

    window.setTimeout(() => {
      setCurrentRequest(null);
    }, 250);
  };

  /* =======================================================
     FINISH REVIEW
     ======================================================= */

  const finishReview = (action) => {
    if (
      !currentRequest ||
      !currentRequest.readyForApproval
    ) {
      return;
    }

    const completedRequest =
      currentRequest;

    setRequests((previousRequests) =>
      previousRequests.filter(
        (request) =>
          request.id !== completedRequest.id
      )
    );

    if (action === "approved") {
      updateStoredRequest(
        completedRequest.id,
        {
          status: "Approved",
          stage: "Principal Approved",
          principalApproval: "Approved",
        }
      );

      setApprovedToday(
        (value) => value + 1
      );

      showToast(
        `${completedRequest.id} approved and authorized`
      );
    } else {
      updateStoredRequest(
        completedRequest.id,
        {
          status:
            "Returned for Correction",
          stage:
            "Returned by Principal",
          principalApproval:
            "Returned for Correction",
        }
      );

      setReturnedToday(
        (value) => value + 1
      );

      showToast(
        `${completedRequest.id} returned for correction`
      );
    }

    closeReview();
  };

  /* =======================================================
     RESET
     ======================================================= */

  const resetFilters = () => {
    setSearchValue("");
    setCredentialFilter("all");
    setPriorityFilter("all");

    showToast("Filters reset");
  };

  /* =======================================================
     LOGOUT
     ======================================================= */

  const handleLogout = () => {
    sessionStorage.removeItem(
      "credtrackSession"
    );

    localStorage.removeItem(
      "credtrackPrincipalSession"
    );

    navigate("/");
  };

  /* =======================================================
     NAVIGATION
     ======================================================= */

  const navigateTo = (path) => {
    setSidebarOpen(false);
    setNotificationOpen(false);
    setProfileOpen(false);

    navigate(path);
  };

  /* =======================================================
     ESCAPE KEY
     ======================================================= */

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") {
        return;
      }

      setDrawerOpen(false);
      setSidebarOpen(false);
      setNotificationOpen(false);
      setProfileOpen(false);
    };

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="principal-approvals-page">

      {/* ===================================================
          SIDEBAR OVERLAY
          =================================================== */}

      <div
        className={`principal-sidebar-screen ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={() =>
          setSidebarOpen(false)
        }
      />

      {/* ===================================================
          SIDEBAR
          =================================================== */}

      <aside
        className={`principal-sidebar ${
          sidebarOpen ? "show" : ""
        }`}
      >

        {/* BRAND */}
        <div className="principal-brand">

          <img
            src="/logo.png"
            alt="PMRMIS-South school seal"
          />

          <div className="principal-brand-text">

            <h2>
              CredTrack
            </h2>

            <span>
              PMRMIS–SOUTH
            </span>

          </div>

          <button
            className="principal-mobile-close"
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label="Close navigation"
          >
            <i className="fas fa-xmark" />
          </button>

        </div>


        {/* NAVIGATION */}
        <nav className="principal-nav">

          <ul>

            {/* DASHBOARD */}
            <li>

              <button
                type="button"
                onClick={() =>
                  navigateTo(
                    "/principal-dashboard"
                  )
                }
              >

                <i className="fas fa-table-columns" />

                <span>
                  Dashboard
                </span>

              </button>

            </li>

            {/* APPROVALS */}
            <li className="active">

              <button
                type="button"
                onClick={() =>
                  navigateTo(
                    "/principal-approvals"
                  )
                }
              >

                <i className="fas fa-file-signature" />

                <span>
                  Credential Approvals
                </span>

                <b>
                  {pendingCount}
                </b>

              </button>

            </li>

            {/* STUDENT RECORDS */}
            <li>



            </li>

            {/* REPORTS */}
            <li>

              <button
                type="button"
                onClick={() =>
                  navigateTo(
                    "/principal-reports"
                  )
                }
              >

                <i className="fas fa-chart-line" />

                <span>
                  School Reports
                </span>

              </button>

            </li>

            {/* ACTIVITY */}
            <li>

              <button
                type="button"
                onClick={() =>
                  navigateTo(
                    "/principal-activity"
                  )
                }
              >

                <i className="fas fa-clock-rotate-left" />

                <span>
                  Approval History
                </span>

              </button>

            </li>




          </ul>

        </nav>


      </aside>

      {/* ===================================================
          MAIN SHELL
          =================================================== */}

      <div className="principal-shell">

        {/* TOPBAR */}
        <header className="principal-topbar">

          {/* LEFT */}
          <div className="principal-top-left">

            <button
              className="principal-menu-button"
              onClick={() =>
                setSidebarOpen(true)
              }
              aria-label="Open navigation"
            >
              <i className="fas fa-bars" />
            </button>

            <img
              className="principal-school-seal"
              src="/logo.png"
              alt="PMRMIS-South school seal"
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

          {/* RIGHT */}
          <div className="principal-top-right">

            {/* NOTIFICATIONS */}
            <div className="principal-notification-wrapper">

              <button
                className="principal-bell"
                onClick={() => {
                  setNotificationOpen(
                    (value) => !value
                  );

                  setProfileOpen(false);
                }}
                aria-label="Notifications"
              >

                <i className="far fa-bell" />

                <b>
                  3
                </b>

              </button>

              {notificationOpen && (
                <div className="principal-notification-dropdown">

                  <div className="principal-dropdown-header">

                    <div>

                      <strong>
                        Notifications
                      </strong>

                      <span>
                        Recent principal activities
                      </span>

                    </div>

                    <span className="principal-unread-count">
                      3 New
                    </span>

                  </div>

                  {/* NOTIFICATION 1 */}
                  <div className="principal-notification-item">

                    <div className="notification-icon approval">

                      <i className="fas fa-file-signature" />

                    </div>

                    <div>

                      <strong>
                        New request ready
                      </strong>

                      <span>
                        A verified credential request needs your review.
                      </span>

                      <small>
                        Just now
                      </small>

                    </div>

                  </div>

                  {/* NOTIFICATION 2 */}
                  <div className="principal-notification-item">

                    <div className="notification-icon warning">

                      <i className="fas fa-clock" />

                    </div>

                    <div>

                      <strong>
                        2 overdue requests
                      </strong>

                      <span>
                        Some requests have exceeded their expected review time.
                      </span>

                      <small>
                        Today
                      </small>

                    </div>

                  </div>

                  {/* NOTIFICATION 3 */}
                  <div className="principal-notification-item">

                    <div className="notification-icon success">

                      <i className="fas fa-circle-check" />

                    </div>

                    <div>

                      <strong>
                        Approval completed
                      </strong>

                      <span>
                        Recent credential approvals were recorded.
                      </span>

                      <small>
                        Today
                      </small>

                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* PROFILE */}
            <div className="principal-profile-wrapper">

              <button
                className="principal-profile"
                onClick={() =>
                  setProfileOpen(
                    (value) => !value
                  )
                }
              >

                <img
                  src="/logo.png"
                  alt="Principal profile"
                />

                <div>

                  <strong>
                    Dr. Elena Reyes
                  </strong>

                  <small>
                    School Principal
                  </small>

                </div>

                <i className="fas fa-chevron-down" />

              </button>

              {profileOpen && (
                <div className="principal-profile-dropdown">


                  <button
                    type="button"
                    onClick={handleLogout}
                  >

                    <i className="fas fa-right-from-bracket" />

                    Logout

                  </button>

                </div>
              )}

            </div>

          </div>

        </header>

        {/* =================================================
            CONTENT
            ================================================= */}

        <main className="principal-content">

          {/* PAGE HEADER */}
          <section className="principal-page-heading">

            <div>

              <div className="principal-breadcrumb">

                <span>
                  Principal Portal
                </span>

                <i className="fas fa-chevron-right" />

                <strong>
                  Credential Approvals
                </strong>

              </div>

              <h1>
                Credential Approvals
              </h1>

              <p>
                Review requests verified by the Records Administrator
                before official authorization.
              </p>

            </div>

            <div className="principal-date">

              <i className="far fa-calendar" />

              <span>
                {today}
              </span>

            </div>

          </section>

          {/* SUMMARY */}
          <section className="principal-summary-grid">

            {/* AWAITING */}
            <article className="principal-summary-card pending">

              <div className="principal-summary-icon">

                <i className="fas fa-clock" />

              </div>

              <div>

                <span>
                  Awaiting Approval
                </span>

                <strong>
                  {pendingCount}
                </strong>

                <small>
                  Requests waiting for review
                </small>

              </div>

            </article>

            {/* OVERDUE */}
            <article className="principal-summary-card overdue">

              <div className="principal-summary-icon">

                <i className="fas fa-triangle-exclamation" />

              </div>

              <div>

                <span>
                  Overdue
                </span>

                <strong>
                  {overdueCount}
                </strong>

                <small>
                  Requests needing attention
                </small>

              </div>

            </article>

            {/* APPROVED */}
            <article className="principal-summary-card approved">

              <div className="principal-summary-icon">

                <i className="fas fa-circle-check" />

              </div>

              <div>

                <span>
                  Approved Today
                </span>

                <strong>
                  {approvedToday}
                </strong>

                <small>
                  Requests authorized today
                </small>

              </div>

            </article>

            {/* RETURNED */}
            <article className="principal-summary-card returned">

              <div className="principal-summary-icon">

                <i className="fas fa-rotate-left" />

              </div>

              <div>

                <span>
                  Returned Today
                </span>

                <strong>
                  {returnedToday}
                </strong>

                <small>
                  Requests sent for correction
                </small>

              </div>

            </article>

          </section>

          {/* FILTERS */}
          <section className="principal-filter-card">

            {/* SEARCH */}
            <div className="principal-control principal-search-control">

              <i className="fas fa-magnifying-glass" />

              <input
                type="search"
                value={searchValue}
                onChange={(event) =>
                  setSearchValue(
                    event.target.value
                  )
                }
                placeholder="Search by student, LRN, or request ID"
              />

            </div>

            {/* CREDENTIAL FILTER */}
            <div className="principal-control">

              <select
                value={credentialFilter}
                onChange={(event) =>
                  setCredentialFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  All Credentials
                </option>

                <option value="SF10 Permanent Record">
                  SF10 Permanent Record
                </option>

                <option value="SF9 Report Card">
                  SF9 Report Card
                </option>

                <option value="Good Moral Certificate">
                  Good Moral Certificate
                </option>

                <option value="Certificate of Enrollment">
                  Certificate of Enrollment
                </option>

              </select>

            </div>

            {/* PRIORITY FILTER */}
            <div className="principal-control">

              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  All Priorities
                </option>

                <option value="Overdue">
                  Overdue
                </option>

                <option value="Due Today">
                  Due Today
                </option>

                <option value="Standard">
                  Standard
                </option>

                <option value="Ready for Approval">
                  Ready for Approval
                </option>

                <option value="Waiting for Verification">
                  Waiting for Verification
                </option>

              </select>

            </div>

            {/* RESET */}
            <button
              type="button"
              className="principal-reset-button"
              onClick={resetFilters}
            >

              <i className="fas fa-rotate-left" />

              Reset

            </button>

          </section>

          {/* REQUEST PANEL */}
          <section className="principal-request-panel">

            <div className="principal-panel-heading">

              <div>

                <div className="principal-section-label">

                  <span />

                  PRINCIPAL REVIEW QUEUE

                </div>

                <h2>
                  Verified Requests
                </h2>

                <p>
                  Showing{" "}
                  {filteredRequests.length}{" "}
                  request
                  {filteredRequests.length === 1
                    ? ""
                    : "s"}{" "}
                  visible to the Principal.
                </p>

              </div>

              <div className="principal-panel-count">

                <i className="fas fa-file-signature" />

                <span>
                  {pendingCount} Pending
                </span>

              </div>

            </div>

            <div className="principal-table-wrap">

              <table className="principal-table">

                <thead>

                  <tr>

                    <th>
                      REQUEST ID
                    </th>

                    <th>
                      STUDENT
                    </th>

                    <th>
                      CREDENTIAL
                    </th>

                    <th>
                      VERIFIED BY
                    </th>

                    <th>
                      DATE FILED
                    </th>

                    <th>
                      PRIORITY
                    </th>

                    <th>
                      ACTION
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredRequests.map(
                    (request) => {

                      const statusClass =
                        request.priority ===
                        "Overdue"
                          ? "overdue-status"
                          : request.priority ===
                            "Due Today"
                          ? "today-status"
                          : request.priority ===
                            "Standard"
                          ? "standard-status"
                          : "ready-status";

                      const reviewLabel =
                        request.readyForApproval
                          ? "Review"
                          : "Waiting";

                      return (
                        <tr
                          key={request.id}
                        >

                          {/* REQUEST ID */}
                          <td>

                            <span className="request-id">
                              {request.id}
                            </span>

                          </td>

                          {/* STUDENT */}
                          <td>

                            <div className="principal-student">

                              <span className="principal-student-avatar">

                                {getInitials(
                                  request.name
                                )}

                              </span>

                              <div>

                                <strong>
                                  {request.name}
                                </strong>

                                <small>
                                  LRN{" "}
                                  {request.lrn}
                                </small>

                              </div>

                            </div>

                          </td>

                          {/* CREDENTIAL */}
                          <td>

                            <span className="credential-name">

                              {request.credential}

                            </span>

                          </td>

                          {/* VERIFIED BY */}
                          <td>

                            <div className="verified-person">

                              <i className="fas fa-circle-check" />

                              <span>
                                {request.verifiedBy}
                              </span>

                            </div>

                          </td>

                          {/* DATE */}
                          <td>

                            <span className="date-text">
                              {request.date}
                            </span>

                          </td>

                          {/* PRIORITY */}
                          <td>

                            <span
                              className={`principal-status ${statusClass}`}
                            >

                              <i
                                className={
                                  request.priority ===
                                  "Overdue"
                                    ? "fas fa-triangle-exclamation"
                                    : request.priority ===
                                      "Due Today"
                                    ? "fas fa-clock"
                                    : request.priority ===
                                      "Standard"
                                    ? "fas fa-minus"
                                    : "fas fa-circle-check"
                                }
                              />

                              {request.priority}

                            </span>

                          </td>

                          {/* ACTION */}
                          <td>

                            <button
                              type="button"
                              className={`principal-review-button ${
                                !request.readyForApproval
                                  ? "disabled"
                                  : ""
                              }`}
                              disabled={
                                !request.readyForApproval
                              }
                              onClick={() =>
                                openReview(
                                  request
                                )
                              }
                            >

                              <i
                                className={
                                  request.readyForApproval
                                    ? "fas fa-eye"
                                    : "fas fa-clock"
                                }
                              />

                              {reviewLabel}

                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

              {/* EMPTY STATE */}
              {filteredRequests.length === 0 && (
                <div className="principal-empty-state">

                  <div className="principal-empty-icon">

                    <i className="far fa-folder-open" />

                  </div>

                  <h3>
                    No requests found
                  </h3>

                  <p>
                    No verified requests match your selected filters.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                  >
                    Clear Filters
                  </button>

                </div>
              )}

            </div>

            {/* TABLE FOOTER */}
            <div className="principal-table-footer">

              <span>

                <i className="fas fa-shield-halved" />

                Only administrator-verified requests can be approved.

              </span>

              <span>

                {filteredRequests.length} of{" "}
                {pendingCount} requests

              </span>

            </div>

          </section>

        </main>

      </div>

      {/* ===================================================
          DRAWER OVERLAY
          =================================================== */}

      <div
        className={`principal-drawer-overlay ${
          drawerOpen ? "show" : ""
        }`}
        onClick={closeReview}
      />

      {/* ===================================================
          REVIEW DRAWER
          =================================================== */}

      <aside
        className={`principal-review-drawer ${
          drawerOpen ? "show" : ""
        }`}
      >

        <div className="principal-drawer-heading">

          <div>

            <small>
              PRINCIPAL REVIEW
            </small>

            <h2>
              {currentRequest?.id ||
                "Credential Review"}
            </h2>

          </div>

          <button
            type="button"
            className="principal-close-button"
            onClick={closeReview}
            aria-label="Close review"
          >

            <i className="fas fa-xmark" />

          </button>

        </div>

        {currentRequest && (
          <>

            {/* STUDENT PROFILE */}
            <div className="principal-drawer-profile">

              <span className="principal-drawer-avatar">

                {getInitials(
                  currentRequest.name
                )}

              </span>

              <div>

                <h3>
                  {currentRequest.name}
                </h3>

                <p>
                  LRN{" "}
                  {currentRequest.lrn}
                </p>

              </div>

              <span className="principal-verified-badge">

                <i className="fas fa-circle-check" />

                Verified

              </span>

            </div>

            {/* DETAILS */}
            <div className="principal-detail-grid">

              <div className="principal-detail">

                <span>
                  Credential
                </span>

                <strong>
                  {currentRequest.credential}
                </strong>

              </div>

              <div className="principal-detail">

                <span>
                  Date Filed
                </span>

                <strong>
                  {currentRequest.date}
                </strong>

              </div>

              <div className="principal-detail">

                <span>
                  Grade and Section
                </span>

                <strong>
                  {currentRequest.grade}
                </strong>

              </div>

              <div className="principal-detail">

                <span>
                  Purpose
                </span>

                <strong>
                  {currentRequest.purpose}
                </strong>

              </div>

            </div>

            {/* VERIFICATION */}
            <div className="principal-verification">

              <div className="principal-verification-icon">

                <i className="fas fa-shield-check" />

              </div>

              <div>

                <strong>
                  Records verification completed
                </strong>

                <p>
                  The Records Administrator verified the student's
                  identity, enrollment record, and supporting files.
                </p>

              </div>

            </div>

            {/* DOCUMENTS */}
            <div className="principal-documents">

              <div className="principal-drawer-section-title">

                <div>

                  <span>
                    DOCUMENTS
                  </span>

                  <h3>
                    Supporting Documents
                  </h3>

                </div>

                <span className="document-count">
                  2 Files
                </span>

              </div>

              {/* FILE 1 */}
              <div className="principal-file">

                <div className="principal-file-icon pdf">

                  <i className="fas fa-file-pdf" />

                </div>

                <div className="principal-file-info">

                  <strong>
                    Verified Request Form.pdf
                  </strong>

                  <small>
                    Verified · 1.2 MB
                  </small>

                </div>

                <button
                  type="button"
                  aria-label="View verified request form"
                >

                  <i className="fas fa-eye" />

                </button>

              </div>

              {/* FILE 2 */}
              <div className="principal-file">

                <div className="principal-file-icon document">

                  <i className="fas fa-file-lines" />

                </div>

                <div className="principal-file-info">

                  <strong>
                    Student Record Summary.pdf
                  </strong>

                  <small>
                    Verified · 940 KB
                  </small>

                </div>

                <button
                  type="button"
                  aria-label="View student record summary"
                >

                  <i className="fas fa-eye" />

                </button>

              </div>

            </div>

            {/* DECISION NOTE */}
            <div className="principal-decision-note">

              <label htmlFor="decisionNote">
                Principal Note
              </label>

              <textarea
                id="decisionNote"
                value={decisionNote}
                onChange={(event) =>
                  setDecisionNote(
                    event.target.value
                  )
                }
                placeholder="Add an approval note or explain why the request must be corrected."
              />

            </div>

            {/* DECISION BUTTONS */}
            <div className="principal-decision-actions">

              <button
                type="button"
                className="principal-return-button"
                onClick={() =>
                  finishReview("returned")
                }
              >

                <i className="fas fa-rotate-left" />

                Return for Correction

              </button>

              <button
                type="button"
                className="principal-approve-button"
                onClick={() =>
                  finishReview("approved")
                }
              >

                <i className="fas fa-file-signature" />

                Approve and Authorize

              </button>

            </div>

          </>
        )}

      </aside>

      {/* ===================================================
          TOAST
          =================================================== */}

      <div
        className={`principal-toast ${
          toast.show ? "show" : ""
        }`}
      >

        <div className="principal-toast-icon">

          <i className="fas fa-circle-check" />

        </div>

        <span>
          {toast.message}
        </span>

      </div>

    </div>
  );
}

/* =========================================================
   DEFAULT EXPORT
   ========================================================= */

export default PrincipalApprovals;