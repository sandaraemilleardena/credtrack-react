import VerificationUpload from './components/VerificationUpload';
import WorkflowSupport from './components/WorkflowSupport';
import useCredentialQueue from "./hooks/useCredentialQueue";
import RequestWorkflowDetails, { QueueNotice } from "./components/RequestWorkflowDetails";
import { logoutUser } from "./auth/session";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AdministrationCredManagement.css";

const ADMIN_ACTIONS = {
  SUBMITTED: [["submit_review", "Confirm Student Information"], ["prepare", "Start preparation"], ["unavailable", "Unavailable / needs information"]],
  PREPARING: [["submit_review", "Confirm Student Information"], ["unavailable", "Unavailable / needs information"]],
  UNAVAILABLE: [["prepare", "Resume preparation"]],
  RETURNED: [["prepare", "Correct and prepare again"], ["unavailable", "Unavailable / needs information"]],
  PRINCIPAL_APPROVED: [["ready", "Confirm ready for release & queue SMS"]],
  READY: [["collect", "Record collection"]],
};
const STATUS_LABELS = { SUBMITTED: "Submitted", PREPARING: "Preparing", UNAVAILABLE: "Unavailable / needs information", PRINCIPAL_REVIEW: "Principal review", RETURNED: "Returned for correction", PRINCIPAL_APPROVED: "Principal approved", READY: "Ready for release", COLLECTED: "Collected" };
function convertRequest(item) {
  return { ...item, name: item.full_name, type: item.credential,
    stage: item.status, status: item.status_label,
    badgeClass: ["PRINCIPAL_APPROVED", "READY"].includes(item.status) ? "approved" : item.status === "COLLECTED" ? "released" : "pending",
    date: new Date(item.created_at).toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"}),
    grade: item.requester_type === "Student" ? [item.grade_level, item.section].filter(Boolean).join(" – ") : "Alumni · " + item.graduation_year,
  };
}

function getInitials(name) {
  return name
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
}

