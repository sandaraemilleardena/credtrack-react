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
import RequestReviewModal from '../src/components/RequestReviewModal';
export function ReviewPreview(){return <RequestReviewModal request={{id:'preview-request',reference:'CT-2026-00005',version:0,status:'PRINCIPAL_REVIEW',status_label:'Awaiting principal approval',created_at:'2026-09-29T03:01:52Z',full_name:'Example Student',first_name:'Example',last_name:'Student',lrn:'123456789001',credential:'SF10 Permanent Record',purpose:'Transfer',grade_level:'Grade 10',section:'Example',phone:'Not provided',email:'student@example.test',confirmed_at:'2026-09-30T03:00:00Z',prepared_by:'Example Administrator',events:[]}} role="PRINCIPAL" onClose={()=>{}} onUpdated={async()=>null}/>;}
const data={user:{name:'Visual test',email:'visual@example.test'},requests:[],students:[],audit:[],tickets:[],tasks:[],accounts:[],services:[],settings:{schoolName:'PMRMIS–South'},preferences:{},sessions:[],settings_version:0,updatedAt:new Date().toISOString()};
const Page=({admin:AdministrationDashboard,principal:PrincipalDashboard,ict:IctDashboard,maintenance:IctSystemMaintenance,settings:IctSettings,review:ReviewPreview})[new URLSearchParams(location.search).get('page')]||AdministrationDashboard;
createRoot(document.getElementById('root')).render(<BrowserRouter><PortalContext.Provider value={{data,refresh:async()=>data,mutate:async()=>{throw Error('Visual fixture: changes are disabled.');}}}><Page snapshot={ictSnapshot(data)} onAction={async()=>{throw Error('Visual fixture: changes are disabled.');}} onNavigate={()=>{}}/></PortalContext.Provider></BrowserRouter>);
