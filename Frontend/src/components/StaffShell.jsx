import EditProfile from './EditProfile';
import ThemeToggle from './ThemeToggle';
import {operation} from '../api/operations';
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
 TEACHER: [['Student Records','fa-user-graduate','/teacher-student-records'],['Digital SF9','fa-user-graduate','/teacher-digital-sf9'],['Digital SF2 / Attendance','fa-calendar','/teacher-sf2'],["Teacher’s Comment",'fa-comment-dots','/teacher-comments'],['SF9 Gradebook','fa-book-open','/teacher-gradebook'],['SF9 Report Card','fa-file-lines','/teacher-sf9-report']],
 ADMIN: [['Dashboard','fa-table-columns','/admin-dashboard'],['Requests / Credentials','fa-folder-open','/admin-credential-management'],['Student Records','fa-user-graduate','/admin-student-records'],['SF9 Report Card','fa-file-lines','/admin-sf9'],['SF10 Permanent Record','fa-folder-open','/admin-sf10'],['Reports','fa-chart-line','/admin-reports'],['Activity Logs','fa-clock-rotate-left','/admin-activity-logs'],['Report an Issue','fa-circle-exclamation','/admin-report-issue'],['Settings','fa-gear','/admin-settings']],
 PRINCIPAL: [['Dashboard','fa-table-columns','/principal-dashboard'],['Requests / Credentials','fa-folder-open','/principal-requests'],['User Access','fa-users-gear','/principal-user-access'],['Reports','fa-chart-line','/principal-reports'],['Activity Logs','fa-clock-rotate-left','/principal-activity']],
};
export default function StaffShell({role,children}) {
 const system=usePortal(), navigate=useNavigate();
 const [mobile,setMobile]=useState(false),[panel,setPanel]=useState(''),[error,setError]=useState('');
 const toolsRef=useRef(null);
 const [recordsOpen,setRecordsOpen]=useState(false);
 const [editingProfile,setEditingProfile]=useState(false),[profileMessage,setProfileMessage]=useState('');
 function closeNavigation(){setRecordsOpen(false);setMobile(false);setPanel('');}
 const [catalog,setCatalog]=useState(null),[catalogError,setCatalogError]=useState('');
 const menuSections=catalog?.current_sections||catalog?.sections||[];
 useEffect(()=>{if(role==='TEACHER')operation('sf9/catalog/').then(setCatalog).catch(e=>setCatalogError(e.message));},[role]);
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
   <nav aria-label="Staff navigation">{links[role].map(([label,icon,path])=>role==='TEACHER'&&path==='/teacher-student-records'?<details key={path} className="sf9-class-menu student-records-menu" open={recordsOpen}><summary onClick={e=>{e.preventDefault();setRecordsOpen(value=>!value);}}><StaffIcon name={icon}/>{label}</summary><NavLink to={path} end onClick={closeNavigation}>All assigned students</NavLink>{menuSections.map(section=>{const name=section.name,gradeName=catalog.grade_levels.find(g=>g.id===section.grade_level_id)?.name||'';const assigned=[{section:section.id,grade_name:gradeName,school_year:catalog.school_years.find(y=>y.name===catalog.current_school_year)?.id,school_year_name:catalog.current_school_year}];return <div key={section.id}>{assigned.length?assigned.map(a=><NavLink key={`${a.section}:${a.school_year||''}`} to={`${path}?section=${a.section}${a.school_year?`&year=${a.school_year}`:''}`} onClick={closeNavigation}><span>{gradeName} {name}</span><small>{a.grade_name}{a.school_year_name?` · ${a.school_year_name}`:''}</small></NavLink>):<span className="student-section-unassigned"><span>{gradeName} {name}</span><small>Not assigned to your account</small></span>}</div>;})}{catalogError&&<small role="alert">{catalogError}</small>}</details>:<NavLink key={path} to={path} onClick={closeNavigation}><StaffIcon name={icon}/>{label}</NavLink>)}</nav>
   <div className="staff-sidebar-footer">Access · Manage · Serve</div>
  </aside>
  <div className="staff-main"><header className="staff-topbar">
   <button className="staff-menu-button" aria-label="Open navigation" onClick={()=>setMobile(!mobile)}><StaffIcon name="fa-bars"/></button>
   <div className="staff-school"><img src="/logo.png" alt="School logo"/><div><strong>{system.data.settings.schoolName}</strong><small>{`${labels[role]} Portal`}</small></div></div>
   <div className="staff-tools" ref={toolsRef}>
    <ThemeToggle/>
    {role==='ADMIN'&&<SmsCredits/>}
    <button aria-label={`Notifications, ${unread} unread`} aria-expanded={panel==='notifications'} onClick={()=>setPanel(panel==='notifications'?'':'notifications')}><StaffIcon name="fa-bell"/>{unread>0&&<span className="staff-unread">{unread}</span>}</button>
    <button className="staff-profile-button" aria-expanded={panel==='profile'} onClick={()=>setPanel(panel==='profile'?'':'profile')}><span className="staff-header-avatar">{user.profile_photo?<img src={user.profile_photo} alt=""/>:user.name.split(' ').map(n=>n[0]).slice(0,2).join('')}</span><strong>{user.name}</strong><StaffIcon name="fa-chevron-down"/></button>
    {panel==='notifications'&&<section className="staff-dropdown staff-notifications" aria-label="Notifications">
     <div className="staff-notifications-header"><div><h2>Notifications</h2><p>{unread ? `${unread} unread notification${unread===1?'':'s'}` : 'You are all caught up'}</p></div><button type="button" className="staff-notifications-dismiss" aria-label="Close notifications" onClick={()=>setPanel('')}><StaffIcon name="fa-xmark"/></button></div>
     {rows.length===0?<div className="staff-notifications-empty"><StaffIcon name="fa-bell"/><strong>No notifications yet</strong><p>School activity updates will appear here.</p></div>:<div className="staff-notification-list">{rows.map(row=><button type="button" className={`staff-notification-item ${!row.read_at?'staff-notification-unread':''}`} key={row.id} onClick={()=>view(row)}><span className="staff-notification-symbol"><StaffIcon name="fa-bell"/></span><span className="staff-notification-content"><strong>{row.title}</strong><span className="staff-notification-message">{row.message}</span><span className="staff-notification-meta"><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})}</time><span className={`staff-notification-state ${!row.read_at?'is-unread':''}`}>{row.read_at?'Read':'Unread'}</span></span></span>{!row.read_at&&<span className="staff-notification-dot" aria-hidden="true"/>}</button>)}</div>}
    </section>}
    {panel==='profile'&&<section className="staff-dropdown staff-profile staff-account-menu" aria-label="Account profile">
     <div className="staff-notifications-header"><div><h2>My account</h2><p>{labels[role]} portal</p></div></div>
     <div className="staff-account-identity"><span className="staff-account-avatar" aria-hidden="true">{user.profile_photo?<img src={user.profile_photo} alt=""/>:user.name.split(' ').filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase()}</span><div><strong>{user.name}</strong><span className="staff-account-role">{role==='ADMIN'?'Administrator':labels[role]}</span></div></div>
     <dl className="staff-account-details"><div><dt>Username</dt><dd>{user.username}</dd></div><div><dt>Email address</dt><dd>{user.email||'No email address provided'}</dd></div></dl>
     <div className="staff-account-actions"><button type="button" className="staff-account-edit" onClick={()=>{setPanel('sms-profile-edit');setEditingProfile(true);setProfileMessage('');}}>Edit Profile</button><button type="button" className="staff-account-logout" onClick={logout}><StaffIcon name="fa-right-from-bracket"/><span>Logout</span></button></div>
    </section>}
   </div>
  </header>{editingProfile&&<EditProfile user={user} onClose={()=>setEditingProfile(false)} onSaved={async()=>{await system.refresh();setEditingProfile(false);setPanel('');setProfileMessage('Your profile has been updated.');}}/>}{profileMessage&&<p role="status" className="sf9-success">{profileMessage}</p>}{error&&<p role="alert" className="staff-error">{error}</p>}<div className="staff-page">{children}</div></div>
 </div>;
}
