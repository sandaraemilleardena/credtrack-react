import DocumentPreview from './DocumentPreview';
import './RequestWorkflowDetails.css';
export function QueueNotice({queue, loginPath}) {
  if(queue.loading) return <p className="request-workflow-notice" role="status">Loading credential requests…</p>;
  if(queue.error) return <div className="request-workflow-notice request-workflow-error" role="alert">{queue.error} <a href={loginPath}>Sign in</a> <button onClick={queue.refresh}>Retry</button></div>;
  return null;
}
export default function RequestWorkflowDetails({request:r}) {
  const groups = [
    ['Request information', [['Reference Number',r.reference],['Date Requested',new Date(r.created_at).toLocaleString()],['Credential',r.credential],['Purpose',r.purpose],['Other Purpose/Document',r.other_purpose],['Delivery Method',r.delivery_method==='SCHOOL_TO_SCHOOL'?'School-to-School':'Claimed On Site'],['Receiving School',r.receiving_school],['Request Status',r.status_label]]],
    ['Student information', [['Requester',r.full_name],['First Name',r.first_name],['Middle Name',r.middle_name],['Last Name',r.last_name],['LRN',r.lrn],['Grade Level',r.grade_level],['Section',r.section],['Graduation Year',r.graduation_year]]],
    ['Contact information', [['Phone',r.phone],['Email',r.email]]],
  ];
  return <section className="request-workflow-details">
    {groups.map(([title,fields]) => <section key={title}><h3>{title}</h3><dl>{fields.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl></section>)}
    <section><h3>Verification</h3>
      {r.has_psa_document && <DocumentPreview id={r.id} kind="psa" label="PSA"/>}
      {r.has_id_document && <DocumentPreview id={r.id} kind="id" label="Valid ID"/>}
      {r.has_verification_document && <DocumentPreview id={r.id} kind="verification" label="PSA / Valid ID"/>}
      {!r.has_psa_document && !r.has_id_document && !r.has_verification_document && <p>No verification document uploaded.</p>}
      <p className={r.confirmed_at?'verification-confirmed':'verification-pending'}>{r.confirmed_at?'STUDENT INFORMATION CONFIRMED':'Pending Administration Verification'}</p>
      <p>Verified by: {r.prepared_by || 'Pending'}</p>
      <p>Student record inventory: {r.record_availability?.matched ? (r.record_availability.available_credentials.join(', ') || 'No available credentials recorded') : 'No matching student record. Check school records.'}</p></section>
    <section><h3>Approval and release</h3><p className={r.approved_at?'verification-confirmed':''}>{r.status==='REJECTED'?'Request Rejected':r.approved_at?'STUDENT INFORMATION APPROVED':r.status==='RETURNED'?'Returned for Administration correction':r.confirmed_at?'Pending Principal Approval':'Awaiting Administration confirmation'}</p><p>Principal: {r.approved_by || 'Pending'}</p><p>{r.status==='REJECTED'?'Release not permitted':r.collected_at?'Released':r.ready_at?'Ready for Release':'Awaiting release'}</p></section>
    {r.additional_details && <p>Additional details: {r.additional_details}</p>}
    {r.sms && <div className="request-workflow-notice"><strong>SMS: {r.sms.status}</strong><p>{r.sms.last_error || `Provider status: ${r.sms.provider_status || 'Awaiting dispatch'}. Provider acceptance does not confirm handset delivery.`}</p></div>}
    <h3>Workflow history</h3><ol>{(r.events || []).map((event,index) => <li key={index}><strong>{event.to_status.replaceAll('_',' ')} · {event.actor || 'Requester'}</strong><small>{new Date(event.created_at).toLocaleString()}</small>{event.note && <p>{event.note}</p>}</li>)}</ol>
  </section>;
}
