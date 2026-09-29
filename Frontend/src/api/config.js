// Keep local cookies on the same hostname (localhost or 127.0.0.1).
const host = globalThis.location?.hostname || 'localhost';
const local = host === 'localhost' || host === '127.0.0.1';
export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL ||
  (local ? globalThis.location?.protocol + '//' + host + ':7788' : '')).replace(/\/$/, '');
