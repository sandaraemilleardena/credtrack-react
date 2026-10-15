import {useSyncExternalStore} from 'react';
export function preference(){try{return localStorage.getItem('credtrack-theme')==='dark'?'dark':'light';}catch{return document.documentElement.dataset.theme||'light';}}
export function initializeTheme(){document.documentElement.dataset.theme=preference();}
const subscribe=listener=>{window.addEventListener('credtrack-theme',listener);window.addEventListener('storage',listener);return()=>{window.removeEventListener('credtrack-theme',listener);window.removeEventListener('storage',listener);};};
export function useTheme(){return useSyncExternalStore(subscribe,preference,()=> 'light');}
