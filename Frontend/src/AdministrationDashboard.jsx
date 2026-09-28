import { logoutUser } from './auth/session';
import {usePortal} from './hooks/PortalContext';
import {metrics,auditRows,statusName} from './api/portalData';
import {submitCredential} from './api/credentials';


import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AdministrationDashboard.css";

function AdministrationDashboard() {
  const system=usePortal();
  const totals=metrics(system.data.requests);
  const [modalError,setModalError]=useState('');
  const modalBusy=useRef(false);
  const submissionKey=useRef(crypto.randomUUID());
  const navigate = useNavigate();
  const location = useLocation();

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(false);

  /* =========================================================
     FORM STATES
  ========================================================= */

  const [credentialForm, setCredentialForm] = useState({
    student: "",
    studentId: "",
    type: "",
    purpose: "",
  });

  const [recordForm, setRecordForm] = useState({
    schoolYear: "2026–2027",
    gradeLevel: "",
    file: null,
  });

  const [userForm, setUserForm] = useState({
    fullName: "",
    email: "",
    role: "",
    password: "",
  });

  const [reportForm, setReportForm] = useState({
    type: "",
    from: "",
    to: "",
    format: "PDF",
  });

  /* =========================================================
     STATIC DATA
  ========================================================= */

  const requests=system.data.requests.slice(0,6).map(r=>({...r,student:r.full_name,initials:r.full_name.split(' ').map(x=>x[0]).slice(0,2).join(''),status:statusName(r),date:new Date(r.created_at).toLocaleDateString()}));
  const notifications=auditRows(system.data).slice(0,5).map(e=>({...e,icon:'fa-clock',color:'blue',title:e.action,description:e.description,time:new Date(e.created_at).toLocaleString()}));
  const statistics=[{title:'Total Requests',value:totals.total,period:'All saved requests',description:'Student and alumni requests',icon:'fa-folder-open',className:'total'},{title:'Pending',value:totals.pending,period:'Current',description:'Preparation or Principal review',icon:'fa-clock',className:'pending'},{title:'Approved',value:totals.approved,period:'All saved requests',description:totals.ready+' ready for pickup',icon:'fa-circle-check',className:'approved'},{title:'Released',value:totals.released,period:'Completed',description:'Collection acknowledged',icon:'fa-box-open',className:'released'}];

  const quickActions = useMemo(
    () => [
      {
        id: "credential",
        title: "Add Credential",
        description: "Create a new request",
        icon: "fa-folder-plus",
        accent: "red",
      },
      {
        id: "records",
        title: "Upload Records",
        description: "Import student information",
        icon: "fa-file-arrow-up",
        accent: "blue",
      },
      {
        id: "user",
        title: "Add User",
        description: "Create a system account",
        icon: "fa-user-plus",
        accent: "green",
      },
      {
        id: "report",
        title: "Generate Report",
        description: "Export institutional data",
        icon: "fa-chart-column",
        accent: "purple",
      },
    ],
    []
  );

  const currentDate = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  /* =========================================================
     NAVIGATION
  ========================================================= */

  const navigationGroups = useMemo(
    () => [
  

          {
            label: "Dashboard",
            icon: "fa-table-columns",
            path: "/admin-dashboard",
          },
          {
            label: "Credential Management",
            icon: "fa-folder-open",
            path: "/admin-credential-management",
          },
          {
            label: "Student Records",
            icon: "fa-user-graduate",
            path: "/admin-student-records",
          },

          {
            label: "Reports",
            icon: "fa-chart-line",
            path: "/admin-reports",
          },
          {
            label: "Activity Logs",
            icon: "fa-clock-rotate-left",
            path: "/admin-activity-logs",
          },
          {
            label: "System Settings",
            icon: "fa-gear",
            path: "/admin-settings",
          },
        ],
    []
  );

  const isActiveRoute = useCallback(
    (path) => {
      if (!path) return false;

      if (path === "/admin-dashboard") {
        return (
          location.pathname === "/admin-dashboard" ||
          location.pathname === "/admin-dashboard/"
        );
      }

      return location.pathname.startsWith(path);
    },
    [location.pathname]
  );

  const closeMenus = useCallback(() => {
    setNotificationOpen(false);
    setAdminMenuOpen(false);
  }, []);

  const goTo = useCallback(
    (path) => {
      navigate(path);
      setSidebarOpen(false);
      closeMenus();
    },
    [navigate, closeMenus]
  );

  const handleViewRequest = useCallback(
    (requestId) => {
      navigate(
        `/admin-credential-management?request=${encodeURIComponent(
          requestId
        )}`
      );

      setSidebarOpen(false);
      closeMenus();
    },
    [navigate, closeMenus]
  );

  const handleLogout = useCallback(async () => {
    await logoutUser();
    navigate("/");
  }, [navigate]);

  /* =========================================================
     MODALS
  ========================================================= */

  const openModal = useCallback((modalName) => {
    setModalSuccess(false);setModalError('');submissionKey.current=crypto.randomUUID();
    setActiveModal(modalName);
    closeMenus();
  }, [closeMenus]);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalSuccess(false);
  }, []);

  const handleModalSubmit=async(event)=>{event.preventDefault();if(modalBusy.current)return;modalBusy.current=true;setModalError('');try{
   if(activeModal==='credential'){
    const student=system.data.students.find(r=>r.lrn===credentialForm.studentId.trim());
    if(!student)throw Error('Save this student in Student Records first, then enter their 12-digit LRN here.');
    await submitCredential({submission_key:submissionKey.current,requester_type:student.status==='Graduated'?'Alumni':'Student',full_name:[student.firstName,student.middleName,student.lastName].filter(Boolean).join(' '),lrn:student.lrn,grade_level:student.grade,section:student.section,graduation_year:student.status==='Graduated'?(student.schoolYear||'').slice(-4):'',credential:credentialForm.type,purpose:credentialForm.purpose,phone:student.contact,email:'',additional_details:'Submitted by the records office.'});
    await system.refresh();
   }else if(activeModal==='user'){
    await system.mutate('accounts/',{action:'create',values:{username:userForm.username,name:userForm.fullName,email:userForm.email,role:userForm.role,password:userForm.password}});
    setUserForm({...userForm,password:''});
   }else if(activeModal==='records'){
    if(!recordForm.file)throw Error('Choose a CSV file. Save Excel spreadsheets as CSV before importing.');
    if(!recordForm.file.name.toLowerCase().endsWith('.csv'))throw Error('Save the spreadsheet as CSV before importing.');
    const {parseStudentCSV}=await import('./api/studentCSV');
    const rows=parseStudentCSV(await recordForm.file.text()).map(r=>({...r,schoolYear:r.schoolYear||recordForm.schoolYear,grade:r.grade||recordForm.gradeLevel}));
    await system.mutate('students/',{action:'import',rows});
   }else if(activeModal==='report'){
    navigate('/admin-reports');return;
   }
   setModalSuccess(true);
  }catch(e){setModalError(e.message);}finally{modalBusy.current=false;}};

  const handleModalInput = useCallback(
    (setter, field, value) => {
      setter((previous) => ({
        ...previous,
        [field]: value,
      }));

      setModalSuccess(false);
    },
    []
  );

  /* =========================================================
     CHART
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const createChart = async () => {
      if (!chartRef.current) return;

      try {
        const module = await import("chart.js/auto");

        if (cancelled || !chartRef.current) return;

        const Chart = module.default;

        if (chartInstance.current) {
          chartInstance.current.destroy();
        }

        chartInstance.current = new Chart(chartRef.current, {
          type: "doughnut",

          data: {
            labels: ["Pending", "Approved", "Released"],

            datasets: [
              {
                data: [totals.pending, totals.total-totals.pending-totals.released, totals.released],

                backgroundColor: [
                  "#f59e0b",
                  "#16a34a",
                  "#2563eb",
                ],

                borderColor: "#ffffff",
                borderWidth: 5,
                hoverOffset: 10,
                borderRadius: 5,
                spacing: 3,
              },
            ],
          },

          options: {
            responsive: true,
            maintainAspectRatio: false,

            cutout: "74%",

            animation: {
              animateRotate: true,
              animateScale: true,
              duration: 1100,
              easing: "easeOutQuart",
            },

            plugins: {
              legend: {
                display: false,
              },

              tooltip: {
                backgroundColor: "#111827",
                titleColor: "#ffffff",
                bodyColor: "#e5e7eb",
                padding: 13,
                displayColors: true,
                cornerRadius: 10,

                callbacks: {
                  label: (context) =>
                    `  ${context.label}: ${context.raw} requests`,
                },
              },
            },
          },

          plugins: [
            {
              id: "centerText",

              afterDraw(chart) {
                const { ctx, chartArea } = chart;

                if (!chartArea) return;

                const centerX =
                  (chartArea.left + chartArea.right) / 2;

                const centerY =
                  (chartArea.top + chartArea.bottom) / 2;

                ctx.save();

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                ctx.fillStyle = "#111827";
                ctx.font =
                  "800 32px 'Poppins', sans-serif";

                ctx.fillText(
                  String(totals.total),
                  centerX,
                  centerY - 10
                );

                ctx.fillStyle = "#6b7280";
                ctx.font =
                  "600 9px 'Poppins', sans-serif";

                ctx.letterSpacing = "1px";

                ctx.fillText(
                  "TOTAL REQUESTS",
                  centerX,
                  centerY + 18
                );

                ctx.restore();
              },
            },
          ],
        });
      } catch (error) {
        console.error(
          "Unable to load Chart.js:",
          error
        );
      }
    };

    createChart();

    return () => {
      cancelled = true;

      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [totals.total, totals.pending, totals.released]);

  /* =========================================================
     KEYBOARD + OUTSIDE CLICK
  ========================================================= */

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      setNotificationOpen(false);
      setAdminMenuOpen(false);
      setSidebarOpen(false);

      if (activeModal) {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [activeModal, closeModal]);

  useEffect(() => {
    const handleDocumentClick = () => {
      closeMenus();
    };

    document.addEventListener(
      "click",
      handleDocumentClick
    );

    return () => {
      document.removeEventListener(
        "click",
        handleDocumentClick
      );
    };
  }, [closeMenus]);

  /* =========================================================
     BODY SCROLL LOCK WHEN MODAL IS OPEN
  ========================================================= */

  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [activeModal]);

  /* =========================================================
     MODAL TITLES
  ========================================================= */

  const modalConfig = {
    credential: {
      eyebrow: "CREDENTIAL MANAGEMENT",
      title: "Add Credential",
      description:
        "Create a credential request without leaving the dashboard.",
      icon: "fa-folder-plus",
      submitText: "Add Credential",
    },

    records: {
      eyebrow: "STUDENT RECORDS",
      title: "Upload Records",
      description:
        "Import student records directly into CredTrack.",
      icon: "fa-file-arrow-up",
      submitText: "Upload Records",
    },

    report: {
      eyebrow: "REPORTS",
      title: "Generate Report",
      description:
        "Choose the report details and generate it here.",
      icon: "fa-chart-column",
      submitText: "Generate Report",
    },
  };

  const activeModalConfig =
    activeModal ? modalConfig[activeModal] : null;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="administration-dashboard">

      {/* =====================================================
          SIDEBAR OVERLAY
      ===================================================== */}

      <button
        type="button"
        className={`sidebar-overlay ${
          sidebarOpen ? "show" : ""
        }`}
        aria-label="Close navigation menu"
        onClick={() => setSidebarOpen(false)}
      />

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`sidebar ${
          sidebarOpen ? "open" : ""
        }`}
        aria-label="Administrator navigation"
      >

        <div className="sidebar-glow"></div>

        {/* BRAND */}

        <div className="brand">

          <div className="brand-logo">
            <img
              src="/logo.png"
              alt="PMRMIS-South logo"
            />
          </div>

          <div className="brand-copy">
            <h2>CredTrack</h2>

            <span>
              PMRMIS–SOUTH
            </span>
          </div>

          <button
            type="button"
            className="close-sidebar"
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="fas fa-xmark"></i>
          </button>

        </div>

        {/* SCHOOL IDENTITY */}

        {/* NAVIGATION */}

        <nav
          className="sidebar-navigation"
          aria-label="Administrator navigation"
        >

          <ul className="menu">

            {navigationGroups.map((item) => (
              <li
                className={`menu-item ${
                  isActiveRoute(item.path)
                    ? "active"
                    : ""
                }`}
                key={item.label}
              >

                <button
                  type="button"
                  className="menu-link"
                  disabled={item.disabled}
                  title={
                    item.disabled
                      ? "User Management is currently unavailable"
                      : undefined
                  }
                  onClick={() => {
                    if (
                      item.disabled ||
                      !item.path
                    ) {
                      return;
                    }

                    goTo(item.path);
                  }}
                >

                  <span className="menu-icon">
                    <i
                      className={`fas ${item.icon}`}
                    ></i>
                  </span>

                  <span className="menu-text">
                    {item.label}
                  </span>

                  {isActiveRoute(
                    item.path
                  ) && (
                    <span className="active-indicator">
                      <i className="fas fa-chevron-right"></i>
                    </span>
                  )}

                  {item.disabled && (
                    <span className="coming-soon">
                      Soon
                    </span>
                  )}

                </button>

              </li>
            ))}

          </ul>

        </nav>

        {/* SIDEBAR PROFILE */}

      </aside>

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <div className="main">

        {/* ===================================================
            TOPBAR
        =================================================== */}

        <header className="topbar">

          <div className="topbar-left">

            <button
              type="button"
              className="menu-button"
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
              onClick={() =>
                setSidebarOpen(true)
              }
            >
              <i className="fas fa-bars"></i>
            </button>

            <div className="school-seal">

              <img
                src="/logo.png"
                alt="PMRMIS-South school logo"
              />

            </div>

            <div className="school-name">

              <div className="school-name-title">
                President Manuel Roxas Memorial Integrated School – South
              </div>

              <div className="school-name-subtitle">
                Digital Credentials Management System
              </div>

            </div>

          </div>

          <div className="topbar-right">

            {/* NOTIFICATIONS */}

            <div className="notification-wrapper">

              <button
                type="button"
                className={`notification ${
                  notificationOpen
                    ? "active"
                    : ""
                }`}
                aria-label="Open notifications"
                aria-expanded={
                  notificationOpen
                }
                onClick={(event) => {
                  event.stopPropagation();

                  setNotificationOpen(
                    (previous) => !previous
                  );

                  setAdminMenuOpen(false);
                }}
              >

                <i className="far fa-bell"></i>

                <span className="notification-badge">
                  {notifications.length}
                </span>

              </button>

              {notificationOpen && (
                <div
                  className="notification-panel show"
                  role="dialog"
                  aria-label="Notifications"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >

                  <div className="notification-header">

                    <div>

                      <span>
                        RECENT ACTIVITY
                      </span>

                      <h3>
                        Notifications
                      </h3>

                    </div>

                    <span className="notification-count">
                      {notifications.length} recent
                    </span>

                  </div>

                  <div className="notification-list">

                    {notifications.map(
                      (notification) => (
                        <div
                          className="mini-notification"
                          key={notification.id}
                        >

                          <div
                            className={`notification-icon ${notification.color}`}
                          >
                            <i
                              className={`fas ${notification.icon}`}
                            ></i>
                          </div>

                          <div className="notification-copy">

                            <strong>
                              {notification.title}
                            </strong>

                            <span>
                              {notification.description}
                            </span>

                            <small>
                              {notification.time}
                            </small>

                          </div>

                        </div>
                      )
                    )}

                  </div>

                  <button
                    type="button"
                    className="view-notifications"
                    onClick={() =>
                      goTo(
                        "/admin-activity-logs"
                      )
                    }
                  >
                    View activity logs

                    <i className="fas fa-arrow-right"></i>
                  </button>

                </div>
              )}

            </div>

            {/* ADMIN MENU */}

            <div className="admin-menu-wrapper">

              <button
                type="button"
                className={`admin-menu ${
                  adminMenuOpen
                    ? "active"
                    : ""
                }`}
                aria-haspopup="menu"
                aria-expanded={
                  adminMenuOpen
                }
                onClick={(event) => {
                  event.stopPropagation();

                  setAdminMenuOpen(
                    (previous) => !previous
                  );

                  setNotificationOpen(false);
                }}
              >

                <div className="admin-avatar">
                  <img
                src="/logo.png"
                alt="PMRMIS-South school logo"
              />
                </div>

                <div className="admin-menu-info">

                  <strong>
                    ADMINISTRATOR
                  </strong>

                </div>

                <i className="fas fa-chevron-down admin-chevron"></i>

              </button>

              {adminMenuOpen && (
                <div
                  className="admin-dropdown show"
                  role="menu"
                  aria-label="Administrator account menu"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >



                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                  >

                    <i className="fas fa-right-from-bracket"></i>

                    <span>

                      <strong>
                        Logout
                      </strong>

   

                    </span>

                  </button>

                </div>
              )}

            </div>

          </div>

        </header>

        {/* ===================================================
            PAGE HEADER / HERO
        =================================================== */}

        <section className="page-header">

          <div className="page-header-content">

            <h1>
              Dashboard
            </h1>

          </div>

          <div className="page-header-actions">

            <div className="date-box">

              <div className="date-icon">
                <i className="far fa-calendar"></i>
              </div>

              <div>

                <small>
                  TODAY
                </small>

                <span>
                  {currentDate}
                </span>

              </div>

            </div>

          </div>

        </section>

        {/* ===================================================
            DASHBOARD CONTENT
        =================================================== */}

        <main className="dashboard-content">


          {/* =================================================
              STATISTICS
          ================================================= */}

          <section
            className="statistics"
            aria-label="Credential statistics"
          >

            {statistics.map((stat) => (
              <article
                className={`stat-card ${stat.className}`}
                key={stat.title}
              >

                <div className="stat-card-top">

                  <div className="icon">
                    <i
                      className={`fas ${stat.icon}`}
                    ></i>
                  </div>

                  <span className="stat-period">
                    {stat.period}
                  </span>

                </div>

                <div className="stat-content">

                  <h4>
                    {stat.title}
                  </h4>

                  <div className="stat-value-row">

                    <h2>
                      {stat.value}
                    </h2>

                    {stat.trend && (
                      <span className="trend-pill">
                        <i className="fas fa-arrow-trend-up"></i>
                        Live
                      </span>
                    )}

                  </div>

                  <p
                    className={
                      stat.trend
                        ? "positive"
                        : ""
                    }
                  >
                    {stat.trend && (
                      <i className="fas fa-circle-check"></i>
                    )}

                    {stat.description}
                  </p>

                </div>

                <div className="stat-decoration"></div>

              </article>
            ))}

          </section>

          {/* =================================================
              QUICK ACTIONS
          ================================================= */}

          <section
            className="quick-actions"
            aria-labelledby="quick-actions-title"
          >

            <div className="section-heading">

              <div>



                <h2 id="quick-actions-title">
                  Quick Actions
                </h2>

              </div>


            </div>

            <div className="action-grid">

              {quickActions.map((action) => (
                <button
                  type="button"
                  className={`action-card ${action.accent}`}
                  key={action.id}
                  onClick={() =>
                    openModal(action.id)
                  }
                >

                  <div
                    className={`action-icon ${action.accent}`}
                  >
                    <i
                      className={`fas ${action.icon}`}
                    ></i>
                  </div>

                  <div className="action-content">

                    <strong>
                      {action.title}
                    </strong>

                    <small>
                      {action.description}
                    </small>

                  </div>

                  <span className="action-arrow">
                    <i className="fas fa-arrow-right"></i>
                  </span>

                </button>
              ))}

            </div>

          </section>

          {/* =================================================
              MAIN DASHBOARD GRID
          ================================================= */}

          <section className="dashboard-grid">

            {/* =================================================
                RECENT REQUESTS
            ================================================= */}

            <article className="card requests-card">

              <div className="card-header">

                <div>

                  <div className="card-eyebrow">
                    <span></span>
                    LATEST TRANSACTIONS
                  </div>


                </div>

                <button
                  type="button"
                  className="view-all-btn"
                  onClick={() =>
                    goTo(
                      "/admin-credential-management"
                    )
                  }
                >
                  View all
                  <i className="fas fa-arrow-right"></i>
                </button>

              </div>

              <div className="table-wrapper">

                <table>

                  <thead>

                    <tr>
                      <th>REQUEST ID</th>
                      <th>STUDENT</th>
                      <th>CREDENTIAL</th>
                      <th>STATUS</th>
                      <th>DATE FILED</th>
                      <th>ACTION</th>
                    </tr>

                  </thead>

                  <tbody>

                    {requests.map(
                      (request) => (
                        <tr key={request.id}>

                          <td className="request-id">
                            <span>
                              {request.id}
                            </span>
                          </td>

                          <td>

                            <div className="student-cell">

                              <span className="student-avatar">
                                {request.initials}
                              </span>

                              <div>

                                <strong>
                                  {request.student}
                                </strong>

                                <small>
                                  Student
                                </small>

                              </div>

                            </div>

                          </td>

                          <td>

                            <span className="credential-name">
                              {request.credential}
                            </span>

                          </td>

                          <td>

                            <span
                              className={`badge ${request.status.toLowerCase()}`}
                            >

                              <span className="status-dot"></span>

                              {request.status}

                            </span>

                          </td>

                          <td>
                            <span className="date-filed">
                              {request.date}
                            </span>
                          </td>

                          <td>

                            <button
                              type="button"
                              className="view-btn"
                              onClick={() =>
                                handleViewRequest(
                                  request.id
                                )
                              }
                              aria-label={`View ${request.id}`}
                            >
                              View
                            </button>

                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>

              <div className="table-footer">

                <span>
                  Showing{" "}
                  <strong>{requests.length}</strong> of{" "}
                  <strong>{totals.total}</strong> requests
                </span>

                <button
                  type="button"
                  onClick={() =>
                    goTo(
                      "/admin-credential-management"
                    )
                  }
                >
                  Manage all requests
                  <i className="fas fa-arrow-right"></i>
                </button>

              </div>

            </article>

            {/* =================================================
                REQUEST OVERVIEW
            ================================================= */}

            <article className="card overview-card">

              <div className="card-header">

                <div>

                  <div className="card-eyebrow">
                    <span></span>
                    SAVED REQUESTS
                  </div>

                  <h2>
                    Requests Overview
                  </h2>

                  <p>
                    Current request distribution
                  </p>

                </div>

                <button
                  type="button"
                  className="card-menu-btn"
                  aria-label="Chart options" onClick={()=>goTo('/admin-reports')}
                  onClick={() =>
                    goTo("/admin-reports")
                  }
                >
                  <i className="fas fa-ellipsis"></i>
                </button>

              </div>

              <div className="chart-container">

                <canvas
                  ref={chartRef}
                  aria-label="Requests overview doughnut chart"
                ></canvas>

              </div>

              <div className="chart-summary">

                <div className="summary-total">
                  <strong>
                    {totals.total}
                  </strong>

                  <span>
                    Total requests
                  </span>
                </div>

                <div className="summary-rate">
                  <i className="fas fa-arrow-trend-up"></i>
                  <strong>
                    Live
                  </strong>
                  <span>
                    current workflow
                  </span>
                </div>

              </div>

              <div className="chart-legend">

                <div className="legend-item">

                  <div className="legend-label">

                    <span className="legend-color pending"></span>

                    <span>
                      Pending
                    </span>

                  </div>

                  <strong>
                    {totals.pending}
                  </strong>

                </div>

                <div className="legend-item">

                  <div className="legend-label">

                    <span className="legend-color approved"></span>

                    <span>
                      Approved
                    </span>

                  </div>

                  <strong>
                    {totals.approved}
                  </strong>

                </div>

                <div className="legend-item">

                  <div className="legend-label">

                    <span className="legend-color released"></span>

                    <span>
                      Released
                    </span>

                  </div>

                  <strong>
                    {totals.released}
                  </strong>

                </div>

              </div>

              <button
                type="button"
                className="overview-link"
                onClick={() =>
                  goTo("/admin-reports")
                }
              >
                View detailed reports

                <i className="fas fa-arrow-right"></i>
              </button>

            </article>

          </section>

        </main>

        {/* ===================================================
            FOOTER
        =================================================== */}

        <footer className="footer">

          <div className="footer-brand">

            <span className="footer-logo">
              CT
            </span>

            <span>
              © 2026 CredTrack
            </span>

            <span className="footer-separator">
              ·
            </span>

            <span>
              President Manuel Roxas Memorial
              Integrated School — South
            </span>

          </div>

          <div className="footer-meta">

            <span>
              Records Management Office
            </span>

            <span className="footer-separator">
              ·
            </span>

            <span>
              Version 1.0.0
            </span>

            <span className="footer-separator">
              ·
            </span>

            <span className="footer-secure">
              <i className="fas fa-lock"></i>
              Secure
            </span>

          </div>

        </footer>

      </div>

      {/* =====================================================
          MODAL SYSTEM
      ===================================================== */}

      {activeModal && activeModalConfig && (
        <div
          className="modal-overlay show"
          role="presentation"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div
            className="modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
          >

            {/* MODAL HEADER */}

            <div className="modal-header">

              <div className="modal-title-area">

                <div className="modal-icon">

                  <i
                    className={`fas ${activeModalConfig.icon}`}
                  ></i>

                </div>

                <div>

                  <span className="modal-eyebrow">
                    {activeModalConfig.eyebrow}
                  </span>

                  <h2 id="modal-title">
                    {activeModalConfig.title}
                  </h2>

                  <p id="modal-description">
                    {activeModalConfig.description}
                  </p>

                </div>

              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                aria-label={`Close ${activeModalConfig.title}`}
              >
                <i className="fas fa-xmark"></i>
              </button>

            </div>

            {/* =================================================
                ADD CREDENTIAL FORM
            ================================================= */}

            {activeModal === "credential" && (
              <form
                className="modal-form"
                onSubmit={handleModalSubmit}
              >

                <div className="form-section-title">
                  <i className="fas fa-user-graduate"></i>
                  Student Information
                </div>

                <div className="form-row">

                  <div className="form-group">

                    <label htmlFor="credential-student">
                      Student name
                      <span>*</span>
                    </label>

                    <div className="input-wrapper">

                      <i className="far fa-user"></i>

                      <input
                        id="credential-student"
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Enter full name"
                        value={
                          credentialForm.student
                        }
                        onChange={(event) =>
                          handleModalInput(
                            setCredentialForm,
                            "student",
                            event.target.value
                          )
                        }
                      />

                    </div>

                  </div>

                  <div className="form-group">

                    <label htmlFor="credential-student-id">
                      Student LRN
                      <span>*</span>
                    </label>

                    <div className="input-wrapper">

                      <i className="fas fa-id-card"></i>

                      <input
                        id="credential-student-id"
                        type="text"
                        required
                        placeholder="e.g. 2026-00124"
                        value={
                          credentialForm.studentId
                        }
                        onChange={(event) =>
                          handleModalInput(
                            setCredentialForm,
                            "studentId",
                            event.target.value
                          )
                        }
                      />

                    </div>

                  </div>

                </div>

                <div className="form-section-title">
                  <i className="fas fa-folder-open"></i>
                  Credential Details
                </div>

                <div className="form-group">

                  <label htmlFor="credential-type">
                    Credential type
                    <span>*</span>
                  </label>

                  <div className="select-wrapper">

                    <i className="fas fa-file-lines"></i>

                    <select
                      id="credential-type"
                      required
                      value={
                        credentialForm.type
                      }
                      onChange={(event) =>
                        handleModalInput(
                          setCredentialForm,
                          "type",
                          event.target.value
                        )
                      }
                    >

                      <option value="">
                        Select a credential
                      </option>

                      <option value="SF10">
                        SF10 — Permanent Record
                      </option>

                      <option value="SF9">
                        SF9 — Report Card
                      </option>

                      <option value="Certificate of Enrollment">
                        Certificate of Enrollment
                      </option>

                      <option value="Good Moral">
                        Certificate of Good Moral
                      </option>

                      <option value="Certificate of Completion">
                        Certificate of Completion
                      </option>

                    </select>

                  </div>

                </div>

                <div className="form-group">

                  <label htmlFor="credential-purpose">
                    Purpose
                  </label>

                  <textarea
                    id="credential-purpose"
                    rows="4"
                    placeholder="Briefly state the purpose of the request"
                    value={
                      credentialForm.purpose
                    }
                    onChange={(event) =>
                      handleModalInput(
                        setCredentialForm,
                        "purpose",
                        event.target.value
                      )
                    }
                  />

                </div>

                {modalError && <p role="alert" style={{color:'#ad0014'}}>{modalError}</p>}{modalSuccess && (
                  <SuccessMessage>
                    Credential request added
                    successfully.
                  </SuccessMessage>
                )}

                <ModalActions
                  onCancel={closeModal}
                  submitIcon="fa-plus"
                  submitText="Add Credential"
                />

              </form>
            )}

            {/* =================================================
                UPLOAD RECORDS FORM
            ================================================= */}

            {activeModal === "records" && (
              <form
                className="modal-form"
                onSubmit={handleModalSubmit}
              >

                <div className="form-section-title">
                  <i className="fas fa-database"></i>
                  Import Configuration
                </div>

                <div className="form-row">

                  <div className="form-group">

                    <label htmlFor="record-school-year">
                      School year
                    </label>

                    <div className="select-wrapper">

                      <i className="fas fa-calendar-days"></i>

                      <select
                        id="record-school-year"
                        value={
                          recordForm.schoolYear
                        }
                        onChange={(event) =>
                          handleModalInput(
                            setRecordForm,
                            "schoolYear",
                            event.target.value
                          )
                        }
                      >

                        <option value="2026–2027">
                          2026–2027
                        </option>

                        <option value="2025–2026">
                          2025–2026
                        </option>

                      </select>

                    </div>

                  </div>

                  <div className="form-group">

                    <label htmlFor="record-grade">
                      Grade level
                      <span>*</span>
                    </label>

                    <div className="select-wrapper">

                      <i className="fas fa-graduation-cap"></i>

                      <select
                        id="record-grade"
                        required
                        value={
                          recordForm.gradeLevel
                        }
                        onChange={(event) =>
                          handleModalInput(
                            setRecordForm,
                            "gradeLevel",
                            event.target.value
                          )
                        }
                      >

                        <option value="">
                          Select grade level
                        </option>

                        {Array.from(
                          { length: 10 },
                          (_, index) => (
                            <option
                              key={index + 1}
                              value={`Grade ${
                                index + 1
                              }`}
                            >
                              Grade {index + 1}
                            </option>
                          )
                        )}

                      </select>

                    </div>

                  </div>

                </div>

                <div className="form-section-title">
                  <i className="fas fa-cloud-arrow-up"></i>
                  Records File
                </div>

                <div className="form-group">

                  <label htmlFor="records-file">
                    Upload file
                    <span>*</span>
                  </label>

                  <div className="file-upload-wrapper">

                    <input
                      id="records-file"
                      type="file"
                      accept=".csv,.xlsx,.xls,.pdf"
                      required
                      onChange={(event) =>
                        handleModalInput(
                          setRecordForm,
                          "file",
                          event.target.files?.[0] ||
                            null
                        )
                      }
                    />

                    <label
                      htmlFor="records-file"
                      className="file-upload-label"
                    >

                      <span className="file-upload-icon">
                        <i className="fas fa-cloud-arrow-up"></i>
                      </span>

                      <span className="file-upload-copy">

                        <strong>
                          {recordForm.file
                            ? recordForm.file.name
                            : "Choose a file"}
                        </strong>

                        <small>
                          {recordForm.file
                            ? `${(
                                recordForm.file.size /
                                1024
                              ).toFixed(1)} KB`
                            : "Drag and drop or browse your files"}
                        </small>

                      </span>

                      <span className="browse-button">
                        Browse
                      </span>

                    </label>

                  </div>

                  <span className="file-help">
                    Accepted formats: CSV, Excel
                    (.xls, .xlsx), or PDF. Maximum
                    recommended file size: 10 MB.
                  </span>

                </div>

                {modalError && <p role="alert" style={{color:'#ad0014'}}>{modalError}</p>}{modalSuccess && (
                  <SuccessMessage>
                    Records uploaded
                    successfully.
                  </SuccessMessage>
                )}

                <ModalActions
                  onCancel={closeModal}
                  submitIcon="fa-upload"
                  submitText="Upload Records"
                />

              </form>
            )}

            {/* =================================================
                ADD USER FORM
            ================================================= */}

            {activeModal === "user" && (
              <form
                className="modal-form"
                onSubmit={handleModalSubmit}
              >

                <div className="form-section-title">
                  <i className="fas fa-user-shield"></i>
                  Account Information
                </div>

                <div className="form-group">

                  <label htmlFor="user-full-name">
                    Full name
                    <span>*</span>
                  </label>

                  <div className="input-wrapper">

                    <i className="far fa-user"></i>

                    <input
                      id="user-full-name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Enter full name"
                      value={
                        userForm.fullName
                      }
                      onChange={(event) =>
                        handleModalInput(
                          setUserForm,
                          "fullName",
                          event.target.value
                        )
                      }
                    />

                  </div>

                </div>

                <div className="form-row">

                  <div className="form-group">

                    <label htmlFor="user-email">
                      Email address
                      <span>*</span>
                    </label>

                    <div className="input-wrapper">

                      <i className="far fa-envelope"></i>

                      <input
                        id="user-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="name@school.edu.ph"
                        value={
                          userForm.email
                        }
                        onChange={(event) =>
                          handleModalInput(
                            setUserForm,
                            "email",
                            event.target.value
                          )
                        }
                      />

                    </div>

                  </div>

                  <div className="form-group">

                    <label htmlFor="staff-username">Username</label><input id="staff-username" required autoComplete="off" value={userForm.username||''} onChange={e=>setUserForm({...userForm,username:e.target.value})}/><label htmlFor="user-role">
                      Role
                      <span>*</span>
                    </label>

                    <div className="select-wrapper">

                      <i className="fas fa-user-tag"></i>

                      <select
                        id="user-role"
                        required
                        value={
                          userForm.role
                        }
                        onChange={(event) =>
                          handleModalInput(
                            setUserForm,
                            "role",
                            event.target.value
                          )
                        }
                      >

                        <option value="">
                          Select a role
                        </option>

                        <option value="Administrator">
                          Administrator
                        </option>

                        <option value="Principal">
                          Principal
                        </option>

                        <option value="ICT Personnel">
                          ICT Personnel
                        </option>

                      </select>

                    </div>

                  </div>

                </div>

                <div className="form-section-title">
                  <i className="fas fa-lock"></i>
                  Security
                </div>

                <div className="form-group">

                  <label htmlFor="user-password">
                    Temporary password
                    <span>*</span>
                  </label>

                  <div className="input-wrapper">

                    <i className="fas fa-key"></i>

                    <input
                      id="user-password"
                      type="password"
                      minLength="8"
                      required
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={
                        userForm.password
                      }
                      onChange={(event) =>
                        handleModalInput(
                          setUserForm,
                          "password",
                          event.target.value
                        )
                      }
                    />

                  </div>

                  <span className="file-help">
                    The user should change this
                    password after signing in.
                  </span>

                </div>

                {modalError && <p role="alert" style={{color:'#ad0014'}}>{modalError}</p>}{modalSuccess && (
                  <SuccessMessage>
                    User account created
                    successfully.
                  </SuccessMessage>
                )}

                <ModalActions
                  onCancel={closeModal}
                  submitIcon="fa-user-plus"
                  submitText="Add User"
                />

              </form>
            )}

            {/* =================================================
                REPORT FORM
            ================================================= */}

            {activeModal === "report" && (
              <form
                className="modal-form"
                onSubmit={handleModalSubmit}
              >

                <div className="form-section-title">
                  <i className="fas fa-chart-column"></i>
                  Report Configuration
                </div>

                <div className="form-group">

                  <label htmlFor="report-type">
                    Report type
                    <span>*</span>
                  </label>

                  <div className="select-wrapper">

                    <i className="fas fa-file-lines"></i>

                    <select
                      id="report-type"
                      required
                      value={
                        reportForm.type
                      }
                      onChange={(event) =>
                        handleModalInput(
                          setReportForm,
                          "type",
                          event.target.value
                        )
                      }
                    >

                      <option value="">
                        Select report type
                      </option>

                      <option value="Credential Requests Summary">
                        Credential Requests Summary
                      </option>

                      <option value="Released Credentials">
                        Released Credentials
                      </option>

                      <option value="Student Records Uploads">
                        Student Records Uploads
                      </option>

                      <option value="User Activity">
                        User Activity
                      </option>

                    </select>

                  </div>

                </div>

                <div className="form-row">

                  <div className="form-group">

                    <label htmlFor="report-from">
                      From
                      <span>*</span>
                    </label>

                    <div className="input-wrapper">

                      <i className="far fa-calendar"></i>

                      <input
                        id="report-from"
                        type="date"
                        required
                        value={
                          reportForm.from
                        }
                        onChange={(event) =>
                          handleModalInput(
                            setReportForm,
                            "from",
                            event.target.value
                          )
                        }
                      />

                    </div>

                  </div>

                  <div className="form-group">

                    <label htmlFor="report-to">
                      To
                      <span>*</span>
                    </label>

                    <div className="input-wrapper">

                      <i className="far fa-calendar"></i>

                      <input
                        id="report-to"
                        type="date"
                        required
                        value={
                          reportForm.to
                        }
                        onChange={(event) =>
                          handleModalInput(
                            setReportForm,
                            "to",
                            event.target.value
                          )
                        }
                      />

                    </div>

                  </div>

                </div>

                <div className="form-group">

                  <label htmlFor="report-format">
                    File format
                  </label>

                  <div className="format-options">

                    {[
                      {
                        value: "PDF",
                        icon: "fa-file-pdf",
                      },
                      {
                        value: "Excel",
                        icon: "fa-file-excel",
                      },
                      {
                        value: "CSV",
                        icon: "fa-file-csv",
                      },
                    ].map((format) => (

                      <label
                        className={`format-option ${
                          reportForm.format ===
                          format.value
                            ? "selected"
                            : ""
                        }`}
                        key={format.value}
                      >

                        <input
                          type="radio"
                          name="report-format"
                          value={format.value}
                          checked={
                            reportForm.format ===
                            format.value
                          }
                          onChange={(event) =>
                            handleModalInput(
                              setReportForm,
                              "format",
                              event.target.value
                            )
                          }
                        />

                        <i
                          className={`fas ${format.icon}`}
                        ></i>

                        <span>
                          {format.value}
                        </span>

                      </label>

                    ))}

                  </div>

                </div>

                {modalError && <p role="alert" style={{color:'#ad0014'}}>{modalError}</p>}{modalSuccess && (
                  <SuccessMessage>
                    Report generated
                    successfully.
                  </SuccessMessage>
                )}

                <ModalActions
                  onCancel={closeModal}
                  submitIcon="fa-chart-column"
                  submitText="Generate Report"
                />

              </form>
            )}

          </div>

        </div>
      )}

    </div>
  );
}

/* =============================================================
   REUSABLE SUCCESS MESSAGE
============================================================= */

function SuccessMessage({ children }) {
  return (
    <div
      className="modal-status show"
      role="status"
      aria-live="polite"
    >

      <span className="success-icon">
        <i className="fas fa-check"></i>
      </span>

      <span>
        {children}
      </span>

    </div>
  );
}

/* =============================================================
   REUSABLE MODAL ACTIONS
============================================================= */

function ModalActions({
  onCancel,
  submitIcon,
  submitText,
}) {
  return (
    <div className="modal-actions">

      <button
        type="button"
        className="btn-cancel"
        onClick={onCancel}
      >
        Cancel
      </button>

      <button
        type="submit"
        className="btn-submit"
      >

        <i
          className={`fas ${submitIcon}`}
        ></i>

        {submitText}

      </button>

    </div>
  );
}

export default AdministrationDashboard;

