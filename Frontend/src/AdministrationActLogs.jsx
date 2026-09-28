import { logoutUser } from './auth/session';
import {usePortal} from './hooks/PortalContext';
import {auditRows,localDay} from './api/portalData';
import {downloadCSV} from './api/operations';

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdministrationActLogs.css";

const getInitials=name=>name.split(' ').filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase();
const getRoleClass=role=>role==='Administrator'?'admin':role==='Principal'?'principal':'ict';
function AdministrationActLogs() {
  const system=usePortal();
  const logs=useMemo(()=>auditRows(system.data),[system.data]);
  const notifications=logs.slice(0,5).map(e=>({...e,title:e.action,message:e.description,unread:true}));
  const navigate = useNavigate();

  const notificationRef = useRef(null);
  const adminMenuRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const [logPage,setLogPage]=useState(1);
  const [toast, setToast] = useState("");

  const unreadCount =
    notifications.length - readNotifications.length;

  const filteredLogs = useMemo(() => {
    const query = search.toLowerCase().trim();

    return logs.filter((log) => {
      const matchesSearch =
        !query ||
        `${log.id} ${log.actor} ${log.action} ${log.description} ${log.target}`
          .toLowerCase()
          .includes(query);

      const matchesRole =
        roleFilter === "all" || log.role === roleFilter;

      const matchesModule =
        moduleFilter === "all" || log.module === moduleFilter;

      const matchesLevel =
        levelFilter === "all" || log.level === levelFilter;

      const matchesDate =
        !dateFilter || log.date === dateFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesModule &&
        matchesLevel &&
        matchesDate
      );
    });
  }, [
    logs,
    search,
    roleFilter,
    moduleFilter,
    levelFilter,
    dateFilter,
  ]);

  const showToast = (message) => {
    setToast(message);
  };

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast("");
    }, 2200);

    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }

      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(event.target)
      ) {
        setAdminMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  const pages=Math.max(1,Math.ceil(filteredLogs.length/20)),currentPage=Math.min(logPage,pages);
  const openDetail = (log) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const closeDetail = () => {
    setDrawerOpen(false);
  };

  const resetFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setModuleFilter("all");
    setLevelFilter("all");
    setDateFilter("");
  };

  const refreshLogs = () => {
    system.refresh();showToast("Refreshing saved activity…");
  };

  const exportLogs = () => {
    downloadCSV('CredTrack_Audit.csv',[['Date','Time','Actor','Role','Action','Module','Target','Detail'],...filteredLogs.map(e=>[e.date,e.time,e.actor,e.role,e.action,e.module,e.target,e.description])]);
  };

  const logout = async () => {
    await logoutUser();
    navigate("/");
  };

  const navigatePage = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  const toggleNotifications = () => {
    setNotificationOpen((previous) => !previous);
    setAdminMenuOpen(false);
  };

  const toggleAdminMenu = () => {
    setAdminMenuOpen((previous) => !previous);
    setNotificationOpen(false);
  };

  const markNotificationRead = (id) => {
    setReadNotifications((previous) => {
      if (previous.includes(id)) {
        return previous;
      }

      return [...previous, id];
    });
  };

  const markAllNotificationsRead = () => {
    setReadNotifications(
      notifications.map((notification) => notification.id)
    );

    showToast("All notifications marked as read");
  };

  return (
    <div className="activity-logs-page">
      {/* Mobile sidebar overlay */}
      <div
        className={`sidebar-screen ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={`sidebar ${
          sidebarOpen ? "show" : ""
        }`}
      >
        <div className="brand">
          <img
            src="/logo.png"
            alt="PMRMIS-South school seal"
          />

          <div>
            <h2>CredTrack</h2>
            <span>PMRMIS–SOUTH</span>
          </div>

          <button
            type="button"
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
          >
            <i className="fas fa-xmark"></i>
          </button>
        </div>

        <ul className="nav">
          <li>
            <button
              type="button"
              onClick={() =>
                navigatePage("/admin-dashboard")
              }
            >
              <i className="fas fa-table-columns"></i>
              <span>Dashboard</span>
            </button>
          </li>

          <li>
            <button
              type="button"
              onClick={() =>
                navigatePage(
                  "/admin-credential-management"
                )
              }
            >
              <i className="fas fa-folder-open"></i>
              <span>Credential Management</span>
            </button>
          </li>

          <li>
            <button
              type="button"
              onClick={() =>
                navigatePage("/admin-student-records")
              }
            >
              <i className="fas fa-user-graduate"></i>
              <span>Student Records</span>
            </button>
          </li>

          <li>
            <button
              type="button"
              onClick={() =>
                navigatePage("/admin-reports")
              }
            >
              <i className="fas fa-chart-line"></i>
              <span>Reports</span>
            </button>
          </li>

          <li className="active">
            <button
              type="button"
              onClick={() =>
                navigatePage("/admin-activity-logs")
              }
            >
              <i className="fas fa-clock-rotate-left"></i>
              <span>Activity Logs</span>
            </button>
          </li>

          <li>
            <button
              type="button"
              onClick={() =>
                navigatePage("/admin-settings")
              }
            >
              <i className="fas fa-gear"></i>
              <span>System Settings</span>
            </button>
          </li>
        </ul>
      </aside>

      <div className="shell">
        {/* Topbar */}
        <header className="topbar">
          <div className="top-left">
            <button
              type="button"
              className="menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <i className="fas fa-bars"></i>
            </button>

            <img
              className="school-seal"
              src="/logo.png"
              alt="PMRMIS-South school seal"
            />

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

          <div className="top-right">
            {/* Notifications */}
            <div
              className="notification-wrapper"
              ref={notificationRef}
            >
              <button
                type="button"
                className={`bell ${
                  notificationOpen ? "active" : ""
                }`}
                onClick={toggleNotifications}
                aria-label="Notifications"
                title="Notifications"
              >
                <i className="far fa-bell"></i>

                {unreadCount > 0 && (
                  <b>{unreadCount}</b>
                )}
              </button>

              {notificationOpen && (
                <div className="notification-panel">
                  <div className="notification-head">
                    <div>
                      <h3>Notifications</h3>

                      <span>
                        {unreadCount > 0
                          ? `${unreadCount} unread notification${
                              unreadCount > 1 ? "s" : ""
                            }`
                          : "You're all caught up"}
                      </span>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="notification-list">
                    {notifications.map(
                      (notification) => {
                        const isRead =
                          readNotifications.includes(
                            notification.id
                          );

                        return (
                          <button
                            type="button"
                            key={notification.id}
                            className={`notification-item ${
                              isRead ? "read" : "unread"
                            }`}
                            onClick={() =>
                              markNotificationRead(
                                notification.id
                              )
                            }
                          >
                            <span
                              className={`notification-icon ${notification.type}`}
                            >
                              <i
                                className={`fas ${notification.icon}`}
                              ></i>
                            </span>

                            <span className="notification-content">
                              <strong>
                                {notification.title}
                              </strong>

                              <span>
                                {notification.message}
                              </span>

                              <small>
                                {notification.time}
                              </small>
                            </span>

                            {!isRead && (
                              <span className="unread-dot"></span>
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>

                  <div className="notification-footer">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationOpen(false);
                        showToast(
                          "Notifications are up to date"
                        );
                      }}
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Administrator Menu */}
            <div
              className="profile-wrapper"
              ref={adminMenuRef}
            >
              <button
                type="button"
                className={`profile ${
                  adminMenuOpen ? "active" : ""
                }`}
                onClick={toggleAdminMenu}
                aria-label="Administrator menu"
              >
                <img
                  src="/logo.png"
                  alt="Administrator"
                />

                <div>
                  <strong>Administrator</strong>
                  <small>System Administrator</small>
                </div>

                <i
                  className={`fas ${
                    adminMenuOpen
                      ? "fa-chevron-up"
                      : "fa-chevron-down"
                  }`}
                ></i>
              </button>

              {adminMenuOpen && (
                <div className="admin-menu">
                  <div className="admin-menu-header">
                    <img
                      src="/logo.png"
                      alt="Administrator"
                    />

                    <div>
                      <strong>Administrator</strong>
                      <span>
                        System Administrator
                      </span>
                    </div>
                  </div>

                  <div className="admin-menu-divider"></div>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      navigatePage("/admin-settings");
                    }}
                  >
                    <i className="fas fa-user-gear"></i>
                    <span>Account Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      navigatePage("/admin-settings");
                    }}
                  >
                    <i className="fas fa-gear"></i>
                    <span>System Settings</span>
                  </button>

                  <div className="admin-menu-divider"></div>

                  <button
                    type="button"
                    className="logout-menu-item"
                    onClick={logout}
                  >
                    <i className="fas fa-right-from-bracket"></i>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="content">
          <section className="page-head">
            <div>
              <h1>Activity Logs</h1>

              <p>
                Review immutable audit events, user
                activity, and security-relevant system
                changes.
              </p>
            </div>

            <div className="head-actions">
              <button
                type="button"
                className="outline"
                onClick={refreshLogs}
              >
                <i className="fas fa-rotate"></i>
                Refresh
              </button>

              <button
                type="button"
                className="primary"
                onClick={exportLogs}
              >
                <i className="fas fa-download"></i>
                Export Logs
              </button>
            </div>
          </section>

          {/* Overview */}
          <section className="overview">
            <article className="metric events">
              <i className="fas fa-list-check"></i>

              <div>
                <span>Events Today</span>
                <strong>{logs.filter(e=>e.date===localDay(system.data.updatedAt)).length}</strong>
              </div>
            </article>

            <article className="metric security">
              <i className="fas fa-shield-halved"></i>

              <div>
                <span>Security Events</span>
                <strong>{logs.filter(e=>e.module==='Authentication').length}</strong>
              </div>
            </article>

            <article className="metric users">
              <i className="fas fa-user-clock"></i>

              <div>
                <span>Actors in audit history</span>
                <strong>{new Set(logs.map(e=>e.actor)).size}</strong>
              </div>
            </article>

            <article className="metric system">
              <i className="fas fa-server"></i>

              <div>
                <span>System Status</span>
                <strong className="healthy">
                  Connected
                </strong>
              </div>
            </article>
          </section>

          {/* Audit Trail */}
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>System Audit Trail</h2>

                <p>
                  {filteredLogs.length === logs.length
                    ? "Showing all recorded activities"
                    : "Showing filtered audit activities"}
                </p>
              </div>

              <span className="integrity">
                <i className="fas fa-lock"></i>
                Append-only audit log
              </span>
            </div>

            {/* Filters */}
            <div className="filters">
              <div className="search">
                <i className="fas fa-search"></i>

                <input
                  type="search"
                  placeholder="Search actor, action, target, or event ID..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(e.target.value)
                }
              >
                <option value="all">All Roles</option>
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

              <select
                value={moduleFilter}
                onChange={(e) =>
                  setModuleFilter(e.target.value)
                }
              >
                <option value="all">All Modules</option>
                <option value="Authentication">
                  Authentication
                </option>
                <option value="Credentials">
                  Credentials
                </option>
                <option value="Student Records">
                  Student Records
                </option>
                <option value="User Management">
                  User Management
                </option>
                <option value="System">System</option>
              </select>

              <select
                value={levelFilter}
                onChange={(e) =>
                  setLevelFilter(e.target.value)
                }
              >
                <option value="all">All Levels</option>
                <option value="Info">Info</option>
                <option value="Success">Success</option>
                <option value="Warning">Warning</option>
                <option value="Critical">Critical</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(e.target.value)
                }
              />

              <button
                type="button"
                className="reset"
                onClick={resetFilters}
              >
                <i className="fas fa-rotate-left"></i>
                Reset
              </button>
            </div>

            {/* Table */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>TIME</th>
                    <th>ACTOR</th>
                    <th>ROLE</th>
                    <th>ACTIVITY</th>
                    <th>MODULE</th>
                    <th>LEVEL</th>
                    <th>IP ADDRESS</th>
                    <th>DETAILS</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <strong>{log.time}</strong>
                          <br />
                          <small>{log.date}</small>
                        </td>

                        <td>
                          <div className="actor">
                            <span className="avatar">
                              {getInitials(log.actor)}
                            </span>

                            <div>
                              <strong>{log.actor}</strong>
                              <small>{log.id}</small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`role ${getRoleClass(
                              log.role
                            )}`}
                          >
                            {log.role}
                          </span>
                        </td>

                        <td>
                          <div className="event-cell">
                            <span className="event-icon">
                              <i
                                className={`fas ${log.icon}`}
                              ></i>
                            </span>

                            <div>
                              <strong>
                                {log.action}
                              </strong>

                              <small>
                                {log.description}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>{log.module}</td>

                        <td>
                          <span
                            className={`level ${log.level.toLowerCase()}`}
                          >
                            {log.level}
                          </span>
                        </td>

                        <td>{log.ip}</td>

                        <td>
                          <button
                            type="button"
                            className="view-btn"
                            onClick={() =>
                              openDetail(log)
                            }
                            title="View details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        className="empty-state"
                      >
                        <i className="fas fa-magnifying-glass"></i>

                        <strong>
                          No activity logs found
                        </strong>

                        <span>
                          Try changing your search or
                          filters.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="table-foot">
              <span>
                {filteredLogs.length} event
                {filteredLogs.length === 1 ? "" : "s"}{" "}
                shown
              </span>

              <div className="pages"><button disabled={currentPage===1} onClick={()=>setLogPage(currentPage-1)}><i className="fas fa-chevron-left"/></button><button className="current">{currentPage}</button><button disabled={currentPage===pages} onClick={()=>setLogPage(currentPage+1)}><i className="fas fa-chevron-right"/></button></div>
            </div>
          </section>
        </main>
      </div>

      {/* Drawer Overlay */}
      <div
        className={`drawer-overlay ${
          drawerOpen ? "show" : ""
        }`}
        onClick={closeDetail}
      ></div>

      {/* Event Details Drawer */}
      <aside
        className={`drawer ${
          drawerOpen ? "show" : ""
        }`}
      >
        {selectedLog && (
          <>
            <div className="drawer-head">
              <div>
                <small>AUDIT EVENT</small>
                <h2>{selectedLog.id}</h2>
              </div>

              <button
                type="button"
                className="close"
                onClick={closeDetail}
              >
                <i className="fas fa-xmark"></i>
              </button>
            </div>

            <div className="event-hero">
              <i
                className={`fas ${selectedLog.icon}`}
              ></i>

              <div>
                <h3>{selectedLog.action}</h3>

                <p>
                  {selectedLog.date} at{" "}
                  {selectedLog.time}
                </p>
              </div>
            </div>

            <div className="details">
              <div className="detail">
                <span>Actor</span>
                <strong>{selectedLog.actor}</strong>
              </div>

              <div className="detail">
                <span>Role</span>
                <strong>{selectedLog.role}</strong>
              </div>

              <div className="detail">
                <span>Module</span>
                <strong>{selectedLog.module}</strong>
              </div>

              <div className="detail">
                <span>IP Address</span>
                <strong>{selectedLog.ip}</strong>
              </div>

              <div className="detail full">
                <span>Description</span>
                <strong>
                  {selectedLog.description}
                </strong>
              </div>

              <div className="detail full">
                <span>Target Resource</span>
                <strong>
                  {selectedLog.target}
                </strong>
              </div>
            </div>

            <div className="notice">
              <i className="fas fa-circle-info"></i>{" "}
              Audit entries must not be edited or deleted
              through the user interface. Retention and
              access should follow school privacy and
              records policies.
            </div>
          </>
        )}
      </aside>

      {/* Toast */}
      <div className={`toast ${toast ? "show" : ""}`}>
        {toast}
      </div>
    </div>
  );
}

export default AdministrationActLogs;


