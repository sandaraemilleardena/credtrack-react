import {renderToStaticMarkup} from 'react-dom/server';
import DocumentPreview from './DocumentPreview';
import './Sf10Preview.css';

const subjects = ['Filipino', 'English', 'Mathematics', 'Science', 'Araling Panlipunan', 'Edukasyon sa Pagpapakatao', 'Technology and Livelihood Education', 'MAPEH', 'Music', 'Arts', 'Physical Education', 'Health'];
const printStyles = `body{font:11px Arial;color:#111;margin:0}.sf10-sheet{padding:12mm;page-break-after:always}.sf10-sheet:last-child{page-break-after:auto}h2,h3,p{text-align:center;margin:5px 0}h3{font-size:12px}.sf10-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}.sf10-fields span{border-bottom:1px solid #777;padding:4px}table{border-collapse:collapse;width:100%;margin:8px 0;font-size:10px}th,td{border:1px solid #444;padding:4px;height:15px}th{background:#eee}.sf10-note{font-size:10px}.sf10-signatures{display:flex;justify-content:space-between;margin-top:25px}section{margin-top:16px}@page{size:A4 portrait;margin:8mm}`;

export function Sf10Record({student, school = {}}) {
  const senior = /(?:11|12)/.test(student.grade || '');
  const grades = senior ? ['Grade 11 — First Semester', 'Grade 11 — Second Semester', 'Grade 12 — First Semester', 'Grade 12 — Second Semester'] : ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  const name = [student.lastName, [student.firstName, student.middleName].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return <div className="sf10-record">{[0, 1].map(page => <article className="sf10-sheet" key={page}>
    <p>Republic of the Philippines · Department of Education</p>
    <h2>School Form 10 (SF10)</h2>
    <h3>Learner’s Permanent Academic Record — {senior ? 'Senior' : 'Junior'} High School</h3>
    <p className="sf10-note">WORKING TEMPLATE — complete and verify before certification{student.isDemo ? ' · FICTIONAL DEMO STUDENT' : ''}</p>
    <div className="sf10-fields">
      <span><b>Learner:</b> {name}</span><span><b>LRN:</b> {student.lrn}</span>
      <span><b>Date of birth:</b> {student.birthday || '________________'}</span><span><b>Sex:</b> {student.sex || '________________'}</span>
      <span><b>School:</b> {school.schoolName || '________________'}</span><span><b>School ID:</b> {school.schoolId || '________________'}</span>
      <span><b>Division:</b> {school.division || '________________'}</span><span><b>Address:</b> {student.address || '________________'}</span>
    </div>
    {page === 0 && <section><h3>Eligibility for admission</h3><div className="sf10-fields"><span>Previous school: ____________________</span><span>School ID: ____________________</span><span>School year completed: ______________</span><span>Admission / assessment details: ______________</span></div></section>}
    {grades.slice(page * 2, page * 2 + 2).map(grade => <section key={grade}>
      <h3>Scholastic Record — {grade}</h3>
      <div className="sf10-fields"><span>School: ____________________</span><span>School ID: ____________________</span><span>School year: {student.grade === grade ? student.schoolYear : '________________'}</span><span>Section: {student.grade === grade ? student.section : '________________'}</span><span>Adviser: ____________________</span><span>Days of school / days present: ____________</span></div>
      <table><thead><tr><th rowSpan="2">Learning Areas</th><th colSpan={senior ? 2 : 4}>Quarterly Rating</th><th rowSpan="2">Final Rating</th><th rowSpan="2">Remarks</th></tr><tr>{(senior ? [1, 2] : [1, 2, 3, 4]).map(q => <th key={q}>{q}</th>)}</tr></thead>
        <tbody>{(senior ? Array.from({length:8}, (_, i) => `Subject ${i + 1}: __________________`) : subjects).map(subject => <tr key={subject}><td>{subject}</td>{Array.from({length:senior ? 4 : 6}, (_, i) => <td key={i}></td>)}</tr>)}<tr><td colSpan={senior ? 3 : 5}><b>General Average</b></td><td></td><td></td></tr></tbody></table>
      <div className="sf10-fields"><span>Promoted to: ____________________</span><span>Remedial / transfer notes: ____________________</span></div>
    </section>)}
    {page === 1 && <section><h3>Certification</h3><p>Academic entries must be completed from verified school records before this form is signed or issued.</p><div className="sf10-signatures"><span>Prepared by: ____________________</span><span>School head: ____________________</span><span>Date: __________</span></div></section>}
    <p className="sf10-note">Page {page + 1} of 2 · Blank cells indicate information not entered.</p>
  </article>)}</div>;
}

export default function Sf10Preview({student, school}) {
  const print = () => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0';
    frame.title = 'Print SF10';
    frame.onload = () => {
      frame.contentWindow.addEventListener('afterprint', () => frame.remove(), {once:true});
      frame.contentWindow.focus();
      frame.contentWindow.print();
    };
    frame.srcdoc = `<!doctype html><html><head><title>SF10 Permanent Record</title><style>${printStyles}</style></head><body>${renderToStaticMarkup(<Sf10Record student={student} school={school}/>)}</body></html>`;
    document.body.appendChild(frame);
  };
  return <DocumentPreview label="SF10 Permanent Record" formattedContent={<div><button type="button" onClick={print}>Print / Save as PDF</button><Sf10Record student={student} school={school}/></div>}/>;
}
