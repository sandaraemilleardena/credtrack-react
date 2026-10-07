import {renderToString} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {PortalContext} from '../src/hooks/PortalContext';
import StaffShell from '../src/components/StaffShell';
import {Sf9Editor} from '../src/components/Sf9Editor';
import PrincipalUserAccess from '../src/PrincipalUserAccess';
const record={id:1,version:0,name:'SF9 Test Learner',lrn:null,grade:'Grade 6',section:'SPJ',school_year:'2026-2027',general_average:null,subjects:[{id:1,name:'Mathematics',editable:true,terms:[null,null,null],final:null,status:'Incomplete'},{id:2,name:'English',editable:false,terms:[null,null,null],final:null,status:'Incomplete'}]};
export function smoke(){
 const results=[];
 const teacher=renderToString(<Sf9Editor record={record} role="TEACHER"/>);
 if((teacher.match(/ disabled=""/g)||[]).length!==6)throw Error('Teacher: only three assigned term inputs should be enabled; final grades remain read-only');
 if(!teacher.includes('Term 1')||!teacher.includes('Term 2')||!teacher.includes('Term 3')||!teacher.includes('Not yet assigned'))throw Error('SF9 term structure / blank LRN missing');
 results.push('SF9: assigned teacher term inputs editable; other subjects and finals disabled');
 const admin=renderToString(<Sf9Editor record={{...record,subjects:record.subjects.map(s=>({...s,editable:true}))}} role="ADMIN"/>);
 if((admin.match(/ disabled=""/g)||[]).length!==8)throw Error('Admin: all subject and final inputs must be read-only');
 results.push('SF9: admin read-only visibility across all subjects');
 const data={user:{id:'1',name:'Test Teacher',username:'teacher',email:''},settings:{schoolName:'Test School'},notifications:[],teacher_accounts:[]};
 const shell=renderToString(<MemoryRouter><PortalContext.Provider value={{data}}><StaffShell role="TEACHER"><Sf9Editor record={record} role="TEACHER"/></StaffShell></PortalContext.Provider></MemoryRouter>);
 if(!shell.includes('Teacher Portal')||shell.includes('Requests / Credentials'))throw Error('Teacher navigation must expose only teacher workspace');
 results.push('Teacher: shared shell and restricted navigation');
 const adminShell=renderToString(<MemoryRouter><PortalContext.Provider value={{data}}><StaffShell role="ADMIN"><div/></StaffShell></PortalContext.Provider></MemoryRouter>);
 if(!adminShell.includes('SF9 Gradebook')||adminShell.includes('Teacher Accounts'))throw Error('Administration navigation must include gradebook without teacher accounts');
 const access=renderToString(<MemoryRouter><PortalContext.Provider value={{data:{...data,accounts:[]}}}><PrincipalUserAccess role="PRINCIPAL"/></PortalContext.Provider></MemoryRouter>);
 if(!access.includes('User Access'))throw Error('Principal account management missing');
 results.push('Administration: SF9 sidebar; Principal: account management');
 return results;
}
