import {ictSnapshot} from '../api/portalData';
import {useNavigate} from 'react-router-dom';
import useSystemData from '../hooks/useSystemData';
import {PortalContext} from '../hooks/PortalContext';
import {logoutUser} from '../auth/session';
const routes={overview:'/ict-dashboard',dashboard:'/ict-dashboard',access:'/ict-user-access',support:'/ict-technical-support',maintenance:'/ict-system-maintenance',protection:'/ict-data-protection',settings:'/ict-settings',activity:'/ict-system-maintenance'};
export default function StaffPortal({role,component:Page}){
 const system=useSystemData(role),navigate=useNavigate();
 if(!system.data)return <div role="status" style={{padding:32}}>{system.error||'Loading your saved workspace…'} {system.error&&<><button onClick={system.refresh}>Retry</button> <button onClick={()=>navigate('/'+({ADMIN:'admin',PRINCIPAL:'principal',ICT:'ict'})[role]+'-login')}>Sign in</button></>}</div>;
 const d=system.data;
 const logout=async()=>{await logoutUser();navigate('/');};
 const onAction=async(type,values={})=>{
   if(type==='save-settings')return system.mutate('settings/',{settings:values.settings||values});
   if(type==='account'){navigate(routes.access);return;}
   if(type==='reset'){navigate(routes.access);return;}
   if(type==='maintenance'){navigate(routes.maintenance);return;}
   if(type==='backup'){navigate(routes.protection);return;}
   const item=[...(d.tasks||[]),...(d.tickets||[])].find(x=>x.id===values.id);
   return system.mutate('work/',{action:type,values:{...values,...(item?{version:item.version}:{})}});
 };
 const snapshot=role==='ICT'?ictSnapshot(d):undefined;
 return <PortalContext.Provider value={system}><Page snapshot={snapshot} onAction={onAction} onNavigate={id=>navigate(routes[id]||id)} onRunDiagnostics={()=>onAction('run-diagnostics')} onLogout={logout}/></PortalContext.Provider>;
}
