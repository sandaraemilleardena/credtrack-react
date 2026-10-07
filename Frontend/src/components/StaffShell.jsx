import StaffIcon from './StaffIcon';
import SmsCredits from './SmsCredits';
import {useEffect,useRef,useState} from 'react';
import {NavLink, useNavigate} from 'react-router-dom';
import {usePortal} from '../hooks/PortalContext';
import {logoutUser} from '../auth/session';
import './StaffShell.css';

const labels={ADMIN:'Administration',PRINCIPAL:'Principal',TEACHER:'Teacher'};
const loginPaths={ADMIN:'/admin-login',PRINCIPAL:'/principal-login',TEACHER:'/teacher-login'};
const links = {
 TEACHER: [['Student Records','fa-user-graduate','/teacher-student-records'],['SF9 Gradebook','fa-book-open','/teacher-gradebook'],['SF9 Report Card','fa-file-lines','/teacher-sf9-report'],['Digital SF9','fa-user-graduate','/teacher-digital-sf9'],['Teacher’s Comments','fa-comment-dots','/teacher-comments']],
 ADMIN: [['Dashboard','fa-table-columns','/admin-dashboard'],['Requests / Credentials','fa-folder-open','/admin-credential-management'],['Student Records','fa-user-graduate','/admin-student-records'],['SF9 Gradebook','fa-book-open','/admin-sf9'],['Reports','fa-chart-line','/admin-reports'],['Activity Logs','fa-clock-rotate-left','/admin-activity-logs'],['Report an Issue','fa-circle-exclamation','/admin-report-issue'],['Settings','fa-gear','/admin-settings']],
 PRINCIPAL: [['Dashboard','fa-table-columns','/principal-dashboard'],['Requests / Credentials','fa-folder-open','/principal-requests'],['User Access','fa-users-gear','/principal-user-access'],['Reports','fa-chart-line','/principal-reports'],['Activity Logs','fa-clock-rotate-left','/principal-activity']],
};
export default function StaffShell({role,children}) {
 const system=usePortal(), navigate=useNavigate();
 const [mobile,setMobile]=useState(false),[panel,setPanel]=useState(''),[error,setError]=useState('');
 const toolsRef=useRef(null);
 useEffect(()=>{const close=e=>{if(e.type==='keydown'&&e.key==='Escape'){setPanel('');setMobile(false);}else if(e.type==='pointerdown'&&toolsRef.current&&!toolsRef.current.contains(e.target))setPanel('');};document.addEventListener('keydown',close);document.addEventListener('pointerdown',close);return()=>{document.removeEventListener('keydown',close);document.removeEventListener('pointerdown',close);};},[]);
 const user=system.data.user, rows=system.data.notifications || [];
 const unread=rows.filter(row=>!row.read_at).length;
 async function view(row) {
  setError('');
  try {await system.mutate(`notifications/${row.id}/read/`,{});setPanel('');if(row.request_id)navigate(`${role==='ADMIN'?'/admin-credential-management':'/principal-requests'}?request=${row.request_id}`);}
  catch(e){setError(e.message);}
 }
 async function logout(){try{await logoutUser();navigate(loginPaths[role],{replace:true});}catch(e){setError(e.message);}}
 return <div className="staff-shell">
  {mobile&&<button className="staff-backdrop" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
  <aside className={`staff-sidebar ${mobile?'staff-sidebar-open':''}`}>
   <div className="staff-brand"><img src="/logo.png" alt="School seal"/><div><strong>CredTrack</strong><small>PMRMIS–SOUTH</small></div></div>
   <p className="staff-role">{labels[role]}</p>
   <nav aria-label="Staff navigation">{links[role].map(([label,icon,path])=><NavLink key={path} to={path} onClick={()=>{setMobile(false);setPanel('');}}><StaffIcon name={icon}/>{label}</NavLink>)}</nav>
   <div className="staff-sidebar-footer">Access · Manage · Serve</div>
  </aside>
  <div className="staff-main"><header className="staff-topbar">
   <button className="staff-menu-button" aria-label="Open navigation" onClick={()=>setMobile(!mobile)}><StaffIcon name="fa-bars"/></button>
   <div className="staff-school"><img src="/logo.png" alt="School logo"/><div><strong>{system.data.settings.schoolName}</strong><small>{`${labels[role]} Portal`}</small></div></div>
   <div className="staff-tools" ref={toolsRef}>
    {role==='ADMIN'&&<SmsCredits/>}
    <button aria-label={`Notifications, ${unread} unread`} aria-expanded={panel==='notifications'} onClick={()=>setPanel(panel==='notifications'?'':'notifications')}><StaffIcon name="fa-bell"/>{unread>0&&<span className="staff-unread">{unread}</span>}</button>
    <button className="staff-profile-button" aria-expanded={panel==='profile'} onClick={()=>setPanel(panel==='profile'?'':'profile')}><span>{user.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</span><strong>{user.name}</strong><StaffIcon name="fa-chevron-down"/></button>
    {panel==='notifications'&&<section className="staff-dropdown staff-notifications" aria-label="Notifications">
     <div className="staff-notifications-header"><div><h2>Notifications</h2><p>{unread ? `${unread} unread notification${unread===1?'':'s'}` : 'You are all caught up'}</p></div><button type="button" className="staff-notifications-dismiss" aria-label="Close notifications" onClick={()=>setPanel('')}><StaffIcon name="fa-xmark"/></button></div>
     {rows.length===0?<div className="staff-notifications-empty"><StaffIcon name="fa-bell"/><strong>No notifications yet</strong><p>School activity updates will appear here.</p></div>:<div className="staff-notification-list">{rows.map(row=><button type="button" className={`staff-notification-item ${!row.read_at?'staff-notification-unread':''}`} key={row.id} onClick={()=>view(row)}><span className="staff-notification-symbol"><StaffIcon name="fa-bell"/></span><span className="staff-notification-content"><strong>{row.title}</strong><span className="staff-notification-message">{row.message}</span><span className="staff-notification-meta"><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}</time><span className={`staff-notification-state ${!row.read_at?'is-unread':''}`}>{row.read_at?'Read':'Unread'}</span></span></span>{!row.read_at&&<span className="staff-notification-dot" aria-hidden="true"/>}</button>)}</div>}
    </section>}
    {panel==='profile'&&<section className="staff-dropdown staff-profile staff-account-menu" aria-label="Account profile">
     <div className="staff-notifications-header"><div><h2>My account</h2><p>{labels[role]} portal</p></div></div>
     <div className="staff-account-identity"><span className="staff-account-avatar" aria-hidden="true">{user.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase()}</span><div><strong>{user.name}</strong><span className="staff-account-role">{role==='ADMIN'?'Administrator':labels[role]}</span></div></div>
     <dl className="staff-account-details"><div><dt>Username</dt><dd>{user.username}</dd></div><div><dt>Email address</dt><dd>{user.email||'No email address provided'}</dd></div></dl>
     <div className="staff-account-actions"><button type="button" className="staff-account-logout" onClick={logout}><StaffIcon name="fa-right-from-bracket"/><span>Logout</span></button></div>
    </section>}
   </div>
  </header>{error&&<p role="alert" className="staff-error">{error}</p>}<div className="staff-page">{children}</div></div>
 </div>;
}
