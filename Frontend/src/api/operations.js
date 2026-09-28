const API = "http://localhost:7788/api/operations/";
export async function operation(path, body) {
  const headers = { Accept: "application/json" };
  if (body) {
    const csrf = await fetch("http://localhost:7788/api/auth/csrf/", { credentials: "include" });
    if (!csrf.ok) throw new Error("Please sign in again.");
    const cookie = document.cookie.split(";").map(v => v.trim()).find(v => v.startsWith("csrftoken="));
    if (!cookie) throw new Error("Security token is missing. Open the app using localhost.");
    headers["X-CSRFToken"] = decodeURIComponent(cookie.slice(10));
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(API + path, { method: body ? "POST" : "GET", credentials: "include", headers, ...(body ? { body: JSON.stringify(body) } : {}) });
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
