export default function SystemNotice({system}) {
  return system.error ? <p role="alert" style={{padding:12,borderRadius:10,background:"#fff0f0",color:"#8d0e12"}}>{system.error} <button onClick={system.refresh}>Retry</button></p> : !system.data ? <p role="status">Loading system records…</p> : null;
}
