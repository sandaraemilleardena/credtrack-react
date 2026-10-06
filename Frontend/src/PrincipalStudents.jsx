import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PrincipalStudents.css";

const students = [
  {
    lrn: "136512340001",
    name: "Juan Dela Cruz",
    grade: "Grade 10",
    section: "Rizal",
    sex: "Male",
    status: "Active",
    credentials: 3,
  },
  {
    lrn: "136512340002",
    name: "Maria Angela Santos",
    grade: "Grade 9",
    section: "Mabini",
    sex: "Female",
    status: "Active",
    credentials: 4,
  },
  {
    lrn: "136512340003",
    name: "John Paul Ramos",
    grade: "Grade 12",
    section: "HUMSS",
    sex: "Male",
    status: "Graduate",
    credentials: 5,
  },
  {
    lrn: "136512340004",
    name: "Angela Reyes",
    grade: "Grade 11",
    section: "STEM",
    sex: "Female",
    status: "Active",
    credentials: 2,
  },
  {
    lrn: "136512340005",
    name: "Carlo Mendoza",
    grade: "Grade 8",
    section: "Luna",
    sex: "Male",
    status: "Active",
    credentials: 2,
  },
  {
    lrn: "136512340006",
    name: "Sophia Garcia",
    grade: "Grade 9",
    section: "Mabini",
    sex: "Female",
    status: "Active",
    credentials: 3,
  },
  {
    lrn: "136512340007",
    name: "Daniel Torres",
    grade: "Grade 7",
    section: "Bonifacio",
    sex: "Male",
    status: "Archived",
    credentials: 1,
  },
  {
    lrn: "136512340008",
    name: "Bea Navarro",
    grade: "Grade 7",
    section: "Bonifacio",
    sex: "Female",
    status: "Active",
    credentials: 2,
  },
];

const credentialNames = [
  "SF9 Report Card",
  "Certificate of Enrollment",
  "Good Moral Certificate",
  "SF10 Permanent Record",
  "Certificate of Completion",
];

function getInitials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
}

