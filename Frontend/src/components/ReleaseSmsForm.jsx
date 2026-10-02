function releaseMessage(request, schedule) {
  const when = schedule.release_date && schedule.release_time ? `${schedule.release_date} at ${schedule.release_time} (Philippine time)` : '[release date] at [release time] (Philippine time)';
  return `CredTrack PMRMIS-South: Request ${request.reference} is ready for release on ${when}. ` + (request.delivery_method === 'SCHOOL_TO_SCHOOL' ? `Please contact the school records office for forwarding to ${request.receiving_school}.` : 'Please collect your credential at the school records office. Bring a valid ID.');
}
export default function ReleaseSmsForm({request, schedule, onChange, disabled, smsEnabled}) {
 return <section className="release-sms-form" aria-label="Release SMS message">
  <h3>Notify requester · Ready for release</h3>
  <p>Recipient: <strong>{request.full_name}</strong> · {request.phone}</p>
  <div className="release-sms-fields">
   <label>Release date<input type="date" required value={schedule.release_date} disabled={disabled} onChange={e=>onChange({...schedule,release_date:e.target.value})}/></label>
   <label>Release time (Philippine time)<input type="time" required step="60" value={schedule.release_time} disabled={disabled} onChange={e=>onChange({...schedule,release_time:e.target.value})}/></label>
  </div>
  <label>Standard SMS preview<textarea readOnly rows={5} value={releaseMessage(request,schedule)}/></label>
  <p>{smsEnabled ? 'Confirming marks the credential ready and submits one SMS to Semaphore. Acceptance does not confirm delivery.' : 'Semaphore approval is pending. Confirming marks the credential ready and saves the message in the queue; no SMS is sent yet.'}</p>
 </section>;
}
