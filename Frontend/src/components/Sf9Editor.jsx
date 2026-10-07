import {useEffect,useRef,useState} from 'react';
import {operation} from '../api/operations';
import StaffIcon from './StaffIcon';
import './Sf9.css';
const stamp=v=>new Date(v).toLocaleString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
const grade=v=>v?.value ?? '';
export function Sf9Editor({record:initial,role,onSaved,onClose}){
 const [record,setRecord]=useState(initial),[values,setValues]=useState({}),[finals,setFinals]=useState({}),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),lock=useRef(false);
 const dirty=Object.keys(values).length+Object.keys(finals).length>0;
 async function refresh(){try{setRecord(await operation(`sf9/records/${record.id}/`));setValues({});setFinals({});setError('');}catch(e){setError(e.message);}}
 useEffect(()=>{if(dirty)return;let active=true;const timer=setInterval(()=>operation(`sf9/records/${initial.id}/`).then(r=>{if(active)setRecord(r);}).catch(()=>{}),5000);return()=>{active=false;clearInterval(timer);};},[initial.id,dirty]);
 async function save(e){e.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');try{
  const grades=Object.entries(values).map(([key,value])=>{const [subject,term]=key.split(':').map(Number);return {subject,term,value};});
  const body={version:record.version,grades,...(role==='ADMIN'?{finals:Object.entries(finals).map(([subject,value])=>({subject:Number(subject),value}))}:{})};
  const r=await operation(`sf9/records/${record.id}/`,body);setRecord(r);setValues({});setFinals({});setMessage('Grades saved.');onSaved?.(r);
 }catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}}
 return <form className="sf9-editor" onSubmit={save}><header className="sf9-heading"><div><span>SCHOOL FORM 9</span><h2>{record.name}</h2><p>LRN {record.lrn||'Not yet assigned'} · {record.grade} / {record.section} · SY {record.school_year}</p></div>{onClose&&<button type="button" aria-label="Close SF9" onClick={onClose}><StaffIcon name="fa-xmark"/></button>}</header>
 <div className="sf9-guidance">{role==='TEACHER'?'Edit your assigned subject. Other subjects are read-only.':'All subject grades are visible here.'}</div>
 <p className="sf9-mobile-hint">Scroll sideways to view all terms.</p><div className="staff-table-wrap"><table className="sf9-table"><thead><tr><th>Subject</th><th>Term 1</th><th>Term 2</th><th>Term 3</th><th>Final Grade</th><th>Progress / Last update</th></tr></thead><tbody>{record.subjects.map(s=>{const latest=[...s.terms,s.final].filter(Boolean).sort((a,b)=>b.updated_at.localeCompare(a.updated_at))[0];return <tr key={s.id} className={s.editable&&role==='TEACHER'?'sf9-editable-row':s.editable?'sf9-admin-row':'sf9-readonly-row'}><th scope="row">{s.name}{role==='TEACHER'&&s.editable&&<small className="sf9-editable-label">Editable subject</small>}</th>{s.terms.map((g,i)=>{const key=`${s.id}:${i+1}`;return <td key={i}><input type="number" min="0" max="100" step="0.01" aria-label={`${s.name} Term ${i+1}`} disabled={role!=='TEACHER'||!s.editable||busy} value={values[key]??grade(g)} placeholder="—" onChange={e=>setValues(v=>({...v,[key]:e.target.value}))}/></td>;})}<td><input type="number" min="0" max="100" step="0.01" aria-label={`${s.name} Final grade`} disabled={true} value={finals[s.id]??grade(s.final)} placeholder="—" onChange={e=>setFinals(v=>({...v,[s.id]:e.target.value}))}/></td><td><span className={`sf9-status ${s.status==='Complete'?'complete':''}`}>{s.status}</span>{latest&&<small>{latest.updated_by}<br/>{stamp(latest.updated_at)}</small>}</td></tr>;})}</tbody></table></div>
 <div className="sf9-average"><strong>General Average</strong><span>{record.general_average??'—'}</span><small>Calculation is not enabled.</small></div>
 {error&&<p className="staff-error" role="alert">{error}</p>}{message&&<p className="sf9-success" role="status">{message}</p>}
 <footer className="sf9-actions"><button type="button" disabled={busy} onClick={refresh}>Reload saved grades</button>{role==='TEACHER'&&<button type="submit" className="staff-primary-button" disabled={busy||!dirty}>{busy?'Saving…':'Save grades'}</button>}</footer></form>;
}
export function Sf9Student({student,role='ADMIN'}){
 const [records,setRecords]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState(''),[open,setOpen]=useState(false);
 async function show(){setError('');setOpen(true);try{const data=await operation(`sf9/records/?student_id=${student.id}`);setRecords(data.records);setSelected(data.records.at(-1)||null);}catch(e){setError(e.message);}}
 return <><button type="button" className="staff-primary-button" onClick={show}>Open digital SF9</button>{open&&<section className="sf9-student"><div className="sf9-year-select"><strong>Digital SF9</strong><select aria-label="SF9 school year" value={selected?.id||''} onChange={e=>setSelected(records.find(r=>r.id===Number(e.target.value)))}>{records.map(r=><option key={r.id} value={r.id}>SY {r.school_year}</option>)}</select><button type="button" onClick={()=>setOpen(false)}>Hide SF9</button></div>{error&&<p role="alert">{error}</p>}{selected?<Sf9Editor key={selected.id} record={selected} role={role}/>:<p>No SF9 yet. Save the student’s grade level, section and school year first.</p>}</section>}</>;
}
