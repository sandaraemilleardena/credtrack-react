import {useEffect,useState} from 'react';
import {API_BASE_URL} from '../api/config';
import {usePortal} from '../hooks/PortalContext';
import StaffIcon from './StaffIcon';
export default function SmsCredits(){
 const system=usePortal(),[credits,setCredits]=useState(null),[loading,setLoading]=useState(false);
 useEffect(()=>{let active=true;async function refresh(){setLoading(true);try{const response=await fetch(`${API_BASE_URL}/api/operations/sms/balance/`,{credentials:'include',cache:'no-store'});if(!response.ok)throw Error();const data=await response.json();if(active)setCredits(data);}catch{if(active)setCredits({balance:null,error:'Credits unavailable. Check provider connection.'});}finally{if(active)setLoading(false);}}
 refresh();const timer=setInterval(refresh,15000);const focus=()=>refresh();window.addEventListener('focus',focus);return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',focus);};},[system.data.updatedAt]);
 return <div className="staff-sms-credits" role="status" aria-label="PhilSMS credits" title={credits?.error||`PhilSMS balance checked ${credits?.checked_at?new Date(credits.checked_at).toLocaleTimeString():''}`}><StaffIcon name="fa-comment-dots"/><div><span>SMS CREDITS</span><strong>{credits?.balance!=null?Number(credits.balance).toLocaleString('en-PH',{maximumFractionDigits:4}):'—'}</strong><small>{credits?.error?'Connection error':loading&&!credits?'Connecting…':'PhilSMS · Live balance'}</small></div></div>;
}
