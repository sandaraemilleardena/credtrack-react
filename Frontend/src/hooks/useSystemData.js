import { useCallback, useEffect, useRef, useState } from "react";
import { operation } from "../api/operations";
export default function useSystemData(role) {
  const [data, setData] = useState(null), [error,setError] = useState("");
  const ref = useRef({active:false,sequence:0});
  const refresh = useCallback(async () => {
    const state=ref.current, sequence=++state.sequence;
    try {
      const result = await operation("snapshot/");
      if(result.role !== role) throw new Error(`Please sign in with the ${role} role.`);
      if(state.active && sequence===state.sequence) {setData(result);setError("");}
      return result;
    } catch(e) {if(state.active && sequence===state.sequence) {setError(e.message);setData(null);}return null;}
  },[role]);
  useEffect(()=>{const state=ref.current;state.active=true;const initial=setTimeout(refresh,0);const timer=setInterval(refresh,15000);return()=>{state.active=false;state.sequence++;clearTimeout(initial);clearInterval(timer);};},[refresh]);
  const mutate = async (path,body) => { const result=await operation(path,body); await refresh(); return result; };
  return {data,error,refresh,mutate};
}
