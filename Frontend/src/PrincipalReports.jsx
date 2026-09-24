import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PrincipalReports.css";

/* =========================================================
   REPORT DATA
   ========================================================= */

const reportData = {
  month: {
    requests: 127,
    approved: 54,
    released: 35,
    average: "2.4 days",
    trend: [
      [58, 43],
      [72, 55],
      [66, 52],
      [81, 64],
      [88, 70],
      [76, 61],
      [92, 74],
    ],
  },

  quarter: {
    requests: 348,
    approved: 296,
    released: 251,
    average: "2.7 days",
    trend: [
      [62, 45],
      [70, 54],
      [75, 61],
      [82, 66],
      [78, 64],
      [86, 72],
      [91, 78],
    ],
  },

  year: {
    requests: 1042,
    approved: 934,
    released: 861,
    average: "2.9 days",
    trend: [
      [55, 42],
      [64, 51],
      [72, 57],
      [68, 56],
      [80, 67],
      [86, 73],
      [93, 81],
    ],
  },
};

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
];

/* =========================================================
   PRINCIPAL REPORTS
   ========================================================= */

function PrincipalReports() {
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

  const [period, setPeriod] = useState("month");
  const [gradeLevel, setGradeLevel] = useState("all");
  const [credentialType, setCredentialType] = useState("all");

  /* =======================================================
     REPORT STATE
     ======================================================= */

  const [activeReport, setActiveReport] = useState(
    reportData.month
  );

  const [toast, setToast] = useState("");

  /* =======================================================
     PERIOD LABEL
     ======================================================= */

  const currentPeriodLabel = useMemo(() => {
    if (period === "quarter") {
      return "This Quarter";
    }

    if (period === "year") {
      return "School Year 2026–2027";
    }

    return "This Month";
  }, [period]);

  /* =======================================================
     TOAST TIMER
     ======================================================= */

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => {
      setToast("");
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  /* =======================================================
     TOAST
     ======================================================= */

  const showToast = (message) => {
    setToast(message);
  };

  /* =======================================================
     SIDEBAR
     ======================================================= */

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  /* =======================================================
     NAVIGATION
     ======================================================= */

  const handleNavigation = (path) => {
    closeSidebar();
    setNotificationOpen(false);
    setProfileOpen(false);

    navigate(path);
  };

  /* =======================================================
     APPLY REPORT FILTERS
     ======================================================= */

  const applyReportFilters = () => {
    const selectedReport =
      reportData[period] || reportData.month;

    setActiveReport(selectedReport);

    const selectedFilters = [currentPeriodLabel];

    if (gradeLevel !== "all") {
      selectedFilters.push(gradeLevel);
    }

    if (credentialType !== "all") {
      selectedFilters.push(credentialType);
    }

    showToast(
      `Report updated for ${selectedFilters.join(" • ")}`
    );
  };

  /* =======================================================
     EXPORT CSV
     ======================================================= */

  const handleExport = () => {
    const rows = [
      ["CredTrack Principal Report"],
      [],
      ["Reporting Period", currentPeriodLabel],
      [
        "Grade Level",
        gradeLevel === "all"
          ? "All Grade Levels"
          : gradeLevel,
      ],
      [
        "Credential Type",
        credentialType === "all"
          ? "All Credentials"
          : credentialType,
      ],
      [],
      ["Metric", "Value"],
      ["Total Requests", activeReport.requests],
      ["Principal Approved", activeReport.approved],
      ["Released", activeReport.released],
      ["Average Processing", activeReport.average],
    ];

    const csvContent = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "principal-credential-report.csv";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);

    showToast("Report exported as CSV");
  };

  /* =======================================================
     PRINT
     ======================================================= */

  const handlePrint = () => {
    window.print();
  };

  /* =======================================================
     LOGOUT
     ======================================================= */

  const handleLogout = () => {
    sessionStorage.removeItem("credtrackSession");
    localStorage.removeItem("credtrackPrincipalSession");

    navigate("/");
  };

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="principal-reports-page">

      {/* ===================================================
          MOBILE SIDEBAR OVERLAY
          =================================================== */}

      <div
        className={`principal-sidebar-screen ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={closeSidebar}
      />

      {/* ===================================================
          SIDEBAR
          EXACT SAME STRUCTURE AS APPROVALS
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
            type="button"
            className="principal-mobile-close"
            onClick={closeSidebar}
            aria-label="Close navigation"
          >
            <i className="fas fa-xmark" />
          </button>

        </div>

        {/* NAVIGATION */}
        <ul className="principal-nav">

          {/* DASHBOARD */}
          <li>

            <button
              type="button"
              onClick={() =>
                handleNavigation(
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
                handleNavigation(
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
          <li className="active">

            <button
              type="button"
              onClick={() =>
                handleNavigation(
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
                handleNavigation(
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

          {/* LOGOUT */}
          <li className="logout-item">

            <button
              type="button"
              onClick={handleLogout}
            >
              <i className="fas fa-right-from-bracket" />

              <span>
                Logout
              </span>

            </button>

          </li>

        </ul>

        {/* SIDEBAR FOOTER */}
        <div className="principal-sidebar-footer">

          <div className="principal-sidebar-user">

            <img
              src="/logo.png"
              alt="Principal"
            />

            <div>

              <strong>
                Dr. Elena Reyes
              </strong>

              <span>
                School Principal
              </span>

            </div>

          </div>

        </div>

      </aside>

      {/* ===================================================
          MAIN SHELL
          SAME CLASS AS APPROVALS
          =================================================== */}

      <div className="principal-shell">

        {/* =================================================
            TOPBAR
            SAME STRUCTURE AS APPROVALS
            ================================================= */}

        <header className="principal-topbar">

          <div className="principal-top-left">

            <button
              type="button"
              className="principal-menu-button"
              onClick={() => setSidebarOpen(true)}
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

          <div className="principal-top-right">

            {/* =================================================
                NOTIFICATION
                SAME CLASS STRUCTURE AS APPROVALS
                ================================================= */}

            <div className="principal-notification-wrapper">

              <button
                type="button"
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
                        3 new
                      </span>

                    </div>

                    <span className="principal-unread-count">
                      3
                    </span>

                  </div>

                  <div className="principal-notification-item">

                    <div className="notification-icon approval">

                      <i className="fas fa-file-signature" />

                    </div>

                    <div>

                      <strong>
                        7 requests awaiting approval
                      </strong>

                      <span>
                        Credential approvals need review.
                      </span>

                      <small>
                        Today
                      </small>

                    </div>

                  </div>

                  <div className="principal-notification-item">

                    <div className="notification-icon approval">

                      <i className="fas fa-chart-line" />

                    </div>

                    <div>

                      <strong>
                        Monthly report ready
                      </strong>

                      <span>
                        Your current report has been updated.
                      </span>

                      <small>
                        Today
                      </small>

                    </div>

                  </div>

                  <div className="principal-notification-item">

                    <div className="notification-icon success">

                      <i className="fas fa-circle-check" />

                    </div>

                    <div>

                      <strong>
                        System status normal
                      </strong>

                      <span>
                        CredTrack services are operating normally.
                      </span>

                      <small>
                        Yesterday
                      </small>

                    </div>

                  </div>

                </div>
              )}

            </div>

            {/* =================================================
                PROFILE
                SAME CLASS STRUCTURE AS APPROVALS
                ================================================= */}

            <div className="principal-profile-wrapper">

              <button
                type="button"
                className="principal-profile"
                onClick={() => {
                  setProfileOpen(
                    (value) => !value
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

        <main className="principal-reports-content">

          {/* PAGE HEADING */}
          <section className="principal-report-page-heading">

            <div>

              <span className="principal-page-kicker">
                PRINCIPAL PORTAL
              </span>

              <h1>
                School Reports
              </h1>

              <p>
                Monitor credential requests, approvals,
                releases, and processing performance.
              </p>

            </div>

            <div className="principal-report-actions">

              <button
                type="button"
                className="principal-export-button"
                onClick={handleExport}
              >

                <i className="fas fa-file-csv" />

                Export CSV

              </button>

              <button
                type="button"
                className="principal-print-button"
                onClick={handlePrint}
              >

                <i className="fas fa-print" />

                Print Report

              </button>

            </div>

          </section>

          {/* =================================================
              FILTER BAR
              ================================================= */}

          <section
            className="principal-filter-bar"
            aria-label="Report filters"
          >

            <div className="principal-filter-group">

              <label htmlFor="periodFilter">
                Reporting Period
              </label>

              <select
                id="periodFilter"
                value={period}
                onChange={(event) =>
                  setPeriod(event.target.value)
                }
              >

                <option value="month">
                  This Month
                </option>

                <option value="quarter">
                  This Quarter
                </option>

                <option value="year">
                  School Year 2026–2027
                </option>

              </select>

            </div>

            <div className="principal-filter-group">

              <label htmlFor="gradeFilter">
                Grade Level
              </label>

              <select
                id="gradeFilter"
                value={gradeLevel}
                onChange={(event) =>
                  setGradeLevel(event.target.value)
                }
              >

                <option value="all">
                  All Grade Levels
                </option>

                <option value="Grade 7">
                  Grade 7
                </option>

                <option value="Grade 8">
                  Grade 8
                </option>

                <option value="Grade 9">
                  Grade 9
                </option>

                <option value="Grade 10">
                  Grade 10
                </option>

                <option value="Grade 11">
                  Grade 11
                </option>

                <option value="Grade 12">
                  Grade 12
                </option>

              </select>

            </div>

            <div className="principal-filter-group">

              <label htmlFor="credentialFilter">
                Credential Type
              </label>

              <select
                id="credentialFilter"
                value={credentialType}
                onChange={(event) =>
                  setCredentialType(
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

                <option value="Certificate of Enrollment">
                  Certificate of Enrollment
                </option>

                <option value="Good Moral Certificate">
                  Good Moral Certificate
                </option>

              </select>

            </div>

            <button
              type="button"
              className="principal-apply-button"
              onClick={applyReportFilters}
            >

              <i className="fas fa-filter" />

              Apply Filters

            </button>

          </section>

          {/* =================================================
              SUMMARY CARDS
              ================================================= */}

          <section className="principal-summary-grid">

            <article className="principal-summary-card requests">

              <div className="principal-summary-icon">

                <i className="fas fa-folder-open" />

              </div>

              <div>

                <span>
                  Total Requests
                </span>

                <strong>
                  {activeReport.requests}
                </strong>

                <small>
                  +12% from previous period
                </small>

              </div>

            </article>

            <article className="principal-summary-card approved">

              <div className="principal-summary-icon">

                <i className="fas fa-file-signature" />

              </div>

              <div>

                <span>
                  Principal Approved
                </span>

                <strong>
                  {activeReport.approved}
                </strong>

                <small>
                  92% approval rate
                </small>

              </div>

            </article>

            <article className="principal-summary-card released">

              <div className="principal-summary-icon">

                <i className="fas fa-box-open" />

              </div>

              <div>

                <span>
                  Released
                </span>

                <strong>
                  {activeReport.released}
                </strong>

                <small>
                  65% of approved requests
                </small>

              </div>

            </article>

            <article className="principal-summary-card processing">

              <div className="principal-summary-icon">

                <i className="fas fa-stopwatch" />

              </div>

              <div>

                <span>
                  Average Processing
                </span>

                <strong>
                  {activeReport.average}
                </strong>

                <small>
                  0.6 day improvement
                </small>

              </div>

            </article>

          </section>

          {/* =================================================
              REPORT GRID
              ================================================= */}

          <section className="principal-report-grid">

            {/* TREND */}
            <article className="principal-panel">

              <div className="principal-panel-heading">

                <div>

                  <h2>
                    Request and Release Trend
                  </h2>

                  <p>
                    Monthly credential volume for the current
                    school year
                  </p>

                </div>

                <div className="principal-legend">

                  <span className="request-key">
                    Requests
                  </span>

                  <span className="release-key">
                    Released
                  </span>

                </div>

              </div>

              <div className="principal-bar-chart">

                {activeReport.trend.map(
                  (values, index) => (
                    <div
                      className="principal-month-column"
                      key={`${months[index]}-${index}`}
                    >

                      <div className="principal-bars">

                        <div
                          className="principal-bar"
                          style={{
                            "--height":
                              `${values[0]}%`,
                          }}
                          title={`${values[0]} requests`}
                        />

                        <div
                          className="principal-bar released-bar"
                          style={{
                            "--height":
                              `${values[1]}%`,
                          }}
                          title={`${values[1]} released`}
                        />

                      </div>

                      <span>
                        {months[index]}
                      </span>

                    </div>
                  )
                )}

              </div>

            </article>

            {/* DONUT */}
            <article className="principal-panel">

              <div className="principal-panel-heading">

                <div>

                  <h2>
                    Credential Distribution
                  </h2>

                  <p>
                    Requests grouped by credential type
                  </p>

                </div>

              </div>

              <div className="principal-donut-area">

                <div className="principal-donut">

                  <div className="principal-donut-center">

                    <strong>
                      {activeReport.requests}
                    </strong>

                    <span>
                      Total requests
                    </span>

                  </div>

                </div>

                <div className="principal-type-legend">

                  <div>
                    <i
                      className="fas fa-circle"
                      style={{
                        "--dot-color":
                          "#176cf4",
                      }}
                    />
                    SF10 · 32%
                  </div>

                  <div>
                    <i
                      className="fas fa-circle"
                      style={{
                        "--dot-color":
                          "#29a94d",
                      }}
                    />
                    SF9 · 26%
                  </div>

                  <div>
                    <i
                      className="fas fa-circle"
                      style={{
                        "--dot-color":
                          "#e3a008",
                      }}
                    />
                    Enrollment · 20%
                  </div>

                  <div>
                    <i
                      className="fas fa-circle"
                      style={{
                        "--dot-color":
                          "#8d0e12",
                      }}
                    />
                    Good Moral · 14%
                  </div>

                  <div>
                    <i
                      className="fas fa-circle"
                      style={{
                        "--dot-color":
                          "#7652b5",
                      }}
                    />
                    Other · 8%
                  </div>

                </div>

              </div>

            </article>

          </section>

          {/* =================================================
              LOWER GRID
              ================================================= */}

          <section className="principal-lower-grid">

            {/* PROCESSING PERFORMANCE */}
            <article className="principal-panel">

              <div className="principal-panel-heading">

                <div>

                  <h2>
                    Processing Performance
                  </h2>

                  <p>
                    Completion rates by credential type
                  </p>

                </div>

              </div>

              <div className="principal-performance-list">

                <div className="principal-performance-row">

                  <div className="principal-performance-label">

                    <span>
                      SF10 Permanent Record
                    </span>

                    <strong>
                      93%
                    </strong>

                  </div>

                  <div className="principal-track">

                    <div
                      className="principal-fill"
                      style={{
                        "--width": "93%",
                        "--bar-color":
                          "#176cf4",
                      }}
                    />

                  </div>

                </div>

                <div className="principal-performance-row">

                  <div className="principal-performance-label">

                    <span>
                      SF9 Report Card
                    </span>

                    <strong>
                      87%
                    </strong>

                  </div>

                  <div className="principal-track">

                    <div
                      className="principal-fill"
                      style={{
                        "--width": "87%",
                        "--bar-color":
                          "#29a94d",
                      }}
                    />

                  </div>

                </div>

                <div className="principal-performance-row">

                  <div className="principal-performance-label">

                    <span>
                      Certificate of Enrollment
                    </span>

                    <strong>
                      89%
                    </strong>

                  </div>

                  <div className="principal-track">

                    <div
                      className="principal-fill"
                      style={{
                        "--width": "89%",
                        "--bar-color":
                          "#e3a008",
                      }}
                    />

                  </div>

                </div>

                <div className="principal-performance-row">

                  <div className="principal-performance-label">

                    <span>
                      Good Moral Certificate
                    </span>

                    <strong>
                      88%
                    </strong>

                  </div>

                  <div className="principal-track">

                    <div
                      className="principal-fill"
                      style={{
                        "--width": "88%",
                        "--bar-color":
                          "#8d0e12",
                      }}
                    />

                  </div>

                </div>

              </div>

            </article>

            {/* GRADE SUMMARY */}
            <article className="principal-panel">

              <div className="principal-panel-heading">

                <div>

                  <h2>
                    Grade-Level Summary
                  </h2>

                  <p>
                    Credential activity by current grade level
                  </p>

                </div>

              </div>

              <div className="principal-table-wrap">

                <table>

                  <thead>

                    <tr>

                      <th>
                        GRADE
                      </th>

                      <th>
                        REQUESTS
                      </th>

                      <th>
                        APPROVED
                      </th>

                      <th>
                        RELEASED
                      </th>

                      <th>
                        RATE
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    <tr>
                      <td>Grade 7</td>
                      <td>18</td>
                      <td>16</td>
                      <td>13</td>
                      <td className="principal-rate">
                        89%
                      </td>
                    </tr>

                    <tr>
                      <td>Grade 8</td>
                      <td>17</td>
                      <td>15</td>
                      <td>12</td>
                      <td className="principal-rate">
                        88%
                      </td>
                    </tr>

                    <tr>
                      <td>Grade 9</td>
                      <td>22</td>
                      <td>20</td>
                      <td>16</td>
                      <td className="principal-rate">
                        91%
                      </td>
                    </tr>

                    <tr>
                      <td>Grade 10</td>
                      <td>28</td>
                      <td>26</td>
                      <td>21</td>
                      <td className="principal-rate">
                        93%
                      </td>
                    </tr>

                    <tr>
                      <td>Grade 11</td>
                      <td>19</td>
                      <td>17</td>
                      <td>14</td>
                      <td className="principal-rate">
                        89%
                      </td>
                    </tr>

                    <tr>
                      <td>Grade 12</td>
                      <td>23</td>
                      <td>21</td>
                      <td>18</td>
                      <td className="principal-rate">
                        91%
                      </td>
                    </tr>

                  </tbody>

                </table>

              </div>

            </article>

          </section>

          {/* REPORT NOTE */}

          <div className="principal-report-note">

            <i className="fas fa-circle-info" />

            <span>
              Figures summarize workflow activity recorded in
              CredTrack. The Principal may review and export
              reports, while source-record corrections remain the
              responsibility of authorized records and ICT
              personnel.
            </span>

          </div>

        </main>

      </div>

      {/* =================================================
          TOAST
          ================================================= */}

      {toast && (
        <div className="principal-report-toast show">
          {toast}
        </div>
      )}

    </div>
  );
}

/* =========================================================
   EXPORT
   ========================================================= */

export default PrincipalReports;