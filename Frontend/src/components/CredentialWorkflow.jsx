import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { actOnCredential, fetchCredentialQueue } from "../api/credentials";
import ReleaseSmsForm from './ReleaseSmsForm';
import { logoutUser } from "../auth/session";
import "./CredentialWorkflow.css";

const ACTIONS = {
  ADMIN: {
    SUBMITTED: [["prepare", "Start preparation"], ["unavailable", "Unavailable / needs information"]],
    PREPARING: [["submit_review", "Prepared — send to Principal"], ["unavailable", "Unavailable / needs information"]],
    UNAVAILABLE: [["prepare", "Resume preparation"]],
    RETURNED: [["prepare", "Correct and prepare again"], ["unavailable", "Unavailable / needs information"]],
    PRINCIPAL_APPROVED: [["ready", "Confirm ready for release & queue SMS"]],
    READY: [["collect", "Record collection"]],
  },
  PRINCIPAL: { PRINCIPAL_REVIEW: [["approve", "Approve credentials"], ["return", "Return to Admin for correction"]] },
};

const LABELS = {
  SUBMITTED: "Submitted", PREPARING: "Preparing", UNAVAILABLE: "Unavailable / needs information",
  PRINCIPAL_REVIEW: "Principal review", RETURNED: "Returned for correction",
  PRINCIPAL_APPROVED: "Principal approved", READY: "Ready for release", COLLECTED: "Collected",
};
const SMS_LABELS = {
  QUEUED: "Queued — not sent", SENDING: "Sending — awaiting provider response",
  ACCEPTED: "Accepted by Semaphore", FAILED: "Failed — staff attention needed",
  UNKNOWN: "Uncertain — check Semaphore before retrying",
  CANCELLED: "Not sent — already collected",
};
const displayDate = value => new Date(value).toLocaleString();

export function CredentialInbox({ role }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try { const next = await fetchCredentialQueue(); if (active) { setData(next); setError(""); } }
      catch (e) { if (active) setError(e.message); }
    };
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  const permitted = data?.role === role;
  const count = permitted ? data.requests.filter(item => ACTIONS[role]?.[item.status]?.length).length : 0;
  return <section className="cw-inbox" aria-label="Live credential inbox">
    <div><strong>Live credential workflow</strong><p>{error || (!data ? "Loading requests…" : !permitted ? "Sign in with the correct staff role." : `${count} request(s) need your action.`)}</p></div>
    <Link to={role === "ADMIN" ? "/admin-credential-management" : "/principal-approvals"}>Open {role === "ADMIN" ? "credential requests" : "approval queue"} →</Link>
  </section>;
}

