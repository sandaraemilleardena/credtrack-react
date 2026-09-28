const API = "http://localhost:7788";

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
    const csrfResponse = await fetch(`${API}/api/auth/csrf/`, {
      credentials: "include",
    });

    if (!csrfResponse.ok) {
      throw new Error("Unable to initialize security token. Please sign in again.");
    }

    const cookie = document.cookie
      .split(";")
      .map(x => x.trim())
      .find(x => x.startsWith("csrftoken="));

    if (!cookie) {
      throw new Error(
        "Security cookie is missing. Open CredTrack using localhost and sign in again."
      );
    }

    headers["X-CSRFToken"] = decodeURIComponent(
      cookie.slice("csrftoken=".length)
    );
  }

  const response = await fetch(`${API}/api/credentials/${path}`, {
    method,
    headers,
    credentials: publicRequest ? "omit" : "include",
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

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