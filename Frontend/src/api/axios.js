import axios from 'axios';
import { API_BASE_URL } from './config.js';
import { getCsrfToken, verifySession } from '../auth/session.js';
const api = axios.create({ baseURL: API_BASE_URL + '/api', withCredentials: true, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use(async config => {
  if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) config.headers['X-CSRFToken'] = await getCsrfToken();
  return config;
});
api.interceptors.response.use(response => response, error => {
  if ([401, 403].includes(error.response?.status)) void verifySession();
  return Promise.reject(error);
});
export default api;
