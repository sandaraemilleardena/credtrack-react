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
  const activities=useMemo(()=>auditRows(system.data).map(e=>({...e,date:new Date(e.created_at).toLocaleString(),day:localDay(e.created_at)===localDay(system.data.updatedAt)?'Today':localDay(e.created_at)===localDay(new Date(system.data.updatedAt).getTime()-86400000)?'Yesterday':'Earlier',action:e.action==='approve'?'Approved':e.action==='collect'?'Released':e.action==='Signed in'?'Signed In':e.action,title:e.action,requestId:e.requestId||e.target||'—',student:e.student||'—',result:e.action==='collect'?'Completed':'Success',source:e.role+' activity'})),[system.data]);
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
        (dateFilter === "month" ? localDay(activity.created_at).slice(0,7)===localDay(system.data.updatedAt).slice(0,7) : activity.day === dateFilter);

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

      Released: {
        className: "action-released",
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



      {/* ===================================================
          SIDEBAR
          =================================================== */}



      {/* ===================================================
          MAIN SHELL
          =================================================== */}

      <div className="activity-shell">

        {/* =================================================
            TOPBAR
            ================================================= */}



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
                    School Activity History
                  </h1>

                  <p>
                    Review the school's credential
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

            <article role="button" tabIndex={0} onClick={()=>{setActionFilter('all');setDateFilter('all');}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActionFilter('all');setDateFilter('all');}}} className="summary-card all-actions">

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

            <article role="button" tabIndex={0} onClick={()=>{setActionFilter('Approved');setDateFilter('month');}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActionFilter('Approved');setDateFilter('month');}}} className="summary-card approvals">

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

            <article role="button" tabIndex={0} onClick={()=>{setActionFilter('Released');setDateFilter('all');}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActionFilter('Released');setDateFilter('all');}}} className="summary-card returns">

              <div className="summary-icon">

                <i className="fas fa-rotate-left" />

              </div>

              <div>

                <span>
                  Credentials Released
                </span>

                <strong>
                  {activities.filter(e=>e.action==='Released').length}
                </strong>

              </div>

            </article>

            <article role="button" tabIndex={0} onClick={()=>{setActionFilter('Signed In');setDateFilter('all');}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setActionFilter('Signed In');setDateFilter('all');}}} className="summary-card security">

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

                <option value="Released">
                  Released
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
                </option><option value="month">This Month</option>

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
                  School Activity Audit Trail
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

              <table className="school-activity-table">

                <thead>

                  <tr>

                    <th>
                      DATE AND TIME
                    </th>

                    <th>
                      ACTIVITY
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
              accountability for school personnel activity.
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
                    {selectedActivity.actor || system.data.user.name}
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
