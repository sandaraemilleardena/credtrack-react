import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AdministrationReports.css";

const monthly = [
  { m: "Jan", p: 20, a: 35, r: 28, x: 5 },
  { m: "Feb", p: 24, a: 39, r: 31, x: 4 },
  { m: "Mar", p: 21, a: 45, r: 33, x: 6 },
  { m: "Apr", p: 28, a: 48, r: 30, x: 5 },
  { m: "May", p: 32, a: 54, r: 35, x: 6 },
  { m: "Jun", p: 18, a: 37, r: 26, x: 3 },
];

const rows = [
  [
    "REQ-2026-0127",
    "Juan Dela Cruz",
    "SF10",
    "May 25, 2026",
    "Pending",
    "Pending",
  ],
  [
    "REQ-2026-0126",
    "Maria Santos",
    "Good Moral Certificate",
    "May 24, 2026",
    "1.8 days",
    "Approved",
  ],
  [
    "REQ-2026-0125",
    "John Ramos",
    "Certificate of Enrollment",
    "May 23, 2026",
    "2.1 days",
    "Released",
  ],
  [
    "REQ-2026-0124",
    "Angela Reyes",
    "SF9",
    "May 22, 2026",
    "1.2 days",
    "Rejected",
  ],
  [
    "REQ-2026-0123",
    "Carlo Mendoza",
    "Certificate of Enrollment",
    "May 21, 2026",
    "Pending",
    "Pending",
  ],
  [
    "REQ-2026-0122",
    "Sophia Garcia",
    "SF10",
    "May 20, 2026",
    "2.7 days",
    "Approved",
  ],
  [
    "REQ-2026-0121",
    "Mark Bautista",
    "SF9",
    "May 19, 2026",
    "Pending",
    "Pending",
  ],
  [
    "REQ-2026-0120",
    "Bea Navarro",
    "Good Moral Certificate",
    "May 18, 2026",
    "2.3 days",
    "Released",
  ],
  [
    "REQ-2026-0119",
    "Luis Aquino",
    "SF10",
    "May 17, 2026",
    "2.5 days",
    "Released",
  ],
  [
    "REQ-2026-0118",
    "Chloe Villanueva",
    "Certificate of Enrollment",
    "May 16, 2026",
    "Pending",
    "Pending",
  ],
];

const templates = [
  {
    report: "Credential Requests Summary",
    icon: "fa-folder-open",
    title: "Request Summary",
    description: "All request statuses",
  },
  {
    report: "Credential Completion Report",
    icon: "fa-circle-check",
    title: "Completion Report",
    description: "Approved and released",
  },
  {
    report: "Released Credentials Report",
    icon: "fa-box-open",
    title: "Release Report",
    description: "Claimed credentials",
  },
  {
    report: "Processing Time Report",
    icon: "fa-stopwatch",
    title: "Processing Time",
    description: "Turnaround performance",
  },
];

function AdministrationReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const navigationItems = useMemo(() => [
    { label: "Dashboard", icon: "fa-table-columns", path: "/admin-dashboard" },
    { label: "Credential Management", icon: "fa-folder-open", path: "/admin-credential-management" },
    { label: "Student Records", icon: "fa-user-graduate", path: "/admin-student-records" },
    { label: "User Management", icon: "fa-users", path: "/admin-user-management" },
    { label: "Reports", icon: "fa-chart-line", path: "/admin-reports" },
    { label: "Activity Logs", icon: "fa-clock-rotate-left", path: "/admin-activity-logs" },
    { label: "System Settings", icon: "fa-gear", path: "/admin-settings" },
  ], []);
  const isActiveRoute = (path) => location.pathname.startsWith(path);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [reportType, setReportType] = useState(
    "Credential Requests Summary"
  );
  const [dateFrom, setDateFrom] = useState("2026-05-01");
  const [dateTo, setDateTo] = useState("2026-05-31");
  const [credentialFilter, setCredentialFilter] =
    useState("All Credentials");
  const [selectedTemplate, setSelectedTemplate] = useState(
    "Credential Requests Summary"
  );

  const [chartTitle, setChartTitle] = useState(
    "Credential Requests Summary"
  );

  const [chartPeriod, setChartPeriod] = useState(
    "May 1–31, 2026 · All Credentials"
  );

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setAdminMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast("");
    }, 2300);

    return () => clearTimeout(timer);
  }, [toast]);

  const notify = (text) => {
    setToast(text);
  };

  const formattedPeriod = useMemo(() => {
    if (!dateFrom || !dateTo) return "";

    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return "";
    }

    return `${from.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} – ${to.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} · ${credentialFilter}`;
  }, [dateFrom, dateTo, credentialFilter]);

  const generateReport = () => {
    if (!dateFrom || !dateTo) {
      notify("Please select a reporting period");
      return;
    }

    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);

    if (from > to) {
      notify("Date From must be before Date To");
      return;
    }

    setChartTitle(reportType);
    setChartPeriod(formattedPeriod);
    notify("Report generated successfully");
  };

  const selectTemplate = (report) => {
    setSelectedTemplate(report);
    setReportType(report);

    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);

    if (from > to) {
      notify("Date From must be before Date To");
      return;
    }

    setChartTitle(report);
    setChartPeriod(formattedPeriod);
    notify("Report generated successfully");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = (format) => {
    notify(`${format} report prepared for export`);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("credtrackSession");
    navigate("/");
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="reports-page">
      {/* Shared dashboard sidebar */}
      <button type="button" className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`} aria-label="Close navigation" onClick={closeSidebar} />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Administrator navigation">
        <div className="brand"><div className="brand-logo"><img src="/logo.png" alt="PMRMIS-South logo" /></div><div className="brand-copy"><h2>CredTrack</h2><span>PMRMIS–SOUTH</span></div><button type="button" className="close-sidebar" onClick={closeSidebar}><i className="fas fa-xmark" /></button></div>
        <div className="sidebar-system-card"><div className="system-card-icon"><i className="fas fa-shield-halved" /></div><div><strong>Records Management</strong><span>Administrative Portal</span></div><span className="online-dot" /></div>
        <nav className="sidebar-navigation"><ul className="menu">{navigationItems.map((item) => <li className={`menu-item ${isActiveRoute(item.path) ? "active" : ""}`} key={item.path}><button type="button" className="menu-link" onClick={() => { navigate(item.path); closeSidebar(); }}><span className="menu-icon"><i className={`fas ${item.icon}`} /></span><span className="menu-text">{item.label}</span>{isActiveRoute(item.path) && <span className="active-indicator"><i className="fas fa-chevron-right" /></span>}</button></li>)}</ul></nav>
        <div className="sidebar-profile"><div className="profile-avatar">AD</div><div className="profile-details"><strong>Administrator</strong><small>System Administrator</small></div><span className="profile-status"><i className="fas fa-circle" /></span></div>
      </aside>
      <div className="shell">
        <header className="topbar">
          <div className="top-left"><button type="button" className="menu-btn" onClick={() => setSidebarOpen(true)}><i className="fas fa-bars" /></button><img className="school-seal" src="/logo.png" alt="PMRMIS-South school seal" /><div className="school"><strong>President Manuel Roxas Memorial Integrated School – South</strong><span>Digital Credentials Management System</span></div></div>
          <div className="top-right"><button type="button" className="bell" onClick={() => notify("You have 3 notifications.")}><i className="far fa-bell" /><b>3</b></button><div className="admin-menu-wrap"><button type="button" className="profile" aria-expanded={adminMenuOpen} onClick={() => setAdminMenuOpen((open) => !open)}><img src="/logo.png" alt="Administrator" /><div><strong>Administrator</strong><small>System Administrator</small></div><i className="fas fa-chevron-down" /></button>{adminMenuOpen && <div className="admin-dropdown"><strong>Administrator</strong><span>Account actions</span><button type="button" className="admin-logout" onClick={handleLogout}><i className="fas fa-right-from-bracket" />Log out</button></div>}</div></div>
        </header>
        {/* Content */}
        <main className="content">
          {/* Page Header */}
          <section className="page-head">
            <div>
              <h1>Reports</h1>
              <p>
                Generate, review, and export credential performance
                reports.
              </p>
            </div>

            <div className="head-actions">
              <button
                type="button"
                className="outline"
                onClick={handlePrint}
              >
                <i className="fas fa-print"></i>
                Print
              </button>

              <button
                type="button"
                className="primary"
                onClick={() =>
                  notify("PDF report prepared for export")
                }
              >
                <i className="fas fa-file-pdf"></i>
                Export PDF
              </button>
            </div>
          </section>

          <section className="reports-overview" aria-label="Reports overview">
            <div className="overview-copy">
              <span className="overview-label"><i className="fas fa-school" /> SCHOOL REPORTING CENTER</span>
              <strong>Clear credential insights for confident school decisions.</strong>
              <span>Track request activity, release performance, and document processing from one reporting workspace.</span>
            </div>
            <div className="overview-metrics">
              <div><b>143</b><span>Requests this month</span></div>
              <div><b>92%</b><span>Completion rate</span></div>
              <div><b>1.8d</b><span>Average processing</span></div>
            </div>
          </section>

          {/* Report Builder */}
          <section className="report-builder">
            <div className="builder-head">
              <div>
                <h2>Report Builder</h2>
                <p>
                  Select the report type and reporting period.
                </p>
              </div>
            </div>

            <div className="filters">
              <div className="field">
                <label htmlFor="reportType">
                  REPORT TYPE
                </label>

                <select
                  id="reportType"
                  value={reportType}
                  onChange={(e) =>
                    setReportType(e.target.value)
                  }
                >
                  <option>
                    Credential Requests Summary
                  </option>
                  <option>
                    Credential Completion Report
                  </option>
                  <option>
                    Released Credentials Report
                  </option>
                  <option>
                    Student Credential History
                  </option>
                  <option>
                    Processing Time Report
                  </option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="dateFrom">
                  DATE FROM
                </label>

                <input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) =>
                    setDateFrom(e.target.value)
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="dateTo">
                  DATE TO
                </label>

                <input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) =>
                    setDateTo(e.target.value)
                  }
                />
              </div>

              <div className="field">
                <label htmlFor="credentialFilter">
                  CREDENTIAL
                </label>

                <select
                  id="credentialFilter"
                  value={credentialFilter}
                  onChange={(e) =>
                    setCredentialFilter(e.target.value)
                  }
                >
                  <option>All Credentials</option>
                  <option>SF10</option>
                  <option>SF9</option>
                  <option>
                    Certificate of Enrollment
                  </option>
                  <option>
                    Good Moral Certificate
                  </option>
                </select>
              </div>

              <button
                type="button"
                className="generate"
                onClick={generateReport}
              >
                <i className="fas fa-chart-column"></i>
                Generate
              </button>
            </div>
          </section>

          {/* Templates */}
          <section className="templates">
            {templates.map((template) => (
              <button
                key={template.report}
                type="button"
                className={`template ${
                  selectedTemplate === template.report
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  selectTemplate(template.report)
                }
              >
                <i className={`fas ${template.icon}`}></i>

                <div>
                  <strong>{template.title}</strong>
                  <span>{template.description}</span>
                </div>
              </button>
            ))}
          </section>

          {/* Report Grid */}
          <section className="report-grid">
            {/* Chart */}
            <article className="panel">
              <div className="panel-head">
                <div>
                  <h2>{chartTitle}</h2>
                  <p>{chartPeriod}</p>
                </div>

                <div className="legend">
                  <span>
                    <i className="legend-gold"></i>
                    Pending
                  </span>

                  <span>
                    <i className="legend-green"></i>
                    Approved
                  </span>

                  <span>
                    <i className="legend-blue"></i>
                    Released
                  </span>

                  <span>
                    <i className="legend-red"></i>
                    Rejected
                  </span>
                </div>
              </div>

              <div className="chart">
                {monthly.map((item) => (
                  <div className="group" key={item.m}>
                    <div className="bar-wrap">
                      <div
                        className="bar pending-bar"
                        data-value={item.p}
                        style={{
                          height: `${(item.p / 60) * 100}%`,
                        }}
                      ></div>
                    </div>

                    <div className="bar-wrap">
                      <div
                        className="bar approved-bar"
                        data-value={item.a}
                        style={{
                          height: `${(item.a / 60) * 100}%`,
                        }}
                      ></div>
                    </div>

                    <div className="bar-wrap">
                      <div
                        className="bar released-bar"
                        data-value={item.r}
                        style={{
                          height: `${(item.r / 60) * 100}%`,
                        }}
                      ></div>
                    </div>

                    <div className="bar-wrap">
                      <div
                        className="bar rejected-bar"
                        data-value={item.x}
                        style={{
                          height: `${Math.max(
                            (item.x / 60) * 100,
                            5
                          )}%`,
                        }}
                      ></div>
                    </div>

                    <span className="group-name">
                      {item.m}
                    </span>
                  </div>
                ))}
              </div>
            </article>

            {/* Insights */}
            <aside className="panel">
              <div className="panel-head">
                <div>
                  <h2>Report Insights</h2>
                  <p>
                    Calculated from the selected period
                  </p>
                </div>
              </div>

              <div className="insights">
                <div className="insight">
                  <i className="fas fa-file-circle-plus"></i>

                  <div>
                    <strong>Total requests</strong>
                    <span>Submitted this period</span>
                  </div>

                  <b>127</b>
                </div>

                <div className="insight">
                  <i className="fas fa-circle-check"></i>

                  <div>
                    <strong>Completion rate</strong>
                    <span>Approved or released</span>
                  </div>

                  <b>70%</b>
                </div>

                <div className="insight">
                  <i className="fas fa-stopwatch"></i>

                  <div>
                    <strong>Average processing</strong>
                    <span>From request to approval</span>
                  </div>

                  <b>2.4 days</b>
                </div>

                <div className="insight">
                  <i className="fas fa-file-lines"></i>

                  <div>
                    <strong>Most requested</strong>
                    <span>SF10 Permanent Record</span>
                  </div>

                  <b>41</b>
                </div>
              </div>

              <div className="note">
                <i className="fas fa-circle-info"></i>{" "}
                Reports contain school records. Export only
                when authorized and store files securely.
              </div>
            </aside>
          </section>

          {/* Detailed Report */}
          <section className="panel table-panel">
            <div className="table-head">
              <div>
                <h2>Detailed Report</h2>
                <p>10 credential requests shown</p>
              </div>

              <div className="export-buttons">
                <button
                  type="button"
                  onClick={() => handleExport("CSV")}
                >
                  <i className="fas fa-file-csv"></i>
                  CSV
                </button>

                <button
                  type="button"
                  onClick={() => handleExport("Excel")}
                >
                  <i className="fas fa-file-excel"></i>
                  Excel
                </button>

                <button
                  type="button"
                  onClick={() => handleExport("PDF")}
                >
                  <i className="fas fa-file-pdf"></i>
                  PDF
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>REQUEST ID</th>
                    <th>STUDENT</th>
                    <th>CREDENTIAL</th>
                    <th>DATE FILED</th>
                    <th>PROCESSING TIME</th>
                    <th>STATUS</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr key={row[0]}>
                      <td>
                        <strong>{row[0]}</strong>
                      </td>

                      <td>{row[1]}</td>
                      <td>{row[2]}</td>
                      <td>{row[3]}</td>
                      <td>{row[4]}</td>

                      <td>
                        <span
                          className={`badge ${row[5].toLowerCase()}`}
                        >
                          {row[5]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-foot">
              <span>Showing 1–10 of 127 records</span>

              <div className="pages">
                <button type="button">
                  <i className="fas fa-chevron-left"></i>
                </button>

                <button
                  type="button"
                  className="current"
                >
                  1
                </button>

                <button type="button">2</button>
                <button type="button">3</button>

                <button type="button">
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Toast */}
      <div className={`toast ${toast ? "show" : ""}`}>
        {toast}
      </div>
    </div>
  );
}

export default AdministrationReports; 