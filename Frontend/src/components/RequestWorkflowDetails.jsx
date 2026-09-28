import "./RequestWorkflowDetails.css";

const smsLabels = {
  QUEUED: "Queued — not sent", SENDING: "Sending — awaiting provider response",
  ACCEPTED: "Accepted by Semaphore", FAILED: "Failed — needs attention",
  UNKNOWN: "Uncertain — check Semaphore before retrying", CANCELLED: "Cancelled — already collected",
};

export function QueueNotice({ queue, loginPath }) {
  if (queue.loading) return <p className="request-workflow-notice" role="status">Loading credential requests…</p>;
  if (queue.error) return <div className="request-workflow-notice request-workflow-error" role="alert">{queue.error} <a href={loginPath}>Sign in</a> <button onClick={queue.refresh}>Retry</button></div>;
  return null;
}

export default function RequestWorkflowDetails({ request }) {
  return <section className="request-workflow-details">
    <h3>Request progress</h3>
    <p><strong>{request.status_label}</strong></p>
    <p>Prepared by: {request.prepared_by || "Not yet prepared"}</p>
    <p>Principal approval: {request.approved_by || "Pending"}</p>
    <p>Contact: {request.phone}{request.email ? ` · ${request.email}` : ""}</p>
    <p><strong>Student record inventory:</strong> {request.record_availability?.matched ? (request.record_availability.available_credentials.join(", ") || "No available credentials recorded yet") : "No matching student record saved. Verify the school records before submitting for approval."}</p>
    {request.additional_details && <p>Additional details: {request.additional_details}</p>}
    {request.sms && <div className="request-workflow-notice"><strong>SMS: {smsLabels[request.sms.status] || request.sms.status}</strong><p>{request.sms.last_error || `Provider status: ${request.sms.provider_status || "Awaiting dispatch"}. Acceptance does not confirm handset delivery.`}</p></div>}
    <h3>Workflow history</h3>
    <ol>{request.events.map((event, index) => <li key={index}><strong>{event.to_status.replaceAll("_", " ")} · {event.actor || "Requester"}</strong><small>{new Date(event.created_at).toLocaleString()}</small>{event.note && <p>{event.note}</p>}</li>)}</ol>
  </section>;
}
