import {useRef,useState} from 'react';
import {attachVerification} from '../api/credentials';
export default function VerificationUpload({request,onUpdated}) {
 const [file,setFile]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),lock=useRef(false);
 if(!['PENDING'].includes(request.status))return null;
 async function upload(){
  if(!file||lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const updated=await attachVerification(request,file);await onUpdated(updated);setFile(null);}catch(e){setError(e.message);}finally{setBusy(false);lock.current=false;}
 }
 return <section><label>Attach or replace a supporting identity document (up to 20 MB)<input type="file"  disabled={busy} onChange={e=>setFile(e.target.files[0]||null)}/></label><button disabled={!file||busy} onClick={upload}>{busy?'Uploading…':'Save verification document'}</button>{error&&<p role="alert">{error}</p>}</section>;
}
