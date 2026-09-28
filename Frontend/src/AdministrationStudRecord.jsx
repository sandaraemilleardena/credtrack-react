import { logoutUser } from './auth/session';
import {usePortal} from './hooks/PortalContext';
import {downloadCSV} from './api/operations';
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AdministrationStudRecord.css";

const emptyStudent = {
  lrn: "",
  firstName: "",
  middleName: "",
  lastName: "",
  sex: "",
  birthday: "",
  grade: "",
  section: "",
  status: "Active",
  schoolYear: "",
  guardian: "",
  contact: "",
  address: "",
};

function AdministrationStudRecord() {
  const system=usePortal();
  const students=system.data.students;
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
  const fileInputRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);

  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentForm, setStudentForm] = useState(emptyStudent);

  const [toast, setToast] = useState("");
  const [excelFile, setExcelFile] = useState(null);
  const [excelRows, setExcelRows] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [excelStep, setExcelStep] = useState(1);

  const [page, setPage] = useState(1);
  const studentsPerPage = 8;



  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      setSidebarOpen(false);
      setShowAddModal(false);
      setShowViewModal(false);
      setShowEditModal(false);
      setShowDeleteModal(false);
      setShowExcelModal(false);
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const fullName =
        `${student.firstName} ${student.middleName} ${student.lastName}`.toLowerCase();

      const matchesSearch =
        !query ||
        student.lrn.toLowerCase().includes(query) ||
        fullName.includes(query);

      const matchesGrade =
        !gradeFilter || student.grade === gradeFilter;

      const matchesSection =
        !sectionFilter || student.section === sectionFilter;

      const matchesStatus =
        !statusFilter || student.status === statusFilter;

      return (
        matchesSearch &&
        matchesGrade &&
        matchesSection &&
        matchesStatus
      );
    });
  }, [students, search, gradeFilter, sectionFilter, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / studentsPerPage)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * studentsPerPage,
    currentPage * studentsPerPage
  );

  const totalStudents = students.length;
  const activeStudents = students.filter(
    (student) => student.status === "Active"
  ).length;
  const graduates = students.filter(
    (student) => student.status === "Graduated"
  ).length;
  const archivedStudents = students.filter(
    (student) => student.status === "Archived"
  ).length;

  const allVisibleSelected =
    paginatedStudents.length > 0 &&
    paginatedStudents.every((student) =>
      selectedIds.includes(student.id)
    );

  const showToast = (message) => {
    setToast(message);
  };

  const getFullName = (student) => {
    return [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const handleNavigation = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate("/");
  };

  const resetFilters = () => {
    setSearch("");
    setGradeFilter("");
    setSectionFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      const visibleIds = paginatedStudents.map(
        (student) => student.id
      );

      setSelectedIds((previous) => [
        ...new Set([...previous, ...visibleIds]),
      ]);
    } else {
      const visibleIds = new Set(
        paginatedStudents.map((student) => student.id)
      );

      setSelectedIds((previous) =>
        previous.filter((id) => !visibleIds.has(id))
      );
    }
  };

  const handleSelectStudent = (id) => {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((studentId) => studentId !== id)
        : [...previous, id]
    );
  };

  const openAddStudent = () => {
    setStudentForm(emptyStudent);
    setShowAddModal(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setStudentForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAddStudent = async (event) => {event.preventDefault();try {await system.mutate('students/',{action:'save',student:studentForm});setShowAddModal(false);setStudentForm(emptyStudent);setPage(1);showToast('Student record saved.');}catch(e){showToast(e.message);}};

  const openViewStudent = (student) => {
    setCurrentStudent(student);
    setShowViewModal(true);
  };

  const openEditStudent = (student) => {
    setCurrentStudent(student);
    setStudentForm({
      ...student,
    });
    setShowEditModal(true);
  };

  const handleEditStudent = async (event) => {event.preventDefault();try {await system.mutate('students/',{action:'save',student:{...studentForm,id:currentStudent.id,version:currentStudent.version}});setShowEditModal(false);setCurrentStudent(null);showToast('Student record updated.');}catch(e){showToast(e.message);}};

  const openDeleteStudent = (student) => {
    setCurrentStudent(student);
    setShowDeleteModal(true);
  };

  const archiveRecords=async(ids)=>{try{await system.mutate('students/',{action:'archive',ids});setSelectedIds([]);setShowDeleteModal(false);setCurrentStudent(null);showToast('Records archived; history preserved.');}catch(e){showToast(e.message);}};
  const confirmDelete=()=>currentStudent&&archiveRecords([currentStudent.id]);
  const handleBulkDelete=()=>selectedIds.length&&archiveRecords(selectedIds);

  const exportCSV=()=>downloadCSV('CredTrack_Student_Records.csv',[['LRN','First Name','Middle Name','Last Name','Sex','Birthday','Grade','Section','Status','School Year','Guardian','Contact','Address','Available Credentials'],...filteredStudents.map(r=>[r.lrn,r.firstName,r.middleName,r.lastName,r.sex,r.birthday,r.grade,r.section,r.status,r.schoolYear,r.guardian,r.contact,r.address,(r.availableCredentials||[]).join(';')])]);

  const printStudents = () => {
    window.print();
  };

  const handleExcelFile=async(file)=>{if(!file)return; if(!file.name.toLowerCase().endsWith('.csv')){showToast('Save your spreadsheet as CSV, then upload the CSV file.');return;} if(file.size>2*1024*1024){showToast('File limit is 2 MB.');return;}try{const {parseStudentCSV}=await import('./api/studentCSV');const rows=parseStudentCSV(await file.text());setExcelFile(file);setExcelRows(rows);setExcelStep(2);}catch(e){showToast(e.message);}};

  const handleFileInput = (event) => {
    const file = event.target.files?.[0];

    handleExcelFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();

    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    handleExcelFile(file);
  };

  const importExcel=async()=>{if(!excelRows.length)return;setExcelStep(3);try{await system.mutate('students/',{action:'import',rows:excelRows});setExcelStep(4);showToast('Student records imported.');}catch(e){setExcelStep(2);showToast(e.message);}};

  const closeExcelModal = () => {
    setShowExcelModal(false);
    setExcelFile(null);
    setExcelRows([]);
    setExcelStep(1);
    setIsDragging(false);
  };

  const downloadTemplate = () => {
    const headers = [
      "LRN",
      "First Name",
      "Middle Name",
      "Last Name",
      "Grade",
      "Section",
      "Sex",
      "Status",
      "School Year",
      "Contact",
      "Available Credentials",
    ];

    const csv = headers.join(",") + "\n";

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "CredTrack_Student_Import_Template.csv";
    link.click();

    URL.revokeObjectURL(url);

    showToast("Import template downloaded.");
  };

  return (
    <div className="student-records-page">

      {/* Shared dashboard sidebar */}
      <button
        type="button"
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        aria-label="Close navigation menu"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Administrator navigation">
        <div className="brand">
          <div className="brand-logo"><img src="/logo.png" alt="PMRMIS-South logo" /></div>
          <div className="brand-copy"><h2>CredTrack</h2><span>PMRMIS–SOUTH</span></div>
          <button type="button" className="close-sidebar" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}><i className="fas fa-xmark" /></button>
        </div>

        <nav className="sidebar-navigation" aria-label="Administrator navigation">
          <ul className="menu">
            {navigationItems.map((item) => (
              <li className={`menu-item ${isActiveRoute(item.path) ? "active" : ""}`} key={item.path}>
                <button type="button" className="menu-link" onClick={() => handleNavigation(item.path)}>
                  <span className="menu-icon"><i className={`fas ${item.icon}`} /></span>
                  <span className="menu-text">{item.label}</span>
                  {isActiveRoute(item.path) && <span className="active-indicator"><i className="fas fa-chevron-right" /></span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>


      </aside>

      {/* MAIN */}

      <div className="main">

        {/* TOPBAR */}

        <header className="topbar">

          <div className="topbar-left">

            <button
              type="button"
              className="menu-button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="fas fa-bars" />
            </button>

            <div className="school-seal">
              <img
                src="/logo.png"
                alt="PMRMIS-South school seal"
              />
            </div>

            <div className="school-name">
              <strong>
                President Manuel Roxas Memorial
                Integrated School – South
              </strong>

              <span>
                Digital Credentials Management System
              </span>
            </div>

          </div>

          <div className="topbar-right">
<button
              type="button"
              className="notification-button"
              aria-label="Notifications"
              onClick={() =>
                showToast("You have 3 notifications.")
              }
            >
              <i className="far fa-bell" />
              <b>3</b>
            </button>

            <div className="admin-menu-wrap">
              <button
                type="button"
                className="admin-menu"
                aria-expanded={adminMenuOpen}
                aria-haspopup="menu"
                onClick={() => setAdminMenuOpen((open) => !open)}
              >
                <img src="/logo.png" alt="Administrator" />
                <div>
                  <strong>Administrator</strong>
                  <small>System Administrator</small>
                </div>
                <i className="fas fa-chevron-down admin-chevron" />
              </button>

              {adminMenuOpen && (
                <div className="admin-dropdown" role="menu">
                  <div className="admin-dropdown-heading">
                    <strong>Administrator</strong>
                    <span>Account actions</span>
                  </div>
                  <button
                    type="button"
                    className="admin-logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <i className="fas fa-right-from-bracket" />
                    Log out
                  </button>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* CONTENT */}

        <main className="dashboard-content">

          {/* PAGE HEADER */}

          <section className="page-header">

            <div className="page-title">

              <h1>Student Records</h1>

              <p>
                Manage student information, search
                records, update profiles, and maintain
                school records.
              </p>

            </div>

            <div className="page-actions">

              <button
                type="button"
                className="btn-import"
                onClick={() =>
                  setShowExcelModal(true)
                }
              >
                <i className="fas fa-file-excel" />
                Import from Excel
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={openAddStudent}
              >
                <i className="fas fa-user-plus" />
                Add Student
              </button>

            </div>

          </section>

          <section className="records-context" aria-label="Student records overview">
            <div className="records-context-icon"><i className="fas fa-id-card" /></div>
            <div><strong>Student Records Registry</strong><span>Keep learner profiles, enrolment details, and record status organized in one place.</span></div>
            <div className="records-context-status"><i className="fas fa-circle-check" /><span>{activeStudents} active learners</span></div>
          </section>

          {/* SUMMARY */}

          <section className="summary-grid">

            <div className="summary-card">
              <div className="summary-icon burgundy">
                <i className="fas fa-user-graduate" />
              </div>

              <div className="summary-info">
                <span>Total Students</span>
                <h2>{totalStudents}</h2>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon green">
                <i className="fas fa-check-circle" />
              </div>

              <div className="summary-info">
                <span>Active</span>
                <h2>{activeStudents}</h2>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon orange">
                <i className="fas fa-graduation-cap" />
              </div>

              <div className="summary-info">
                <span>Graduates</span>
                <h2>{graduates}</h2>
              </div>
            </div>

            <div className="summary-card">
              <div className="summary-icon gray">
                <i className="fas fa-archive" />
              </div>

              <div className="summary-info">
                <span>Archived</span>
                <h2>{archivedStudents}</h2>
              </div>
            </div>

          </section>

          {/* SEARCH */}

          <section className="search-panel">

            <div className="search-wrapper">
              <i className="fas fa-search" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  handleSearch(event.target.value)
                }
                placeholder="Search by LRN or student name..."
                autoComplete="off"
              />
            </div>

            <select
              value={gradeFilter}
              onChange={handleFilter(setGradeFilter)}
            >
              <option value="">All Grades</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
            </select>

            <select
              value={sectionFilter}
              onChange={handleFilter(setSectionFilter)}
            >
              <option value="">All Sections</option>
              <option value="Rizal">Rizal</option>
              <option value="Mabini">Mabini</option>
              <option value="Bonifacio">Bonifacio</option>
              <option value="Luna">Luna</option>
            </select>

            <select
              value={statusFilter}
              onChange={handleFilter(setStatusFilter)}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Graduated">Graduated</option>
              <option value="Transferred">
                Transferred
              </option>
              <option value="Archived">Archived</option>
            </select>

          </section>

          {/* TABLE */}

          <section className="table-card">

            <div className="table-header">

              <div className="table-left">
                <h3>Student List</h3>

                <span>
                  Showing{" "}
                  <strong>
                    {filteredStudents.length}
                  </strong>{" "}
                  students
                </span>
              </div>

              <div className="table-right">

                <button
                  type="button"
                  className="btn-light"
                  onClick={resetFilters}
                >
                  <i className="fas fa-rotate-left" />
                  Reset
                </button>

                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleBulkDelete}
                >
                  <i className="fas fa-trash" />
                  Archive Selected
                </button>

                <button
                  type="button"
                  className="btn-light"
                  onClick={exportCSV}
                >
                  <i className="fas fa-file-export" />
                  Export
                </button>

                <button
                  type="button"
                  className="btn-light"
                  onClick={printStudents}
                >
                  <i className="fas fa-print" />
                  Print
                </button>

              </div>

            </div>

            <div className="table-responsive">

              <table id="studentTable">

                <thead>
                  <tr>

                    <th>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={handleSelectAll}
                        aria-label="Select all students"
                      />
                    </th>

                    <th>LRN</th>
                    <th>Student Name</th>
                    <th>Grade</th>
                    <th>Section</th>
                    <th>Sex</th>
                    <th>Status</th>
                    <th>Actions</th>

                  </tr>
                </thead>

                <tbody>

                  {paginatedStudents.length > 0 ? (
                    paginatedStudents.map((student) => (

                      <tr key={student.id}>

                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(
                              student.id
                            )}
                            onChange={() =>
                              handleSelectStudent(
                                student.id
                              )
                            }
                            aria-label={`Select ${getFullName(
                              student
                            )}`}
                          />
                        </td>

                        <td>
                          <strong className="lrn-text">
                            {student.lrn}
                          </strong>
                        </td>

                        <td>
                          <div className="student-name-cell">

                            <div className="table-avatar">
                              <i className="fas fa-user-graduate" />
                            </div>

                            <div>
                              <strong>
                                {getFullName(student)}
                              </strong>

                              <small>
                                {student.schoolYear}
                              </small>
                            </div>

                          </div>
                        </td>

                        <td>{student.grade}</td>

                        <td>{student.section}</td>

                        <td>{student.sex}</td>

                        <td>
                          <span
                            className={`status-badge status-${student.status
                              .toLowerCase()
                              .replace(/\s+/g, "-")}`}
                          >
                            {student.status}
                          </span>
                        </td>

                        <td>

                          <div className="row-actions">

                            <button
                              type="button"
                              className="action-view"
                              title="View student"
                              onClick={() =>
                                openViewStudent(student)
                              }
                            >
                              <i className="fas fa-eye" />
                            </button>

                            <button
                              type="button"
                              className="action-edit"
                              title="Edit student"
                              onClick={() =>
                                openEditStudent(student)
                              }
                            >
                              <i className="fas fa-user-pen" />
                            </button>

                            <button
                              type="button"
                              className="action-delete"
                              title="Delete student"
                              onClick={() =>
                                openDeleteStudent(student)
                              }
                            >
                              <i className="fas fa-trash" />
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))
                  ) : (

                    <tr>
                      <td
                        colSpan="8"
                        className="empty-state"
                      >
                        <i className="fas fa-user-graduate" />
                        <strong>
                          No student records found
                        </strong>
                        <span>
                          Try adjusting your search or
                          filters.
                        </span>
                      </td>
                    </tr>

                  )}

                </tbody>

              </table>

            </div>

            {/* PAGINATION */}

            <div className="pagination">

              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  setPage((previous) =>
                    Math.max(1, previous - 1)
                  )
                }
              >
                <i className="fas fa-chevron-left" />
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map((pageNumber) => (

                <button
                  type="button"
                  key={pageNumber}
                  className={
                    currentPage === pageNumber
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setPage(pageNumber)
                  }
                >
                  {pageNumber}
                </button>

              ))}

              <button
                type="button"
                disabled={
                  currentPage === totalPages
                }
                onClick={() =>
                  setPage((previous) =>
                    Math.min(
                      totalPages,
                      previous + 1
                    )
                  )
                }
              >
                <i className="fas fa-chevron-right" />
              </button>

            </div>

          </section>

        </main>

        {/* FOOTER */}

        <footer className="footer">

          <div>
            © 2026 CredTrack | President Manuel
            Roxas Memorial Integrated School - South
          </div>

          <div>Version 1.0.0</div>

        </footer>

      </div>

      {/* =================================================
          ADD STUDENT MODAL
      ================================================= */}

      {showAddModal && (

        <div
          className="modal-overlay show"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowAddModal(false);
            }
          }}
        >

          <div className="modal-container large">

            <div className="modal-header">

              <h2>
                <i className="fas fa-user-plus" />
                Add Student
              </h2>

              <button
                type="button"
                className="close-modal"
                onClick={() =>
                  setShowAddModal(false)
                }
                aria-label="Close add student modal"
              >
                <i className="fas fa-times" />
              </button>

            </div>

            <form onSubmit={handleAddStudent}>

              <StudentForm
                form={studentForm}
                onChange={handleFormChange}
                prefix="add"
              />

              <div className="modal-footer">

                <button
                  type="button"
                  className="btn-light"
                  onClick={() =>
                    setShowAddModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                >
                  <i className="fas fa-save" />
                  Save Student
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =================================================
          VIEW STUDENT MODAL
      ================================================= */}

      {showViewModal && currentStudent && (

        <div
          className="modal-overlay show"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowViewModal(false);
            }
          }}
        >

          <div className="modal-container">

            <div className="modal-header">

              <h2>
                <i className="fas fa-user-graduate" />
                Student Information
              </h2>

              <button
                type="button"
                className="close-modal"
                onClick={() =>
                  setShowViewModal(false)
                }
                aria-label="Close student information modal"
              >
                <i className="fas fa-times" />
              </button>

            </div>

            <div className="profile-top">

              <div className="student-avatar">
                <i className="fas fa-user-graduate" />
              </div>

              <h3>
                {getFullName(currentStudent)}
              </h3>

              <p>
                LRN:{" "}
                <span>{currentStudent.lrn}</span>
              </p>

            </div>

            <p><strong>Available credentials:</strong> {(currentStudent.availableCredentials||[]).join(", ")||"Not recorded"}</p><p><strong>Principal authorizations:</strong> {system.data.requests.filter(r=>r.lrn===currentStudent.lrn&&r.approved_at).map(r=>r.credential+" — "+r.status_label).join("; ")||"None yet"}</p><div className="profile-grid">

              <div>
                <label>Grade</label>
                <span>{currentStudent.grade}</span>
              </div>

              <div>
                <label>Section</label>
                <span>{currentStudent.section}</span>
              </div>

              <div>
                <label>Sex</label>
                <span>{currentStudent.sex}</span>
              </div>

              <div>
                <label>Status</label>
                <span>
                  {currentStudent.status}
                </span>
              </div>

              <div>
                <label>Birthday</label>
                <span>
                  {currentStudent.birthday || "—"}
                </span>
              </div>

              <div>
                <label>School Year</label>
                <span>
                  {currentStudent.schoolYear}
                </span>
              </div>

              <div>
                <label>Guardian</label>
                <span>
                  {currentStudent.guardian}
                </span>
              </div>

              <div>
                <label>Contact Number</label>
                <span>
                  {currentStudent.contact}
                </span>
              </div>

              <div className="full">
                <label>Address</label>
                <span>
                  {currentStudent.address}
                </span>
              </div>

            </div>

            <div className="modal-footer">

              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  setShowViewModal(false)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
          EDIT STUDENT MODAL
      ================================================= */}

      {showEditModal && (

        <div
          className="modal-overlay show"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowEditModal(false);
            }
          }}
        >

          <div className="modal-container large">

            <div className="modal-header">

              <h2>
                <i className="fas fa-user-pen" />
                Edit Student
              </h2>

              <button
                type="button"
                className="close-modal"
                onClick={() =>
                  setShowEditModal(false)
                }
                aria-label="Close edit student modal"
              >
                <i className="fas fa-times" />
              </button>

            </div>

            <form onSubmit={handleEditStudent}>

              <StudentForm
                form={studentForm}
                onChange={handleFormChange}
                prefix="edit"
              />

              <div className="modal-footer">

                <button
                  type="button"
                  className="btn-light"
                  onClick={() =>
                    setShowEditModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                >
                  <i className="fas fa-save" />
                  Update Student
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* =================================================
          DELETE MODAL
      ================================================= */}

      {showDeleteModal && currentStudent && (

        <div
          className="modal-overlay show"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setShowDeleteModal(false);
            }
          }}
        >

          <div className="delete-box">

            <div className="delete-icon">
              <i className="fas fa-trash-alt" />
            </div>

            <h2>Archive Student?</h2>

            <p>
              The transaction history will be preserved. The
              selected student record will be
              permanently removed.
            </p>

            <strong className="delete-student-name">
              {getFullName(currentStudent)}
            </strong>

            <div className="modal-footer center">

              <button
                type="button"
                className="btn-light"
                onClick={() =>
                  setShowDeleteModal(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-danger"
                onClick={confirmDelete}
              >
                <i className="fas fa-trash" />
                Archive Student
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
          EXCEL IMPORT MODAL
      ================================================= */}

      {showExcelModal && (

        <div className="excel-modal show">

          <div className="excel-dialog">

            <div className="excel-head">

              <div>
                <h2>
                  <i className="fas fa-file-excel" />
                  Import Student Credentials
                </h2>

                <p>
                  Transfer the school's existing Excel
                  records into CredTrack.
                </p>
              </div>

              <button
                type="button"
                className="excel-close"
                onClick={closeExcelModal}
                aria-label="Close Excel import"
              >
                <i className="fas fa-xmark" />
              </button>

            </div>

            <div className="excel-body">

              <div className="import-steps">

                <div
                  className={`import-step ${
                    excelStep >= 1 ? "active" : ""
                  }`}
                >
                  <b>1</b>
                  Upload spreadsheet
                </div>

                <div
                  className={`import-step ${
                    excelStep >= 2 ? "active" : ""
                  }`}
                >
                  <b>2</b>
                  Map and preview
                </div>

                <div
                  className={`import-step ${
                    excelStep >= 3 ? "active" : ""
                  }`}
                >
                  <b>3</b>
                  Import records
                </div>

              </div>

              {!excelFile && (

                <div
                  className={`drop-zone ${
                    isDragging ? "dragging" : ""
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() =>
                    setIsDragging(false)
                  }
                  onDrop={handleDrop}
                >

                  <div>

                    <i className="fas fa-cloud-arrow-up" />

                    <h3>
                      Drop the Excel file here
                    </h3>

                    <p>
                      Supports .xlsx, .xls, and .csv
                      files up to 10 MB
                    </p>

                    <label
                      className="choose-file"
                      htmlFor="excelFileInput"
                    >
                      Choose Spreadsheet
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      id="excelFileInput"
                      accept=".xlsx,.xls,.csv"
                      hidden
                      onChange={handleFileInput}
                    />

                    <div className="required-columns">
                      <strong>
                        Recommended columns:
                      </strong>{" "}
                      LRN, First Name, Middle Name,
                      Last Name, Grade, Section, Sex,
                      Status, Credential Type,
                      Credential Status, and Date Issued.
                    </div>

                  </div>

                </div>

              )}

              {excelFile && (

                <>

                  <div className="file-summary show">

                    <div>
                      <strong>
                        {excelFile.name}
                      </strong>

                      <span>
                        {excelRows.length} preview
                        rows found
                      </span>
                    </div>

                    <i className="fas fa-circle-check" />

                  </div>

                  <div className="mapping show">

                    {[
                      "LRN",
                      "First Name",
                      "Last Name",
                      "Grade",
                      "Section",
                      "Sex",
                      "Credential Type",
                      "Credential Status",
                      "Date Issued",
                    ].map((field, index) => (

                      <div
                        className="map-field"
                        key={field}
                      >

                        <label>
                          {field}
                          {[
                            "LRN",
                            "First Name",
                            "Last Name",
                            "Credential Type",
                          ].includes(field)
                            ? " *"
                            : ""}
                        </label>

                        <select
                          defaultValue={
                            index === 0
                              ? "LRN"
                              : ""
                          }
                        >
                          <option value="">
                            Select column
                          </option>

                          <option value={field}>
                            {field}
                          </option>

                          <option value="Column A">
                            Column A
                          </option>

                          <option value="Column B">
                            Column B
                          </option>

                        </select>

                      </div>

                    ))}

                  </div>

                  <div className="preview-wrap show">

                    <table className="preview-table">

                      <thead>
                        <tr>
                          <th>LRN</th>
                          <th>Student</th>
                          <th>
                            Grade & Section
                          </th>
                          <th>Credential</th>
                          <th>Status</th>
                          <th>Validation</th>
                        </tr>
                      </thead>

                      <tbody>

                        {excelRows.map(
                          (row, index) => (

                            <tr key={index}>

                              <td>{row.lrn}</td>

                              <td>
                                {row.student}
                              </td>

                              <td>
                                {row.gradeSection}
                              </td>

                              <td>
                                {row.credential}
                              </td>

                              <td>
                                {row.status}
                              </td>

                              <td>
                                <span className="row-ok">
                                  Valid
                                </span>
                              </td>

                            </tr>

                          )
                        )}

                      </tbody>

                    </table>

                  </div>

                </>

              )}

              {excelStep === 4 && (

                <div className="import-result show">

                  <i className="fas fa-circle-check" />

                  <h3>
                    Spreadsheet imported
                    successfully
                  </h3>

                  <p>
                    Student credentials were added
                    to the system.
                  </p>

                </div>

              )}

            </div>

            <div className="excel-actions">

              <button
                type="button"
                className="download-template"
                onClick={downloadTemplate}
              >
                <i className="fas fa-download" />
                Download Template
              </button>

              <button
                type="button"
                className="import-now"
                disabled={!excelFile || excelStep === 4}
                onClick={importExcel}
              >
                <i className="fas fa-file-import" />
                {excelStep === 4
                  ? "Imported"
                  : "Import to System"}
              </button>

            </div>

          </div>

        </div>

      )}

      {/* TOAST */}

      {toast && (
        <div className="toast show">
          <i className="fas fa-circle-check" />
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
}


/* =========================================================
   REUSABLE STUDENT FORM
========================================================= */

function StudentForm({
  form,
  onChange,
  prefix,
}) {
  return (
    <div className="form-grid"><div className="form-group"><label htmlFor={prefix+'Available'}>Available credentials (verified by records staff)</label><input id={prefix+'Available'} value={(form.availableCredentials||[]).join(';')} onChange={e=>onChange({target:{name:'availableCredentials',value:e.target.value.split(';')}})} placeholder="SF10; SF9; Good Moral Certificate" /></div>

      <div className="form-group">
        <label htmlFor={`${prefix}LRN`}>
          LRN
        </label>

        <input
          type="text"
          id={`${prefix}LRN`}
          name="lrn"
          value={form.lrn}
          onChange={onChange}
          maxLength="12"
          pattern="[0-9]{12}"
          placeholder="12-digit Learner Reference Number"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}FirstName`}>
          First Name
        </label>

        <input
          type="text"
          id={`${prefix}FirstName`}
          name="firstName"
          value={form.firstName}
          onChange={onChange}
          placeholder="First name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}MiddleName`}>
          Middle Name
        </label>

        <input
          type="text"
          id={`${prefix}MiddleName`}
          name="middleName"
          value={form.middleName}
          onChange={onChange}
          placeholder="Middle name"
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}LastName`}>
          Last Name
        </label>

        <input
          type="text"
          id={`${prefix}LastName`}
          name="lastName"
          value={form.lastName}
          onChange={onChange}
          placeholder="Last name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}Sex`}>
          Sex
        </label>

        <select
          id={`${prefix}Sex`}
          name="sex"
          value={form.sex}
          onChange={onChange}
          required
        >
          <option value="">Select sex</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}Birthday`}>
          Birthday
        </label>

        <input
          type="date"
          id={`${prefix}Birthday`}
          name="birthday"
          value={form.birthday}
          onChange={onChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}Grade`}>
          Grade
        </label>

        <select
          id={`${prefix}Grade`}
          name="grade"
          value={form.grade}
          onChange={onChange}
          required
        >
          <option value="">Select grade</option>
          <option value="Grade 7">Grade 7</option>
          <option value="Grade 8">Grade 8</option>
          <option value="Grade 9">Grade 9</option>
          <option value="Grade 10">Grade 10</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}Section`}>
          Section
        </label>

        <select
          id={`${prefix}Section`}
          name="section"
          value={form.section}
          onChange={onChange}
          required
        >
          <option value="">Select section</option>
          <option value="Rizal">Rizal</option>
          <option value="Mabini">Mabini</option>
          <option value="Bonifacio">
            Bonifacio
          </option>
          <option value="Luna">Luna</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}Status`}>
          Status
        </label>

        <select
          id={`${prefix}Status`}
          name="status"
          value={form.status}
          onChange={onChange}
          required
        >
          <option value="Active">Active</option>
          <option value="Graduated">Graduated</option>
          <option value="Transferred">
            Transferred
          </option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}SchoolYear`}>
          School Year
        </label>

        <input
          type="text"
          id={`${prefix}SchoolYear`}
          name="schoolYear"
          value={form.schoolYear}
          onChange={onChange}
          placeholder="2025-2026"
          pattern="[0-9]{4}-[0-9]{4}"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}Guardian`}>
          Guardian Name
        </label>

        <input
          type="text"
          id={`${prefix}Guardian`}
          name="guardian"
          value={form.guardian}
          onChange={onChange}
          placeholder="Guardian's complete name"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor={`${prefix}Contact`}>
          Contact Number
        </label>

        <input
          type="tel"
          id={`${prefix}Contact`}
          name="contact"
          value={form.contact}
          onChange={onChange}
          maxLength="11"
          pattern="09[0-9]{9}"
          placeholder="09XXXXXXXXX"
          required
        />
      </div>

      <div className="form-group full">
        <label htmlFor={`${prefix}Address`}>
          Address
        </label>

        <textarea
          id={`${prefix}Address`}
          name="address"
          value={form.address}
          onChange={onChange}
          rows="3"
          placeholder="Complete home address"
          required
        />
      </div>

    </div>
  );
}

export default AdministrationStudRecord; 