import {useState} from 'react';
import {usePortal} from './hooks/PortalContext';
import OriginalSf9Card from './components/OriginalSf9Card';
import './components/Sf9.css';
export default function AdministrationSf10(){
 const system=usePortal(),[search,setSearch]=useState(''),[year,setYear]=useState('');
 const graduates=(system.data.students||[]).filter(s=>s.status==='Graduated');
 const years=[...new Set(graduates.map(s=>s.schoolYear).filter(Boolean))].sort().reverse();
 const name=s=>[s.lastName,[s.firstName,s.middleName].filter(Boolean).join(' ')].filter(Boolean).join(', ');
 const visible=graduates.filter(s=>(!year||s.schoolYear===year)&&`${name(s)} ${s.lrn||''}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b)=>name(a).localeCompare(name(b)));
 return <section className="staff-panel sf9-workspace"><header className="sf9-heading"><div><span>GRADUATED STUDENTS</span><h1>SF10 Permanent Record</h1><p>Find alumni and view or print their saved SF10 permanent records.</p></div></header><div className="sf9-filter-panel"><div className="staff-filters"><label className="sf9-filter-label">Search alumni<input aria-label="Search alumni SF10" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or LRN"/></label><label className="sf9-filter-label">School year<select aria-label="SF10 school year" value={year} onChange={e=>setYear(e.target.value)}><option value="">All school years</option>{years.map(y=><option key={y}>{y}</option>)}</select></label></div><small>{visible.length} graduated students · Alphabetical by last name</small></div><div className="staff-table-wrap"><table className="staff-table"><thead><tr><th>Alumni name</th><th>LRN</th><th>Grade / Section</th><th>School year</th><th>Permanent record</th></tr></thead><tbody>{visible.map(s=><tr key={s.id}><td><strong>{name(s)}</strong><small>Graduated</small></td><td>{s.lrn||'—'}</td><td>{s.grade} / {s.section}</td><td>{s.schoolYear||'—'}</td><td><OriginalSf9Card student={s} documentType="SF10"/></td></tr>)}</tbody></table>{!visible.length&&<p>No graduated students match these filters.</p>}</div></section>;
}
