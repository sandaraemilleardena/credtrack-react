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

  if (body) {
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
    ...(body ? { body: JSON.stringify(body) } : {}),
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
    throw new Error(
      errorText(data) || `Request failed (${response.status}).`
    );
  }

  return data;
}

export const submitCredential = body =>
  call("submit/", {
    method: "POST",
    body,
    publicRequest: true,
  });

export const fetchCredentialQueue = () => call("");

export const actOnCredential = (item, action, note) =>
  call(`${item.id}/action/`, {
    method: "POST",
    body: {
      action,
      version: item.version,
      note,
    },
  });