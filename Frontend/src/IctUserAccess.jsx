import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "./auth/session";
import { usePortal } from "./hooks/PortalContext";
import "./IctUserAccess.css";

const roleOptions = [
  "ICT Personnel",
  "Administrator",
  "Principal",
];

const normalizeRequestStatus = (status) => {
  if (!status) return "Pending";

  const value = String(status).trim().toLowerCase();

  if (value === "pending") return "Pending";
  if (value === "approved") return "Approved";
  if (value === "provisioned") return "Provisioned";
  if (value === "rejected") return "Rejected";

  return status;
};

const formatDateTime = (value) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const emptyForm = {
  name: "",
  email: "",
  role: "",
  username: "",
  password: "",
};

function IctUserAccess() {
  const navigate = useNavigate();
  const system = usePortal();

  const accounts = Array.isArray(system?.data?.accounts)
    ? system.data.accounts
    : [];

  const requests = Array.isArray(system?.data?.requests)
    ? system.data.requests
    : Array.isArray(system?.data?.credentialRequests)
      ? system.data.credentialRequests
      : [];

  const saving = useRef(false);
  const dialogRef = useRef(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [action, setAction] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [formValues, setFormValues] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (action && !dialog.open) {
      dialog.showModal();
    }

    if (!action && dialog.open) {
      dialog.close();
    }
  }, [action]);

  const closeModal = () => {
    const dialog = dialogRef.current;

    if (dialog?.open) {
      dialog.close();
    }

    setAction(null);
    setSelectedAccount(null);
    setSelectedRequest(null);
    setFormError("");
    setFormValues(emptyForm);
  };

  const openCreateAccount = () => {
    setSelectedAccount(null);
    setSelectedRequest(null);
    setFormValues(emptyForm);
    setFormError("");
    setAction("create");
  };

  const openEditAccount = (account) => {
    setSelectedAccount(account);

    setFormValues({
      name: account?.name || "",
      email: account?.email || "",
      role: account?.role || "",
      username: account?.username || "",
      password: "",
    });

    setFormError("");
    setAction("edit");
  };

  const openAccessAction = (account, actionType) => {
    setSelectedAccount(account);

    setFormValues({
      name: account?.name || "",
      email: account?.email || "",
      role: account?.role || "",
      username: account?.username || "",
      password: "",
    });

    setFormError("");
    setAction(actionType);
  };

  const openProvision = (request) => {
    setSelectedRequest(request);
    setFormError("");
    setAction("provision");
  };

  const updateFormValue = (field, value) => {
    setFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveAccount = async (type) => {
    if (saving.current) return;

    if (!selectedAccount && type !== "create") {
      setFormError("No account was selected.");
      return;
    }

    if (type === "create") {
      if (!formValues.username.trim()) {
        setFormError("Username is required.");
        return;
      }

      if (!formValues.password.trim()) {
        setFormError("Initial password is required.");
        return;
      }

      if (!formValues.name.trim()) {
        setFormError("Full name is required.");
        return;
      }

      if (!formValues.email.trim()) {
        setFormError("Email address is required.");
        return;
      }

      if (!formValues.role) {
        setFormError("Please select a role.");
        return;
      }
    }

    if (type === "edit") {
      if (!formValues.name.trim()) {
        setFormError("Full name is required.");
        return;
      }

      if (!formValues.role) {
        setFormError("Please select a role.");
        return;
      }
    }

    if (type === "reset" && !formValues.password.trim()) {
      setFormError("Please enter a new password.");
      return;
    }

    saving.current = true;
    setFormError("");

    try {
      await system.mutate("accounts/", {
        action: type,
        values: {
          ...formValues,
          id: selectedAccount?.id,
        },
      });

      closeModal();
    } catch (error) {
      setFormError(
        error?.message || "Unable to complete the account action."
      );
    } finally {
      saving.current = false;
    }
  };

  const createAccount = () => saveAccount("create");

  const updateAccount = () => saveAccount("edit");

  const handleAccessAction = () => {
    const actionMap = {
      activate: "activate",
      deactivate: "deactivate",
      reset: "reset",
      delete: "deactivate",
      invite: "invite",
    };

    saveAccount(actionMap[action] || action);
  };

  const provisionRequest = async () => {
    if (saving.current) return;

    if (!selectedRequest) {
      setFormError("No request was selected.");
      return;
    }

    saving.current = true;
    setFormError("");

    try {
      await system.mutate("accounts/", {
        action: "provision",
        values: {
          requestId: selectedRequest.id,
          name:
            selectedRequest.fullName ||
            selectedRequest.name ||
            "",
          email: selectedRequest.email || "",
          role: "ICT Personnel",
        },
      });

      closeModal();
    } catch (error) {
      setFormError(
        error?.message ||
          "Credential requesters are not automatically staff accounts. Please verify the request before provisioning."
      );
    } finally {
      saving.current = false;
    }
  };

  const filteredAccounts = accounts.filter((account) => {
    const search = searchTerm.toLowerCase().trim();

    const name = String(account?.name || "").toLowerCase();
    const username = String(account?.username || "").toLowerCase();
    const email = String(account?.email || "").toLowerCase();
    const id = String(account?.id || "").toLowerCase();
    const role = String(account?.role || "");
    const status = String(account?.status || "");

    const matchesSearch =
      !search ||
      name.includes(search) ||
      username.includes(search) ||
      email.includes(search) ||
      id.includes(search);

    const matchesStatus =
      statusFilter === "All" || status === statusFilter;

    const matchesRole =
      roleFilter === "All" || role === roleFilter;

    return matchesSearch && matchesStatus && matchesRole;
  });

  const pendingRequests = requests.filter(
    (request) =>
      normalizeRequestStatus(request?.status) !== "Provisioned"
  );

  const approvedRequests = pendingRequests.filter(
    (request) =>
      normalizeRequestStatus(request?.status) === "Approved"
  );

  const activeAccounts = accounts.filter(
    (account) => account?.status === "Active"
  ).length;

  const invitedAccounts = accounts.filter(
    (account) => account?.status === "Invited"
  ).length;

  const inactiveAccounts = accounts.filter(
    (account) => account?.status === "Inactive"
  ).length;

  const notificationsCount = approvedRequests.length;

  const handleNavigate = (path) => {
    setSidebarOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigate("/", { replace: true });
    } catch {
      // The shared session guard displays the retry screen on failure.
    }
  };

  const jumpTo = (section) => {
    const routes = {
      dashboard: "/ict-dashboard",
      access: "/ict-user-access",
      support: "/ict-technical-support",
      maintenance: "/ict-system-maintenance",
      protection: "/ict-data-protection",
      settings: "/ict-settings",
      health: "/ict-system-maintenance",
      infrastructure: "/ict-system-maintenance",
      security: "/ict-data-protection",
    };

    const target = routes[section];

    if (target) {
      handleNavigate(target);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Active":
        return "status-active";
      case "Invited":
        return "status-invited";
      case "Inactive":
        return "status-inactive";
      case "Pending":
        return "status-pending";
      case "Approved":
        return "status-approved";
      case "Provisioned":
        return "status-provisioned";
      case "Rejected":
        return "status-rejected";
      default:
        return "";
    }
  };

  const getInitial = (name) => {
    return String(name || "U").charAt(0).toUpperCase();
  };

  const getActionTitle = () => {
    switch (action) {
      case "delete":
        return "Deactivate Account";
      case "reset":
        return "Reset Access";
      case "activate":
        return "Activate Account";
      case "deactivate":
        return "Deactivate Account";
      case "invite":
        return "Invite Account";
      default:
        return "Manage Account";
    }
  };

  const getActionDescription = () => {
    switch (action) {
      case "delete":
        return "This will deactivate the account and remove its active access.";
      case "reset":
        return "Set a new password for this account.";
      case "activate":
        return "Restore this account's access to CredTrack.";
      case "deactivate":
        return "Temporarily disable this account's access.";
      case "invite":
        return "Create an invitation for this account.";
      default:
        return "Manage this account.";
    }
  };

  const getActionButtonText = () => {
    switch (action) {
      case "delete":
        return "Deactivate Account";
      case "reset":
        return "Reset Access";
      case "activate":
        return "Activate";
      case "deactivate":
        return "Deactivate";
      case "invite":
        return "Invite";
      default:
        return "Confirm";
    }
  };

  return (
    <div className="ict-dashboard ict-access-page ict-user-access-page">
      {sidebarOpen && (
        <button
          type="button"
          className="ict-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        id="ict-access-navigation"
        aria-label="ICT navigation"
        className={`principal-sidebar ${
          sidebarOpen ? "show" : ""
        }`}
      >
        <div className="principal-brand">
          <img
            src="/logo.png"
            alt="PMRMIS-SOUTH Logo"
            className="principal-brand-logo"
          />

          <div className="principal-brand-text">
            <strong>CredTrack</strong>
            <span>PMRMIS-SOUTH</span>
          </div>

          <button
            type="button"
            className="principal-mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <nav className="principal-nav">
          <button
            type="button"
            className="principal-nav-item"
            onClick={() => jumpTo("dashboard")}
          >
            <i className="fa-solid fa-chart-line" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="principal-nav-item active"
            aria-current="page"
            onClick={() => jumpTo("access")}
          >
            <i className="fa-solid fa-user-shield" />
            <span>User Access</span>
          </button>

          <button
            type="button"
            className="principal-nav-item"
            onClick={() => jumpTo("support")}
          >
            <i className="fa-solid fa-headset" />
            <span>Technical Support</span>
          </button>

          <button
            type="button"
            className="principal-nav-item"
            onClick={() => jumpTo("maintenance")}
          >
            <i className="fa-solid fa-screwdriver-wrench" />
            <span>System Maintenance</span>
          </button>

          <button
            type="button"
            className="principal-nav-item"
            onClick={() => jumpTo("protection")}
          >
            <i className="fa-solid fa-shield-halved" />
            <span>Data Protection</span>
          </button>

          <button
            type="button"
            className="principal-nav-item"
            onClick={() => jumpTo("settings")}
          >
            <i className="fa-solid fa-gear" />
            <span>Settings</span>
          </button>
        </nav>

        <div className="principal-sidebar-footer">
          <div className="ict-sidebar-footer-icon">
            <i className="fa-solid fa-server" />
          </div>

          <div>
            <strong>ICT Personnel</strong>
            <span>System Administrator</span>
          </div>
        </div>
      </aside>

      <main className="principal-shell">
        <header className="principal-topbar">
          <div className="principal-top-left">
            <button
              type="button"
              className="principal-menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              aria-expanded={sidebarOpen}
              aria-controls="ict-access-navigation"
            >
              <i className="fa-solid fa-bars" />
            </button>

            <img className="principal-school-seal" src="/logo.png" alt="" />
            <div className="principal-school">
              <strong>President Manuel Roxas Memorial Integrated School – South</strong>
              <span>Digital Credentials Management System</span>
            </div>
          </div>

          <div className="principal-top-right">
            <div className="principal-notification-wrapper">
              <button
                type="button"
                className="principal-bell"
                onClick={() =>
                  setNotificationsOpen((current) => !current)
                }
                aria-label="Notifications"
              >
                <i className="fa-regular fa-bell" />

                {notificationsCount > 0 && (
                  <span className="ict-notification-badge">
                    {notificationsCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="ict-dropdown ict-notification-dropdown">
                  <div className="ict-dropdown-heading">
                    <strong>Notifications</strong>
                    <span>{notificationsCount} pending</span>
                  </div>

                  {approvedRequests.length === 0 ? (
                    <div className="ict-empty-notification">
                      <i className="fa-regular fa-bell-slash" />
                      <p>No new notifications.</p>
                    </div>
                  ) : (
                    approvedRequests.slice(0, 5).map((request, index) => (
                      <button
                        type="button"
                        className="ict-notification-item"
                        key={request?.id ?? request?.email ?? index}
                        onClick={() => {
                          setSelectedRequest(request);
                          setNotificationsOpen(false);
                          setAction("provision");
                        }}
                      >
                        <div className="ict-notification-icon">
                          <i className="fa-solid fa-user-plus" />
                        </div>

                        <div>
                          <strong>Approved request</strong>

                          <span>
                            {request?.fullName ||
                              request?.name ||
                              "Requester"}{" "}
                            is ready for account provisioning.
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="principal-profile-wrapper">
              <button
                type="button"
                className="principal-profile"
                onClick={() =>
                  setProfileOpen((current) => !current)
                }
              >
                <div className="ict-profile-avatar">
                  <i className="fa-solid fa-user" />
                </div>

                <div className="profile-info">
                  <strong>ICT Personnel</strong>
                  <span>Administrator</span>
                </div>

                <i className="fa-solid fa-chevron-down" />
              </button>

              {profileOpen && (
                <div className="ict-dropdown ict-profile-dropdown">
                  <button
                    type="button"
                    onClick={() =>
                      handleNavigate("/ict-settings")
                    }
                  >
                    <i className="fa-solid fa-gear" />
                    Account Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                  >
                    <i className="fa-solid fa-right-from-bracket" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="ict-content">
          <div className="ict-page-heading">
            <div>
              <span className="ict-breadcrumb">
                ICT Personnel / User Access
              </span>

              <h1>User Access Management</h1>

              <p>
                Create, update, activate, and manage access
                for CredTrack users.
              </p>
            </div>

            <button
              type="button"
              className="ict-primary-button"
              onClick={openCreateAccount}
            >
              <i className="fa-solid fa-user-plus" />
              Create Account
            </button>
          </div>

          <div className="ict-metrics">
            <div className="ict-metric-card">
              <div className="ict-metric-icon">
                <i className="fa-solid fa-users" />
              </div>

              <div>
                <span>Total Accounts</span>
                <strong>{accounts.length}</strong>
              </div>
            </div>

            <div className="ict-metric-card">
              <div className="ict-metric-icon">
                <i className="fa-solid fa-user-check" />
              </div>

              <div>
                <span>Active Accounts</span>
                <strong>{activeAccounts}</strong>
              </div>
            </div>

            <div className="ict-metric-card">
              <div className="ict-metric-icon">
                <i className="fa-solid fa-envelope" />
              </div>

              <div>
                <span>Invited</span>
                <strong>{invitedAccounts}</strong>
              </div>
            </div>

            <div className="ict-metric-card">
              <div className="ict-metric-icon">
                <i className="fa-solid fa-user-slash" />
              </div>

              <div>
                <span>Inactive</span>
                <strong>{inactiveAccounts}</strong>
              </div>
            </div>
          </div>

          <section className="ict-panel">
            <div className="ict-panel-heading">
              <div>
                <h3>System Accounts</h3>
                <p>
                  View and manage registered CredTrack accounts.
                </p>
              </div>

              <div className="ict-panel-count">
                {filteredAccounts.length} account
                {filteredAccounts.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="ict-filter-row">
              <div className="ict-search-box">
                <i className="fa-solid fa-magnifying-glass" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(event.target.value)
                  }
                  placeholder="Search name, email, or account ID..."
                />
              </div>

              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value)
                }
              >
                <option value="All">All Roles</option>

                {roleOptions.map((role) => (
                  <option value={role} key={role}>
                    {role}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Invited">Invited</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="ict-table-wrapper">
              <table className="ict-access-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Sign-In</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="ict-table-empty">
                        <i className="fa-solid fa-user-slash" />
                        <strong>No accounts found</strong>
                        <span>
                          Try changing your search or filters.
                        </span>
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((account) => (
                      <tr key={account?.id || account?.username}>
                        <td>
                          <div className="ict-account-cell">
                            <div className="ict-account-avatar">
                              {getInitial(account?.name)}
                            </div>

                            <div>
                              <strong>
                                {account?.name || "Unnamed Account"}
                                {account?.username
                                  ? ` (${account.username})`
                                  : ""}
                              </strong>

                              <span>
                                {account?.email || "No email"}
                              </span>

                              <small>
                                {account?.id || "No account ID"}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="ict-role-badge">
                            {account?.role || "Unassigned"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`ict-status-badge ${getStatusClass(
                              account?.status
                            )}`}
                          >
                            <span className="ict-status-dot" />
                            {account?.status || "Unknown"}
                          </span>
                        </td>

                        <td>
                          <span className="ict-date-text">
                            {account?.lastSignIn || "Never"}
                          </span>
                        </td>

                        <td>
                          <span className="ict-date-text">
                            {account?.createdAt || "Not available"}
                          </span>
                        </td>

                        <td>
                          <div className="ict-action-buttons">
                            <button
                              type="button"
                              title="Edit account"
                              onClick={() =>
                                openEditAccount(account)
                              }
                            >
                              <i className="fa-solid fa-pen" />
                            </button>

                            {account?.status !== "Active" && (
                              <button
                                type="button"
                                title="Activate account"
                                onClick={() =>
                                  openAccessAction(
                                    account,
                                    "activate"
                                  )
                                }
                              >
                                <i className="fa-solid fa-user-check" />
                              </button>
                            )}

                            {account?.status === "Active" && (
                              <button
                                type="button"
                                title="Deactivate account"
                                onClick={() =>
                                  openAccessAction(
                                    account,
                                    "deactivate"
                                  )
                                }
                              >
                                <i className="fa-solid fa-user-slash" />
                              </button>
                            )}

                            <button
                              type="button"
                              title="Reset access"
                              onClick={() =>
                                openAccessAction(
                                  account,
                                  "reset"
                                )
                              }
                            >
                              <i className="fa-solid fa-key" />
                            </button>

                            <button
                              type="button"
                              title="Deactivate account"
                              className="danger"
                              onClick={() =>
                                openAccessAction(
                                  account,
                                  "delete"
                                )
                              }
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ict-panel ict-request-panel">
            <div className="ict-panel-heading">
              <div>
                <h3>Approved Access Requests</h3>
                <p>
                  Approved requests waiting for ICT account
                  provisioning.
                </p>
              </div>

              <span className="ict-request-count">
                {approvedRequests.length} pending
              </span>
            </div>

            {approvedRequests.length === 0 ? (
              <div className="ict-empty-state">
                <div className="ict-empty-icon">
                  <i className="fa-regular fa-circle-check" />
                </div>

                <h4>No approved requests</h4>

                <p>
                  There are currently no approved requests
                  waiting for account provisioning.
                </p>
              </div>
            ) : (
              <div className="ict-request-list">
                {approvedRequests.map((request) => (
                  <div
                    className="ict-request-card"
                    key={request?.id}
                  >
                    <div className="ict-request-main">
                      <div className="ict-request-avatar">
                        {getInitial(
                          request?.fullName || request?.name
                        )}
                      </div>

                      <div className="ict-request-info">
                        <div className="ict-request-title">
                          <strong>
                            {request?.fullName ||
                              request?.name ||
                              "Credential Requester"}
                          </strong>

                          <span className="ict-status-badge status-approved">
                            <span className="ict-status-dot" />
                            Approved
                          </span>
                        </div>

                        <p>
                          {request?.email || "No email provided"}
                        </p>

                        <div className="ict-request-meta">
                          <span>
                            <i className="fa-solid fa-id-card" />
                            {request?.id || "No request ID"}
                          </span>

                          <span>
                            <i className="fa-solid fa-file-lines" />
                            {request?.credential ||
                              "Credential Request"}
                          </span>

                          <span>
                            <i className="fa-regular fa-clock" />
                            {formatDateTime(
                              request?.createdAt ||
                                request?.submittedAt ||
                                request?.date
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="ict-secondary-button"
                      onClick={() => openProvision(request)}
                    >
                      <i className="fa-solid fa-user-plus" />
                      Provision Account
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="ict-information-panel">
            <div className="ict-information-icon">
              <i className="fa-solid fa-circle-info" />
            </div>

            <div>
              <h3>Access Management Reminder</h3>

              <p>
                ICT Personnel accounts should only be provided
                to authorized school personnel. Review account
                roles regularly and deactivate access when it
                is no longer required.
              </p>
            </div>
          </section>
        </section>
      </main>

      <dialog
        ref={dialogRef}
        className="ict-modal"
        onCancel={(event) => {
          event.preventDefault();
          closeModal();
        }}
      >
        {action === "create" && (
          <div className="ict-modal-content">
            <div className="ict-modal-header">
              <div>
                <span className="ict-modal-icon">
                  <i className="fa-solid fa-user-plus" />
                </span>

                <div>
                  <h3>Create Account</h3>
                  <p>Add a new CredTrack system account.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="ict-modal-body">
              {formError && (
                <div className="ict-form-error">
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>{formError}</span>
                </div>
              )}

              <label>
                Username
                <input
                  type="text"
                  autoComplete="off"
                  value={formValues.username}
                  onChange={(event) =>
                    updateFormValue(
                      "username",
                      event.target.value
                    )
                  }
                  placeholder="Enter username"
                />
              </label>

              <label>
                Initial Password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={formValues.password}
                  onChange={(event) =>
                    updateFormValue(
                      "password",
                      event.target.value
                    )
                  }
                  placeholder="Enter initial password"
                />
              </label>

              <label>
                Full Name
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(event) =>
                    updateFormValue("name", event.target.value)
                  }
                  placeholder="Enter full name"
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  value={formValues.email}
                  onChange={(event) =>
                    updateFormValue(
                      "email",
                      event.target.value
                    )
                  }
                  placeholder="name@pmrmis-south.edu.ph"
                />
              </label>

              <label>
                Role
                <select
                  value={formValues.role}
                  onChange={(event) =>
                    updateFormValue("role", event.target.value)
                  }
                >
                  <option value="">Select role</option>

                  {roleOptions.map((role) => (
                    <option value={role} key={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="ict-modal-footer">
              <button
                type="button"
                className="ict-cancel-button"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ict-primary-button"
                onClick={createAccount}
              >
                <i className="fa-solid fa-user-plus" />
                Create Account
              </button>
            </div>
          </div>
        )}

        {action === "edit" && selectedAccount && (
          <div className="ict-modal-content">
            <div className="ict-modal-header">
              <div>
                <span className="ict-modal-icon">
                  <i className="fa-solid fa-pen" />
                </span>

                <div>
                  <h3>Edit Account</h3>
                  <p>
                    Update account information and role.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="ict-modal-body">
              {formError && (
                <div className="ict-form-error">
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>{formError}</span>
                </div>
              )}

              <label>
                Username
                <input
                  type="text"
                  value={formValues.username}
                  disabled
                />
              </label>

              <label>
                Full Name
                <input
                  type="text"
                  value={formValues.name}
                  onChange={(event) =>
                    updateFormValue("name", event.target.value)
                  }
                />
              </label>

              <label>
                Email Address
                <input
                  type="email"
                  value={formValues.email}
                  disabled
                />
              </label>

              <label>
                Role
                <select
                  value={formValues.role}
                  onChange={(event) =>
                    updateFormValue("role", event.target.value)
                  }
                >
                  {roleOptions.map((role) => (
                    <option value={role} key={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="ict-modal-footer">
              <button
                type="button"
                className="ict-cancel-button"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ict-primary-button"
                onClick={updateAccount}
              >
                <i className="fa-solid fa-floppy-disk" />
                Save Changes
              </button>
            </div>
          </div>
        )}

        {[
          "invite",
          "activate",
          "deactivate",
          "reset",
          "delete",
        ].includes(action) &&
          selectedAccount && (
            <div className="ict-modal-content">
              <div className="ict-modal-header">
                <div>
                  <span
                    className={`ict-modal-icon ${
                      action === "delete" ||
                      action === "deactivate"
                        ? "danger-icon"
                        : ""
                    }`}
                  >
                    <i
                      className={
                        action === "delete" ||
                        action === "deactivate"
                          ? "fa-solid fa-user-slash"
                          : action === "reset"
                            ? "fa-solid fa-key"
                            : action === "activate"
                              ? "fa-solid fa-user-check"
                              : "fa-solid fa-envelope"
                      }
                    />
                  </span>

                  <div>
                    <h3>{getActionTitle()}</h3>
                    <p>{getActionDescription()}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>

              <div className="ict-modal-body">
                {formError && (
                  <div className="ict-form-error">
                    <i className="fa-solid fa-circle-exclamation" />
                    <span>{formError}</span>
                  </div>
                )}

                {action === "reset" && (
                  <label>
                    New Password
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={formValues.password}
                      onChange={(event) =>
                        updateFormValue(
                          "password",
                          event.target.value
                        )
                      }
                      placeholder="Enter new password"
                    />
                  </label>
                )}

                <div className="ict-confirm-account">
                  <div className="ict-account-avatar">
                    {getInitial(selectedAccount?.name)}
                  </div>

                  <div>
                    <strong>
                      {selectedAccount?.name ||
                        "Unnamed Account"}
                    </strong>

                    <span>
                      {selectedAccount?.email ||
                        "No email provided"}
                    </span>

                    <small>
                      {selectedAccount?.role ||
                        "Unassigned role"}
                    </small>
                  </div>
                </div>

                {action === "delete" ? (
                  <p className="ict-warning-text">
                    This account will be deactivated and will
                    no longer be able to access CredTrack.
                  </p>
                ) : (
                  <p className="ict-confirm-text">
                    Are you sure you want to{" "}
                    {action === "reset"
                      ? "reset access for"
                      : action === "activate"
                        ? "activate"
                        : action === "deactivate"
                          ? "deactivate"
                          : "invite"}{" "}
                    this account?
                  </p>
                )}
              </div>

              <div className="ict-modal-footer">
                <button
                  type="button"
                  className="ict-cancel-button"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={
                    action === "delete" ||
                    action === "deactivate"
                      ? "ict-danger-button"
                      : "ict-primary-button"
                  }
                  onClick={handleAccessAction}
                >
                  {getActionButtonText()}
                </button>
              </div>
            </div>
          )}

        {action === "provision" && selectedRequest && (
          <div className="ict-modal-content">
            <div className="ict-modal-header">
              <div>
                <span className="ict-modal-icon">
                  <i className="fa-solid fa-user-plus" />
                </span>

                <div>
                  <h3>Provision Account</h3>
                  <p>
                    Create an ICT Personnel account from
                    this approved request.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div className="ict-modal-body">
              {formError && (
                <div className="ict-form-error">
                  <i className="fa-solid fa-circle-exclamation" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="ict-provision-summary">
                <div className="ict-provision-row">
                  <span>Requester</span>
                  <strong>
                    {selectedRequest?.fullName ||
                      selectedRequest?.name ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="ict-provision-row">
                  <span>Email</span>
                  <strong>
                    {selectedRequest?.email || "Not provided"}
                  </strong>
                </div>

                <div className="ict-provision-row">
                  <span>Request ID</span>
                  <strong>
                    {selectedRequest?.id || "Not provided"}
                  </strong>
                </div>

                <div className="ict-provision-row">
                  <span>Credential</span>
                  <strong>
                    {selectedRequest?.credential ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="ict-provision-row">
                  <span>Role</span>
                  <strong>ICT Personnel</strong>
                </div>
              </div>

              <div className="ict-info-message">
                <i className="fa-solid fa-circle-info" />

                <span>
                  Provisioning will create an{" "}
                  <strong>Invited</strong> account. The user
                  can then complete the account setup process.
                </span>
              </div>
            </div>

            <div className="ict-modal-footer">
              <button
                type="button"
                className="ict-cancel-button"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="ict-primary-button"
                onClick={provisionRequest}
              >
                <i className="fa-solid fa-user-plus" />
                Provision Account
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

export default IctUserAccess;