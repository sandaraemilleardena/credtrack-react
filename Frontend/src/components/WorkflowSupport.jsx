import {useRef,useState} from 'react';
import {usePortal} from '../hooks/PortalContext';
export default function WorkflowSupport(){
 const system=usePortal(),[open,setOpen]=useState(false),[message,setMessage]=useState('');
 const busy=useRef(false);
 const submit=async e=>{e.preventDefault();if(busy.current)return;busy.current=true;setMessage('');try{const values=Object.fromEntries(new FormData(e.currentTarget));await system.mutate('work/',{action:'create-ticket',values});setOpen(false);setMessage('Support ticket saved. ICT can now review it.');}catch(err){setMessage(err.message);}finally{busy.current=false;}};
 return <section className="request-workflow-notice"><button type="button" onClick={()=>{setOpen(!open);setMessage('');}}>Report an issue to ICT</button>{message&&<p role="status">{message}</p>}{open&&<form onSubmit={submit} style={{display:'grid',gap:10,marginTop:12}}><label>Subject<input name="subject" required maxLength={160} style={{width:'100%'}}/></label><label>Related request reference (optional)<input name="requestId" style={{width:'100%'}}/></label><label>Description<textarea name="description" required maxLength={2000} style={{width:'100%'}}/></label><button type="submit">Send to ICT</button></form>}</section>;
}
