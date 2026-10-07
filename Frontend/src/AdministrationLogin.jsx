import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdministrationLogin.css";
import "./StaffLogin.css";

// Django session utility
import { loginUser } from "./auth/session";

function AdministrationLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    // --------------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------------

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);

    try {
      // ------------------------------------------------------
      // LOGIN THROUGH DJANGO
      // ------------------------------------------------------

      const data = await loginUser(
        username.trim(),
        password,
        "ADMIN"
      );

      // ------------------------------------------------------
      // CHECK DJANGO RESPONSE
      // ------------------------------------------------------

      if (!data.authenticated) {
        setError(
          data.error ||
          data.message ||
          "Login failed."
        );

        setLoading(false);
        return;
      }

      // ------------------------------------------------------
      // VERIFY THE ROLE RETURNED BY DJANGO
      // ------------------------------------------------------

      const userRole = String(
        data.user?.role || ""
      ).toUpperCase();

      if (
        userRole !== "ADMIN" &&
        userRole !== "ADMINISTRATION"
      ) {
        setError(
          "This account is not authorized for Administration."
        );

        setLoading(false);
        return;
      }

      // ------------------------------------------------------
      // LOGIN SUCCESSFUL
      //
      // Django now owns the authenticated session.
      // We do NOT store the password.
      // ------------------------------------------------------

      navigate("/admin-dashboard", {
        replace: true,
      });

    } catch (error) {
      console.error(
        "Administration login error:",
        error
      );

      setError(
        error.message ||
        "Unable to connect to the server. Please make sure the Django backend is running."
      );

      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="admin-login-page">
      <div className="admin-top-bar"></div>

      <main className="admin-login-main">
        <section
          className="admin-login-card"
          aria-labelledby="admin-login-title"
        >
          <div className="staff-login-branding">
          {/* LOGO */}
          <img
            className="admin-logo"
            src="/logo.png"
            alt="PMRMIS-South school seal"
          />

          {/* SCHOOL NAME */}
          <h1 className="admin-school-name">
            President Manuel Roxas Memorial
            <br />
            Integrated School – South
          </h1>

          {/* DIVIDER */}
          <div
            className="admin-divider"
            aria-hidden="true"
          >
            <span></span>
            <i>★</i>
            <span></span>
          </div>

          {/* ROLE BANNER */}
          <div className="admin-role-banner">
            <i
              className="fa-solid fa-building-columns"
              aria-hidden="true"
            ></i>

            <h2 id="admin-login-title">
              ADMINISTRATION
            </h2>
          </div>

          <p className="staff-login-brand-note">Access · Manage · Serve</p></div>
          <div className="staff-login-content"><div className="staff-login-welcome"><span>STAFF PORTAL</span><h2>Welcome back</h2><p>Sign in to your Administration account.</p></div>
          {/* LOGIN FORM */}
          <form
            className="admin-login-form"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* USERNAME */}
            <div className="admin-field">
              <i
                className="fa-regular fa-user"
                aria-hidden="true"
              ></i>

              <label htmlFor="admin-username">
                Username
              </label>

              <input
                id="admin-username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                required
              />
            </div>

            {/* PASSWORD */}
            <div className="admin-field">
              <i
                className="fa-solid fa-lock"
                aria-hidden="true"
              ></i>

              <label htmlFor="admin-password">
                Password
              </label>

              <input
                id="admin-password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                required
              />

              <button
                className="admin-toggle-password"
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                <i
                  className={
                    showPassword
                      ? "fa-regular fa-eye"
                      : "fa-regular fa-eye-slash"
                  }
                  aria-hidden="true"
                ></i>
              </button>
            </div>

            {/* FORGOT PASSWORD */}
            <div className="admin-forgot-row">
              <button
                type="button"
                className="admin-forgot-link"
                onClick={() =>
                  navigate("/forgot-password")
                }
              >
                Forgot password?
              </button>
            </div>

            {/* ERROR */}
            {error && (
              <div
                className="admin-error show"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* LOGIN BUTTON */}
            <button
              className="admin-login-button"
              type="submit"
              disabled={loading}
            >
              <i
                className={
                  loading
                    ? "fa-solid fa-spinner fa-spin"
                    : "fa-solid fa-right-to-bracket"
                }
                aria-hidden="true"
              ></i>

              <span>
                {loading
                  ? "Signing in..."
                  : "Login"}
              </span>
            </button>
          </form>

          {/* BACK */}
          <button
            type="button"
            className="admin-back-link"
            onClick={handleBack}
          >
            <i
              className="fa-solid fa-arrow-left"
              aria-hidden="true"
            ></i>

            Back to Role Selection
          </button>

          {/* SECURITY */}
          <div className="admin-security">
            <i
              className="fa-solid fa-shield-halved"
              aria-hidden="true"
            ></i>

            <span>
              Secure role-based access
            </span>
          </div>

          {/* FOOTER */}
          <footer className="admin-footer">
            © 2026 PMRMIS–South
          </footer>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdministrationLogin;