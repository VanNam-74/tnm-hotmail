async function req(path, { method = "GET", body, params } = {}) {
  let url = path;
  if (params) {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
    );
    url += (url.includes("?") ? "&" : "?") + q.toString();
  }
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  me: () => req("/api/auth/me"),
  login: (username, password, remember_me) =>
    req("/api/auth/login", { method: "POST", body: { username, password, remember_me } }),
  logout: () => req("/api/auth/logout", { method: "POST" }),

  profiles: (page = 1, limit = 25) => req("/api/filter/profiles", { params: { page, limit } }),
  search: (payload, page = 1, limit = 25) =>
    req("/api/filter/search", { method: "POST", body: payload, params: { page, limit } }),
  detail: (id) => req(`/api/filter/detail/${id}`),

  gettokenImport: () => req("/api/gettoken/import", { method: "POST", body: {} }),
  gettokenImportProgress: () => req("/api/gettoken/import/progress"),
  gettokenConfig: () => req("/api/gettoken/config"),
  gettokenSaveConfig: (cfg) => req("/api/gettoken/config", { method: "POST", body: cfg }),
  gettokenRun: (body = {}) => req("/api/gettoken/run", { method: "POST", body }),
  gettokenProgress: () => req("/api/gettoken/progress"),

  shareAccounts: () => req("/api/share/accounts"),
  shareCreate: (label, allowed_emails) =>
    req("/api/share/create", { method: "POST", body: { label, allowed_emails } }),
  shareList: () => req("/api/share/list"),
  shareRevoke: (key) => req("/api/share/revoke", { method: "POST", body: { key } }),
  peers: () => req("/api/share/peers"),
  peerAdd: (name, url, key, gateway_mac) =>
    req("/api/share/peers/add", { method: "POST", body: { name, url, key, gateway_mac } }),
  peerTest: (url, key) => req("/api/share/peers/test", { method: "POST", body: { url, key } }),
  peerPull: (id) => req(`/api/share/peers/${id}/pull`, { method: "POST" }),
  peerDelete: (id) => req(`/api/share/peers/${id}`, { method: "DELETE" }),

  settings: () => req("/api/settings"),
  settingUpdate: (section, key, value) =>
    req("/api/settings/update", { method: "POST", body: { section, key, value } }),

  // ---- API bổ sung (tnm-api-samples) ----
  notifications: (unread = 0, limit = 20) => req("/api/notifications", { params: { unread, limit } }),
  notificationsRead: (ids, all = false) => req("/api/notifications/read", { method: "POST", body: { ids, all } }),
  shareStatus: () => req("/api/share/status"),
  filterExport: async (payload) => {
    const res = await fetch("/api/filter/export", {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || "tnm-accounts.csv";
    return { blob: await res.blob(), name };
  },
  gettokenRecheck: (ids) => req("/api/gettoken/recheck", { method: "POST", body: { ids } }),
  gettokenHistory: (limit = 10, kind) => req("/api/gettoken/history", { params: { limit, kind } }),
  gettokenLog: (kind = "run") => req("/api/gettoken/log", { params: { kind } }),
  gettokenStop: () => req("/api/gettoken/stop", { method: "POST" }),
  gettokenImportStop: () => req("/api/gettoken/import/stop", { method: "POST" }),
  serverRestart: (target = "ui") => req("/api/server/restart", { method: "POST", body: { target } }),
  testEoffice: (host, timeout) => req("/api/settings/test-eoffice", { method: "POST", body: { host, timeout } }),
  overview: () => req("/api/overview"),
};