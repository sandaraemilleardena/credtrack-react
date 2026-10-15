import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {operation} from './api/operations';
import {Sf9ReportCard} from './components/Sf9ReportCard';
import './components/Sf9.css';
export default function TeacherReportCard({role='TEACHER'}){
 const [params,setParams]=useSearchParams(),[rows,setRows]=useState([]),[error,setError]=useState(''),[search,setSearch]=useState('');
 useEffect(()=>{operation('sf9/records/?scope=current').then(r=>setRows(r.records)).catch(e=>setError(e.message));},[]);
 const visible=rows.filter(r=>`${r.name} ${r.lrn||''}`.toLowerCase().includes(search.trim().toLowerCase()));
 const selected=visible.find(r=>String(r.id)===params.get('record'))||visible[0];
 return <section className="staff-panel"><header className="sf9-heading"><div><span>STUDENT REPORT CARD</span><h1>SF9 Report Card</h1><p>Read-only report cards retrieve grades and attendance from authorized entry forms.</p></div></header><div className="sf9-filter-panel"><div className="staff-filters"><label className="sf9-filter-label">Search student<input aria-label="Search Digital SF9 students" placeholder="Search name or LRN" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="sf9-filter-label">Student / School year<select aria-label="Select student SF9" value={selected?.id||''} onChange={e=>setParams({record:e.target.value})}>{visible.map(r=><option key={r.id} value={r.id}>{r.last_name?`${r.last_name}, ${r.first_name}`:r.name} · {r.school_year} · {r.grade} / {r.section}</option>)}</select></label></div><small>{visible.length} student record{visible.length===1?'':'s'} · Alphabetical by last name</small></div>{error&&<p role="alert">{error}</p>}{selected?<Sf9ReportCard key={selected.id} recordId={selected.id} role={role}/>:<p>{search?'No students match your search.':'No assigned students available.'}</p>}</section>;
}
