import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AdministrationCredManagement.css";

const exampleRequests = [
  {
    id: "REQ-2026-0127",
    name: "Juan Dela Cruz",
    lrn: "136512340001",
    type: "SF10",
    date: "May 25, 2026",
    status: "Pending",
  },
  {
    id: "REQ-2026-0126",
    name: "Maria Santos",
    lrn: "136512340002",
    type: "Good Moral Certificate",
    date: "May 24, 2026",
    status: "Approved",
  },
  {
    id: "REQ-2026-0125",
    name: "John Ramos",
    lrn: "136512340003",
    type: "Certificate of Enrollment",
    date: "May 23, 2026",
    status: "Released",
  },
  {
    id: "REQ-2026-0123",
    name: "Carlo Mendoza",
    lrn: "136512340005",
    type: "Certificate of Enrollment",
    date: "May 21, 2026",
    status: "Pending",
  },
  {
    id: "REQ-2026-0122",
    name: "Sophia Garcia",
    lrn: "136512340006",
    type: "SF10",
    date: "May 20, 2026",
    status: "Approved",
  },
  {
    id: "REQ-2026-0121",
    name: "Mark Bautista",
    lrn: "136512340007",
    type: "SF9",
    date: "May 19, 2026",
    status: "Pending",
  },
  {
    id: "REQ-2026-0120",
    name: "Bea Navarro",
    lrn: "136512340008",
    type: "Good Moral Certificate",
    date: "May 18, 2026",
    status: "Released",
  },
  {
    id: "REQ-2026-0119",
    name: "Luis Aquino",
    lrn: "136512340009",
    type: "SF10",
    date: "May 17, 2026",
    status: "Released",
  },
  {
    id: "REQ-2026-0118",
    name: "Chloe Villanueva",
    lrn: "136512340010",
    type: "Certificate of Enrollment",
    date: "May 16, 2026",
    status: "Pending",
  },
];

function readStoredRequests() {
  try {
    return JSON.parse(
      localStorage.getItem("credtrackCredentialRequests") || "[]"
    );
  } catch {
    return [];
  }
}

function formatSubmittedDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently submitted";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function convertSubmittedRequest(request) {
  return {
    id: request.id,
    name: request.fullName || request.studentName || "Unknown Requester",
    lrn: request.lrn || "No LRN provided",
    type: request.credential || "Credential Request",
    date: formatSubmittedDate(request.submittedAt),
    status:
      request.administratorVerification === "Verified"
        ? "Approved"
        : request.status === "Rejected"
        ? "Rejected"
        : "Pending",
    submittedFromPortal: true,
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

  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const submittedRequests = readStoredRequests().map(
      convertSubmittedRequest
    );

    const submittedIds = new Set(
      submittedRequests.map((request) => request.id)
    );

    setRequests([
      ...submittedRequests,
      ...exampleRequests.filter(
        (request) => !submittedIds.has(request.id)
      ),
    ]);
  }, []);

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
        `${request.id} ${request.name} ${request.lrn}`
          .toLowerCase()
          .includes(q);

      const matchesStatus =
        statusFilter === "all" || request.status === statusFilter;

      const matchesType =
        typeFilter === "all" || request.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [requests, search, statusFilter, typeFilter]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeDrawer();
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
    setDrawerOpen(true);
  };

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

  const updateStoredRequest = (requestId, updates) => {
    const storedRequests = readStoredRequests();

    const storedRequest = storedRequests.find(
      (request) => request.id === requestId
    );

    if (!storedRequest) return;

    Object.assign(storedRequest, updates);

    storedRequest.audit = Array.isArray(storedRequest.audit)
      ? storedRequest.audit
      : [];

    storedRequest.audit.unshift({
      at: new Date().toISOString(),
      actor: "Administrator",
      action:
        updates.administratorVerification === "Verified"
          ? "Request verified and forwarded for Principal approval"
          : "Request rejected by Administrator",
    });

    localStorage.setItem(
      "credtrackCredentialRequests",
      JSON.stringify(storedRequests)
    );

    const principalInbox = JSON.parse(
      localStorage.getItem("credtrackPrincipalInbox") || "[]"
    );

    const principalItem = principalInbox.find(
      (item) => item.requestId === requestId
    );

    if (principalItem) {
      principalItem.status = updates.status;

      principalItem.nextAction =
        updates.administratorVerification === "Verified"
          ? "Review and approve the verified credential request"
          : "No Principal action available";

      principalItem.unread = true;

      localStorage.setItem(
        "credtrackPrincipalInbox",
        JSON.stringify(principalInbox)
      );
    }
  };

  const handleApprove = () => {
    if (!currentRequest) return;

    const updatedRequest = {
      ...currentRequest,
      status: "Approved",
    };

    setRequests((previous) =>
      previous.map((request) =>
        request.id === currentRequest.id ? updatedRequest : request
      )
    );

    updateStoredRequest(currentRequest.id, {
      status: "Pending Principal Approval",
      stage: "Administrator Verified",
      administratorVerification: "Verified",
      principalApproval: "Pending",
    });

    closeDrawer();

    notify(
      `${currentRequest.id} verified and sent to the Principal`
    );
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const handlePrint = (id) => {
    notify(`Preparing ${id} for printing`);
  };

  const handleExport = () => {
    notify("Credential request list exported");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("credtrackSession");
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

        <div className="sidebar-system-card">
        
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

        <div className="sidebar-profile">
  
        </div>
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
                <div className="admin-avatar">AD</div>

                <div className="admin-copy">
                  <strong>Administrator</strong>
                  <small>System Administrator</small>
                </div>

                <i className="fas fa-chevron-down admin-chevron"></i>
              </button>

              {adminMenuOpen && (
                <div
                  className="admin-dropdown"
                  role="menu"
                  aria-label="Administrator account menu"
                >
                  <div className="dropdown-profile">
                    <div className="admin-avatar large">AD</div>

                    <div>
                      <strong>Administrator</strong>
                      <small>System Administrator</small>
                    </div>
                  </div>

                  <div className="dropdown-account-status">
                    <span className="online-dot"></span>
                    <span>Account active</span>
                  </div>

                  <div className="dropdown-divider"></div>

                  <button
                    type="button"
                    role="menuitem"
                    className="dropdown-logout"
                    onClick={handleLogout}
                  >
                    <i className="fas fa-right-from-bracket"></i>

                    <span>
                      <strong>Logout</strong>
                      <small>Sign out of CredTrack</small>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="content">
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
                <strong>127</strong>
                <small>+12% this month</small>
              </div>
            </article>

            <article className="stat pending">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>

              <div>
                <span>Pending</span>
                <strong>32</strong>
                <small>Waiting for approval</small>
              </div>
            </article>

            <article className="stat approved">
              <div className="stat-icon">
                <i className="fas fa-circle-check"></i>
              </div>

              <div>
                <span>Approved</span>
                <strong>54</strong>
                <small>Ready for release</small>
              </div>
            </article>

            <article className="stat released">
              <div className="stat-icon">
                <i className="fas fa-box-open"></i>
              </div>

              <div>
                <span>Released</span>
                <strong>35</strong>
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
                    Showing {filteredRequests.length} of 127
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
                      setSearch(event.target.value)
                    }
                  />
                </div>

                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                >
                  <option value="all">
                    All Statuses
                  </option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Released">Released</option>
                </select>

                <select
                  aria-label="Filter by credential"
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value)
                  }
                >
                  <option value="all">
                    All Credentials
                  </option>
                  <option value="SF10">SF10</option>
                  <option value="SF9">SF9</option>
                  <option value="Certificate of Enrollment">
                    Certificate of Enrollment
                  </option>
                  <option value="Good Moral Certificate">
                    Good Moral Certificate
                  </option>
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
                    {filteredRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <strong>{request.id}</strong>
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
                            className={`badge ${request.status.toLowerCase()}`}
                          >
                            {request.status}
                          </span>
                        </td>

                        <td>
                          <div className="actions">
                            <button
                              className="view"
                              aria-label={`View ${request.id}`}
                              onClick={() =>
                                openRequest(request.id)
                              }
                            >
                              <i className="fas fa-eye"></i>
                            </button>

                            <button
                              className="print"
                              aria-label={`Print ${request.id}`}
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
                  <button>
                    <i className="fas fa-chevron-left"></i>
                  </button>

                  <button className="current">1</button>
                  <button>2</button>
                  <button>3</button>

                  <button>
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
                    <p>Requests this month</p>
                  </div>
                </div>

                <div className="type-list">
                  <div className="type">
                    <div className="type-icon">
                      <i className="fas fa-file-lines"></i>
                    </div>

                    <div>
                      <strong>
                        SF10 Permanent Record
                      </strong>
                      <small>38 completed</small>
                    </div>

                    <b>41</b>
                  </div>

                  <div className="type">
                    <div className="type-icon">
                      <i className="fas fa-file-invoice"></i>
                    </div>

                    <div>
                      <strong>SF9 Report Card</strong>
                      <small>26 completed</small>
                    </div>

                    <b>30</b>
                  </div>

                  <div className="type">
                    <div className="type-icon">
                      <i className="fas fa-certificate"></i>
                    </div>

                    <div>
                      <strong>
                        Certificate of Enrollment
                      </strong>
                      <small>17 completed</small>
                    </div>

                    <b>19</b>
                  </div>

                  <div className="type">
                    <div className="type-icon">
                      <i className="fas fa-award"></i>
                    </div>

                    <div>
                      <strong>
                        Good Moral Certificate
                      </strong>
                      <small>21 completed</small>
                    </div>

                    <b>24</b>
                  </div>
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
                      notify("Activity logs opened")
                    }
                  >
                    View all
                  </button>
                </div>

                <div className="activity">
                  <div className="event">
                    <i className="fas fa-circle-check"></i>

                    <div>
                      <strong>Request approved</strong>
                      <p>
                        Maria Santos' Good Moral
                        Certificate
                      </p>
                      <time>12 minutes ago</time>
                    </div>
                  </div>

                  <div className="event">
                    <i className="fas fa-box-open"></i>

                    <div>
                      <strong>
                        Credential released
                      </strong>
                      <p>REQ-2026-0119 was claimed</p>
                      <time>35 minutes ago</time>
                    </div>
                  </div>

                  <div className="event">
                    <i className="fas fa-file-circle-plus"></i>

                    <div>
                      <strong>
                        New request received
                      </strong>
                      <p>
                        Juan Dela Cruz requested an
                        SF10
                      </p>
                      <time>1 hour ago</time>
                    </div>
                  </div>
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
      >
        <div className="drawer-head">
          <div>
            <small style={{ color: "#8b8f99" }}>
              REQUEST DETAILS
            </small>

            <h2>
              {currentRequest?.id || "REQ-2026-0127"}
            </h2>
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
          <>
            <div className="request-profile">
              <div className="avatar">
                {getInitials(currentRequest.name)}
              </div>

              <div>
                <h3>{currentRequest.name}</h3>
                <p>LRN {currentRequest.lrn}</p>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail">
                <span>Credential</span>
                <strong>{currentRequest.type}</strong>
              </div>

              <div className="detail">
                <span>Status</span>
                <strong>{currentRequest.status}</strong>
              </div>

              <div className="detail">
                <span>Date filed</span>
                <strong>{currentRequest.date}</strong>
              </div>

              <div className="detail">
                <span>Grade & Section</span>
                <strong>Grade 10 – Rizal</strong>
              </div>
            </div>

            <div className="documents">
              <h3>Submitted Documents</h3>

              <div className="file">
                <i className="fas fa-file-pdf"></i>

                <div>
                  <strong>Request Form.pdf</strong>
                  <small>PDF · 1.2 MB</small>
                </div>

                <button
                  aria-label="Preview request form"
                  onClick={() =>
                    notify("Preview opened")
                  }
                >
                  <i className="fas fa-eye"></i>
                </button>
              </div>

              <div className="file">
                <i className="fas fa-id-card"></i>

                <div>
                  <strong>Student ID.jpg</strong>
                  <small>JPG · 860 KB</small>
                </div>

                <button
                  aria-label="Preview student ID"
                  onClick={() =>
                    notify("Preview opened")
                  }
                >
                  <i className="fas fa-eye"></i>
                </button>
              </div>
            </div>

            <div className="decision">
              <button
                className="approve"
                onClick={handleApprove}
              >
                <i className="fas fa-check"></i>
                Approve Request
              </button>
            </div>
          </>
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
