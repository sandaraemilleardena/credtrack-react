export function parseStudentCSV(text){
const rows=[];let row=[],cell='',quoted=false;
for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}
if(quoted)throw Error('CSV contains an unclosed quotation mark.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
const headers=(rows.shift()||[]).map(x=>x.replace(/^\uFEFF/,'').trim().toLowerCase());
for(const name of ['lrn','first name','last name'])if(!headers.includes(name))throw Error('Missing column: '+name);
if(!rows.length||rows.length>500)throw Error('Import 1 to 500 records at a time.');
const fields={'lrn':'lrn','first name':'firstName','middle name':'middleName','last name':'lastName','sex':'sex','birthday':'birthday','grade':'grade','section':'section','status':'status','school year':'schoolYear','guardian':'guardian','contact':'contact','address':'address'};
return rows.map((cells,i)=>{const r={};headers.forEach((h,j)=>{if(fields[h])r[fields[h]]=(cells[j]||'').trim();if(h==='available credentials')r.availableCredentials=(cells[j]||'').split(';').map(x=>x.trim()).filter(Boolean);});if(!/^\d{12}$/.test(r.lrn)||!r.firstName||!r.lastName)throw Error('Check LRN and names on row '+(i+2));return {...r,status:r.status||'Active',student:[r.firstName,r.lastName].join(' '),gradeSection:[r.grade,r.section].filter(Boolean).join(' - '),credential:(r.availableCredentials||[]).join(', ')};});
}
