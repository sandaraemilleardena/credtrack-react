import { useState } from "react";
import { loginUser } from "./auth/session.js";
import { useNavigate } from "react-router-dom";
import "./IctLogin.css";

function IctLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await loginUser(username.trim(), password, "ICT");

      if (data.authenticated !== true) {
        setError(data.error || "Unable to establish a login session.");
        return;
      }

      if (String(data.user?.role || "").toUpperCase() !== "ICT") {
        setError("This account is not authorized for ICT.");
        return;
      }

      navigate("/ict-dashboard", { replace: true });
    } catch (error) {
      setError(error.message || "Unable to connect to the login server.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="ict-login-page">

      {/* TOP BAR */}
      <div className="ict-top-bar"></div>

      <main className="ict-login-main">
        <section
          className="ict-login-card"
          aria-labelledby="ict-login-title"
        >

          {/* LOGO */}
          <img
            className="ict-logo"
            src="/logo.png"
            alt="PMRMIS-South school seal"
          />

          {/* SCHOOL NAME */}
          <h1 className="ict-school-name">
            PRESIDENT MANUEL ROXAS MEMORIAL
            <br />
            INTEGRATED SCHOOL – SOUTH
          </h1>

          {/* DIVIDER */}
          <div
            className="ict-divider"
            aria-hidden="true"
          >
            <span></span>
            <i>★</i>
            <span></span>
          </div>

          {/* ROLE BANNER */}
          <div className="ict-role-banner">
            <i
              className="fa-solid fa-user-tie"
              aria-hidden="true"
            ></i>

            <h2 id="ict-login-title">
              ICT
            </h2>
          </div>

          {/* LOGIN FORM */}
          <form
            className="ict-login-form"
            onSubmit={handleSubmit}
            noValidate
          >

            {/* USERNAME */}
            <div className="ict-field">
              <i
                className="fa-regular fa-user"
                aria-hidden="true"
              ></i>

              <label htmlFor="ict-username">
                Username
              </label>

              <input
                id="ict-username"
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
            <div className="ict-field">
              <i
                className="fa-solid fa-lock"
                aria-hidden="true"
              ></i>

              <label htmlFor="ict-password">
                Password
              </label>

              <input
                id="ict-password"
                name="password"
                type={showPassword ? "text" : "password"}
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
                className="ict-toggle-password"
                type="button"
                onClick={() =>
                  setShowPassword((prev) => !prev)
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
            <div className="ict-forgot-row">
              <button
                type="button"
                className="ict-forgot-link"
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
                className="ict-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* LOGIN BUTTON */}
            <button
              className="ict-login-button"
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
                {loading ? "Signing in..." : "Login"}
              </span>
            </button>

          </form>

          {/* BACK TO ROLE SELECTION */}
          <button
            type="button"
            className="ict-back-link"
            onClick={handleBack}
          >
            <i
              className="fa-solid fa-arrow-left"
              aria-hidden="true"
            ></i>

            Back to Role Selection
          </button>

          {/* SECURITY */}
          <div className="ict-security">
            <i
              className="fa-solid fa-shield-halved"
              aria-hidden="true"
            ></i>

            <span>
              Secure role-based access
            </span>
          </div>

          {/* FOOTER */}
          <footer className="ict-footer">
            © 2026 PMRMIS–South
          </footer>

        </section>
      </main>
    </div>
  );
}

export default IctLogin;