function AdministrationCredManagement() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = useMemo(
    () => [
      { label: "Dashboard", icon: "fa-table-columns", path: "/admin-dashboard" },
      { label: "Credential Management", icon: "fa-folder-open", path: "/admin-credential-management" },
      { label: "Student Records", icon: "fa-user-graduate", path: "/admin-student-records" },
      { label: "Reports", icon: "fa-chart-line", path: "/admin-reports" },
      { label: "Activity Logs", icon: "fa-clock-rotate-left", path: "/admin-activity-logs" },
      { label: "System Settings", icon: "fa-gear", path: "/admin-settings" },
    ],
    []
  );

  const isActiveRoute = (path) =>
    path === "/admin-dashboard"
      ? location.pathname === path || location.pathname === `${path}/`
      : location.pathname.startsWith(path);

  const goTo = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const queue = useCredentialQueue("ADMIN");
  const requests = useMemo(() => queue.items.map(convertRequest), [queue.items]);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionError, setActionError] = useState("");
  const [page, setPage] = useState(1);
  const recentEvents = requests.flatMap(request => request.events.map(event => ({ ...event, requestName: request.name, requestId: request.id }))).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0,3);
  const credentialTypes = [...new Set(requests.map(request => request.type))];

  const notify = (message) => {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 2400);
  };

  const filteredRequests = useMemo(() => {
    const q = search.toLowerCase().trim();

    return requests.filter((request) => {
      if (request.status === "Rejected") return false;

      const matchesSearch =
        !q ||
        `${request.reference} ${request.name} ${request.lrn}`
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        statusFilter === "all" || request.stage === statusFilter;

      const matchesType =
        typeFilter === "all" || request.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, search, statusFilter, typeFilter]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setAdminMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const closeAdminMenu = () => setAdminMenuOpen(false);

    document.addEventListener("click", closeAdminMenu);

    return () => {
      document.removeEventListener("click", closeAdminMenu);
    };
  }, []);

  const openRequest = (id) => {
    const request = requests.find((item) => item.id === id);

    if (!request) return;

    setCurrentRequest(request);
    setPendingAction(null);
    setActionError("");
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    const focused = document.activeElement;
    document.body.style.overflow = 'hidden';
    document.querySelector('.credential-management-page .drawer .close')?.focus();
    return () => { document.body.style.overflow = previous; focused?.focus?.(); };
  }, [drawerOpen]);

  const closeDrawer = () => {
    setDrawerOpen(false);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleOverlayClick = () => {
    closeDrawer();
    closeSidebar();
  };

  const handleApprove = async () => {
    if (!currentRequest || !pendingAction || queue.busy) return;
    setActionError("");
    try {
      const updated = await queue.perform(currentRequest, pendingAction[0], "");
      if (!updated) return;
      setCurrentRequest(convertRequest(updated));
      setPendingAction(null);
      notify(updated.status_label);
    } catch (error) {
      setActionError(error.message);
      setPendingAction(null);
    }
  };

  const handleReset = () => {
    setSearch("");
    setPage(1);
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const handlePrint = (id) => {
    openRequest(id);
    notify("Review the request details. Credential document generation is not yet connected.");
  };

  const handleExport = () => {
    const cell = value => '"' + String(value ?? "").replace(/^[=+@-]/, "'" + String(value ?? "")[0]).replaceAll('"', '""') + '"';
    const rows = [["Request ID", "Requester", "LRN", "Credential", "Status"], ...filteredRequests.map(item => [item.reference, item.name, item.lrn, item.type, item.status])];
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "credential-requests.csv"; link.click(); URL.revokeObjectURL(url);
    notify("Credential request list exported");
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate("/");
  };

  return (
    <div className="credential-management-page">
            {/* Shared dashboard sidebar */}
      <button
        type="button"
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        aria-label="Close navigation menu"
        onClick={closeSidebar}
      />

      <aside
        className={`sidebar ${sidebarOpen ? "open" : ""}`}
        aria-label="Administrator navigation"
      >
        <div className="brand">
          <div className="brand-logo">
            <img src="/logo.png" alt="PMRMIS-South logo" />
          </div>
          <div className="brand-copy">
            <h2>CredTrack</h2>
            <span>PMRMIS–SOUTH</span>
          </div>
          <button type="button" className="close-sidebar" aria-label="Close sidebar" onClick={closeSidebar}>
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <nav className="sidebar-navigation" aria-label="Administrator navigation">
          <ul className="menu">
            {navigationItems.map((item) => (
              <li className={`menu-item ${isActiveRoute(item.path) ? "active" : ""}`} key={item.path}>
                <button type="button" className="menu-link" onClick={() => goTo(item.path)}>
                  <span className="menu-icon"><i className={`fas ${item.icon}`}></i></span>
                  <span className="menu-text">{item.label}</span>
                  {isActiveRoute(item.path) && <span className="active-indicator"><i className="fas fa-chevron-right"></i></span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Keep the existing overlay for the request drawer only. */}
      {drawerOpen && <div className="overlay show" onClick={handleOverlayClick}></div>}

      {/* MAIN SHELL */}
      <div className="shell">
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-btn"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="fas fa-bars"></i>
            </button>

            <div className="school-seal">
              <img
                src="/logo.png"
                alt="PMRMIS-South school seal"
              />
            </div>

            <div className="school">
              <strong>
                President Manuel Roxas Memorial Integrated
                School – South
              </strong>

              <span>
                Digital Credentials Management System
              </span>
            </div>
          </div>

          <div className="top-actions">
            <button
              className="icon-btn"
              aria-label="Notifications"
              onClick={() =>
                notify("You have 3 new notifications")
              }
            >
              <i className="far fa-bell"></i>
              <b>3</b>
            </button>

            <div
              className="admin-menu-wrapper"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={`admin ${adminMenuOpen ? "active" : ""}`}
                aria-haspopup="menu"
                aria-expanded={adminMenuOpen}
                onClick={() =>
                  setAdminMenuOpen((previous) => !previous)
                }
              >
                <div className="admin-avatar">
                  <img src="/logo.png" alt="PMRMIS-South school logo" />
                </div>

                <div className="admin-copy">
                  <strong>ADMINISTRATOR</strong>
  
                </div>

              </button>

              {adminMenuOpen && (
                <div
                  className="admin-dropdown"
                  role="menu"
                  aria-label="Administrator account menu"
                >

                  <button
                    type="button"
                    role="menuitem"
                    className="dropdown-logout"
                    onClick={handleLogout}
                  >
                    <i className="fas fa-right-from-bracket"></i>

                    <span>
                      <strong>Logout</strong>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="content">
          <QueueNotice queue={queue} loginPath="/admin-login" />
          <WorkflowSupport />
          <section className="page-head">
            <div>
              <h1>Credential Management</h1>
              <p>
                Review, approve, release, and track student
                credential requests.
              </p>
            </div>

          </section>

          {/* STATISTICS */}
          <section className="stats">
            <article className="stat total">
              <div className="stat-icon">
                <i className="fas fa-folder-open"></i>
              </div>

              <div>
                <span>Total Requests</span>
                <strong>{requests.length}</strong>
                <small>Saved requests</small>
              </div>
            </article>

            <article className="stat pending">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>

              <div>
                <span>Pending</span>
                <strong>{requests.filter(item => !["PRINCIPAL_APPROVED", "READY", "COLLECTED"].includes(item.stage)).length}</strong>
                <small>Waiting for approval</small>
              </div>
            </article>

            <article className="stat approved">
              <div className="stat-icon">
                <i className="fas fa-circle-check"></i>
              </div>

              <div>
                <span>Approved</span>
                <strong>{requests.filter(item => ["PRINCIPAL_APPROVED", "READY"].includes(item.stage)).length}</strong>
                <small>Principal approved / ready for release</small>
              </div>
            </article>

            <article className="stat released">
              <div className="stat-icon">
                <i className="fas fa-box-open"></i>
              </div>

              <div>
                <span>Released</span>
                <strong>{requests.filter(item => item.stage === "COLLECTED").length}</strong>
                <small>Successfully claimed</small>
              </div>
            </article>

          </section>

          {/* WORKSPACE */}
          <section className="workspace">
            {/* REQUEST TABLE */}
            <article className="panel">
              <div className="panel-title">
                <div>
                  <h2>Credential Requests</h2>
                  <p>
                    Showing {filteredRequests.length} of {requests.length}
                    requests
                  </p>
                </div>

                <button onClick={handleExport}>
                  <i className="fas fa-download"></i>{" "}
                  Export CSV
                </button>
              </div>

              {/* FILTERS */}
              <div className="filters">
                <div className="search">
                  <i className="fas fa-search"></i>

                  <input
                    type="search"
                    placeholder="Search request, LRN, or student..."
                    value={search}
                    onChange={(event) =>
                      (setSearch(event.target.value), setPage(1))
                    }
                  />
                </div>

                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) =>
                    (setStatusFilter(event.target.value), setPage(1))
                  }
                >
                  <option value="all">
                    All Statuses
                  </option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>

                <select
                  aria-label="Filter by credential"
                  value={typeFilter}
                  onChange={(event) =>
                    (setTypeFilter(event.target.value), setPage(1))
                  }
                >
                  <option value="all">
                    All Credentials
                  </option>
                  {credentialTypes.map(type => <option value={type} key={type}>{type}</option>)}
                </select>

                <button
                  className="reset"
                  onClick={handleReset}
                >
                  <i className="fas fa-rotate-left"></i>{" "}
                  Reset
                </button>
              </div>

              {/* TABLE */}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>REQUEST ID</th>
                      <th>STUDENT</th>
                      <th>CREDENTIAL</th>
                      <th>DATE FILED</th>
                      <th>STATUS</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRequests.slice((Math.min(page, Math.max(1, Math.ceil(filteredRequests.length / 10))) - 1) * 10, Math.min(page, Math.max(1, Math.ceil(filteredRequests.length / 10))) * 10).map((request) => (
                      <tr key={request.id}>
                        <td>
                          <strong className="workflow-reference" title={request.reference}>{request.reference || request.id}</strong>
                        </td>

                        <td>
                          <div className="student">
                            <span className="avatar">
                              {getInitials(request.name)}
                            </span>

                            <div>
                              <strong>
                                {request.name}
                              </strong>

                              <small>{request.lrn}</small>
                            </div>
                          </div>
                        </td>

                        <td
                          className="cred"
                          title={request.type}
                        >
                          {request.type}
                        </td>

                        <td>{request.date}</td>

                        <td>
                          <span
                            className={`badge ${request.badgeClass}`}
                          >
                            {request.status}
                          </span>
                        </td>

                        <td>
                          <div className="actions">
                            <button
                              className="view"
                              aria-label={`View ${request.reference}`}
                              onClick={() =>
                                openRequest(request.id)
                              }
                            >
                              View
                            </button>

                            <button
                              className="print"
                              aria-label={`Print ${request.reference}`}
                              onClick={() =>
                                handlePrint(request.id)
                              }
                            >
                              <i className="fas fa-print"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredRequests.length === 0 && (
                      <tr>
                        <td
                          colSpan="6"
                          style={{
                            textAlign: "center",
                            padding: "35px",
                          }}
                        >
                          No credential requests found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-foot">
                <span>
                  {filteredRequests.length} request
                  {filteredRequests.length === 1
                    ? ""
                    : "s"}{" "}
                  shown
                </span>

                <div className="pages">
                  <button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}>
                    <i className="fas fa-chevron-left"></i>
                  </button>

                  <button className="current">{Math.min(page, Math.max(1, Math.ceil(filteredRequests.length / 10)))}</button>

                  <button aria-label="Next page" disabled={page >= Math.ceil(filteredRequests.length / 10)} onClick={() => setPage(value => value + 1)}>
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              </div>
            </article>

            {/* RIGHT SIDE */}
            <aside className="side-stack">
              <article className="panel">
                <div className="panel-title">
                  <div>
                    <h2>Credential Types</h2>
                    <p>Saved credential requests</p>
                  </div>
                </div>

                <div className="type-list">
                  {credentialTypes.map(type => <div className="type" key={type}><div className="type-icon"><i className="fas fa-file-lines"></i></div><div><strong>{type}</strong><small>{requests.filter(item => item.type === type && item.stage === "COLLECTED").length} completed</small></div><b>{requests.filter(item => item.type === type).length}</b></div>)}
                  {!credentialTypes.length && <p>No requests yet.</p>}
                </div>
              </article>

              <article className="panel">
                <div className="panel-title">
                  <div>
                    <h2>Recent Activity</h2>
                    <p>Live credential updates</p>
                  </div>

                  <button
                    onClick={() =>
                      navigate("/admin-activity-logs")
                    }
                  >
                    View all
                  </button>
                </div>

                <div className="activity">
                  {recentEvents.map((event, index) => <div className="event" key={index}><i className="fas fa-circle-check"></i><div><strong>{STATUS_LABELS[event.to_status]}</strong><p>{event.requestName}</p><time>{new Date(event.created_at).toLocaleString()}</time></div></div>)}
                  {!recentEvents.length && <p>No activity yet.</p>}
                </div>
              </article>
            </aside>
          </section>
        </main>
      </div>

      {/* REQUEST DETAILS DRAWER */}
      <aside
        className={`drawer ${drawerOpen ? "show" : ""}`}
        aria-hidden={!drawerOpen}
        role="dialog"
        aria-modal={drawerOpen || undefined}
        aria-labelledby="credential-details-title"
        inert={!drawerOpen}
      >
        <div className="drawer-head">
          <div>
            <small className="details-eyebrow">CREDENTIAL REQUEST</small>
            <h2 id="credential-details-title">Request Details</h2>
            <p className="workflow-drawer-reference">{currentRequest?.reference || 'Review request information'}</p>
          </div>

          <button
            className="close"
            aria-label="Close details"
            onClick={closeDrawer}
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        {currentRequest && (
          <div className="request-details-body">
            <div className="request-profile">
              <div className="avatar">
                {getInitials(currentRequest.name)}
              </div>

              <div>
                <h3>{currentRequest.name}</h3>
                <p>LRN {currentRequest.lrn}</p>
              </div>
            </div>

            <RequestWorkflowDetails request={{...currentRequest,status:currentRequest.stage}} />
            <VerificationUpload request={{...currentRequest,status:currentRequest.stage}} onUpdated={async updated=>{setCurrentRequest(convertRequest(updated));await queue.refresh();}}/>
            {actionError && <p className="request-workflow-notice request-workflow-error" role="alert">{actionError} Close and reopen this request if it has changed.</p>}
            {currentRequest.stage === "PRINCIPAL_APPROVED" && !queue.smsEnabled && <p className="request-workflow-notice">Semaphore is not activated yet. Final release confirmation will queue an SMS without sending it.</p>}
            <div className="decision workflow-actions">
              {(ADMIN_ACTIONS[currentRequest.stage] || []).map((action, index) => <button key={action[0]} className={action[0] === "submit_review" ? "verification-pending" : index ? "workflow-secondary" : "approve"} disabled={queue.busy} onClick={() => { setPendingAction(action); setActionError(""); }}><i className="fas fa-check"></i>{action[1]}</button>)}
            </div>
            {pendingAction && <div className="workflow-confirm"><strong>{pendingAction[1]}?</strong><p>{pendingAction[0] === "ready" ? "Confirm that the Principal-approved credentials are ready for collection. One SMS will be queued for the requester." : "This action will be recorded in the request history."}</p><button disabled={queue.busy} onClick={handleApprove}>{queue.busy ? "Saving…" : "Confirm"}</button><button disabled={queue.busy} onClick={() => setPendingAction(null)}>Cancel</button></div>}
          </div>
        )}
      </aside>

      {/* TOAST */}
      <div className={`toast ${toast ? "show" : ""}`}>
        <i className="fas fa-circle-check"></i>
        <span>{toast || "Action completed"}</span>
      </div>
    </div>
  );
}

export default AdministrationCredManagement;
