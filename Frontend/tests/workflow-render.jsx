import {renderToString} from 'react-dom/server';
import RequestReviewModal from '../src/components/RequestReviewModal';
import Sf10Preview, {Sf10Record} from '../src/components/Sf10Preview';
export function smoke() {
 const base={id:'test-request',reference:'CT-2026-00001',version:0,status:'SUBMITTED',status_label:'Pending Administration Verification',created_at:'2026-09-29T00:00:00Z',events:[],full_name:'Test Student',credential:'SF10',has_verification_document:true};
 const results=[];
 for(const [status,role,expected] of [['SUBMITTED','ADMIN','Confirm Student Information'],['PRINCIPAL_REVIEW','PRINCIPAL','Approve'],['PRINCIPAL_APPROVED','ADMIN','STUDENT INFORMATION APPROVED'],['REJECTED','PRINCIPAL','Request Rejected']]) {
  const request={...base,status,confirmed_at:status==='SUBMITTED'?null:base.created_at,approved_at:status==='PRINCIPAL_APPROVED'?base.created_at:null};
  const html=renderToString(<RequestReviewModal request={request} role={role} onClose={()=>{}} onUpdated={async()=>({})}/>);
  if(!html.includes('<dialog')||!html.includes(expected))throw Error('Missing modal or state '+status);
  if(status==='PRINCIPAL_REVIEW' && /Return for correction|Reject request/.test(html))throw Error('Principal must only approve');
  if(status==='REJECTED' && html.includes('Pending Principal Approval'))throw Error('Rejected request shown as pending');
  if(status==='SUBMITTED' && html.includes('STUDENT INFORMATION CONFIRMED'))throw Error('Unconfirmed request shown as confirmed');
  results.push(status+': modal state passed');
 }
 const learner={firstName:'Example',middleName:'Middle',lastName:'Learner',lrn:'123456789012',grade:'Grade 10',section:'A',schoolYear:'2026–2027',isDemo:true};
 const school={schoolName:'Example School',schoolId:'123456'};
 const sf10=renderToString(<Sf10Preview student={learner} school={school}/>).replace(/<!--.*?-->/g, '');
 for(const expected of ['View SF10 Permanent Record','Print / Save as PDF','123456789012','Example School','Grade 7','Grade 10','FICTIONAL DEMO STUDENT','WORKING TEMPLATE']) {
  if(!sf10.includes(expected))throw Error('Missing SF10 content: '+expected);
 }
 if(sf10.includes('Loading document'))throw Error('SF10 template waits for an uploaded file');
 const senior=renderToString(<Sf10Record student={{...learner,grade:'Grade 12',firstName:'<script>alert(1)</script>'}} school={school}/>).replace(/<!--.*?-->/g, '');
 if(!senior.includes('Senior High School')||!senior.includes('Grade 12 — Second Semester'))throw Error('Missing senior SF10 layout');
 if(senior.includes('<script>'))throw Error('Unescaped learner data');
 results.push('SF10: template, senior layout, and escaped learner data passed');
 return results;
}
