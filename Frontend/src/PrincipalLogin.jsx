import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PrincipalLogin.css";

function PrincipalLogin() {
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
    const principalAccount = {
      username: "principal",
      password: "principal123",
    };

    const validUsername =
      username.trim() === principalAccount.username;

    const validPassword =
      password === principalAccount.password;

    if (!validUsername || !validPassword) {
      setError("Incorrect username or password.");
      return;
    }

    sessionStorage.setItem(
      "credtrackSession",
      JSON.stringify({
        role: "Principal",
        username: principalAccount.username,
        signedInAt: new Date().toISOString(),
      })
    );

    setLoading(true);

    // Temporary dashboard navigation
    setTimeout(() => {
      navigate("/principal-dashboard");
    }, 700);
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
                className="principal-toggle-password"
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
            {error && (
              <div
                className="principal-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* LOGIN BUTTON */}
            <button
              className="principal-login-button"
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

          {/* FOOTER */}
          <footer className="principal-footer">
            © 2026 PMRMIS–South
          </footer>
        </section>
      </main>
    </div>
  );
}

export default PrincipalLogin;