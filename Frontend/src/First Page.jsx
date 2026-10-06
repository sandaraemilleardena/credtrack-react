import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSchoolEntry, unlockSchoolEntry } from "./auth/schoolEntry";
import "./First Page.css";

export default function FirstPage() {
  const navigate = useNavigate();
  const [showPin, setShowPin] = useState(false);
  const pinDialog = useRef(null);
  useEffect(() => {
    if (showPin) pinDialog.current?.showModal();
    else pinDialog.current?.close();
  }, [showPin]);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  function submitPin(event) {
    event.preventDefault();
    if (!unlockSchoolEntry(pin)) { setError("Incorrect PIN. Enter the four-digit school PIN."); return; }
    navigate("/login/school");
  }
  return <main className="first-page">
    <section className="first-card" aria-labelledby="first-title">
      <img className="first-logo" src="/logo.png" alt="PMRMIS South" />
      <p className="first-eyebrow">PMRMIS SOUTH · SCHOOL RECORDS</p>
      <h1 id="first-title">Welcome to <span>CredTrack</span></h1>
      <p className="first-description">Choose how you would like to continue.</p>
      <div className="first-choices">
        <button className="first-choice" onClick={() => { clearSchoolEntry(); setShowPin(true); }}>
          <span className="first-icon" aria-hidden="true">🏫</span><strong>SCHOOL ADMINISTRATION</strong>
          <span>Administration and Principal</span><small>PIN required <b aria-hidden="true">→</b></small>
        </button>
        <button className="first-choice" onClick={() => { clearSchoolEntry(); navigate("/login/public"); }}>
          <span className="first-icon" aria-hidden="true">🎓</span><strong>STUDENT / ALUMNI</strong>
          <span>Request your school credentials</span><small>Public access <b aria-hidden="true">→</b></small>
        </button>
      </div>
      <p className="first-footer">Access · Manage · Serve</p>
    </section>
    <dialog ref={pinDialog} className="first-pin-dialog" aria-labelledby="pin-dialog-title" aria-describedby="pin-dialog-description" onCancel={() => { setShowPin(false); setPin(""); setError(""); }}>
      <form className="first-pin-form" onSubmit={submitPin}>
        <h2 id="pin-dialog-title">School access</h2><p id="pin-dialog-description">Enter your four-digit PIN to continue.</p>
        <label htmlFor="school-pin">Enter a PIN</label>
        <input id="school-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} minLength={4} autoComplete="off" autoFocus required value={pin} onChange={event => { setPin(event.target.value.replace(/\D/g, "").slice(0, 4)); setError(""); }} aria-invalid={!!error} aria-describedby={error ? "pin-error" : undefined} />
        {error && <p id="pin-error" className="first-error" role="alert">{error}</p>}
        <button className="first-submit" type="submit">Continue to school login →</button>
        <button className="first-back" type="button" onClick={() => { setShowPin(false); setPin(""); setError(""); }}>← Back to role selection</button>
      </form>
    </dialog>
  </main>;
}
