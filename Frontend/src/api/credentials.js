import { API_BASE_URL as API } from './config.js';
import { getCsrfToken, verifySession } from '../auth/session.js';

function errorText(data) {
  if (typeof data === "string") return data;
  return Object.entries(data || {}).map(([key, value]) =>
    `${key === "detail" ? "" : `${key}: `}${Array.isArray(value) ? value.join(" ") : value}`
  ).join(" ");
}

async function call(path, { method = "GET", body, publicRequest = false } = {}) {
  const headers = { Accept: "application/json" };

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (method !== "GET" && !publicRequest) {
    headers["X-CSRFToken"] = await getCsrfToken();
  }

  const response = await fetch(`${API}/api/credentials/${path}`, {
    method,
    cache: "no-store",
    headers,
    credentials: publicRequest ? "omit" : "include",
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}),
  });

  if (!publicRequest && [401, 403].includes(response.status)) void verifySession();
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The request service is unavailable. Please contact the administrator."
    );
  }

  if (!response.ok) {
    const error = new Error(errorText(data) || `Request failed (${response.status}).`);
    error.fields = data;
    throw error;
  }

  return data;
}

export const submitCredential = values => {
  const body = new FormData();
  Object.entries(values).forEach(([key, value]) => { if (Array.isArray(value)) value.forEach(file => body.append(key, file)); else if (value !== null && value !== undefined) body.append(key, value); });
  return call("submit/", { method: "POST", body, publicRequest: true });
};
export const fetchRequestOptions = () => call("options/", { publicRequest: true });
export const verificationUrl = (id, kind = "verification") => `${API}/api/credentials/${id}/verification/?kind=${kind}`;

export const fetchCredentialQueue = (query = "") => call(query ? `?${query}` : "");

export const actOnCredential = (item, action, note, schedule = {}) =>
  call(`${item.id}/action/`, {
    method: "POST",
    body: {
      action,
      version: item.version,
      note,
      ...schedule,
    },
  });
export const attachVerification = (item, file) => {
 const body = new FormData(); body.append('verification_document',file); body.append('version',item.version);
 return call(`${item.id}/verification/upload/`,{method:'POST',body});
};

export const trackCredential = tracking_token => call("track/", {method:"POST", body:{tracking_token}, publicRequest:true});

export const refreshSmsStatus = item => call(`${item.id}/sms/status/`, {method:"POST", body:{}});
