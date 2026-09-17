
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdministrationLogin.css";

function AdministrationLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");

    if (!username.trim() || !password) {
      setError("Please enter your username and password.");
      return;
    }

    // DEMO ONLY
    // Replace this with Django authentication later.
    const administrationAccount = {
      username: "admin",
      password: "admin123",
    };

    const validUsername =
      username.trim() === administrationAccount.username;

    const validPassword =
      password === administrationAccount.password;

    if (!validUsername || !validPassword) {
      setError("Incorrect username or password.");
      return;
    }

    // Store temporary session information
    sessionStorage.setItem(
      "credtrackSession",
      JSON.stringify({
        role: "Administration",
        username: administrationAccount.username,
        signedInAt: new Date().toISOString(),
      })
    );

    setLoading(true);

    // Temporary dashboard navigation
    // We will replace this with your React Admin Dashboard later.
    setTimeout(() => {
      navigate("/admin-dashboard");
    }, 700);
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
          <div className="admin-divider" aria-hidden="true">
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
                {loading ? "Signing in..." : "Login"}
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
        </section>
      </main>
    </div>
  );
}

export default AdministrationLogin;

