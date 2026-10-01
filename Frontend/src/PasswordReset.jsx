import {useRef,useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {API_BASE_URL} from './api/config';
import {getCsrfToken} from './auth/session';
import './AdministrationLogin.css';
import "./EntryTheme.css";
import EntryBrand from './EntryBrand';
export default function PasswordReset() {
  const {uid, token} = useParams();
  const reset = Boolean(uid && token);
  const submitLock = useRef(false);
  const [fields,setFields] = useState({});
  const [values, setValues] = useState({username:'', email:'', password:'', confirm_password:''});
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const change = event => {setValues({...values, [event.target.name]:event.target.value});setFields(previous=>({...previous,[event.target.name]:''}));};
  async function submit(event) {
    event.preventDefault(); if(submitLock.current) return; setError('');
    const next = {};
    for (const name of reset ? ['password','confirm_password'] : ['username','email']) {
      if (!values[name].trim()) next[name] = 'This question is required.';
    }
    if (!reset && values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'Enter a valid email address.';
    setFields(next);
    if (Object.keys(next).length) {document.getElementById(Object.keys(next)[0])?.focus();return;}
    if(reset && values.password !== values.confirm_password) {setError('Passwords do not match.'); return;}
    if(reset && values.password.length < 10) {setError('Use at least 10 characters.'); return;}
    submitLock.current=true; setBusy(true);
    try {
      const csrf = await getCsrfToken();
      const response = await fetch(`${API_BASE_URL}/api/auth/${reset?'reset-password':'forgot-password'}/`, {method:'POST', credentials:'include', headers:{'Content-Type':'application/json','X-CSRFToken':csrf}, body:JSON.stringify(reset?{uid,token,password:values.password,confirm_password:values.confirm_password}:{username:values.username,email:values.email})});
      const data = await response.json(); if(!response.ok) throw new Error(data.error || 'Please try again.');
      setMessage(data.message); setValues({username:'',email:'',password:'',confirm_password:''});
    } catch(e) {setError(e.message);} finally {submitLock.current=false;setBusy(false);}
  }
  return <div className="admin-login-page entry-page recovery-page"><main className="admin-login-main"><section className="admin-login-card entry-card">
    <EntryBrand/><h1 className="entry-banner">{reset?'Change Password':'Forgot Password?'}</h1>
    {!reset && <p>Enter your username and registered email. We will send a one-hour reset link to that email.</p>}
    {error && <p role="alert">{error}</p>}{message ? <p role="status">{message}</p> : <form className="admin-login-form" noValidate onSubmit={submit}>
      {(reset ? [['password','New Password','password'],['confirm_password','Confirm New Password','password']] : [['username','Username','text'],['email','Registered Email','email']]).map(([name,label,type]) => <div className="admin-field" key={name}><i className={reset?'fa-solid fa-lock':name==='email'?'fa-regular fa-envelope':'fa-regular fa-user'} aria-hidden="true"/><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} placeholder={reset ? "Enter your new password" : name === "email" ? "Enter your registered email" : "Enter your username"} required aria-invalid={Boolean(fields[name])} aria-describedby={fields[name]?name+'-error':undefined} maxLength={name.includes('password')?256:name==='username'?150:254} autoComplete={reset?'new-password':name==='email'?'email':'username'} value={values[name]} onChange={change}/>{fields[name] && <small id={name+'-error'} role="alert" style={{color:'#b42318'}}>{fields[name]}</small>}</div>)}
      {reset && <p>Use at least 10 characters. Avoid common, numeric-only passwords and personal information.</p>}
      <button className="admin-login-button" disabled={busy}>{busy?'Submitting…':reset?'Change Password':'Send reset link'}</button></form>}
    <Link className="admin-forgot-link" to="/" style={{display:'inline-block',marginTop:16}}>← Back to Role Selection</Link>
    <p className="entry-footer"><i className="fa-solid fa-shield-halved" aria-hidden="true"/> Secure account recovery</p>
  </section></main></div>;
}
