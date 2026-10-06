import DocumentPreview from './DocumentPreview';
import './RequestWorkflowDetails.css';
export function QueueNotice({queue, loginPath}) {
  if(queue.loading) return <p className="request-workflow-notice" role="status">Loading credential requests…</p>;
  if(queue.error) return <div className="request-workflow-notice request-workflow-error" role="alert">{queue.error} <a href={loginPath}>Sign in</a> <button onClick={queue.refresh}>Retry</button></div>;
  return null;
}
const stamp = value => value ? new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}) : '—';
function Fields({items}){return <dl>{items.filter(([,value])=>value!==null&&value!==undefined&&value!=='').map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;}
export default function RequestWorkflowDetails({request:r}) {
 const schedule=r.scheduled_release_date?stamp(`${r.scheduled_release_date}T${r.scheduled_release_time||'00:00:00'}+08:00`):'Not scheduled';
 return <section className="request-workflow-details compact-request-details">
  <section><h3>Requester</h3><Fields items={[["Name",r.full_name],["LRN",r.lrn],["Grade / Section",[r.grade_level,r.section].filter(Boolean).join(' / ')],["Graduation year",r.graduation_year],["Phone",r.phone],["Email",r.email]]}/></section>
  <section><h3>Request</h3><Fields items={[["Credential",r.credential],["Submitted",stamp(r.created_at)],["Purpose",r.purpose],["Other details",r.other_purpose],["Delivery",r.delivery_method==='SCHOOL_TO_SCHOOL'?'School-to-school':'School pickup'],["Receiving school",r.receiving_school]]}/>{r.additional_details&&<p>{r.additional_details}</p>}</section>
  <section className="request-documents-card"><h3>Supporting documents</h3><div className="request-document-grid">
   {r.has_verification_document&&<DocumentPreview id={r.id} kind="verification" label="Identity / Request form"/>}
   {r.has_psa_document&&<DocumentPreview id={r.id} kind="psa" label="Supporting document 2"/>}
   {r.has_id_document&&<DocumentPreview id={r.id} kind="id" label="Supporting document 3"/>}
  </div>{!r.has_verification_document&&!r.has_psa_document&&!r.has_id_document&&<p>No documents uploaded.</p>}<Fields items={[["Verification",r.confirmed_at?'Verified':'Pending verification'],["Verified by",r.prepared_by||'—'],["School records",r.record_availability?.matched?(r.record_availability.available_credentials.join(', ')||'No credentials recorded'):'No matching record']]}/></section>
  <section><h3>Approval & release</h3><Fields items={[["Approved by Administration",r.approved_by||'Pending'],["Approved",r.approved_at?stamp(r.approved_at):'Pending'],["Scheduled release / sending",schedule],["Actual Released / Sent",r.collected_at?stamp(r.collected_at):'Not yet released']]}/></section>
  {r.sms&&<section className="request-sms-card"><h3>SMS <span className="request-sms-state">{r.sms.provider_status||r.sms.status}</span></h3><Fields items={[["Queued",stamp(r.sms.created_at)],["Accepted",r.sms.accepted_at?stamp(r.sms.accepted_at):null],["Sent / confirmed",r.sms.sent_at?stamp(r.sms.sent_at):null]]}/>{r.sms.last_error&&<p className="request-workflow-error">{r.sms.last_error}</p>}</section>}
  <section className="request-history-card"><details><summary>Activity history <span>{(r.events||[]).length} events</span></summary><ol>{(r.events||[]).map((event,index)=><li key={index}><strong>{event.to_status.replaceAll('_',' ')} · {event.actor||'Requester'}</strong><small>{stamp(event.created_at)}</small>{event.note&&<p>{event.note}</p>}</li>)}</ol></details></section>
 </section>;
}
