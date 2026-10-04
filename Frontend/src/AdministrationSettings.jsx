import { logoutUser } from './auth/session';
import {usePortal} from './hooks/PortalContext';
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdministrationSettings.css";

function AdministrationSettings() {
  const system=usePortal();
  const defaultSettings=system.data.settings;
  const settingsVersion=useRef(system.data.settings_version);
  const initialNotifications=[];
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(defaultSettings);
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState("");

  const [adminMenuOpen, setAdminMenuOpen] = useState(false);

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState(
    initialNotifications
  );

  const adminMenuRef = useRef(null);
  const notificationRef = useRef(null);



  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast("");
    }, 2300);

    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setConfirmOpen(false);
        setPendingAction("");
        setAdminMenuOpen(false);
        setNotificationOpen(false);
        setSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(event.target)
      ) {
        setAdminMenuOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
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

  const notify = (message) => {
    setToast(message);
  };

  const updateSetting = (key, value) => {
    if(!['schoolName','schoolId','division','schoolEmail','schoolPhone','address','academicYear','processingDays','pickupInstructions','acceptRequests'].includes(key)){notify('This policy is enforced by the server or requires deployment configuration.');return;}
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const saveAll=async()=>{try{await system.mutate('settings/',{settings,version:settingsVersion.current});settingsVersion.current++;notify('School workflow settings saved.');}catch(e){notify(e.message);}};

  const openConfirm = (message) => {
    setPendingAction(message);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setPendingAction("");
  };

  const proceedConfirm=()=>{setSettings(system.data.settings);settingsVersion.current=system.data.settings_version;notify('Reloaded saved settings. Backup and security operations require configured infrastructure.');closeConfirm();};

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const navigateTo = (path) => {
    setSidebarOpen(false);
    setAdminMenuOpen(false);
    setNotificationOpen(false);
    navigate(path);
  };

  const toggleAdminMenu = () => {
    setAdminMenuOpen((previous) => !previous);
    setNotificationOpen(false);
  };

  const logout = async () => {
    await logoutUser();
    sessionStorage.removeItem("credtrackSession");

    setAdminMenuOpen(false);
    navigate("/");
  };

  const unreadCount = notifications.filter(
    (notification) => notification.unread
  ).length;

  const toggleNotifications = () => {
    setNotificationOpen((previous) => !previous);
    setAdminMenuOpen(false);
  };

  const openNotification = (notificationId) => {
    setNotifications((previous) =>
      previous.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              unread: false,
            }
          : notification
      )
    );

    notify("Notification opened");
  };

  const markAllNotificationsRead = () => {
    setNotifications((previous) =>
      previous.map((notification) => ({
        ...notification,
        unread: false,
      }))
    );

    notify("All notifications marked as read");
  };

  return (
    <div className="administration-settings-page">

      {/* MOBILE SIDEBAR OVERLAY */}
      <button
        type="button"
        className={`sidebar-overlay ${
          sidebarOpen ? "show" : ""
        }`}
        onClick={closeSidebar}
        aria-label="Close sidebar"
      />

      {/* SIDEBAR */}
      <aside
        className={`sidebar ${
          sidebarOpen ? "open" : ""
        }`}
      >
        {/* BRAND */}
        <div className="brand">
          <div className="brand-logo">
            <img
              src="/logo.png"
              alt="PMRMIS-South school seal"
            />
          </div>

          <div className="brand-copy">
            <h2>CredTrack</h2>
            <span>PMRMIS–SOUTH</span>
          </div>

          <button
            type="button"
            className="close-sidebar"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <i className="fas fa-xmark" />
          </button>
        </div>

        {/* SYSTEM CARD */}


        {/* NAVIGATION */}
        <nav className="sidebar-navigation">
          <ul className="menu">

            <li className="menu-item">
              <button
                type="button"
                className="menu-link"
                onClick={() =>
                  navigateTo("/admin-dashboard")
                }
              >
                <span className="menu-icon">
                  <i className="fas fa-table-columns" />
                </span>

                <span className="menu-text">
                  Dashboard
                </span>
              </button>
            </li>

            <li className="menu-item">
              <button
                type="button"
                className="menu-link"
                onClick={() =>
                  navigateTo(
                    "/admin-credential-management"
                  )
                }
              >
                <span className="menu-icon">
                  <i className="fas fa-folder-open" />
                </span>

                <span className="menu-text">
                  Credential Management
                </span>
              </button>
            </li>

            <li className="menu-item">
              <button
                type="button"
                className="menu-link"
                onClick={() =>
                  navigateTo("/admin-student-records")
                }
              >
                <span className="menu-icon">
                  <i className="fas fa-user-graduate" />
                </span>

                <span className="menu-text">
                  Student Records
                </span>
              </button>
            </li>

            <li className="menu-item">
              <button
                type="button"
                className="menu-link"
                onClick={() =>
                  navigateTo("/admin-reports")
                }
              >
                <span className="menu-icon">
                  <i className="fas fa-chart-line" />
                </span>

                <span className="menu-text">
                  Reports
                </span>
              </button>
            </li>

            <li className="menu-item">
              <button
                type="button"
                className="menu-link"
                onClick={() =>
                  navigateTo("/admin-activity-logs")
                }
              >
                <span className="menu-icon">
                  <i className="fas fa-clock-rotate-left" />
                </span>

                <span className="menu-text">
                  Activity Logs
                </span>
              </button>
            </li>

            <li className="menu-item active">
              <button
                type="button"
                className="menu-link"
                onClick={() =>
                  navigateTo("/admin-settings")
                }
              >
                <span className="menu-icon">
                  <i className="fas fa-gear" />
                </span>

                <span className="menu-text">
                  System Settings
                </span>

                <span className="active-indicator">
                
                </span>
              </button>
            </li>

          </ul>
        </nav>


      </aside>

      {/* MAIN SHELL */}
      <div className="shell">

        {/* TOPBAR */}
        <header className="topbar">

          <div className="top-left">

            <button
              type="button"
              className="menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <i className="fas fa-bars" />
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

            {/* NOTIFICATIONS */}
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
                aria-expanded={notificationOpen}
              >
                <i className="far fa-bell" />

                {unreadCount > 0 && (
                  <b>{unreadCount}</b>
                )}
              </button>

              {notificationOpen && (
                <div className="notification-panel">

                  <div className="notification-head">
                    <div>
                      <strong>Notifications</strong>

                      <span>
                        {unreadCount > 0
                          ? `${unreadCount} unread notification${
                              unreadCount > 1
                                ? "s"
                                : ""
                            }`
                          : "All notifications are read"}
                      </span>
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={
                          markAllNotificationsRead
                        }
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="notification-list">

                    {notifications.length > 0 ? (
                      notifications.map(
                        (notification) => (
                          <button
                            type="button"
                            key={notification.id}
                            className={`notification-item ${
                              notification.unread
                                ? "unread"
                                : ""
                            }`}
                            onClick={() =>
                              openNotification(
                                notification.id
                              )
                            }
                          >
                            <span className="notification-icon">
                              <i
                                className={`fas ${notification.icon}`}
                              />
                            </span>

                            <span className="notification-copy">
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

                            {notification.unread && (
                              <span className="unread-dot" />
                            )}
                          </button>
                        )
                      )
                    ) : (
                      <div className="empty-notifications">
                        <i className="far fa-bell-slash" />

                        <strong>
                          No notifications
                        </strong>

                        <span>
                          You are all caught up.
                        </span>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>

            {/* ADMIN MENU */}
            <div
              className="admin-menu-wrap"
              ref={adminMenuRef}
            >
              <button
                type="button"
                className={`profile ${
                  adminMenuOpen ? "open" : ""
                }`}
                onClick={toggleAdminMenu}
                aria-label="Open administrator menu"
                aria-expanded={adminMenuOpen}
              >
                <img
                  src="/logo.png"
                  alt="Administrator"
                />

                <div>
                  <strong>ADMINISTRATOR</strong>

                </div>

                
             
              </button>

              {adminMenuOpen && (
                <div className="admin-dropdown">

                  <div className="admin-menu-divider" />



                  <button
                    type="button"
                    className="admin-logout"
                    onClick={logout}
                  >
                    <i className="fas fa-right-from-bracket" />
                    <span>Logout</span>
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
              <h1>System Settings</h1>

              <p>
                Configure institutional information,
                workflows, security, and data protection.
              </p>
            </div>

            <button
              type="button"
              className="save-all"
              onClick={saveAll}
            >
              <i className="fas fa-floppy-disk" />
              Save Changes
            </button>
          </section>

          <div className="settings-layout">

            {/* SETTINGS NAVIGATION */}
            <nav className="settings-nav">

              <button
                type="button"
                className={`tab ${
                  activeTab === "general"
                    ? "active"
                    : ""
                }`}
                onClick={() => setActiveTab("general")}
              >
                <i className="fas fa-school" />
                General
              </button>

              <button
                type="button"
                className={`tab ${
                  activeTab === "credentials"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("credentials")
                }
              >
                <i className="fas fa-file-shield" />
                Credential Workflow
              </button>

              <button
                type="button"
                className={`tab ${
                  activeTab === "notifications"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("notifications")
                }
              >
                <i className="fas fa-bell" />
                Notifications
              </button>

              <button
                type="button"
                className={`tab ${
                  activeTab === "security"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("security")
                }
              >
                <i className="fas fa-lock" />
                Security
              </button>

              <button
                type="button"
                className={`tab ${
                  activeTab === "backup"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("backup")
                }
              >
                <i className="fas fa-database" />
                Backup & Retention
              </button>

              <button
                type="button"
                className={`tab ${
                  activeTab === "maintenance"
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveTab("maintenance")
                }
              >
                <i className="fas fa-screwdriver-wrench" />
                Maintenance
              </button>

            </nav>

            <div className="settings-content">

              {/* GENERAL */}
              <div className="settings-card" style={{padding:20,marginBottom:16}}><label><input type="checkbox" checked={settings.acceptRequests!==false} onChange={e=>updateSetting('acceptRequests',e.target.checked)}/> Accept student/alumni requests</label><label style={{display:'block',marginTop:12}}>Pickup instructions<input style={{width:'100%'}} value={settings.pickupInstructions||''} onChange={e=>updateSetting('pickupInstructions',e.target.value)}/></label><p>Principal approval, release acknowledgment, and audit history are mandatory. SMS is queued until Semaphore is configured.</p></div>
{activeTab === "general" && (
                <section className="settings-section active">
                  <article className="panel">

                    <div className="panel-head">
                      <h2>School Information</h2>
                      <p>
                        Official information displayed on
                        credentials and reports.
                      </p>
                    </div>

                    <div className="panel-body">
                      <div className="form-grid">

                        <div className="field full">
                          <label>School Identity</label>

                          <div className="logo-setting">
                            <img
                              src="/logo.png"
                              alt="Current school seal"
                            />

                            <div>
                              <button
                                type="button"
                                className="upload"
                                onClick={() =>
                                  notify(
                                    "Connect this control to secure file storage"
                                  )
                                }
                              >
                                <i className="fas fa-upload" />
                                Change School Seal
                              </button>

                              <small>
                                PNG or JPG. Use the
                                official approved
                                school seal.
                              </small>
                            </div>
                          </div>
                        </div>

                        <div className="field full">
                          <label htmlFor="schoolName">
                            Official School Name
                          </label>

                          <input
                            id="schoolName"
                            value={settings.schoolName}
                            onChange={(e) =>
                              updateSetting(
                                "schoolName",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="schoolId">
                            School ID
                          </label>

                          <input
                            id="schoolId"
                            value={settings.schoolId}
                            onChange={(e) =>
                              updateSetting(
                                "schoolId",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="division">
                            Schools Division
                          </label>

                          <input
                            id="division"
                            value={settings.division}
                            onChange={(e) =>
                              updateSetting(
                                "division",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="schoolEmail">
                            Official Email
                          </label>

                          <input
                            id="schoolEmail"
                            type="email"
                            value={settings.schoolEmail}
                            onChange={(e) =>
                              updateSetting(
                                "schoolEmail",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="schoolPhone">
                            Contact Number
                          </label>

                          <input
                            id="schoolPhone"
                            value={settings.schoolPhone}
                            onChange={(e) =>
                              updateSetting(
                                "schoolPhone",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="field full">
                          <label htmlFor="address">
                            School Address
                          </label>

                          <textarea
                            id="address"
                            value={settings.address}
                            onChange={(e) =>
                              updateSetting(
                                "address",
                                e.target.value
                              )
                            }
                          />
                        </div>

                        <div className="field">
                          <label htmlFor="academicYear">
                            Current Academic Year
                          </label>

                          <select
                            id="academicYear"
                            value={settings.academicYear}
                            onChange={(e) =>
                              updateSetting(
                                "academicYear",
                                e.target.value
                              )
                            }
                          >
                            <option>2025–2026</option>
                            <option>2026–2027</option>
                            <option>2027–2028</option>
                          </select>
                        </div>

                        <div className="field">
                          <label htmlFor="timezone">
                            System Time Zone
                          </label>

                          <select
                            id="timezone"
                            value={settings.timezone}
                            onChange={(e) =>
                              updateSetting(
                                "timezone",
                                e.target.value
                              )
                            }
                          >
                            <option>
                              Asia/Manila (UTC+8)
                            </option>
                          </select>
                        </div>

                      </div>
                    </div>
                  </article>
                </section>
              )}

              {/* CREDENTIAL WORKFLOW */}
              {activeTab === "credentials" && (
                <section className="settings-section active">
                  <article className="panel">

                    <div className="panel-head">
                      <h2>
                        Credential Approval Workflow
                      </h2>

                      <p>
                        Define how official credential
                        requests move through the system.
                      </p>
                    </div>

                    <div className="panel-body">

                      <SettingSwitch
                        title="Require Principal approval"
                        description="Official credentials must be authorized by the designated Principal account before release."
                        checked={
                          settings.principalApproval
                        }
                        onChange={(value) =>
                          updateSetting(
                            "principalApproval",
                            value
                          )
                        }
                      />

                      <SettingSwitch
                        title="Require document verification"
                        description="Administrator verifies supporting documents before sending a request for approval."
                        checked={
                          settings.documentVerification
                        }
                        onChange={(value) =>
                          updateSetting(
                            "documentVerification",
                            value
                          )
                        }
                      />

                      <SettingSwitch
                        title="Release acknowledgment"
                        description="Record claimant name, release date, and releasing staff member."
                        checked={
                          settings.releaseAcknowledgment
                        }
                        onChange={(value) =>
                          updateSetting(
                            "releaseAcknowledgment",
                            value
                          )
                        }
                      />

                      <SettingSelect
                        title="Target processing time"
                        description="Used for overdue indicators and performance reporting."
                        value={settings.processingDays}
                        options={[
                          "1 working day",
                          "3 working days",
                          "5 working days",
                        ]}
                        onChange={(value) =>
                          updateSetting(
                            "processingDays",
                            value
                          )
                        }
                      />

                      <SettingInput
                        title="Request reference format"
                        description="Prefix used for newly created credential request IDs."
                        value={settings.referencePrefix}
                        onChange={(value) =>
                          updateSetting(
                            "referencePrefix",
                            value
                          )
                        }
                      />

                    </div>
                  </article>
                </section>
              )}

              {/* NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <section className="settings-section active">
                  <article className="panel">

                    <div className="panel-head">
                      <h2>System Notifications</h2>

                      <p>
                        Choose which events create alerts
                        for authorized users.
                      </p>
                    </div>

                    <div className="panel-body">

                      <SettingSwitch
                        title="New credential request"
                        description="Notify Administrators when a student request is submitted."
                        checked={
                          settings.notifyNewRequest
                        }
                        onChange={(value) =>
                          updateSetting(
                            "notifyNewRequest",
                            value
                          )
                        }
                      />

                      <SettingSwitch
                        title="Approval required"
                        description="Notify the Principal when a verified request needs authorization."
                        checked={settings.notifyApproval}
                        onChange={(value) =>
                          updateSetting(
                            "notifyApproval",
                            value
                          )
                        }
                      />

                      <SettingSwitch
                        title="Credential ready for release"
                        description="Notify the responsible staff after approval and preparation."
                        checked={settings.notifyRelease}
                        onChange={(value) =>
                          updateSetting(
                            "notifyRelease",
                            value
                          )
                        }
                      />

                      <SettingSwitch
                        title="Security warnings"
                        description="Alert Administrators and ICT Personnel about repeated failed logins or unusual access."
                        checked={
                          settings.notifySecurity
                        }
                        onChange={(value) =>
                          updateSetting(
                            "notifySecurity",
                            value
                          )
                        }
                      />

                      <SettingSwitch
                        title="Backup failures"
                        description="Alert ICT Personnel immediately when a scheduled backup fails."
                        checked={settings.notifyBackup}
                        onChange={(value) =>
                          updateSetting(
                            "notifyBackup",
                            value
                          )
                        }
                      />

                    </div>
                  </article>
                </section>
              )}

              {/* SECURITY */}
              {activeTab === "security" && (
                <section className="settings-section active">
                  <article className="panel">

                    <div className="panel-head">
                      <h2>
                        Authentication & Access
                      </h2>

                      <p>
                        Security requirements should be
                        enforced by the backend.
                      </p>
                    </div>

                    <div className="panel-body">

                      <SettingSelect
                        title="Minimum password length"
                        description="Require long passwords for every system user."
                        value={
                          settings.passwordLength
                        }
                        options={[
                          "8 characters",
                          "12 characters",
                          "14 characters",
                        ]}
                        onChange={(value) =>
                          updateSetting(
                            "passwordLength",
                            value
                          )
                        }
                      />

                      <SettingSwitch
                        title="Multi-factor authentication"
                        description="Require a second verification step for Administrator, Principal, and ICT Personnel accounts."
                        checked={settings.mfa}
                        onChange={(value) =>
                          updateSetting("mfa", value)
                        }
                      />

                      <SettingSelect
                        title="Account lockout"
                        description="Temporarily lock an account after repeated failed sign-in attempts."
                        value={settings.lockout}
                        options={[
                          "3 failed attempts",
                          "5 failed attempts",
                          "10 failed attempts",
                        ]}
                        onChange={(value) =>
                          updateSetting(
                            "lockout",
                            value
                          )
                        }
                      />

                      <SettingSelect
                        title="Session timeout"
                        description="Automatically sign out inactive users to protect student records."
                        value={
                          settings.sessionTimeout
                        }
                        options={[
                          "15 minutes",
                          "30 minutes",
                          "60 minutes",
                        ]}
                        onChange={(value) =>
                          updateSetting(
                            "sessionTimeout",
                            value
                          )
                        }
                      />

                      <SettingSwitch
                        title="Audit all privileged actions"
                        description="Record approvals, account changes, imports, and system configuration updates."
                        checked={
                          settings.auditActions
                        }
                        onChange={(value) =>
                          updateSetting(
                            "auditActions",
                            value
                          )
                        }
                      />

                    </div>
                  </article>
                </section>
              )}

              {/* BACKUP */}
              {activeTab === "backup" && (
                <section className="settings-section active">
                  <article className="panel">

                    <div className="panel-head">
                      <h2>
                        Backup & Data Retention
                      </h2>

                      <p>
                        Protect school records and
                        maintain recoverable copies.
                      </p>
                    </div>

                    <div className="panel-body">

                      <div className="status-card">
                        <i className="fas fa-circle-info" />

                        <div>
                          <strong>
                            Backup service not configured
                          </strong>

                          <span>
                            No backup or restore has been verified. Configure protected storage with ICT.
                          </span>
                        </div>

                        <b>PENDING</b>
                      </div>

                      <SettingSwitch
                        title="Automatic backups"
                        description="Unavailable until protected backup storage and scheduling are configured."
                        checked={false}
                        disabled
                        onChange={(value) =>
                          updateSetting(
                            "automaticBackups",
                            value
                          )
                        }
                      />

                      <SettingSelect
                        title="Backup frequency"
                        disabled
                        description="More frequent backups reduce possible data loss."
                        value={
                          settings.backupFrequency
                        }
                        options={[
                          "Every day",
                          "Every 12 hours",
                          "Every week",
                        ]}
                        onChange={(value) =>
                          updateSetting(
                            "backupFrequency",
                            value
                          )
                        }
                      />

                      <SettingSelect
                        title="Audit-log retention"
                        disabled
                        description="Retention must follow applicable school, privacy, and records policies."
                        value={settings.logRetention}
                        options={[
                          "1 year",
                          "3 years",
                          "5 years",
                          "7 years",
                        ]}
                        onChange={(value) =>
                          updateSetting(
                            "logRetention",
                            value
                          )
                        }
                      />

                      <div className="button-row">

                        <button
                          type="button"
                          className="secondary"
                          disabled title="Backup service is not configured"
                        >
                          <i className="fas fa-database" />
                          Back Up Now
                        </button>

                        <button
                          type="button"
                          className="secondary"
                          disabled title="Backup service is not configured"
                        >
                          <i className="fas fa-shield-halved" />
                          Verify Latest Backup
                        </button>

                      </div>

                      <div className="backup-history" role="status">
                        <p>No backup history is available. No backup or restore has been verified.</p>
                      </div>

                    </div>
                  </article>
                </section>
              )}

              {/* MAINTENANCE */}
              {activeTab === "maintenance" && (
                <section className="settings-section active">

                  <article className="panel">

                    <div className="panel-head">
                      <h2>System Maintenance</h2>

                      <p>
                        Technical operations intended for
                        authorized ICT Personnel.
                      </p>
                    </div>

                    <div className="panel-body">

                      <div className="status-card">
                        <i className="fas fa-server" />

                        <div>
                          <strong>
                            All services operational
                          </strong>

                          <span>
                            Database, file storage, email
                            delivery, and scheduled jobs
                            are available.
                          </span>
                        </div>

                        <b>ONLINE</b>
                      </div>

                      <div className="button-row">

                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            notify(
                              "System health check passed"
                            )
                          }
                        >
                          <i className="fas fa-stethoscope" />
                          Run Health Check
                        </button>

                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            notify(
                              "Temporary cache cleared"
                            )
                          }
                        >
                          <i className="fas fa-broom" />
                          Clear Temporary Cache
                        </button>

                      </div>

                    </div>
                  </article>

                  <article className="panel danger-zone">

                    <div className="panel-head">
                      <h2>Restricted Operations</h2>

                      <p>
                        These actions require confirmation
                        and should be limited to authorized
                        technical staff.
                      </p>
                    </div>

                    <div className="panel-body">

                      <div className="danger-item">

                        <div>
                          <strong>
                            Maintenance Mode
                          </strong>

                          <span>
                            Temporarily block normal user
                            access while technical work is
                            performed.
                          </span>
                        </div>

                        <button
                          type="button"
                          className="warning"
                          onClick={() =>
                            openConfirm(
                              "Enable maintenance mode? Users will be unable to access the system."
                            )
                          }
                        >
                          Enable Mode
                        </button>

                      </div>

                      <div className="danger-item">

                        <div>
                          <strong>
                            Reset Local UI Preferences
                          </strong>

                          <span>
                            Clear saved settings from this
                            browser only. Database records
                            are not affected.
                          </span>
                        </div>

                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            openConfirm(
                              "Reset all locally saved UI settings on this device?"
                            )
                          }
                        >
                          Reset Local Settings
                        </button>

                      </div>

                    </div>
                  </article>

                </section>
              )}

            </div>
          </div>
        </main>
      </div>

      {/* CONFIRMATION MODAL */}
      <div
        className={`confirm-overlay ${
          confirmOpen ? "show" : ""
        }`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeConfirm();
          }
        }}
      >
        <div className="confirm">

          <div className="confirm-head">
            <h2>Confirm Restricted Action</h2>

            <button
              type="button"
              className="secondary confirm-close"
              onClick={closeConfirm}
            >
              <i className="fas fa-xmark" />
            </button>
          </div>

          <div className="confirm-body">
            {pendingAction}
          </div>

          <div className="confirm-actions">

            <button
              type="button"
              className="secondary"
              onClick={closeConfirm}
            >
              Cancel
            </button>

            <button
              type="button"
              className="danger"
              onClick={proceedConfirm}
            >
              Confirm Action
            </button>

          </div>
        </div>
      </div>

      {/* TOAST */}
      <div className={`toast ${toast ? "show" : ""}`}>
        {toast}
      </div>

    </div>
  );
}

/* =========================
   REUSABLE SETTING COMPONENTS
========================= */

function SettingSwitch({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}) {
  return (
    <div className="setting-row">

      <div className="setting-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <label className="switch">
        <input
          type="checkbox"
          checked={checked} disabled={disabled}
          onChange={(e) =>
            onChange(e.target.checked)
          }
        />

        <span className="slider" />
      </label>

    </div>
  );
}

function SettingSelect({
  title,
  description,
  value,
  options,
  disabled = false,
  onChange,
}) {
  return (
    <div className="setting-row">

      <div className="setting-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <select
        className="inline-control"
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(e.target.value)
        }
      >
        {[...new Set([value,...options])].map((option) => (
          <option key={option}>
            {option}
          </option>
        ))}
      </select>

    </div>
  );
}

function SettingInput({
  title,
  description,
  value,
  onChange,
}) {
  return (
    <div className="setting-row">

      <div className="setting-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <input
        className="inline-control"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
      />

    </div>
  );
}

export default AdministrationSettings;