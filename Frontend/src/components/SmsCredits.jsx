import {useEffect,useState} from 'react';
import {API_BASE_URL} from '../api/config';
import StaffIcon from './StaffIcon';

let lastVerifiedCredits=null;
export default function SmsCredits(){
 const [credits,setCredits]=useState(lastVerifiedCredits),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true,inFlight=false,lastRefresh=0,retryTimer;
  const controller=new AbortController();
  async function refresh(){
   if(document.hidden||inFlight||Date.now()-lastRefresh<35000)return;
   inFlight=true;lastRefresh=Date.now();
   try{
    const response=await fetch(`${API_BASE_URL}/api/operations/sms/balance/`,{credentials:'include',cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error();
    const data=await response.json();
    if(active){if(data.balance!=null)lastVerifiedCredits=data;setCredits(old=>data.balance==null&&old?.balance!=null?{...old,error:data.error,refreshing:data.refreshing}:data);if(data.refreshing){lastRefresh=0;retryTimer=setTimeout(refresh,2500);}} 
   }catch{
    if(active)setCredits(old=>({...old,error:'Credits unavailable. Check provider connection.'}));
   }finally{inFlight=false;if(active)setLoading(false);}
  }
  refresh();
  const timer=setInterval(refresh,35000);
  window.addEventListener('focus',refresh);
  document.addEventListener('visibilitychange',refresh);
  return()=>{active=false;controller.abort();clearInterval(timer);clearTimeout(retryTimer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[]);
 const provider=credits?.provider||'Semaphore';
 return <div className="staff-sms-credits" role="status" aria-label={`${provider} credits`} title={credits?.error||`${provider} balance checked ${credits?.checked_at?new Date(credits.checked_at).toLocaleTimeString():'—'}. Refreshes every 35 seconds.`}><StaffIcon name="fa-comment-dots"/><div><span>SMS CREDITS</span><strong>{credits?.balance!=null?Number(credits.balance).toLocaleString('en-PH',{maximumFractionDigits:4}):'—'}</strong><small>{credits?.error?(credits?.balance!=null?'Semaphore · Last checked':'Credits unavailable'):loading||credits?.refreshing?'Updating…':`${provider} · Live balance`}</small></div></div>;
}
