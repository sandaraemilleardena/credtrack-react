import {useEffect,useState} from 'react';
import {operation} from '../api/operations';
const labels={'GMRC':'GMRC (Good Manners and Right Conduct)','Music and Arts':'Music & Arts','PE and Health':'Physical Education & Health'};
export default function TeacherAssignmentFields({value=[],onChange,canAssignAdviser=false}){
 const [catalog,setCatalog]=useState(null),[error,setError]=useState(''),[gradeId,setGradeId]=useState('');
 useEffect(()=>{let active=true;operation('sf9/catalog/').then(c=>{if(active)setCatalog(c);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 const grades=catalog?.grade_levels.filter(g=>catalog.grade_subjects?.[g.id])||[];
 const grade=gradeId||String(value.find(v=>v.grade_level)?.grade_level||grades[0]?.id||'');
 const allowed=catalog?.grade_subjects?.[grade]||[];
 const subjects=catalog?.subjects.filter(s=>allowed.includes(s.id))||[];
 const selected=value.filter(r=>String(r.grade_level)===grade).map(r=>r.subject);
 const year=catalog?.school_years.find(y=>y.name===catalog.current_school_year)?.id;
 function toggle(subject,checked){const remaining=value.filter(r=>!(String(r.grade_level)===grade&&r.subject===subject));onChange(checked?[...remaining,{grade_level:Number(grade),subject,section:null,school_year:year}]:remaining);}
 return <fieldset className="sf9-assignment-fields"><legend>Grade level & subjects</legend><p>Select a grade level, then choose the subjects this teacher may enter grades for. You can assign subjects in more than one grade.</p><label>Grade level<select aria-label="Teaching grade level" value={grade} onChange={e=>setGradeId(e.target.value)}>{grades.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>{subjects.map(subject=><label key={subject.id} className="curriculum-option"><input type="checkbox" disabled={!canAssignAdviser||!year} checked={selected.includes(subject.id)} onChange={e=>toggle(subject.id,e.target.checked)}/>{labels[subject.name]||subject.name}</label>)}<small>{value.length} teaching assignment{value.length===1?'':'s'} selected across grade levels.</small>{!canAssignAdviser&&<small>Only the principal can change subject assignments.</small>}{catalog&&!year&&<p role="alert">Configure the current school year before assigning subjects.</p>}{error&&<p role="alert">{error}</p>}</fieldset>;
}
