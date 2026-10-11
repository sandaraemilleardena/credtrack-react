import {useRef, useState} from 'react';
import {operation} from '../api/operations';

export default function SchoolPinDialog({onClose, onSaved}) {
  const [values, setValues] = useState({current_pin:'', new_pin:'', confirm_pin:''});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function save(event) {
    event.preventDefault();
    if (lock.current) return;
    if (values.new_pin !== values.confirm_pin) {setError('The new PIN and confirmation do not match.'); return;}
    lock.current = true; setBusy(true); setError('');
    try {
      await operation('school-pin/change/', values);
      onSaved('School PIN changed successfully. Use the new PIN on the first page.');
    } catch (error) {setError(error.message);}
    finally {lock.current = false; setBusy(false);}
  }
  return <dialog className="request-review-modal staff-account-dialog" aria-labelledby="school-pin-change-title" ref={element=>{if(element&&!element.open)element.showModal();}} onCancel={event=>{event.preventDefault(); if(!busy)onClose();}}>
    <form className="staff-panel issue-form staff-account-form" onSubmit={save}>
      <header className="staff-account-dialog-header"><h2 id="school-pin-change-title">Change School PIN</h2></header>
      <div className="staff-account-dialog-body">
        <p>Update the four-digit PIN used to open school staff sign-in from the first page.</p>
        {Object.entries({current_pin:'Current PIN', new_pin:'New PIN', confirm_pin:'Confirm new PIN'}).map(([key,label])=><label key={key}>{label}<input type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete="off" required disabled={busy} value={values[key]} onChange={event=>{setValues(previous=>({...previous,[key]:event.target.value.replace(/\D/g,'').slice(0,4)}));setError('');}}/></label>)}
        {error&&<p role="alert">{error}</p>}
      </div>
      <footer className="staff-account-dialog-footer"><button type="submit" className="staff-account-confirm" disabled={busy}>{busy?'Saving…':'Save PIN'}</button><button type="button" className="staff-account-cancel" disabled={busy} onClick={onClose}>Cancel</button></footer>
    </form>
  </dialog>;
}
