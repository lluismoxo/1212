// Puente entre el diseño (Claude Design) y la API real de 1212.
// El WebView puede hacer fetch directo a la API. Guardamos el token en
// localStorage del WebView. Expuesto como window.API.
(function () {
  // La API es el mismo host que sirve este diseño, puerto 8787.
  // origin = http://localhost:8787  (el diseño se sirve desde /design)
  var BASE = location.origin;

  var ACCESS = "1212_access";
  var REFRESH = "1212_refresh";

  function getAccess() { try { return localStorage.getItem(ACCESS); } catch (e) { return null; } }
  function setTokens(a, r) {
    try { localStorage.setItem(ACCESS, a); localStorage.setItem(REFRESH, r); } catch (e) {}
  }
  function clearTokens() {
    try { localStorage.removeItem(ACCESS); localStorage.removeItem(REFRESH); } catch (e) {}
  }

  async function refreshAccess() {
    var r = localStorage.getItem(REFRESH);
    if (!r) return null;
    var res = await fetch(BASE + "/auth/refresh", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: r }),
    });
    if (!res.ok) { clearTokens(); return null; }
    var d = await res.json();
    setTokens(d.accessToken, d.refreshToken);
    return d.accessToken;
  }

  async function call(path, opts) {
    opts = opts || {};
    var method = opts.method || "GET";
    var auth = opts.auth !== false;
    async function go(token) {
      var headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;
      return fetch(BASE + path, {
        method: method, headers: headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    }
    var token = auth ? getAccess() : null;
    var res = await go(token);
    if (res.status === 401 && auth) {
      var fresh = await refreshAccess();
      if (fresh) res = await go(fresh);
    }
    if (!res.ok) {
      var code = "error";
      try { code = (await res.json()).error || "error"; } catch (e) {}
      var err = new Error(code); err.status = res.status; err.code = code;
      throw err;
    }
    if (res.status === 204) return null;
    return res.json();
  }

  window.API = {
    base: BASE,
    isLoggedIn: function () { return !!getAccess(); },
    setTokens: setTokens,
    clearTokens: clearTokens,
    call: call,
    // atajos
    register: async function (email, password, name) {
      var d = await call("/auth/register", { method: "POST", body: { email: email, password: password, name: name }, auth: false });
      setTokens(d.accessToken, d.refreshToken); return d;
    },
    login: async function (email, password) {
      var d = await call("/auth/login-password", { method: "POST", body: { email: email, password: password }, auth: false });
      setTokens(d.accessToken, d.refreshToken); return d;
    },
    logout: async function () { clearTokens(); },
  };
})();
