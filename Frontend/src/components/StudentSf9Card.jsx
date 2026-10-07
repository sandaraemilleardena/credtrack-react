import {useEffect,useRef,useState} from 'react';
import {operation} from '../api/operations';
import {Sf9ReportCard} from './Sf9ReportCard';
import OriginalSf9Card from './OriginalSf9Card';
import './StudentSf9Card.css';
export default function StudentSf9Card({student}){
 const [open,setOpen]=useState(false),[records,setRecords]=useState([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),dialog=useRef(null);
 useEffect(()=>{if(!open)return;let active=true;dialog.current.showModal();operation(`sf9/records/?student_id=${student.id}`).then(r=>{if(active){setRecords(r.records);setSelected(String(r.records[0]?.id||''));}}).catch(e=>setError(e.message));return()=>{active=false;};},[open,student.id]);
 function close(){dialog.current.close();setOpen(false);}
 return <><button type="button" className="staff-primary-button" onClick={()=>setOpen(true)}>SF9</button><dialog ref={dialog} className="student-sf9-card-dialog structured-sf9-dialog" aria-label="Learner’s Performance Report" onCancel={e=>{e.preventDefault();close();}}><header><h2>LEARNER’S PERFORMANCE REPORT</h2><button type="button" aria-label="Close SF9" onClick={close}>×</button></header><div className="structured-sf9-body"><label>School year <select value={selected} onChange={e=>setSelected(e.target.value)}>{records.map(r=><option key={r.id} value={r.id}>{r.school_year}</option>)}</select></label>{(student.credentialFiles||[]).some(f=>/^SF9.*(?:Front|Back)/i.test(f.title))&&<OriginalSf9Card student={student}/ >}{error&&<p role="alert">{error}</p>}{selected?<Sf9ReportCard key={selected} recordId={selected}/>:<p>No SF9 record available.</p>}</div></dialog></>;
}
