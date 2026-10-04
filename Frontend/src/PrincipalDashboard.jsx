import RequestReviewModal from './components/RequestReviewModal';
import { logoutUser } from './auth/session';
import {usePortal} from './hooks/PortalContext';
import {metrics,auditRows} from './api/portalData';
import {actOnCredential} from './api/credentials';

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PrincipalDashboard.css";

/* =========================================================
   SAMPLE DATA
   ========================================================= */

function PrincipalDashboard() {
  const navigate = useNavigate();

  const system=usePortal();
  const [reviewId,setReviewId]=useState(null);
  const reviewRequest=system.data.requests.find(r=>r.id===reviewId);
  const totals=metrics(system.data.requests);
  const requests=system.data.requests.filter(r=>['PRINCIPAL_REVIEW','PRINCIPAL_APPROVED','READY','COLLECTED','RETURNED','REJECTED'].includes(r.status)).map(r=>({...r,name:r.full_name,grade:r.grade_level,date:new Date(r.created_at).toLocaleDateString(),status:r.status==='PRINCIPAL_REVIEW'?'Pending':r.status==='RETURNED'?'Returned':r.status==='REJECTED'?'Rejected':r.status==='COLLECTED'?'Released':r.status==='READY'?'Ready for Release':'Approved',priority:'Normal'}));
  const recentActivities=auditRows(system.data).filter(e=>e.role==='Principal').slice(0,5).map(e=>({...e,title:e.action,time:new Date(e.created_at).toLocaleString()}));
  const authorizedCredentials=[...new Set(system.data.requests.filter(r=>r.approved_at).map(r=>r.credential))];
  const completionData=[{label:'Approved',value:totals.approved},{label:'Pending',value:requests.filter(r=>r.status==='Pending').length},{label:'Released',value:totals.released}];
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

  const openRequest = request => { setReviewId(request.id); };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setCurrentRequest(null);
    setDecisionNote("");
  };

  const finishRequest=async(requestId,newStatus,message)=>{try{await actOnCredential(currentRequest,'approve',decisionNote);await system.refresh();closeDrawer();showToast(message);}catch(e){showToast(e.message,'error');}};

  const handleApprove = () => {
    if (!currentRequest) return;

    finishRequest(
      currentRequest.id,
      "Approved",
      `STUDENT INFORMATION APPROVED · ${currentRequest.reference}`
    );
  };


  /* =========================================================
     LOGOUT
     ========================================================= */

  const handleLogout = async () => {
    await logoutUser();

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
      {reviewRequest && <RequestReviewModal key={reviewRequest.id} request={reviewRequest} role="PRINCIPAL" onClose={()=>setReviewId(null)} onUpdated={system.refresh}/>}

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
                <span className="nav-badge">{requests.filter(r=>r.status==='Pending').length}</span>
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
                <span className="notification-count">{requests.filter(r=>r.status==='Pending').length}</span>
              </button>

              {notificationsOpen && (
                <div className="notification-dropdown">

                  <div className="dropdown-header">
                    <div>
                      <strong>Notifications</strong>
                      <span>Recent system updates</span>
                    </div>

                    <span className="dropdown-count">{requests.filter(r=>r.status==='Pending').length}</span>
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
                          {requests.filter(r=>r.status==='Pending').length} prepared requests await review.
                        </span>

                        <small>Live queue</small>
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
                          {requests.filter(r=>r.status==='Pending').length} credential requests require your review.
                        </span>

                        <small>Live queue</small>
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
                          {totals.approved} saved requests have Principal approval.
                        </span>

                        <small>Saved approval history</small>
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
                {requests.filter(r=>r.status==='Pending').length} credential requests are awaiting approval
              </h3>

              <p>
                Review and approve requests before they proceed
                to document preparation and release.
              </p>
            </div>

            <button
              type="button"
              className="priority-button"
              onClick={() => {const next=requests.find(r=>r.status==='Pending');if(next)openRequest(next);else showToast('No requests are awaiting approval.');}}
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
                <strong>{totals.total}</strong>

                <small className="metric-positive">
                  <i className="fas fa-arrow-up"></i>
                  Saved requests
                </small>
              </div>
            </div>

            <div className="principal-metric-card">
              <div className="metric-card-icon pending-icon">
                <i className="fas fa-hourglass-half"></i>
              </div>

              <div className="metric-card-content">
                <span>Pending Approval</span>
                <strong>{requests.filter(r=>r.status==='Pending').length}</strong>

                <small>
                  {requests.filter(r=>r.status==='Pending').length} require your attention
                </small>
              </div>
            </div>

            <div className="principal-metric-card">
              <div className="metric-card-icon approved-icon">
                <i className="fas fa-circle-check"></i>
              </div>

              <div className="metric-card-content">
                <span>Approved</span>
                <strong>{totals.approved}</strong>

                <small>This month</small>
              </div>
            </div>

            <div className="principal-metric-card">
              <div className="metric-card-icon released-icon">
                <i className="fas fa-file-circle-check"></i>
              </div>

              <div className="metric-card-content">
                <span>Released</span>
                <strong>{totals.released}</strong>

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
                            {request.reference || request.id}
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
                            aria-label={`View ${request.reference}`}
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

                  <h2>Overall Completion</h2>
                </div>

                <button
                  type="button"
                  className="panel-more-button"
                  aria-label="More options" onClick={()=>goTo('/principal-reports')}
                >
                  <i className="fas fa-ellipsis"></i>
                </button>

              </div>

              <div className="completion-content">

                <div className="completion-circle" style={{background:'conic-gradient(#af0015 '+(totals.total?totals.released/totals.total*100:0)+'%, #eee 0)'}}>

                  <div className="completion-circle-inner">
                    <strong>{totals.total?Math.round(totals.released/totals.total*100):0}%</strong>
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
                  {totals.total ? Math.round(totals.released / totals.total * 100) : 0}%
                </span>

                <p>
                  Released requests as a share of all requests
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

                <h2>{currentRequest.reference || currentRequest.id}</h2>
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
                  placeholder="Add an optional approval note..."
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
                className="drawer-approve-button"
                onClick={handleApprove}
              >
                <i className="fas fa-check"></i>
                Approve
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
