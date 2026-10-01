// Development-only visual fixture. Not an application entry or authentication bypass.
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {PortalContext} from '../src/hooks/PortalContext';
import {ictSnapshot} from '../src/api/portalData';
import AdministrationDashboard from '../src/AdministrationDashboard';
import PrincipalDashboard from '../src/PrincipalDashboard';
import IctDashboard from '../src/IctDashboard';
import IctSystemMaintenance from '../src/IctSystemMaintenance';
import IctSettings from '../src/IctSettings';
const data={user:{name:'Visual test',email:'visual@example.test'},requests:[],students:[],audit:[],tickets:[],tasks:[],accounts:[],services:[],settings:{schoolName:'PMRMIS–South'},preferences:{},sessions:[],settings_version:0,updatedAt:new Date().toISOString()};
const Page=({admin:AdministrationDashboard,principal:PrincipalDashboard,ict:IctDashboard,maintenance:IctSystemMaintenance,settings:IctSettings})[new URLSearchParams(location.search).get('page')]||AdministrationDashboard;
createRoot(document.getElementById('root')).render(<BrowserRouter><PortalContext.Provider value={{data,refresh:async()=>data,mutate:async()=>{throw Error('Visual fixture: changes are disabled.');}}}><Page snapshot={ictSnapshot(data)} onAction={async()=>{throw Error('Visual fixture: changes are disabled.');}} onNavigate={()=>{}}/></PortalContext.Provider></BrowserRouter>);
