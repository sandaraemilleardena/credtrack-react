import {useSyncExternalStore} from 'react';
import './Theme.css';
import './ThemePalette.css';
import {preference} from '../theme';
const subscribe=listener=>{window.addEventListener('credtrack-theme',listener);window.addEventListener('storage',listener);return()=>{window.removeEventListener('credtrack-theme',listener);window.removeEventListener('storage',listener);};};
export default function ThemeToggle({floating=false}){
 const mode=useSyncExternalStore(subscribe,preference,()=> 'light');
 function toggle(){const next=mode==='dark'?'light':'dark';try{localStorage.setItem('credtrack-theme',next);}catch{/* Keep the session preference when storage is unavailable. */}document.documentElement.dataset.theme=next;window.dispatchEvent(new Event('credtrack-theme'));}
 return <button type="button" className={`theme-toggle ${floating?'theme-toggle-floating':''}`} aria-label={`Switch to ${mode==='dark'?'light':'dark'} mode`} aria-pressed={mode==='dark'} onClick={toggle}>{mode==='dark'?'☀':'☾'}<span className="theme-toggle-label"> {mode==='dark'?'Light':'Dark'} mode</span></button>;
}
