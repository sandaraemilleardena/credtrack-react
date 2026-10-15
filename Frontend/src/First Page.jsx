
import { useNavigate } from "react-router-dom";

import "./First Page.css";

export default function FirstPage() {
  const navigate = useNavigate();
  return <main className="first-page">
    <section className="first-card" aria-labelledby="first-title">
      <img className="first-logo" src="/logo.png" alt="PMRMIS South" />
      <p className="first-eyebrow">PMRMIS SOUTH · SCHOOL RECORDS</p>
      <h1 id="first-title">Welcome to <span>CredTrack</span></h1>
      <p className="first-description">Choose how you would like to continue.</p>
      <div className="first-choices">
        <button className="first-choice" onClick={() => navigate("/login/school")}>
          <span className="first-icon" aria-hidden="true">🏫</span><strong>SCHOOL ADMINISTRATION</strong>
          <span>Administration, Principal and Teachers</span><small>Staff sign in <b aria-hidden="true">→</b></small>
        </button>
        <button className="first-choice" onClick={() => navigate("/login/public")}>
          <span className="first-icon" aria-hidden="true">🎓</span><strong>STUDENT / ALUMNI</strong>
          <span>Request your school credentials</span><small>Public access <b aria-hidden="true">→</b></small>
        </button>
      </div>
      <p className="first-footer">Access · Manage · Serve</p>
    </section>

  </main>;
}
