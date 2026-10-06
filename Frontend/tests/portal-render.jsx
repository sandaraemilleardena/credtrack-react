import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {PortalContext} from '../src/hooks/PortalContext';
import StaffShell from '../src/components/StaffShell';
import AdministrationDashboard from '../src/AdministrationDashboard';
import AdministrationStudRecord from '../src/AdministrationStudRecord';
import AdministrationReports from '../src/AdministrationReports';
import AdministrationActLogs from '../src/AdministrationActLogs';
import AdministrationSettings from '../src/AdministrationSettings';
import PrincipalDashboard from '../src/PrincipalDashboard';
import PrincipalReports from '../src/PrincipalReports';
import PrincipalActivity from '../src/PrincipalActivity';
import PrincipalUserAccess from '../src/PrincipalUserAccess';
import RequestQueue from '../src/components/RequestQueue';
import WorkflowSupport from '../src/components/WorkflowSupport';
export function smoke(){
 const now=new Date().toISOString(),base={user:{id:'1',username:'staff',name:'Test staff',email:'staff@example.test',role:'Administrator'},requests:[],students:[],audit:[],accounts:[],notifications:[],statistics:{total:0,pending:0,approved:0,released:0},settings:{schoolName:'Test school'},settings_version:0,updatedAt:now};
 const request={reference:'CT-TEST-00001',id:'11111111-1111-4111-8111-111111111111',full_name:'Render Test',lrn:'123456789012',credential:'SF10',grade_level:'Grade 10',section:'Test',status:'PENDING',status_label:'Pending',created_at:now,events:[{action:'submitted',actor:'Requester',created_at:now,note:'Submitted',to_status:'PENDING'}],version:0};
 const pages={AdministrationDashboard,AdministrationStudRecord,AdministrationReports,AdministrationActLogs,AdministrationSettings,PrincipalDashboard,PrincipalReports,PrincipalActivity,PrincipalUserAccess,RequestQueue,WorkflowSupport},results=[];
 for(const populated of [false,true])for(const [name,Page] of Object.entries(pages)){
  const role=name.startsWith('Principal')?'PRINCIPAL':'ADMIN';
  const data=populated?{...base,requests:[request],students:[{id:1,lrn:request.lrn,firstName:'Render',lastName:'Test',middleName:'',grade:'Grade 10',section:'Test',sex:'Male',status:'Active',availableCredentials:['SF10']}],accounts:[{id:'1',username:'staff',name:'Test staff',email:'staff@example.test',role:'Administrator',status:'Active'}],statistics:{...base.statistics,total:1,pending:1},notifications:[{id:1,title:'New request',message:'A new request was received.',created_at:now,read_at:null}]}:base;
  const html=renderToString(<MemoryRouter><PortalContext.Provider value={{data,refresh:async()=>data,mutate:async()=>({})}}><StaffShell role={role}><Page role={role}/></StaffShell></PortalContext.Provider></MemoryRouter>);
  if((html.match(/class="staff-sidebar /g)||[]).length!==1||(html.match(/class="staff-topbar"/g)||[]).length!==1)throw Error(name+' must use one shared navigation shell');
  if(html.includes('NaN')||html.includes('ICT Personnel'))throw Error(name+' rendered obsolete or invalid content');
  results.push(name+': '+(populated?'populated':'empty')+' passed');
 }
 return results;
}
