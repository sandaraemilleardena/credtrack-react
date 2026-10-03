import { useRef, useState } from 'react';
import { usePortal } from '../hooks/PortalContext';

export default function IctQuickTools({ action, data, onAction, onClose }) {
  const system = usePortal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [selected, setSelected] = useState('');
  const saving = useRef(false);
  const accounts = (data.accounts || []).filter(a => /locked/i.test(a.status));
  const tickets = (data.tickets || []).filter(t => t.status !== 'Resolved');
  const ticket = tickets.find(t => t.id === selected);

  async function submit(event) {
    event.preventDefault();
    if (saving.current) return;
    if (!system || !onAction) { setError('Sign in to the ICT portal to save changes.'); return; }
    saving.current = true;
    setBusy(true); setError(''); setResult('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      let response;
      if (action === 'create') {
        response = await system.mutate('accounts/', { action: 'create', values });
      } else if (action === 'access') {
        response = await system.mutate('accounts/', { action: 'unlock', values });
      } else if (action === 'support') {
        response = await onAction('update-ticket', { ...values, version: ticket?.version });
      } else if (action === 'maintenance') {
        response = await onAction('schedule-maintenance', {
          ...values, startsAt: new Date(values.startsAt).toISOString(), duration: Number(values.duration),
        });
      } else if (action === 'health') {
        response = await onAction('run-diagnostics');
      }
      setResult(response?.message || 'Saved successfully.');
    } catch (e) { setError(e.message || 'Unable to complete this action.'); }
    finally { saving.current = false; setBusy(false); }
  }

  return <form onSubmit={submit}>
    <fieldset className="ix-fields" disabled={busy}>
      {action === 'create' && <>
        <label>Full name<input name="name" required maxLength={150} autoComplete="name" /></label>
        <label>Username<input name="username" required maxLength={150} autoComplete="off" /></label>
        <label>Registered email<input name="email" type="email" required maxLength={254} /></label>
        <label>Staff role<select name="role" required defaultValue="Administrator"><option>Administrator</option><option>Principal</option><option>ICT Personnel</option></select></label>
        <label>Initial password<input name="password" type="password" required minLength={10} maxLength={256} autoComplete="new-password" /></label>
        <p className="ix-hint">Use at least 10 characters. Share the initial password privately with the staff member.</p>
      </>}
      {action === 'access' && <>
        <label>Locked account<select name="id" required defaultValue=""><option value="" disabled>Select an account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.username}) · {a.status}</option>)}</select></label>
        <p className="ix-hint">Confirm the staff member’s identity first. Unlocking clears the failed-login counter and lock; the password stays the same. This action is recorded.</p>
        {!accounts.length && <p>No locked accounts in the latest snapshot.</p>}
      </>}
      {action === 'support' && <>
        <label>Support ticket<select name="id" required value={selected} onChange={e => setSelected(e.target.value)}><option value="" disabled>Select a ticket</option>{tickets.map(t => <option key={t.id} value={t.id}>{t.subject} · {t.priority} · {t.status}</option>)}</select></label>
        {ticket && <div className="ix-result"><strong>{ticket.requester}</strong><p>{ticket.description}</p></div>}
        <label>Status<select name="status" defaultValue="In progress"><option>Open</option><option>In progress</option><option>Waiting</option><option>Resolved</option></select></label>
        <label>Assigned to<input name="assignee" defaultValue={data.user?.name || ''} maxLength={150} /></label>
        <label>Work note<textarea name="note" required rows={3} maxLength={2000} placeholder="Record the investigation or resolution." /></label>
        {!tickets.length && <p>No open support tickets.</p>}
      </>}
      {action === 'maintenance' && <>
        <label>Task title<input name="title" required maxLength={200} /></label>
        <label>Owner<input name="owner" required defaultValue={data.user?.name || ''} maxLength={150} /></label>
        <label>Service<select name="service" required><option>All services</option>{(data.services || []).map(s => <option key={s.id}>{s.name}</option>)}</select></label>
        <div className="ix-form-grid"><label>Start time (your local time)<input name="startsAt" type="datetime-local" required /></label><label>Duration (minutes)<input name="duration" type="number" defaultValue={30} min={1} max={1440} required /></label></div>
        <label>Maintenance notes<textarea name="notes" rows={3} maxLength={2000} /></label>
        <p className="ix-hint">This records a maintenance plan. It does not take the website offline automatically.</p>
      </>}
      {action === 'health' && <>
        <p className="ix-hint">Run a fresh API and database connectivity check. Provider configuration does not confirm email or SMS delivery.</p>
        {(data.services || []).map(s => <div className="ix-result" key={s.id}><strong>{s.name} · {s.status}</strong><p>{s.detail}</p></div>)}
      </>}
      {action === 'protection' && <>
        {(data.controls || []).map(c => <div className="ix-result" key={c.id}><strong>{c.name} · {c.status}</strong><p>{c.detail}</p></div>)}
        <div className="ix-result"><strong>Latest backup: {data.backupStatus || 'Not reported'}</strong><p>{data.lastBackup || 'No verified backup completion is available.'}</p></div>
        <p className="ix-hint">Backup creation and recovery must be configured in the hosting environment. This dialog shows reported status.</p>
      </>}
    </fieldset>
    {error && <p role="alert" className="ix-tool-error">{error}</p>}
    {result && <p role="status" className="ix-result">{result}</p>}
    <div className="ix-modal-footer"><button type="button" className="ix-secondary" disabled={busy} onClick={onClose}>Close</button>{action !== 'protection' && <button className="ov-primary" disabled={busy || (action === 'access' && !accounts.length) || (action === 'support' && !ticket)}>{busy ? 'Saving…' : ({create:'Create account',access:'Confirm unlock',support:'Save ticket',maintenance:'Schedule maintenance',health:'Run diagnostics'})[action]}</button>}</div>
  </form>;
}
