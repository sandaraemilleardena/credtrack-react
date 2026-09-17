import { useNavigate } from "react-router-dom";
import "./login.css";

function Login() {
  const navigate = useNavigate();

  const handleRole = (role) => {
    switch (role) {
      case "PRINCIPAL":
        navigate("/principal-login");
        break;

      case "ADMIN":
        navigate("/admin-login");
        break;

      case "ICT":
        navigate("/ict-login");
        break;

      case "STUDENT":
        navigate("/student-request");
        break;

      case "ALUMNI":
        navigate("/alumni-request");
        break;

      default:
        break;
    }
  };

  return (
    <div className="landing-page">

      {/* Decorative Background */}
      <div className="corner corner-top-left"></div>
      <div className="corner corner-bottom-right"></div>

      {/* Faded School Seal */}
      <img
        src="/logo.png"
        alt=""
        className="background-seal"
      />

      {/* School Building Background */}
      <div className="school-background"></div>

      {/* Main Content */}
      <main className="landing-content">

        {/* Header */}
        <section className="system-header">

          <img
            src="/logo.png"
            alt="PMRMIS South Logo"
            className="school-logo"
          />

          <h1>PMRMIS - SOUTH</h1>

          <h2>SCHOOL RECORDS MANAGEMENT SYSTEM</h2>

          <div className="tagline">
            <span></span>
            <em>Access</em>
            <b>•</b>
            <em>Manage</em>
            <b>•</b>
            <em>Serve</em>
            <span></span>
          </div>

        </section>

        {/* Role Buttons */}
        <section className="role-menu">

          <button
            type="button"
            className="role-button"
            onClick={() => handleRole("PRINCIPAL")}
          >
            <span className="role-icon principal-icon">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3L4 7v2h16V7l-8-4zm-6 8v8H4v2h16v-2h-2v-8h-2v8h-2v-8h-2v8h-2v-8H6z"
                />
              </svg>
            </span>

            <span className="role-divider"></span>

            <span className="role-name">
              Principal
            </span>

            <span className="role-arrow">
              ›
            </span>
          </button>


          <button
            type="button"
            className="role-button"
            onClick={() => handleRole("ADMIN")}
          >
            <span className="role-icon">
              <svg viewBox="0 0 24 24">
                <path
                  d="M19.43 12.98c.04-.32.07-.65.07-.98s-.02-.66-.07-.98l2.11-1.65-2-3.46-2.49 1c-.52-.4-1.08-.73-1.69-.98L15 3h-4l-.37 2.53c-.61.25-1.17.59-1.69.98l-2.49-1-2 3.46 2.11 1.65c-.04.32-.08.65-.08.98s.03.66.08.98l-2.11 1.65 2 3.46 2.49-1c.52.4 1.08.73 1.69.98L11 21h4l.37-2.53c.61-.25 1.17-.58 1.69-.98l2.49 1 2-3.46-2.12-1.65zM13 16h-2v-4h2v4zm0-6h-2V8h2v2z"
                />
              </svg>
            </span>

            <span className="role-divider"></span>

            <span className="role-name">
              Administration
            </span>

            <span className="role-arrow">
              ›
            </span>
          </button>


          <button
            type="button"
            className="role-button"
            onClick={() => handleRole("ICT")}
          >
            <span className="role-icon">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4 5h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2h-5v2h3v2H6v-2h3v-2H4c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2zm0 2v10h16V7H4z"
                />
              </svg>
            </span>

            <span className="role-divider"></span>

            <span className="role-name">
              ICT Personnel
            </span>

            <span className="role-arrow">
              ›
            </span>
          </button>


          <button
            type="button"
            className="role-button"
            onClick={() => handleRole("STUDENT")}
          >
            <span className="role-icon">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3L1 9l4 2.18v6.1c0 .72.39 1.39 1.01 1.75C7.72 20.01 9.78 21 12 21s4.28-.99 5.99-1.97A2 2 0 0019 17.28v-6.1L21 10v6h2V9L12 3zm5 14.28C15.6 18.06 13.82 19 12 19s-3.6-.94-5-1.72v-5.04l5 2.76 5-2.76v5.04z"
                />
              </svg>
            </span>

            <span className="role-divider"></span>

            <span className="role-name">
              Students
            </span>

            <span className="role-arrow">
              ›
            </span>
          </button>


          <button
            type="button"
            className="role-button"
            onClick={() => handleRole("ALUMNI")}
          >
            <span className="role-icon">
              <svg viewBox="0 0 24 24">
                <path
                  d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm8 2c-2 0-6 1-6 3v3h12v-3c0-2-4-3-6-3zM8 13c-2.33 0-7 1.17-7 3.5V19h7v-3c0-1.17.53-2.23 1.43-3.04C9.74 13.36 8.86 13 8 13z"
                />
              </svg>
            </span>

            <span className="role-divider"></span>

            <span className="role-name">
              Alumni
            </span>

            <span className="role-arrow">
              ›
            </span>
          </button>

        </section>

        {/* Bottom Quote */}
        <div className="bottom-message">
          <p>Education Builds</p>
          <p>a Brighter Future</p>
          <span></span>
        </div>

      </main>

    </div>
  );
}

export default Login; 