function PrincipalStudents() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
  });

  const filteredStudents = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        `${student.name} ${student.lrn}`
          .toLowerCase()
          .includes(searchValue);

      const matchesGrade =
        gradeFilter === "all" || student.grade === gradeFilter;

      const matchesSection =
        sectionFilter === "all" || student.section === sectionFilter;

      const matchesStatus =
        statusFilter === "all" || student.status === statusFilter;

      return (
        matchesSearch &&
        matchesGrade &&
        matchesSection &&
        matchesStatus
      );
    });
  }, [search, gradeFilter, sectionFilter, statusFilter]);

  const showToast = (message) => {
    setToast({
      show: true,
      message,
    });

    setTimeout(() => {
      setToast({
        show: false,
        message: "",
      });
    }, 2200);
  };

  const resetFilters = () => {
    setSearch("");
    setGradeFilter("all");
    setSectionFilter("all");
    setStatusFilter("all");
  };

  const openStudent = (student) => {
    setSelectedStudent(student);
  };

  const closeStudent = () => {
    setSelectedStudent(null);
  };

  const handleExport = () => {
    showToast("Student summary prepared for export");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("credtrackSession");
    sessionStorage.removeItem("credtrackRole");

    navigate("/");
  };

  const getStatusClass = (status) => {
    if (status === "Active") return "status-active";
    if (status === "Graduate") return "status-graduate";
    return "status-archived";
  };

  return (
    <div className="principal-students-page">

      {/* =====================================================
          MOBILE SIDEBAR OVERLAY
      ===================================================== */}
      {sidebarOpen && (
        <div
          className="principal-students-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}
      <aside
        className={`principal-students-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="principal-students-brand">
          <img
            src="/logo.png"
            alt="PMRMIS-South School Seal"
          />

          <div className="principal-students-brand-text">
            <h2>CredTrack</h2>
            <span>PMRMIS–SOUTH</span>
          </div>

          <button
            className="principal-students-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <div className="principal-students-role">
          <i className="fas fa-user-tie"></i>
          <span>PRINCIPAL PORTAL</span>
        </div>

        <nav className="principal-students-nav">
          <ul>
            <li>
              <button
                onClick={() => navigate("/principal-dashboard")}
              >
                <i className="fas fa-table-columns"></i>
                <span>Dashboard</span>
              </button>
            </li>

            <li>
              <button
                onClick={() => navigate("/principal-approvals")}
              >
                <i className="fas fa-file-signature"></i>
                <span>Credential Approvals</span>
                <b>7</b>
              </button>
            </li>

            <li className="active">
              <button>
                <i className="fas fa-user-graduate"></i>
                <span>Student Records</span>
              </button>
            </li>

            <li>
              <button
                onClick={() => navigate("/principal-reports")}
              >
                <i className="fas fa-chart-line"></i>
                <span>School Reports</span>
              </button>
            </li>

            <li>
              <button
                onClick={() => navigate("/principal-activity")}
              >
                <i className="fas fa-clock-rotate-left"></i>
                <span>Approval History</span>
              </button>
            </li>

            <li>
              <button
                onClick={() => showToast("My Profile page is coming soon")}
              >
                <i className="fas fa-id-badge"></i>
                <span>My Profile</span>
              </button>
            </li>

            <li className="logout-item">
              <button onClick={handleLogout}>
                <i className="fas fa-right-from-bracket"></i>
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* =====================================================
          MAIN SHELL
      ===================================================== */}
      <div className="principal-students-shell">

        {/* ===================================================
            TOPBAR
        =================================================== */}
        <header className="principal-students-topbar">

          <div className="principal-students-top-left">

            <button
              className="principal-students-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <i className="fas fa-bars"></i>
            </button>

            <img
              className="principal-students-school-seal"
              src="/logo.png"
              alt="PMRMIS-South School Seal"
            />

            <div className="principal-students-school">
              <strong>
                President Manuel Roxas Memorial Integrated School – South
              </strong>

              <span>
                Digital Credentials Management System
              </span>
            </div>
          </div>

          <div className="principal-students-top-right">

            {/* NOTIFICATION */}
            <div className="principal-students-notification-wrapper">
              <button
                className="principal-students-bell"
                onClick={() => {
                  setNotificationOpen(!notificationOpen);
                  setProfileOpen(false);
                }}
                aria-label="Notifications"
              >
                <i className="far fa-bell"></i>
                <b>3</b>
              </button>

              {notificationOpen && (
                <div className="principal-students-notification-dropdown">

                  <div className="notification-header">
                    <div>
                      <strong>Notifications</strong>
                      <span>Recent system activity</span>
                    </div>

                    <b>3</b>
                  </div>

                  <div className="notification-item">
                    <div className="notification-icon approval">
                      <i className="fas fa-file-signature"></i>
                    </div>

                    <div>
                      <strong>Credential approval</strong>
                      <span>7 requests are awaiting approval.</span>
                      <small>Just now</small>
                    </div>
                  </div>

                  <div className="notification-item">
                    <div className="notification-icon info">
                      <i className="fas fa-user-graduate"></i>
                    </div>

                    <div>
                      <strong>Student records</strong>
                      <span>Student records are available for review.</span>
                      <small>10 minutes ago</small>
                    </div>
                  </div>

                  <div className="notification-item">
                    <div className="notification-icon security">
                      <i className="fas fa-shield-halved"></i>
                    </div>

                    <div>
                      <strong>System security</strong>
                      <span>Your principal session is active.</span>
                      <small>Today</small>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* PROFILE */}
            <div className="principal-students-profile-wrapper">

              <button
                className="principal-students-profile"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationOpen(false);
                }}
              >
                <img
                  src="/logo.png"
                  alt="Principal Profile"
                />

                <div>
                  <strong>Dr. Elena Reyes</strong>
                  <small>School Principal</small>
                </div>

                <i className="fas fa-chevron-down"></i>
              </button>

              {profileOpen && (
                <div className="principal-students-profile-dropdown">

                  <div className="profile-dropdown-header">
                    <img
                      src="/logo.png"
                      alt="Principal"
                    />

                    <div>
                      <strong>Dr. Elena Reyes</strong>
                      <span>School Principal</span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      showToast("My Profile page is coming soon")
                    }
                  >
                    <i className="fas fa-id-badge"></i>
                    My Profile
                  </button>

                  <button
                    className="profile-logout"
                    onClick={handleLogout}
                  >
                    <i className="fas fa-right-from-bracket"></i>
                    Logout
                  </button>

                </div>
              )}
            </div>

          </div>
        </header>

        {/* ===================================================
            CONTENT
        =================================================== */}
        <main className="principal-students-content">

          {/* PAGE HEADING */}
          <section className="principal-students-page-heading">

            <div>
              <span className="heading-label">
                PRINCIPAL PORTAL
              </span>

              <h1>Student Records</h1>

              <p>
                View student profiles, enrollment information,
                and credential history.
              </p>
            </div>

            <div className="principal-students-access-note">
              <i className="fas fa-eye"></i>

              <div>
                <strong>Read-only access</strong>
                <span>Principal view</span>
              </div>
            </div>

          </section>

          {/* =================================================
              SUMMARY CARDS
          ================================================= */}
          <section className="principal-students-summary-grid">

            <article className="principal-students-summary-card total">
              <div className="summary-icon">
                <i className="fas fa-user-graduate"></i>
              </div>

              <div>
                <span>Total Students</span>
                <strong>1,248</strong>
                <small>All student records</small>
              </div>
            </article>

            <article className="principal-students-summary-card active-card">
              <div className="summary-icon">
                <i className="fas fa-circle-check"></i>
              </div>

              <div>
                <span>Active</span>
                <strong>1,086</strong>
                <small>Currently enrolled</small>
              </div>
            </article>

            <article className="principal-students-summary-card graduates">
              <div className="summary-icon">
                <i className="fas fa-graduation-cap"></i>
              </div>

              <div>
                <span>Graduates</span>
                <strong>142</strong>
                <small>Completed students</small>
              </div>
            </article>

            <article className="principal-students-summary-card archived">
              <div className="summary-icon">
                <i className="fas fa-box-archive"></i>
              </div>

              <div>
                <span>Archived</span>
                <strong>20</strong>
                <small>Archived records</small>
              </div>
            </article>

          </section>

          {/* =================================================
              FILTERS
          ================================================= */}
          <section className="principal-students-filters">

            <div className="principal-students-control search-control">
              <i className="fas fa-magnifying-glass"></i>

              <input
                type="search"
                placeholder="Search by student name or LRN"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <div className="principal-students-control">
              <select
                value={gradeFilter}
                onChange={(event) =>
                  setGradeFilter(event.target.value)
                }
              >
                <option value="all">All Grades</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            <div className="principal-students-control">
              <select
                value={sectionFilter}
                onChange={(event) =>
                  setSectionFilter(event.target.value)
                }
              >
                <option value="all">All Sections</option>
                <option value="Rizal">Rizal</option>
                <option value="Mabini">Mabini</option>
                <option value="Luna">Luna</option>
                <option value="Bonifacio">Bonifacio</option>
                <option value="STEM">STEM</option>
                <option value="HUMSS">HUMSS</option>
              </select>
            </div>

            <div className="principal-students-control">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Graduate">Graduate</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <button
              className="principal-students-reset-button"
              onClick={resetFilters}
            >
              <i className="fas fa-rotate-left"></i>
              Reset
            </button>

          </section>

          {/* =================================================
              RECORDS PANEL
          ================================================= */}
          <section className="principal-students-records-panel">

            <div className="principal-students-panel-heading">

              <div>
                <span className="panel-kicker">
                  STUDENT DIRECTORY
                </span>

                <h2>Student Directory</h2>

                <p>
                  Showing {filteredStudents.length} student{" "}
                  {filteredStudents.length === 1
                    ? "record"
                    : "records"}
                </p>
              </div>

              <button
                className="principal-students-export-button"
                onClick={handleExport}
              >
                <i className="fas fa-file-export"></i>
                Export Summary
              </button>

            </div>

            <div className="principal-students-table-wrap">

              {filteredStudents.length > 0 ? (
                <table className="principal-students-table">

                  <thead>
                    <tr>
                      <th>LRN</th>
                      <th>STUDENT NAME</th>
                      <th>GRADE</th>
                      <th>SECTION</th>
                      <th>SEX</th>
                      <th>STATUS</th>
                      <th>CREDENTIALS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>

                  <tbody>

                    {filteredStudents.map((student) => (
                      <tr key={student.lrn}>

                        <td>
                          <strong className="student-lrn">
                            {student.lrn}
                          </strong>
                        </td>

                        <td>
                          <div className="student-name-cell">

                            <span className="mini-avatar">
                              {getInitials(student.name)}
                            </span>

                            <div>
                              <strong>{student.name}</strong>
                              <small>
                                {student.grade} –{" "}
                                {student.section}
                              </small>
                            </div>

                          </div>
                        </td>

                        <td>{student.grade}</td>

                        <td>{student.section}</td>

                        <td>{student.sex}</td>

                        <td>
                          <span
                            className={`principal-students-status ${getStatusClass(
                              student.status
                            )}`}
                          >
                            <i className="fas fa-circle"></i>
                            {student.status}
                          </span>
                        </td>

                        <td>
                          <span className="credential-count">
                            <i className="fas fa-file-lines"></i>
                            {student.credentials} records
                          </span>
                        </td>

                        <td>
                          <button
                            className="principal-students-view-button"
                            onClick={() =>
                              openStudent(student)
                            }
                          >
                            <i className="fas fa-eye"></i>
                            View
                          </button>
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>
              ) : (
                <div className="principal-students-empty-state">

                  <div className="empty-icon">
                    <i className="far fa-folder-open"></i>
                  </div>

                  <h3>No Student Records Found</h3>

                  <p>
                    No student records match the selected
                    filters.
                  </p>

                  <button onClick={resetFilters}>
                    <i className="fas fa-rotate-left"></i>
                    Clear Filters
                  </button>

                </div>
              )}

            </div>

          </section>

        </main>
      </div>

      {/* =====================================================
          STUDENT DRAWER
      ===================================================== */}
      {selectedStudent && (
        <>
          <div
            className="principal-students-drawer-overlay"
            onClick={closeStudent}
          ></div>

          <aside className="principal-students-drawer">

            <div className="principal-students-drawer-heading">

              <div>
                <small>STUDENT RECORD</small>

                <h2>
                  LRN {selectedStudent.lrn}
                </h2>
              </div>

              <button
                className="principal-students-close-button"
                onClick={closeStudent}
                aria-label="Close student record"
              >
                <i className="fas fa-xmark"></i>
              </button>

            </div>

            {/* STUDENT PROFILE */}
            <div className="principal-students-profile-card">

              <div className="principal-students-large-avatar">
                {getInitials(selectedStudent.name)}
              </div>

              <div>
                <h3>{selectedStudent.name}</h3>

                <p>
                  {selectedStudent.grade} –{" "}
                  {selectedStudent.section}
                </p>
              </div>

            </div>

            {/* DETAILS */}
            <div className="principal-students-detail-grid">

              <div className="principal-students-detail">
                <span>Sex</span>
                <strong>{selectedStudent.sex}</strong>
              </div>

              <div className="principal-students-detail">
                <span>Status</span>

                <strong
                  className={`drawer-status ${getStatusClass(
                    selectedStudent.status
                  )}`}
                >
                  {selectedStudent.status}
                </strong>
              </div>

              <div className="principal-students-detail">
                <span>School Year</span>
                <strong>2026–2027</strong>
              </div>

              <div className="principal-students-detail">
                <span>Credentials on File</span>

                <strong>
                  {selectedStudent.credentials} records
                </strong>
              </div>

            </div>

            {/* CREDENTIAL HISTORY */}
            <section className="principal-students-record-section">

              <div className="record-section-heading">
                <div>
                  <span>CREDENTIALS</span>
                  <h3>Credential History</h3>
                </div>

                <span className="history-count">
                  {selectedStudent.credentials}
                </span>
              </div>

              <div className="credential-history">

                {credentialNames
                  .slice(0, selectedStudent.credentials)
                  .map((credential, index) => (
                    <div
                      className="principal-students-record-item"
                      key={`${selectedStudent.lrn}-${credential}`}
                    >

                      <div className="record-file-icon">
                        <i className="fas fa-file-lines"></i>
                      </div>

                      <div className="record-information">

                        <strong>{credential}</strong>

                        <small>
                          School Year{" "}
                          {2026 - index}–
                          {2027 - index}
                        </small>

                      </div>

                      <span className="record-verified">
                        <i className="fas fa-circle-check"></i>
                        Verified
                      </span>

                    </div>
                  ))}

              </div>

            </section>

            {/* READ ONLY NOTICE */}
            <div className="principal-students-read-only-note">

              <div className="read-only-icon">
                <i className="fas fa-lock"></i>
              </div>

              <div>
                <strong>Read-only Principal Access</strong>

                <p>
                  Record corrections and document uploads
                  must be completed by authorized records or
                  ICT personnel.
                </p>
              </div>

            </div>

          </aside>
        </>
      )}

      {/* =====================================================
          TOAST
      ===================================================== */}
      <div
        className={`principal-students-toast ${
          toast.show ? "show" : ""
        }`}
      >
        <i className="fas fa-circle-check"></i>
        {toast.message}
      </div>

    </div>
  );
}

export default PrincipalStudents;