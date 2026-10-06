// Development-only visual fixture; no production route or authentication bypass.
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {PortalContext} from '../src/hooks/PortalContext';
import StaffShell from '../src/components/StaffShell';
import AdministrationDashboard from '../src/AdministrationDashboard';
import PrincipalDashboard from '../src/PrincipalDashboard';
import PrincipalUserAccess from '../src/PrincipalUserAccess';
import WorkflowSupport from '../src/components/WorkflowSupport';
import RequestQueue from '../src/components/RequestQueue';
const data={user:{id:'1',username:'fixture',name:'Visual test',email:'visual@example.test',role:'Administrator'},requests:[],students:[],audit:[],accounts:[],notifications:[],statistics:{total:0,pending:0,approved:0,released:0},settings:{schoolName:'PMRMIS–South'},settings_version:0,updatedAt:new Date().toISOString()};
const name=new URLSearchParams(location.search).get('page'),role=['principal','access'].includes(name)?'PRINCIPAL':'ADMIN',Page=({admin:AdministrationDashboard,principal:PrincipalDashboard,access:PrincipalUserAccess,issues:WorkflowSupport,requests:RequestQueue})[name]||AdministrationDashboard;
createRoot(document.getElementById('root')).render(<BrowserRouter><PortalContext.Provider value={{data,refresh:async()=>data,mutate:async()=>{throw Error('Visual fixture: changes are disabled.');}}}><StaffShell role={role}><Page role={role}/></StaffShell></PortalContext.Provider></BrowserRouter>);
