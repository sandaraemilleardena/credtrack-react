import { API_BASE_URL } from './config.js';
import { getCsrfToken, verifySession } from '../auth/session.js';
const API = API_BASE_URL + '/api/operations/';
export async function operation(path, body) {
  const headers = { Accept: "application/json" };
  if (body) {
    headers["X-CSRFToken"] = await getCsrfToken();
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(API + path, { method: body ? "POST" : "GET", credentials: "include", cache: "no-store", headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  if ([401, 403].includes(response.status)) void verifySession();
  let data;
  try { data = await response.json(); } catch { throw new Error("The server could not complete the request."); }
  if (!response.ok) throw new Error(typeof data === "string" ? data : Array.isArray(data) ? data.join(" ") : Object.entries(data).map(([key,value]) => `${key === "detail" ? "" : key+": "}${Array.isArray(value) ? value.join(" ") : value}`).join(" "));
  return data;
}
export function downloadCSV(filename, rows) {
  const cell = value => '"' + String(value ?? "").replace(/^[=+@-]/, match => "'"+match).replaceAll('"','""') + '"';
  const blob = new Blob(["\ufeff" + rows.map(row => row.map(cell).join(",")).join("\r\n")], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
