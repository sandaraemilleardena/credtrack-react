import useLoginLockout from "./auth/useLoginLockout";
import { useState } from "react";
import { loginUser } from "./auth/session.js";
import { useNavigate } from "react-router-dom";
import "./PrincipalLogin.css";

function PrincipalLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const lockout = useLoginLockout(username);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || lockout.blocked) return;
    if (loading) return;
    setError("");

    if (!username.trim() || !password) {
      setFieldErrors({ username: !username.trim(), password: !password });
      document.getElementById(!username.trim() ? 'principal-username' : 'principal-password')?.focus();
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const data = await loginUser(username.trim(), password, "PRINCIPAL");

      if (data.authenticated !== true) {
        setError(data.error || "Unable to establish a login session.");
        return;
      }

      if (String(data.user?.role || "").toUpperCase() !== "PRINCIPAL") {
        setError("This account is not authorized for Principal.");
        return;
      }

      navigate("/principal-dashboard", { replace: true });
    } catch (error) {
      lockout.recordFailure(error);
      setError(error.message || "Unable to connect to the login server.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="principal-login-page">

      {/* TOP BAR */}
      <div className="principal-top-bar"></div>

      <main className="principal-login-main">
        <section
          className="principal-login-card"
          aria-labelledby="principal-login-title"
        >

          {/* LOGO */}
          <img
            className="principal-logo"
            src="/logo.png"
            alt="PMRMIS-South school seal"
          />

          {/* SCHOOL NAME */}
          <h1 className="principal-school-name">
            PRESIDENT MANUEL ROXAS MEMORIAL
            <br />
            INTEGRATED SCHOOL – SOUTH
          </h1>

          {/* DIVIDER */}
          <div
            className="principal-divider"
            aria-hidden="true"
          >
            <span></span>
            <i>★</i>
            <span></span>
          </div>

          {/* ROLE BANNER */}
          <div className="principal-role-banner">
            <i
              className="fa-solid fa-user-tie"
              aria-hidden="true"
            ></i>

            <h2 id="principal-login-title">
              PRINCIPAL
            </h2>
          </div>

          {/* LOGIN FORM */}
          <form
            className="principal-login-form"
            onSubmit={handleSubmit}
            noValidate
          >

            {/* USERNAME */}
            <div className="principal-field">
              <i
                className="fa-regular fa-user"
                aria-hidden="true"
              ></i>

              <label htmlFor="principal-username">
                Username
              </label>

              <input
                id="principal-username"
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={fieldErrors.username ? 'principal-username-error' : undefined}
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setFieldErrors(previous => ({ ...previous, username: false }));
                  setError("");
                }}
                required
              />
            </div>
            {fieldErrors.username && <small className="login-field-warning" id="principal-username-error" role="alert">This field is required.</small>}

            {/* PASSWORD */}
            <div className="principal-field">
              <i
                className="fa-solid fa-lock"
                aria-hidden="true"
              ></i>

              <label htmlFor="principal-password">
                Password
              </label>

              <input
                id="principal-password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'principal-password-error' : undefined}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors(previous => ({ ...previous, password: false }));
                  setError("");
                }}
                required
              />

              <button
                className="principal-toggle-password"
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
            {fieldErrors.password && <small className="login-field-warning" id="principal-password-error" role="alert">This field is required.</small>}

            {/* FORGOT PASSWORD */}
            <div className="principal-forgot-row">
              <button
                type="button"
                className="principal-forgot-link"
                onClick={() =>
                  navigate("/forgot-password")
                }
              >
                Forgot password?
              </button>
            </div>

            {/* ERROR */}
            {error && !lockout.message && (
              <div
                className="principal-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* LOGIN BUTTON */}
            {lockout.message && <p className="login-lockout-notice" role="status" aria-live="polite">{lockout.message}</p>}

            <button
              className="principal-login-button"
              type="submit"
              disabled={loading || lockout.blocked}
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
                {loading ? "Signing in..." : lockout.buttonText}
              </span>
            </button>

          </form>

          {/* BACK TO ROLE SELECTION */}
          <button
            type="button"
            className="principal-back-link"
            onClick={handleBack}
          >
            <i
              className="fa-solid fa-arrow-left"
              aria-hidden="true"
            ></i>

            Back to Role Selection
          </button>

          {/* SECURITY */}
          <div className="principal-security">
            <i
              className="fa-solid fa-shield-halved"
              aria-hidden="true"
            ></i>

            <span>
              Secure role-based access
            </span>
          </div>


        </section>
      </main>
    </div>
  );
}

export default PrincipalLogin; 
