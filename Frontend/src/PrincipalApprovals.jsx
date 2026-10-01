import WorkflowSupport from './components/WorkflowSupport';
import useCredentialQueue from "./hooks/useCredentialQueue";
import RequestWorkflowDetails, { QueueNotice } from "./components/RequestWorkflowDetails";
import { logoutUser } from "./auth/session";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PrincipalApprovals.css";

function convertRequest(item) {
  return { ...item, name: item.full_name, verifiedBy: item.prepared_by || "Records Administrator",
    date: new Date(item.created_at).toLocaleDateString("en-US", {month: "long", day: "numeric", year: "numeric"}),
    grade: item.requester_type === "Student" ? [item.grade_level, item.section].filter(Boolean).join(" – ") : "Alumni · " + item.graduation_year,
    priority: "Ready for Approval", readyForApproval: item.status === "PRINCIPAL_REVIEW",
  };
}

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

  const queue = useCredentialQueue("PRINCIPAL");
  const requests = useMemo(() => queue.items.filter(item => item.status === "PRINCIPAL_REVIEW").map(convertRequest), [queue.items]);
  const [actionError, setActionError] = useState("");
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

  const todayKey = new Date().toDateString();
  const todayEvents = queue.items.flatMap(item => item.events).filter(event => new Date(event.created_at).toDateString() === todayKey);
  const approvedToday = todayEvents.filter(event => event.action === "approve").length;
  const returnedToday = todayEvents.filter(event => event.action === "return").length;

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
        ${request.reference || ""}
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

  const openReview = (request) => {
    if (!request?.readyForApproval) {
      showToast(
        "This request is waiting for Administrator verification."
      );
      return;
    }

    setActionError("");
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

  const finishReview = async (action) => {
    if (!currentRequest?.readyForApproval || queue.busy) return;
    setActionError("");
    try {
      const updated = await queue.perform(currentRequest, action === "approved" ? "approve" : "return", decisionNote);
      if (!updated) return;
      closeReview();
      showToast(action === "approved" ? "Approved and returned to Admin for final release confirmation." : "Returned to Admin for correction.");
    } catch (error) {
      setActionError(error.message);
    }
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

  const handleLogout = async () => {
    await logoutUser();
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
                  Principal
                  </strong>

      

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
          <QueueNotice queue={queue} loginPath="/principal-login" />
          <WorkflowSupport />

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

                {[...new Set(requests.map(item => item.credential))].map(credential => <option value={credential} key={credential}>{credential}</option>)}
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

                <option value="Ready for Approval">Ready for Approval</option>
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

                            <span className="request-id workflow-reference" title={request.reference}>
                              {request.reference || request.id}
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

            <h2 className="workflow-drawer-reference">
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
                  Prepared by {currentRequest.verifiedBy}. Review the preparation notes before making your decision.
                </p>

              </div>

            </div>

            <div className="principal-documents">
              <div className="principal-drawer-section-title"><div><span>ADMINISTRATOR VERIFICATION</span><h3>Preparation notes</h3></div></div>
              <div className="principal-file"><div className="principal-file-icon document"><i className="fas fa-file-lines" /></div><div className="workflow-preparation-note">{[...currentRequest.events].reverse().find(event => event.action === "submit_review")?.note || "No preparation notes provided."}</div></div>
            </div>
            <RequestWorkflowDetails request={currentRequest} />
            {actionError && <p className="request-workflow-notice request-workflow-error" role="alert">{actionError} Close and reopen the request if it has changed.</p>}

            {/* DECISION NOTE */}
            <div className="principal-decision-note">

              <label htmlFor="decisionNote">
                Principal Note
              </label>

              <textarea
                id="decisionNote"
                maxLength={2000}
                disabled={queue.busy}
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
                disabled={queue.busy}
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
                disabled={queue.busy}
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