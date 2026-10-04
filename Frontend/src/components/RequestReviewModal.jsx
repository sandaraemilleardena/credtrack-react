
import {useEffect, useRef, useState} from 'react';
import {actOnCredential} from '../api/credentials';
import ReleaseSmsForm from './ReleaseSmsForm';
import RequestWorkflowDetails from './RequestWorkflowDetails';
import './RequestReviewModal.css';
const actions = {
 ADMIN: {SUBMITTED:[['submit_review','Confirm Student Information'],['prepare','Start preparation']],PREPARING:[['submit_review','Confirm Student Information'],['unavailable','Unavailable / needs information']],RETURNED:[['submit_review','Confirm Student Information']],UNAVAILABLE:[['prepare','Resume preparation']],PRINCIPAL_APPROVED:[['ready','Release: mark ready and queue SMS']],READY:[['collect','Record release / collection']]},
 PRINCIPAL: {PRINCIPAL_REVIEW:[['approve','Approve']]}
};
export default function RequestReviewModal({request: incoming,role,onClose,onUpdated,smsEnabled=false}) {
 const [saved,setSaved]=useState(null);
 // Only server responses can advance the visible state; a late poll cannot roll it back.
 const request = saved && saved.id === incoming.id && saved.version > incoming.version ? saved : incoming;
 const [success,setSuccess]=useState('');
 const [releaseOpen,setReleaseOpen]=useState(false);
 const [schedule,setSchedule]=useState({release_date:'',release_time:''});
 async function acceptUpdate(updated) {
  setSaved(updated);
  const refreshed = await onUpdated();
  if (refreshed === null) setError('The change was saved, but the queue could not be refreshed. Reload to reconnect.');
 }
 const dialog = useRef(null), locked = useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const el=dialog.current;el.showModal();return()=>el.close();},[]);
 async function act(action) {
  if(action==='ready' && !releaseOpen){setReleaseOpen(true);return;}
  if(action==='ready' && (!schedule.release_date || !schedule.release_time)){setError('Enter the release date and time before confirming.');return;}
  if(locked.current)return; locked.current=true;setBusy(true);setError('');
  try {const updated=await actOnCredential(request,action,"",action==='ready'?schedule:{});setSuccess(action==='submit_review'?'STUDENT INFORMATION CONFIRMED':action==='approve'?'STUDENT INFORMATION APPROVED':action==='ready'?(updated.sms?.status==='QUEUED'?'Ready for release. SMS queued; no message sent yet.':updated.sms?.status==='ACCEPTED'?'Ready for release. SMS accepted by Semaphore.':'Ready for release. Review SMS status below.'):updated.status_label);setReleaseOpen(false);await acceptUpdate(updated);}
  catch(e){setError(e.message);}finally{locked.current=false;setBusy(false);}
 }
 return <dialog ref={dialog} className="request-review-modal" onCancel={event=>{event.preventDefault();if(!busy)onClose();}} aria-labelledby="request-review-title">
   <header className="request-review-header"><div><span className="request-review-eyebrow">CREDENTIAL REQUEST</span><h2 id="request-review-title">Request Details · {request.reference}</h2><span className="request-review-status">{request.status_label}</span></div><button type="button" disabled={busy} onClick={onClose} aria-label="Close request details">Close <span aria-hidden="true">×</span></button></header>
   <div className="request-review-body">
   <RequestWorkflowDetails request={request}/>

   {releaseOpen && request.status === "PRINCIPAL_APPROVED" && <ReleaseSmsForm request={request} schedule={schedule} onChange={setSchedule} disabled={busy} smsEnabled={smsEnabled}/>}
   {success && <p role="status" className="verification-confirmed">{success}</p>}
   {error && <p role="alert" className="request-workflow-error">{error}</p>}
   </div>
   {(actions[role]?.[request.status] || []).length > 0 && <footer className="request-review-footer"><p>Review the student record and uploaded identity document before confirming. Each action is saved in the request history.</p><div className="review-actions">{actions[role][request.status].map(([action,label])=><button type="button" key={action} className={`review-action ${action === 'unavailable' ? 'review-action-warning' : 'review-action-approve'}`} disabled={busy} onClick={()=>act(action)}>{busy?'Saving…':action==='ready'?(releaseOpen?(smsEnabled?'Confirm ready & send SMS':'Confirm ready & queue SMS'):'Schedule release & notify requester'):label}</button>)}</div></footer>}
 </dialog>;
}

