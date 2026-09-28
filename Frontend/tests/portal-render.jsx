import React from 'react';
import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {PortalContext} from '../src/hooks/PortalContext';
import {ictSnapshot} from '../src/api/portalData';
import AdministrationDashboard from '../src/AdministrationDashboard';
import AdministrationStudRecord from '../src/AdministrationStudRecord';
import AdministrationReports from '../src/AdministrationReports';
import AdministrationActLogs from '../src/AdministrationActLogs';
import AdministrationSettings from '../src/AdministrationSettings';
import PrincipalDashboard from '../src/PrincipalDashboard';
import PrincipalReports from '../src/PrincipalReports';
import PrincipalActivity from '../src/PrincipalActivity';
import IctDashboard from '../src/IctDashboard';
import IctUserAccess from '../src/IctUserAccess';
import IctTechnicalSupport from '../src/IctTechnicalSupport';
import IctSystemMaintenance from '../src/IctSystemMaintenance';
import IctDataProtection from '../src/IctDataProtection';
import IctSettings from '../src/IctSettings';

export function smoke(){
 const now=new Date().toISOString();
 const base={user:{name:'Test staff',email:'staff@example.test'},requests:[],students:[],audit:[],tickets:[],tasks:[],accounts:[],services:[],settings:{schoolName:'Test school'},preferences:{},sessions:[],settings_version:0,updatedAt:now};
 const request={id:'11111111-1111-4111-8111-111111111111',full_name:'Render Test',lrn:'123456789012',credential:'SF10',grade_level:'Grade 10',section:'Test',status:'PRINCIPAL_REVIEW',status_label:'Awaiting Principal',created_at:now,events:[{action:'submit_review',actor:'Test admin',created_at:now,note:'Verified',to_status:'PRINCIPAL_REVIEW'}],version:2};
 const pages={AdministrationDashboard,AdministrationStudRecord,AdministrationReports,AdministrationActLogs,AdministrationSettings,PrincipalDashboard,PrincipalReports,PrincipalActivity,IctDashboard,IctUserAccess,IctTechnicalSupport,IctSystemMaintenance,IctDataProtection,IctSettings};
 const results=[];
 for(const populated of [false,true])for(const [name,Page] of Object.entries(pages)){
  const data=populated?{...base,requests:[request],students:[{id:1,lrn:request.lrn,firstName:'Render',lastName:'Test',middleName:'',grade:'Grade 10',section:'Test',sex:'Male',status:'Active',availableCredentials:['SF10']}],accounts:[{id:'1',username:'test-staff',name:'Test staff',email:'staff@example.test',role:'ICT Personnel',status:'Active'}]}:base;
  const portal={data,refresh:async()=>data,mutate:async()=>({})};
  const html=renderToString(<MemoryRouter><PortalContext.Provider value={portal}><Page snapshot={ictSnapshot(data)} onAction={async()=>{}} onNavigate={()=>{}} onLogout={async()=>{}}/></PortalContext.Provider></MemoryRouter>);
  if(!html.includes('<aside')||!html.includes('<header'))throw Error(name+' lost its original navigation shell');
  if(html.includes('NaN'))throw Error(name+' rendered an invalid metric');
  results.push(name+': '+(populated?'populated':'empty')+' passed');
 }
 return results;
}