export default function CredentialWorkflow({ role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ACTION");
  const [selectedId, setSelectedId] = useState(new URLSearchParams(location.search).get("request"));
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(null);
  const [schedule,setSchedule]=useState({release_date:'',release_time:''});
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    try {
      const next = await fetchCredentialQueue();
      if (current === generation.current) { setData(next); setError(""); }
    } catch (e) { if (current === generation.current) setError(e.message); }
  }, []);
  useEffect(() => {
    const requestGeneration = generation;
    const initialLoad = setTimeout(refresh, 0);
    const timer = setInterval(() => { if (!lock.current) refresh(); }, 15000);
    return () => { clearTimeout(initialLoad); clearInterval(timer); requestGeneration.current++; };
  }, [refresh]);

  const authorized = data?.role === role;
  const requests = authorized ? data.requests : [];
  const selected = requests.find(item => item.id === selectedId);
  const available = item => ACTIONS[role]?.[item.status] || [];
  const filtered = requests.filter(item =>
    (filter === "ALL" || (filter === "ACTION" ? available(item).length > 0 : item.status === filter)) &&
    `${item.id} ${item.full_name} ${item.lrn} ${item.credential}`.toLowerCase().includes(search.toLowerCase())
  );
  const open = item => { setSelectedId(item.id); setSchedule({release_date:'',release_time:''}); setNote(""); setPending(null); setSuccess(""); };
  const confirm = async () => {
    if (!selected || !pending || lock.current) return;
    if(pending[0]==='ready' && (!schedule.release_date || !schedule.release_time)){setError('Enter the release date and time before confirming.');return;}
    lock.current = true; setBusy(true); setError(""); setSuccess(""); generation.current++;
    try {
      const updated = await actOnCredential(selected, pending[0], note, pending[0] === "ready" ? schedule : {});
      setData(previous => ({ ...previous, requests: previous.requests.map(item => item.id === updated.id ? updated : item) }));
      setSuccess(`Request updated: ${updated.status_label}.`);
      setPending(null); setNote("");
    } catch (e) {
      const message = e.message;
      await refresh();
      setError(message);
      setPending(null);
    } finally { lock.current = false; setBusy(false); }
  };

  return <div className="cw-page">
    <aside className="cw-nav"><img src="/logo.png" alt="School seal"/><h1>CredTrack</h1><p>PMRMIS – SOUTH</p>
      <strong>{role === "ADMIN" ? "Administration" : "Principal"}</strong>
      <Link to={role === "ADMIN" ? "/admin-dashboard" : "/principal-dashboard"}>Dashboard</Link>
      <Link className="cw-active" to={role === "ADMIN" ? "/admin-credential-management" : "/principal-approvals"}>{role === "ADMIN" ? "Credential Management" : "Credential Approvals"}</Link>
      <button onClick={async () => { await logoutUser(); navigate(role === "ADMIN" ? "/admin-login" : "/principal-login", { replace: true }); }}>Sign out</button>
    </aside>
    <main className="cw-main">
      <header><span className="cw-eyebrow">CREDENTIAL REQUEST WORKFLOW</span><h2>{role === "ADMIN" ? "Prepare, verify and release" : "Review prepared credentials"}</h2>
        <p>{role === "ADMIN" ? "Check availability and prepare each credential before sending it to the Principal. Confirm release only after approval." : "Review the Administrator’s preparation notes. Approve the credential or return it with correction details."}</p></header>
      <ol className="cw-steps"><li>Submitted</li><li>Admin preparation</li><li>Principal approval</li><li>Admin release + SMS</li><li>Collected</li></ol>
      {error && <div className="cw-error" role="alert">{error} {!data && <Link to={role === "ADMIN" ? "/admin-login" : "/principal-login"}>Sign in to continue</Link>}</div>}
      {success && <div className="cw-success" role="status">{success}</div>}
      {data && !authorized && <div className="cw-error" role="alert">This page requires the {role} role. <Link to={role === "ADMIN" ? "/admin-login" : "/principal-login"}>Sign in</Link></div>}
      {authorized && !data.sms_enabled && role === "ADMIN" && <div className="cw-notice">Semaphore approval is pending. Release notifications are saved in the SMS queue; no text messages are being sent yet.</div>}
      <div className="cw-tools"><input aria-label="Search requests" placeholder="Search name, LRN or request ID" value={search} onChange={e => setSearch(e.target.value)}/>
        <select aria-label="Filter by stage" value={filter} onChange={e => setFilter(e.target.value)}><option value="ACTION">Needs my action</option><option value="ALL">All requests</option>{Object.entries(LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select>
        <button onClick={refresh} disabled={busy}>Refresh</button></div>
      {!data && !error && <p role="status">Loading requests…</p>}
      <div className="cw-table-wrap"><table><thead><tr><th>Requester</th><th>Credential</th><th>Stage</th><th>SMS</th><th>Action</th></tr></thead>
        <tbody>{filtered.map(item => <tr key={item.id}><td><strong>{item.full_name}</strong><small>{item.requester_type} · {item.lrn}</small><small>{displayDate(item.created_at)}</small></td><td>{item.credential}</td><td><span className={`cw-badge cw-${item.status}`}>{item.status_label}</span></td><td>{item.sms ? SMS_LABELS[item.sms.status] || item.sms.status : "Not queued"}</td><td><button onClick={() => open(item)}>View request</button></td></tr>)}</tbody></table>
        {authorized && filtered.length === 0 && <p className="cw-empty">No requests match this view.</p>}</div>
      {selected && <section className="cw-detail" aria-label="Request details">
        <div className="cw-detail-heading"><div><span className="cw-eyebrow">{selected.status_label}</span><h3>{selected.full_name} — {selected.credential}</h3></div><button disabled={busy} onClick={() => setSelectedId(null)}>Close details</button></div>
        <dl><dt>Request ID</dt><dd>{selected.reference || selected.id}</dd><dt>Requester</dt><dd>{selected.requester_type} · LRN {selected.lrn}</dd><dt>Grade / graduation</dt><dd>{selected.requester_type === "Student" ? `${selected.grade_level} · ${selected.section}` : selected.graduation_year}</dd><dt>Contact</dt><dd>{selected.phone} {selected.email}</dd><dt>Purpose</dt><dd>{selected.purpose}</dd><dt>Additional details</dt><dd>{selected.additional_details || "None"}</dd><dt>Prepared by</dt><dd>{selected.prepared_by || "Not yet prepared"}</dd><dt>Principal approval</dt><dd>{selected.approved_by ? `${selected.approved_by} · ${displayDate(selected.approved_at)}` : "Not yet approved"}</dd></dl>
        {selected.sms && <div className="cw-notice"><strong>SMS: {SMS_LABELS[selected.sms.status] || selected.sms.status}</strong><p>{selected.sms.last_error || `Provider status: ${selected.sms.provider_status || "Awaiting dispatch"}. Provider acceptance does not confirm handset delivery.`}</p></div>}
        {available(selected).length > 0 && <><label className="cw-note">Verification / decision notes<textarea value={note} disabled={busy} onChange={e => setNote(e.target.value)} maxLength={2000} placeholder="Record availability checks, preparation details, corrections or collection proof."/></label>
          <div className="cw-actions">{available(selected).map(action => <button disabled={busy} key={action[0]} onClick={() => setPending(action)}>{action[1]}</button>)}</div></>}
        {pending?.[0] === "ready" && <ReleaseSmsForm request={selected} schedule={schedule} onChange={setSchedule} disabled={busy} smsEnabled={data.sms_enabled}/>}
        {pending && <div className="cw-confirm" role="group" aria-label="Confirm workflow action"><strong>{pending[1]}?</strong><p>{pending[0] === "ready" ? "Confirm that the approved credentials are available for collection. This queues one SMS to the requester." : pending[0] === "submit_review" ? "Confirm you checked availability and prepared the credentials. Include your verification details above." : "This decision will be saved in the request’s history."}</p><button disabled={busy} onClick={confirm}>{busy ? "Saving…" : "Confirm"}</button><button disabled={busy} onClick={() => setPending(null)}>Cancel</button></div>}
        <h4>Request history</h4><ol className="cw-history">{selected.events.map((event, index) => <li key={index}><strong>{LABELS[event.to_status]} · {event.actor || "Requester"}</strong><small>{displayDate(event.created_at)}</small>{event.note && <p>{event.note}</p>}</li>)}</ol>
      </section>}
    </main>
  </div>;
}
