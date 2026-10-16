import { logoutUser } from './auth/session';
import {usePortal} from './hooks/PortalContext';
import {metrics,monthlyCounts,statusName,elapsed,localDay} from './api/portalData';
import {downloadCSV} from './api/operations';
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AdministrationReports.css";

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
  const system=usePortal();
  const navigate = useNavigate();
  const location = useLocation();
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const navigationItems = useMemo(() => [
    { label: "Dashboard", icon: "fa-table-columns", path: "/admin-dashboard" },
    { label: "Credential Management", icon: "fa-folder-open", path: "/admin-credential-management" },
    { label: "Student Records", icon: "fa-user-graduate", path: "/admin-student-records" },
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
  const [dateFrom, setDateFrom] = useState(new Date().getFullYear()+'-01-01');
  const [dateTo, setDateTo] = useState(localDay(new Date()));
  const [credentialFilter, setCredentialFilter] =
    useState("All Credentials");
  const [applied,setApplied]=useState({reportType:'Credential Requests Summary',dateFrom:new Date().getFullYear()+'-01-01',dateTo:localDay(new Date()),credentialFilter:'All Credentials'});
  const items=system.data.requests.filter(r=>(!applied.dateFrom||localDay(r.created_at)>=applied.dateFrom)&&(!applied.dateTo||localDay(r.created_at)<=applied.dateTo)&&(applied.credentialFilter==='All Credentials'||r.credential.toLowerCase().includes(applied.credentialFilter.toLowerCase()))).filter(r=>applied.reportType==='Released Credentials Report'?r.status==='RELEASED':applied.reportType==='Credential Completion Report'?Boolean(r.approved_at):true);
  const openStatistic=(category)=>{const params=new URLSearchParams({category});if(dateFrom)params.set('date_from',dateFrom);if(dateTo)params.set('date_to',dateTo);if(credentialFilter!=='All Credentials')params.set('credential',credentialFilter);navigate('/admin-credential-management?'+params);};
  const totals=metrics(items), monthly=monthlyCounts(items);
  const popular=Object.entries(items.reduce((all,r)=>({...all,[r.credential]:(all[r.credential]||0)+1}),{})).sort((a,b)=>b[1]-a[1])[0]||['None yet',0];
  const [reportPage,setReportPage]=useState(1),pages=Math.max(1,Math.ceil(items.length/10)),currentPage=Math.min(reportPage,pages);
  const rows=items.map(r=>[r.reference,r.full_name,r.credential,new Date(r.created_at).toLocaleDateString(),elapsed(r)===null?'In progress':elapsed(r).toFixed(1)+' days',statusName(r)]);
  const [selectedTemplate, setSelectedTemplate] = useState(
    "Credential Requests Summary"
  );

  const [chartTitle, setChartTitle] = useState(
    "Credential Requests Summary"
  );

  const [chartPeriod, setChartPeriod] = useState(
    "Current reporting period"
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

    setApplied({reportType,dateFrom,dateTo,credentialFilter});
    setReportPage(1);
    setSelectedTemplate(reportType);
    setChartTitle(reportType);
    setChartPeriod(formattedPeriod);
    notify("Report generated successfully");
  };

  const selectTemplate = (report) => {setSelectedTemplate(report);setReportType(report);notify('Report type selected. Click Generate to apply it.');};

  const handleExport = (format) => {
    downloadCSV('CredTrack_Transactions.csv',[['Reference','Requester','Credential','Submitted','Turnaround','Status'],...rows]);notify('Transaction report exported as CSV (opens in Excel).');
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate("/");
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="reports-page">
      {/* Shared dashboard sidebar */}


      <div className="shell">

        {/* Content */}
        <main className="content">
          {/* Page Header */}
          <section className="page-head">
            <div>
              <h1>Reports</h1>
              <p>
                Generate and review credential performance
                reports.
              </p>
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
                    Returned / unavailable
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
                          height: `${(item.p / Math.max(1,...monthly.flatMap(r=>[r.p,r.a,r.r,r.x]))) * 100}%`,
                        }}
                      ></div>
                    </div>

                    <div className="bar-wrap">
                      <div
                        className="bar approved-bar"
                        data-value={item.a}
                        style={{
                          height: `${(item.a / Math.max(1,...monthly.flatMap(r=>[r.p,r.a,r.r,r.x]))) * 100}%`,
                        }}
                      ></div>
                    </div>

                    <div className="bar-wrap">
                      <div
                        className="bar released-bar"
                        data-value={item.r}
                        style={{
                          height: `${(item.r / Math.max(1,...monthly.flatMap(r=>[r.p,r.a,r.r,r.x]))) * 100}%`,
                        }}
                      ></div>
                    </div>

                    <div className="bar-wrap">
                      <div
                        className="bar rejected-bar"
                        data-value={item.x}
                        style={{
                          height: `${Math.max(
                            (item.x / Math.max(1,...monthly.flatMap(r=>[r.p,r.a,r.r,r.x]))) * 100,
                            0
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

                  <b>{totals.total}</b>
                </div>

                <div className="insight">
                  <i className="fas fa-circle-check"></i>

                  <div>
                    <strong>Completion rate</strong>
                    <span>Collected by requester</span>
                  </div>

                  <b>{totals.total?Math.round(totals.released/totals.total*100):0}%</b>
                </div>

                <div className="insight">
                  <i className="fas fa-stopwatch"></i>

                  <div>
                    <strong>Average processing</strong>
                    <span>From request to collection</span>
                  </div>

                  <b>{totals.average} days</b>
                </div>

                <div className="insight">
                  <i className="fas fa-file-lines"></i>

                  <div>
                    <strong>Most requested</strong>
                    <span>{popular[0]}</span>
                  </div>

                  <b>{popular[1]}</b>
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
                <p>{rows.length} saved requests in this report</p>
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
                  {rows.slice((currentPage-1)*10,currentPage*10).map((row) => (
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
              <span>Page {currentPage} of {pages} · {rows.length} records</span>

              <div className="pages"><button type="button" disabled={currentPage===1} onClick={()=>setReportPage(currentPage-1)}><i className="fas fa-chevron-left"/></button><button className="current">{currentPage}</button><button type="button" disabled={currentPage===pages} onClick={()=>setReportPage(currentPage+1)}><i className="fas fa-chevron-right"/></button></div>
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
