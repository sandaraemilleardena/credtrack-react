
import {useEffect, useRef, useState} from 'react';
import {actOnCredential} from '../api/credentials';
import RequestWorkflowDetails from './RequestWorkflowDetails';
const actions = {
 ADMIN: {SUBMITTED:[['submit_review','Confirm Student Information'],['prepare','Start preparation']],PREPARING:[['submit_review','Confirm Student Information'],['unavailable','Unavailable / needs information']],RETURNED:[['submit_review','Confirm Student Information']],UNAVAILABLE:[['prepare','Resume preparation']],PRINCIPAL_APPROVED:[['ready','Release: mark ready and queue SMS']],READY:[['collect','Record release / collection']]},
 PRINCIPAL: {PRINCIPAL_REVIEW:[['approve','Approve Student Information'],['return','Return for correction'],['reject','Reject request']]}
};
export default function RequestReviewModal({request: incoming,role,onClose,onUpdated}) {
 const [saved,setSaved]=useState(null);
 // Only server responses can advance the visible state; a late poll cannot roll it back.
 const request = saved && saved.id === incoming.id && saved.version > incoming.version ? saved : incoming;
 const [success,setSuccess]=useState('');
 async function acceptUpdate(updated) {
  setSaved(updated);
  const refreshed = await onUpdated();
  if (refreshed === null) setError('The change was saved, but the queue could not be refreshed. Reload to reconnect.');
 }
 const dialog = useRef(null), locked = useRef(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const el=dialog.current;el.showModal();return()=>el.close();},[]);
 async function act(action) {
  if(locked.current)return; locked.current=true;setBusy(true);setError('');
  try {const updated=await actOnCredential(request,action,"");setSuccess(action==='submit_review'?'STUDENT INFORMATION CONFIRMED':action==='approve'?'STUDENT INFORMATION APPROVED':updated.status_label);await acceptUpdate(updated);}
  catch(e){setError(e.message);}finally{locked.current=false;setBusy(false);}
 }
 return <dialog ref={dialog} className="request-review-modal" onCancel={event=>{event.preventDefault();if(!busy)onClose();}} aria-labelledby="request-review-title">
   <header><h2 id="request-review-title">Request Details · {request.reference}</h2><button disabled={busy} onClick={onClose} aria-label="Close request details">Close</button></header>
   <RequestWorkflowDetails request={request}/>

   {success && <p role="status" className="verification-confirmed">{success}</p>}
   {error && <p role="alert" className="request-workflow-error">{error}</p>}
   {(actions[role]?.[request.status] || []).length > 0 && <><p>Review the student record and uploaded identity document before confirming. Each action is saved in the request history.</p><div className="review-actions">{actions[role][request.status].map(([action,label])=><button key={action} className={`review-action ${['return','reject','unavailable'].includes(action) ? 'review-action-warning' : 'review-action-approve'}`} disabled={busy} onClick={()=>act(action)}>{busy?'Saving…':label}</button>)}</div></>}
 </dialog>;
}

