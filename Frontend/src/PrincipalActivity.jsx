import { logoutUser } from './auth/session';
import {usePortal} from './hooks/PortalContext';
import {auditRows,localDay} from './api/portalData';
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PrincipalActivity.css";

/* =========================================================
   ACTIVITY DATA
   ========================================================= */

function PrincipalActivity() {
  const system=usePortal();
  const activities=useMemo(()=>auditRows(system.data).filter(e=>e.role==='Principal').map(e=>({...e,date:new Date(e.created_at).toLocaleString(),day:localDay(e.created_at)===localDay(system.data.updatedAt)?'Today':localDay(e.created_at)===localDay(new Date(system.data.updatedAt).getTime()-86400000)?'Yesterday':'Earlier',action:e.action==='approve'?'Approved':e.action==='return'?'Returned':e.action==='Signed in'?'Signed In':e.action,title:e.action,requestId:e.requestId||e.target||'—',student:e.student||'—',result:e.action==='return'?'Needs Correction':'Success',source:'Principal Portal'})),[system.data]);
  const navigate = useNavigate();

  /* =======================================================
     UI STATES
     ======================================================= */

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  /* =======================================================
     FILTER STATES
     ======================================================= */

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");

  /* =======================================================
     ACTIVITY MODAL
     ======================================================= */

  const [selectedActivity, setSelectedActivity] = useState(null);

  /* =======================================================
     TOAST
     ======================================================= */

  const [toast, setToast] = useState("");

  /* =======================================================
     FILTER ACTIVITIES
     ======================================================= */

  const filteredActivities = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return activities.filter((activity) => {
      const searchableText = `
        ${activity.title || ""}
        ${activity.requestId || ""}
        ${activity.student || ""}
        ${activity.source || ""}
        ${activity.action || ""}
      `.toLowerCase();

      const matchesSearch =
        searchableText.includes(searchValue);

      const matchesAction =
        actionFilter === "all" ||
        activity.action === actionFilter;

      const matchesDate =
        dateFilter === "all" ||
        activity.day === dateFilter;

      const matchesResult =
        resultFilter === "all" ||
        activity.result === resultFilter;

      return (
        matchesSearch &&
        matchesAction &&
        matchesDate &&
        matchesResult
      );
    });
  }, [
    activities,
    search,
    actionFilter,
    dateFilter,
    resultFilter,
  ]);

  /* =======================================================
     TOAST
     ======================================================= */

  const showToast = (message) => {
    setToast(message);

    window.setTimeout(() => {
      setToast("");
    }, 2200);
  };

  /* =======================================================
     RESET FILTERS
     ======================================================= */

  const resetFilters = () => {
    setSearch("");
    setActionFilter("all");
    setDateFilter("all");
    setResultFilter("all");

    showToast("Activity filters reset");
  };

  /* =======================================================
     EXPORT ACTIVITIES
     ======================================================= */

  const exportActivities = () => {
    const rows = [
      [
        "Activity ID",
        "Date",
        "Action",
        "Request ID",
        "Student",
        "Result",
        "Source",
      ],
    ];

    filteredActivities.forEach((activity) => {
      rows.push([
        activity.id,
        activity.date,
        activity.action,
        activity.requestId,
        activity.student,
        activity.result,
        activity.source,
      ]);
    });

    const csv = rows
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(cell).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "principal-activity-log.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);

    showToast("Activity log exported as CSV");
  };

  /* =======================================================
     LOGOUT
     ======================================================= */

  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem("credtrackPrincipalSession");

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
     ACTION STYLE
     ======================================================= */

  const getActionStyle = (action) => {
    const styles = {
      Approved: {
        className: "action-approved",
        icon: "fa-circle-check",
      },

      Returned: {
        className: "action-returned",
        icon: "fa-rotate-left",
      },

      "Signed In": {
        className: "action-login",
        icon: "fa-right-to-bracket",
      },

      Viewed: {
        className: "action-viewed",
        icon: "fa-eye",
      },
    };

    return styles[action] || styles.Viewed;
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="principal-activity-page">

      {/* ===================================================
          MOBILE SIDEBAR OVERLAY
          =================================================== */}

      <div
        className={`sidebar-screen ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ===================================================
          SIDEBAR
          =================================================== */}

      <aside
        className={`activity-sidebar ${
          sidebarOpen ? "show" : ""
        }`}
      >

        {/* BRAND */}
        <div className="activity-brand">

          <img
            src="/logo.png"
            alt="PMRMIS-South school seal"
          />

          <div className="activity-brand-text">

            <h2>
              CredTrack
            </h2>

            <span>
              PMRMIS–SOUTH
            </span>

          </div>

          <button
            className="mobile-close"
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label="Close navigation"
          >
            <i className="fas fa-xmark" />
          </button>

        </div>



        {/* NAVIGATION */}
        <ul className="activity-nav">

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
          <li>

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
                7
              </b>

            </button>

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
          <li className="active">

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

  

      </aside>

      {/* ===================================================
          MAIN SHELL
          =================================================== */}

      <div className="activity-shell">

        {/* =================================================
            TOPBAR
            ================================================= */}

        <header className="activity-topbar">

          {/* LEFT */}
          <div className="top-left">

            <button
              className="menu-button"
              onClick={() =>
                setSidebarOpen(true)
              }
              aria-label="Open navigation"
            >
              <i className="fas fa-bars" />
            </button>

            <img
              className="school-seal"
              src="/logo.png"
              alt="PMRMIS-South school seal"
            />

            <div className="school">

              <strong>
                President Manuel Roxas Memorial Integrated School – South
              </strong>

              <span>
                Digital Credentials Management System
              </span>

            </div>

          </div>

          {/* RIGHT */}
          <div className="top-right">

            {/* NOTIFICATIONS */}
            <div className="notification-wrapper">

              <button
                className="bell"
                onClick={() => {
                  setNotificationOpen(
                    !notificationOpen
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
                <div className="notification-dropdown">

                  <div className="dropdown-header">

                    <strong>
                      Notifications
                    </strong>

                    <span>
                      3 new
                    </span>

                  </div>

                  <div className="notification-item">

                    <div className="notification-icon approved">

                      <i className="fas fa-file-signature" />

                    </div>

                    <div>

                      <strong>
                        New credential request
                      </strong>

                      <p>
                        REQ-2026-0127 is waiting for approval.
                      </p>

                      <small>
                        10 minutes ago
                      </small>

                    </div>

                  </div>

                  <div className="notification-item">

                    <div className="notification-icon warning">

                      <i className="fas fa-rotate-left" />

                    </div>

                    <div>

                      <strong>
                        Correction required
                      </strong>

                      <p>
                        REQ-2026-0118 needs additional records.
                      </p>

                      <small>
                        1 hour ago
                      </small>

                    </div>

                  </div>

                  <div className="notification-item">

                    <div className="notification-icon info">

                      <i className="fas fa-circle-info" />

                    </div>

                    <div>

                      <strong>
                        Activity recorded
                      </strong>

                      <p>
                        Your recent account activity was logged.
                      </p>

                      <small>
                        2 hours ago
                      </small>

                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* PROFILE */}
            <div className="profile-wrapper">

              <button
                className="profile-button"
                onClick={() => {
                  setProfileOpen(
                    !profileOpen
                  );

                  setNotificationOpen(false);
                }}
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
                <div className="profile-dropdown">

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

        <main className="activity-content">

          {/* PAGE HEADER */}
          <section className="page-heading">

            <div>

              <div className="page-title-row">

            
                <div>

                  <h1>
                    Approval History
                  </h1>

                  <p>
                    Review the Principal account's credential
                    decisions and security activity.
                  </p>

                </div>

              </div>

            </div>

            <button
              className="export-button"
              onClick={exportActivities}
            >

              <i className="fas fa-file-csv" />

              Export Activity

            </button>

          </section>

          {/* =================================================
              SUMMARY
              ================================================= */}

          <section className="summary-grid">

            <article className="summary-card all-actions">

              <div className="summary-icon">

                <i className="fas fa-list-check" />

              </div>

              <div>

                <span>
                  Total Activities
                </span>

                <strong>
                  {activities.length}
                </strong>

              </div>

            </article>

            <article className="summary-card approvals">

              <div className="summary-icon">

                <i className="fas fa-file-signature" />

              </div>

              <div>

                <span>
                  Approved This Month
                </span>

                <strong>
                  {activities.filter(e=>e.action==='Approved'&&localDay(e.created_at).slice(0,7)===localDay(system.data.updatedAt).slice(0,7)).length}
                </strong>

              </div>

            </article>

            <article className="summary-card returns">

              <div className="summary-icon">

                <i className="fas fa-rotate-left" />

              </div>

              <div>

                <span>
                  Returned for Correction
                </span>

                <strong>
                  {activities.filter(e=>e.action==='Returned').length}
                </strong>

              </div>

            </article>

            <article className="summary-card security">

              <div className="summary-icon">

                <i className="fas fa-shield-halved" />

              </div>

              <div>

                <span>
                  Account Sign-ins
                </span>

                <strong>
                  {activities.filter(e=>e.action==='Signed In').length}
                </strong>

              </div>

            </article>

          </section>

          {/* =================================================
              FILTERS
              ================================================= */}

          <section
            className="filter-card"
            aria-label="Activity filters"
          >

            {/* SEARCH */}
            <div className="control search-control">

              <i className="fas fa-magnifying-glass" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search request ID, student, or activity"
              />

            </div>

            {/* ACTION */}
            <div className="control">

              <select
                value={actionFilter}
                onChange={(event) =>
                  setActionFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  All Actions
                </option>

                <option value="Approved">
                  Approved
                </option>

                <option value="Returned">
                  Returned
                </option>

                <option value="Viewed">
                  Viewed
                </option>

                <option value="Signed In">
                  Signed In
                </option>

              </select>

            </div>

            {/* DATE */}
            <div className="control">

              <select
                value={dateFilter}
                onChange={(event) =>
                  setDateFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  All Dates
                </option>

                <option value="Today">
                  Today
                </option>

                <option value="Yesterday">
                  Yesterday
                </option>

                <option value="Earlier">
                  Earlier
                </option>

              </select>

            </div>

            {/* RESULT */}
            <div className="control">

              <select
                value={resultFilter}
                onChange={(event) =>
                  setResultFilter(
                    event.target.value
                  )
                }
              >

                <option value="all">
                  All Results
                </option>

                <option value="Success">
                  Success
                </option>

                <option value="Needs Correction">
                  Needs Correction
                </option>

              </select>

            </div>

            {/* RESET */}
            <button
              className="reset-button"
              onClick={resetFilters}
            >

              <i className="fas fa-rotate-left" />

              Reset

            </button>

          </section>

          {/* =================================================
              ACTIVITY TABLE
              ================================================= */}

          <section className="activity-panel">

            <div className="panel-heading">

              <div>

                <h2>
                  Principal Audit Trail
                </h2>

                <p>
                  Showing{" "}
                  {filteredActivities.length}{" "}
                  recorded{" "}
                  {filteredActivities.length === 1
                    ? "activity"
                    : "activities"}
                </p>

              </div>

              <span className="audit-status">

                <i className="fas fa-lock" />

                Read Only

              </span>

            </div>

            <div className="table-wrap">

              <table>

                <thead>

                  <tr>

                    <th>
                      DATE AND TIME
                    </th>

                    <th>
                      ACTIVITY
                    </th>

                    <th>
                      REQUEST ID
                    </th>

                    <th>
                      STUDENT
                    </th>

                    <th>
                      RESULT
                    </th>

                    <th>
                      DEVICE / SOURCE
                    </th>

                    <th>
                      DETAILS
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {filteredActivities.map(
                    (activity) => {
                      const style =
                        getActionStyle(
                          activity.action
                        );

                      const resultClass =
                        activity.result ===
                        "Success"
                          ? "success"
                          : "warning";

                      return (
                        <tr
                          key={
                            activity.id
                          }
                        >

                          <td>
                            {activity.date}
                          </td>

                          <td>

                            <div
                              className={`activity-cell ${style.className}`}
                            >

                              <span className="activity-icon">

                                <i
                                  className={`fas ${style.icon}`}
                                />

                              </span>

                              <div>

                                <strong>
                                  {activity.title}
                                </strong>

                                <small>
                                  {activity.action}
                                </small>

                              </div>

                            </div>

                          </td>

                          <td>
                            {activity.requestId}
                          </td>

                          <td>
                            {activity.student}
                          </td>

                          <td>

                            <span
                              className={`result-badge ${resultClass}`}
                            >
                              {activity.result}
                            </span>

                          </td>

                          <td>
                            {activity.source}
                          </td>

                          <td>

                            <button
                              type="button"
                              className="details-button"
                              onClick={() =>
                                setSelectedActivity(
                                  activity
                                )
                              }
                            >

                              <i className="fas fa-eye" />

                              View

                            </button>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

              {/* EMPTY STATE */}
              {filteredActivities.length === 0 && (
                <div className="empty-state">

                  <i className="far fa-folder-open" />

                  <h3>
                    No activities found
                  </h3>

                  <p>
                    No activities match the selected filters.
                  </p>

                  <button
                    type="button"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </button>

                </div>
              )}

            </div>

          </section>

          {/* =================================================
              AUDIT NOTE
              ================================================= */}

          <div className="audit-note">

            <div className="audit-note-icon">

              <i className="fas fa-lock" />

            </div>

            <span>
              Activity records are read-only and support
              accountability for official Principal decisions.
              Production audit logs should be stored securely
              on the server and must not be editable from this
              page.
            </span>

          </div>

        </main>

      </div>

      {/* ===================================================
          ACTIVITY MODAL
          =================================================== */}

      {selectedActivity && (
        <div
          className="modal-overlay show"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedActivity(null);
            }
          }}
        >

          <div className="activity-modal">

            {/* MODAL HEADER */}
            <div className="modal-heading">

              <div>

                <span className="modal-label">
                  AUDIT RECORD
                </span>

                <h2>
                  Activity Details
                </h2>

              </div>

              <button
                type="button"
                className="close-button"
                onClick={() =>
                  setSelectedActivity(null)
                }
                aria-label="Close activity details"
              >

                <i className="fas fa-xmark" />

              </button>

            </div>

            {/* MODAL BODY */}
            <div className="modal-body">

              <div className="modal-activity-header">

                <div className="modal-activity-icon">

                  <i
                    className={`fas ${
                      getActionStyle(
                        selectedActivity.action
                      ).icon
                    }`}
                  />

                </div>

                <div>

                  <strong>
                    {selectedActivity.title}
                  </strong>

                  <span>
                    {selectedActivity.action}
                  </span>

                </div>

              </div>

              {/* DETAILS */}
              <div className="detail-grid">

                <div className="detail">

                  <span>
                    Activity ID
                  </span>

                  <strong>
                    {selectedActivity.id}
                  </strong>

                </div>

                <div className="detail">

                  <span>
                    Date and Time
                  </span>

                  <strong>
                    {selectedActivity.date}
                  </strong>

                </div>

                <div className="detail">

                  <span>
                    Request ID
                  </span>

                  <strong>
                    {selectedActivity.requestId}
                  </strong>

                </div>

                <div className="detail">

                  <span>
                    Result
                  </span>

                  <strong>
                    {selectedActivity.result}
                  </strong>

                </div>

                <div className="detail">

                  <span>
                    Account
                  </span>

                  <strong>
                    Dr. Elena Reyes · Principal
                  </strong>

                </div>

                <div className="detail">

                  <span>
                    Source
                  </span>

                  <strong>
                    {selectedActivity.source}
                  </strong>

                </div>

              </div>

              {/* DESCRIPTION */}
              <div className="activity-description">

                <span>
                  Description
                </span>

                <p>
                  {selectedActivity.description}
                </p>

              </div>

            </div>

            {/* FOOTER */}
            <div className="modal-footer">

              <button
                type="button"
                onClick={() =>
                  setSelectedActivity(null)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ===================================================
          TOAST
          =================================================== */}

      <div
        className={`toast ${
          toast ? "show" : ""
        }`}
      >

        <i className="fas fa-circle-check" />

        {toast}

      </div>

    </div>
  );
}

/* =========================================================
   EXPORTS
   ========================================================= */

export { PrincipalActivity };

export default PrincipalActivity;