// Puente entre el diseño (Claude Design) y la API real de 1212.
//
// Dos capas:
//   1) window.API  — cliente HTTP con refresh de tokens (localStorage del WebView).
//   2) Wiring del diseño — toma la instancia de la lógica (class Component extends
//      DCLogic) vía el fiber de React, y reemplaza sus métodos de datos (login,
//      hábitos, tareas) por llamadas reales. NO toca el markup del diseño.
//
// El diseño se sirve en /design; la API es el mismo origin (puerto 8787).
(function () {
  var BASE = location.origin;
  var ACCESS = "1212_access";
  var REFRESH = "1212_refresh";

  function getAccess() { try { return localStorage.getItem(ACCESS); } catch (e) { return null; } }
  function setTokens(a, r) { try { localStorage.setItem(ACCESS, a); localStorage.setItem(REFRESH, r); } catch (e) {} }
  function clearTokens() { try { localStorage.removeItem(ACCESS); localStorage.removeItem(REFRESH); } catch (e) {} }

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
    register: async function (email, password, name) {
      var d = await call("/auth/register", { method: "POST", body: { email: email, password: password, name: name }, auth: false });
      setTokens(d.accessToken, d.refreshToken); return d;
    },
    login: async function (email, password) {
      var d = await call("/auth/login-password", { method: "POST", body: { email: email, password: password }, auth: false });
      setTokens(d.accessToken, d.refreshToken); return d;
    },
    logout: function () { clearTokens(); },
    // datos
    habits: function () { return call("/habits"); },
    habitsToday: function () { return call("/habits/today"); },
    createHabit: function (name) { return call("/habits", { method: "POST", body: { name: name } }); },
    setHabitLog: function (id, done) { return call("/habits/" + id + "/log", { method: "PUT", body: { done: done } }); },
    tasks: function () { return call("/tasks"); },
    createTask: function (text) { return call("/tasks", { method: "POST", body: { text: text } }); },
    setTask: function (id, done) { return call("/tasks/" + id, { method: "PATCH", body: { done: done } }); },
    delTask: function (id) { return call("/tasks/" + id, { method: "DELETE" }); },
    level: function () { return call("/levels/me"); },
    me: function () { return call("/profiles/me"); },
    communities: function () { return call("/communities"); },
    joinCommunity: function (id) { return call("/communities/" + id + "/join", { method: "POST" }); },
    comMembers: function (id) { return call("/communities/" + id + "/members"); },
    createCommunity: function (data) { return call("/communities", { method: "POST", body: data }); },
    updateCommunity: function (id, data) { return call("/communities/" + id, { method: "PATCH", body: data }); },
    journalList: function () { return call("/journal?limit=30"); },
    journalGet: function (date) { return call("/journal/" + date); },
    journalSave: function (date, body) { return call("/journal/" + date, { method: "PUT", body: { body: body } }); },
    saveLocation: function (lat, lng) { return call("/location/me", { method: "PUT", body: { lat: lat, lng: lng } }); },
    nearby: function (lat, lng, radiusKm) { return call("/location/nearby?lat=" + lat + "&lng=" + lng + "&radiusKm=" + (radiusKm || 20000) + "&limit=200"); },
    setSharing: function (mode) { return call("/profiles/me", { method: "PATCH", body: { locationSharing: mode } }); },
  };

  // ----------------------------------------------------------------------------
  // Retorno de Google OAuth: el callback vuelve a /design/index.html con los
  // tokens en el fragmento (#access=...&refresh=...). Los guardamos y limpiamos
  // la URL para no dejarlos a la vista. Marcamos que venimos de login Google
  // para que el wiring entre directo a home.
  var cameFromGoogle = false;
  (function captureOAuthFragment() {
    if (!location.hash || location.hash.length < 2) return;
    var f = new URLSearchParams(location.hash.slice(1));
    var access = f.get("access"), refresh = f.get("refresh");
    if (access && refresh) {
      setTokens(access, refresh);
      cameFromGoogle = true;
    }
    // limpiar el fragmento de la barra de direcciones (sin recargar)
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  })();

  // ¿Estamos dentro del WebView de React Native? (la app inyecta este puente)
  var inReactNative = typeof window.ReactNativeWebView !== "undefined";

  // La app nativa nos entrega los tokens tras el login Google en Safari.
  // Guardamos sesión y, si el logic ya está cableado, entramos a home.
  var enterHomeWithSession = null; // lo define el wiring cuando monta
  window.__1212_setSession = function (access, refresh) {
    if (!access || !refresh) return;
    setTokens(access, refresh);
    cameFromGoogle = true;
    if (enterHomeWithSession) enterHomeWithSession();
  };

  // ----------------------------------------------------------------------------
  // Capa 2: wiring del diseño
  // ----------------------------------------------------------------------------

  // Encuentra la instancia de la lógica del autor recorriendo el fiber de React.
  // El host guarda la lógica en `.logic` (ver support.js). Buscamos un fiber
  // cuyo stateNode tenga `.logic` con `state.habits` (es nuestro Component).
  function findLogic() {
    var root = document.getElementById("app") || document.body;
    var nodes = root.querySelectorAll("*");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = Object.keys(el).find(function (k) {
        return k.indexOf("__reactFiber$") === 0 || k.indexOf("__reactInternalInstance$") === 0;
      });
      if (!key) continue;
      var f = el[key];
      var guard = 0;
      while (f && guard++ < 80) {
        var sn = f.stateNode;
        if (sn && sn.logic && sn.logic.state && sn.logic.state.habits !== undefined) {
          return sn.logic;
        }
        f = f.return;
      }
    }
    return null;
  }

  // Espera a que la lógica monte y la cablea una sola vez.
  var wired = false;
  function tryWire() {
    if (wired) return true;
    var logic = findLogic();
    if (!logic) return false;
    wired = true;
    wire(logic);
    return true;
  }

  function poll() {
    if (tryWire()) return;
    setTimeout(poll, 150);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(poll, 200); });
  } else {
    setTimeout(poll, 200);
  }

  // ------- mini modal de login/registro (sustituye a Google/Apple por ahora) ----
  function authModal() {
    return new Promise(function (resolve) {
      var ov = document.createElement("div");
      ov.style.cssText = "position:absolute;inset:0;z-index:999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(6px);font-family:'Satoshi',system-ui,sans-serif";
      ov.innerHTML =
        '<div style="width:100%;max-width:393px;background:#0e0e10;border-top-left-radius:28px;border-top-right-radius:28px;padding:26px 24px 34px;border:1px solid rgba(255,255,255,.08)">' +
          '<div style="width:38px;height:4px;border-radius:2px;background:rgba(255,255,255,.18);margin:0 auto 20px"></div>' +
          '<div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:4px">Entra en 1212</div>' +
          '<div id="b_sub" style="font-size:13px;color:rgba(255,255,255,.45);margin-bottom:18px">Usa tu email para entrar o crear tu cuenta.</div>' +
          '<input id="b_email" type="email" autocapitalize="none" autocorrect="off" placeholder="email@ejemplo.com" style="width:100%;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;font-size:15px;padding:0 16px;outline:none;margin-bottom:10px"/>' +
          '<input id="b_pass" type="password" placeholder="Contraseña (mín. 8)" style="width:100%;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;font-size:15px;padding:0 16px;outline:none;margin-bottom:10px"/>' +
          '<input id="b_name" type="text" placeholder="Tu nombre (solo para crear cuenta)" style="width:100%;height:52px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;font-size:15px;padding:0 16px;outline:none;margin-bottom:6px"/>' +
          '<div id="b_err" style="color:#ff6b6b;font-size:13px;min-height:18px;margin:2px 2px 8px"></div>' +
          '<button id="b_login" style="width:100%;height:54px;border:none;border-radius:16px;background:#fff;color:#070707;font-size:16px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:10px">Entrar</button>' +
          '<button id="b_reg" style="width:100%;height:54px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.05);color:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit">Crear cuenta</button>' +
        '</div>';
      var host = document.getElementById("app") || document.body;
      host.appendChild(ov);
      var email = ov.querySelector("#b_email");
      var pass = ov.querySelector("#b_pass");
      var name = ov.querySelector("#b_name");
      var err = ov.querySelector("#b_err");
      setTimeout(function () { email.focus(); }, 50);

      function msg(code) {
        return code === "email_taken" ? "Ese email ya está registrado. Pulsa Entrar." :
          code === "invalid_credentials" ? "Email o contraseña incorrectos." :
          code === "weak_password" ? "La contraseña debe tener al menos 8 caracteres." :
          "No se pudo completar. Revisa los datos.";
      }
      async function run(mode) {
        err.textContent = "";
        var e = (email.value || "").trim();
        var p = pass.value || "";
        if (!e || !p) { err.textContent = "Email y contraseña obligatorios."; return; }
        try {
          if (mode === "register") {
            await window.API.register(e, p, (name.value || "").trim() || "Usuario");
          } else {
            await window.API.login(e, p);
          }
          host.removeChild(ov);
          resolve(true);
        } catch (ex) {
          err.textContent = msg(ex.code);
        }
      }
      ov.querySelector("#b_login").onclick = function () { run("login"); };
      ov.querySelector("#b_reg").onclick = function () { run("register"); };
      ov.addEventListener("click", function (ev) { if (ev.target === ov) { host.removeChild(ov); resolve(false); } });
    });
  }

  // ------- carga de datos reales en el state del diseño -------
  // Mapea hábitos del backend al shape del diseño: { id, name, days:[7 bools] }.
  // El backend trabaja por día (hoy = TODAY index). Rellenamos solo el día de hoy
  // con el log real; el resto de la semana queda en false (histórico vendrá luego).
  // El diseño saca el NIVEL de `cur()` -> `this.props.level`, y el NOMBRE de
  // `this.props.userName`. Sobreescribimos ambos con datos reales una sola vez.
  // El runtime reconstruye logic.props desde host.props en cada render, así que
  // mutar props no persiste. El punto de inyección estable es renderVals(): el
  // diseño lo llama en cada render para construir el objeto de valores de la
  // plantilla ({{ name }}, {{ levelNum }}, ...). Lo envolvemos una vez.
  var realData = { level: 1, name: null };
  function applyLevelName(logic, levelNum, name) {
    realData.level = Math.max(1, Math.min(9, levelNum || 1));
    if (name) realData.name = name;
    logic.cur = function () { return realData.level; };
    if (logic.__rvWrapped) { logic.forceUpdate && logic.forceUpdate(); return; }
    var origRV = logic.renderVals.bind(logic);
    logic.renderVals = function () {
      var v = origRV();
      var lv = (logic.LEVELS && logic.LEVELS[realData.level - 1]) || null;
      if (realData.name) v.name = realData.name;
      v.levelNum = realData.level;
      if (lv) { v.levelName = lv.name; v.levelAura = lv.aura; }
      return v;
    };
    logic.__rvWrapped = true;
    logic.forceUpdate && logic.forceUpdate();
  }

  async function loadData(logic) {
    try {
      // estadísticas reales (también para el resumen del home: racha, etc.)
      window.API.call("/profiles/me/stats").then(function (s) {
        logic.setState({ stats: { diasActivos: s.diasActivos, habitos: s.habitos, racha: s.racha, diario: s.diario } });
      }).catch(function () {});
      var TODAY = logic.TODAY != null ? logic.TODAY : 6;
      var hs = await window.API.habits();
      var logs = await window.API.habitsToday(); // [{habit_id, log_date, done}]
      var doneSet = {};
      (logs || []).forEach(function (l) { if (l.done) doneSet[l.habit_id] = true; });
      var habits = (hs || []).map(function (h) {
        var days = [false, false, false, false, false, false, false];
        days[TODAY] = !!doneSet[h.id];
        return { id: h.id, name: h.name, days: days };
      });

      var ts = await window.API.tasks();
      var tasks = (ts || []).map(function (t) { return { id: t.id, text: t.text, done: !!t.done }; });

      var lv = await window.API.level();
      var prof = null;
      try { prof = await window.API.me(); } catch (e) {}

      applyLevelName(logic, lv ? lv.current_level : 1, prof && (prof.display_name || prof.username));

      logic.setState({
        habits: habits,
        tasks: tasks,
        progress: lv && typeof lv.progress === "number" ? lv.progress : 0,
      });
      console.info("[bridge] loadData OK: habits=" + habits.length + " tasks=" + tasks.length + " level=" + (lv ? lv.current_level : "?") + " name=" + (prof ? prof.display_name : "?"));
    } catch (ex) {
      console.warn("[bridge] loadData ERR:", ex && ex.message);
    }
  }

  // ------- cableado de métodos del diseño -------
  function wire(logic) {
    // 1) Login: el diseño va auth -> goProfile (crear perfil) -> ... -> enterApp.
    //    Interceptamos goProfile cuando estamos en 'auth': pedimos login real y,
    //    si ya hay sesión, saltamos directo a home con datos.
    var origGoProfile = logic.go ? null : null;
    var methods = logic; // los métodos viven en la instancia

    // Guardamos referencias originales.
    var _enterApp = logic.enterApp && logic.enterApp.bind(logic);
    var _toggleHabit = logic.toggleHabit.bind(logic);
    var _toggleTask = logic.toggleTask.bind(logic);
    var _addTask = logic.addTask.bind(logic);

    // Helper: index de hábito/tarea -> id real (desde el state actual).
    function habitIdAt(hi) { var h = logic.state.habits[hi]; return h && h.id; }
    function taskIdAt(ti) { var t = logic.state.tasks[ti]; return t && t.id; }

    // toggleHabit(hi, di): solo HOY es editable (el diseño ya lo fuerza).
    logic.toggleHabit = function (hi, di) {
      var TODAY = logic.TODAY != null ? logic.TODAY : 6;
      if (di !== TODAY) return;
      var id = habitIdAt(hi);
      var willBe = !(logic.state.habits[hi] && logic.state.habits[hi].days[di]);
      _toggleHabit(hi, di); // optimista (UI inmediata)
      if (id != null) {
        window.API.setHabitLog(id, willBe).catch(function (e) {
          console.warn("[bridge] setHabitLog:", e.message); _toggleHabit(hi, di); // revertir
        });
      }
    };

    // toggleTask(ti): el diseño marca y luego filtra las hechas a los 420ms.
    logic.toggleTask = function (ti) {
      var id = taskIdAt(ti);
      var willBe = !(logic.state.tasks[ti] && logic.state.tasks[ti].done);
      _toggleTask(ti);
      if (id != null) window.API.setTask(id, willBe).catch(function (e) { console.warn("[bridge] setTask:", e.message); });
    };

    // addTask(): crea en backend y usa el id real.
    logic.addTask = function () {
      var v = (logic.state.taskDraft || "").trim();
      if (!v) return;
      logic.setState({ taskDraft: "" });
      window.API.createTask(v).then(function (t) {
        logic.setState(function (st) { return { tasks: st.tasks.concat([{ id: t.id, text: t.text, done: false }]) }; });
      }).catch(function (e) { console.warn("[bridge] createTask:", e.message); });
    };

    // createHabit(): crea en backend, usa el id real en el state.
    var _createHabit = logic.createHabit && logic.createHabit.bind(logic);
    if (_createHabit) {
      logic.createHabit = function () {
        var v = (logic.state.habitDraft || "").trim();
        if (!v) { logic.setState({ sheet: null }); return; }
        logic.setState({ sheet: null, habitDraft: "" });
        var TODAY = logic.TODAY != null ? logic.TODAY : 6;
        window.API.createHabit(v).then(function (h) {
          logic.setState(function (st) {
            var days = [false, false, false, false, false, false, false];
            return { habits: st.habits.concat([{ id: h.id, name: h.name, days: days }]) };
          });
        }).catch(function (e) { console.warn("[bridge] createHabit:", e.message); });
      };
    }

    // deleteHabit(): archiva en backend.
    var _deleteHabit = logic.deleteHabit && logic.deleteHabit.bind(logic);
    if (_deleteHabit) {
      logic.deleteHabit = function () {
        var idx = logic.state.selHabit;
        var h = logic.state.habits[idx];
        _deleteHabit();
        if (h && h.id != null) {
          window.API.call("/habits/" + h.id, { method: "DELETE" }).catch(function (e) { console.warn("[bridge] deleteHabit:", e.message); });
        }
      };
    }

    // enterApp(): al entrar a home, cargamos datos reales.
    if (_enterApp) {
      logic.enterApp = function () { _enterApp(); loadData(logic); };
    }

    // Entra a home cargando datos reales. Lo exponemos para que el callback de
    // Google (window.__1212_setSession) pueda usarlo aunque llegue tarde.
    enterHomeWithSession = function () {
      logic.setState({ screen: "home", stack: [] });
      loadData(logic);
    };

    // Si volvemos de Google con sesión ya guardada, o ya había sesión en storage,
    // entramos directos a home con datos reales.
    if (cameFromGoogle && window.API.isLoggedIn()) {
      enterHomeWithSession();
    }

    // 2) Botones de auth. Google bloquea el login dentro de WebViews, así que:
    //    - en la app (React Native): pedimos abrir Safari (postMessage); la app
    //      vuelve con los tokens vía window.__1212_setSession.
    //    - en navegador web: navegamos a /auth/google/start?return=web.
    //    Apple/otros -> mini-form de email por ahora.
    document.addEventListener("click", async function (ev) {
      var b = ev.target.closest && ev.target.closest("button");
      if (!b) return;
      var txt = (b.textContent || "").trim();
      if (txt.indexOf("Continuar con Google") === 0) {
        ev.preventDefault();
        ev.stopPropagation();
        if (window.API.isLoggedIn()) { enterHomeWithSession(); return; }
        if (inReactNative) {
          // la app abrirá Safari (Google no permite WebView) y nos devolverá tokens.
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "google-login" }));
        } else {
          window.location.href = window.API.base + "/auth/google/start?return=web";
        }
        return;
      }
      if (txt.indexOf("Continuar con Apple") === 0) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!window.API.isLoggedIn()) {
          var ok = await authModal();
          if (!ok) return;
        }
        enterHomeWithSession();
      }
    }, true);

    // ------- AJUSTES: funciones expuestas a los botones del diseño -------
    // Cerrar sesión.
    window.__1212_logout = function () {
      var rt = null;
      try { rt = localStorage.getItem("1212_refresh"); } catch (e) {}
      if (rt) window.API.call("/auth/logout", { method: "POST", auth: false, body: { refreshToken: rt } }).catch(function () {});
      window.API.clearTokens();
      logic.USERS = [];
      logic.setState({ screen: "auth", stack: [], sheet: null, habits: [], tasks: [], communities: [] });
    };

    // Cargar los datos de la cuenta al abrir Ajustes > Cuenta.
    function loadAccount() {
      window.API.me().then(function (p) {
        // enlaces sociales: array [{kind,url}] -> objeto {kind:url} para los inputs
        var links = {};
        (p.links || []).forEach(function (l) { links[l.kind] = l.url; });
        logic.setState({ acct: {
          display_name: p.display_name || "", username: p.username || "",
          location_sharing: p.location_sharing || "city",
          links: links,
        } });
      }).catch(function (e) { console.warn("[bridge] account:", e.message); });
    }

    // Guardar la cuenta: nombre/usuario (PATCH /profiles/me) + enlaces sociales
    // (PUT /profiles/me/links). Solo datos reales del perfil.
    window.__1212_saveAccount = function (a) {
      var body = {};
      if (a.display_name != null) body.displayName = a.display_name;
      if (a.username != null && a.username.trim()) body.username = a.username.trim().replace(/^@/, "");
      // enlaces: objeto {kind:url} -> array, descartando vacíos
      var links = [];
      var L = a.links || {};
      Object.keys(L).forEach(function (k) { var v = (L[k] || "").trim(); if (v) links.push({ kind: k, url: v }); });
      var p1 = window.API.call("/profiles/me", { method: "PATCH", body: body });
      var p2 = window.API.call("/profiles/me/links", { method: "PUT", body: { links: links } });
      Promise.all([p1, p2]).then(function () {
        applyLevelName(logic, realData.level, a.display_name || realData.name);
        logic.setState({ sheet: "settings" });
      }).catch(function (e) { console.warn("[bridge] saveAccount:", e.code || e.message); });
    };

    // Cambiar la visibilidad de la ubicación (location_sharing).
    window.__1212_setSharing = function (mode) {
      window.API.setSharing(mode).catch(function () {});
      logic.setState(function (st) { return { acct: Object.assign({}, st.acct || {}, { location_sharing: mode }) }; });
    };

    // Notificaciones y permisos: necesitan la app nativa. Si estamos en el WebView
    // de React Native, le pedimos por postMessage; si no (web), avisamos.
    window.__1212_toggleNotif = function (on) {
      logic.setState({ notifOn: on });
      if (inReactNative) window.ReactNativeWebView.postMessage(JSON.stringify({ type: "notif", on: on }));
      else if (on && "Notification" in window && Notification.requestPermission) {
        Notification.requestPermission().then(function (r) { if (r !== "granted") logic.setState({ notifOn: false }); });
      }
    };
    // La app nativa nos dice si concedió el permiso de notificaciones.
    window.__1212_notifResult = function (granted) { logic.setState({ notifOn: !!granted }); };
    window.__1212_openPerm = function (which) {
      if (inReactNative) window.ReactNativeWebView.postMessage(JSON.stringify({ type: "perm", which: which }));
    };

    // Mostrar un documento legal (markdown servido en /legal).
    window.__1212_openDoc = function (slug, title) {
      var box = document.getElementById("legalDocView");
      if (box) box.textContent = "Cargando…";
      fetch(window.API.base + "/legal/" + slug + ".md").then(function (r) { return r.text(); }).then(function (md) {
        var el = document.getElementById("legalDocView");
        if (el) el.textContent = md;
      }).catch(function () {
        var el = document.getElementById("legalDocView");
        if (el) el.textContent = "No se pudo cargar el documento.";
      });
    };

    // Si ya había sesión al cargar (token en storage), permitir entrar sin re-login
    // dejando que el flujo del diseño avance normal; los datos se cargan en enterApp.

    // ------- COMUNIDADES: lista real -------
    // El diseño lee state.communities con shape {id,n,m,a,c,desc,goal,parts,msgs}.
    // Mapeamos las comunidades reales del backend a ese shape.
    var DEFAULT_COLORS = ["#2C7D63", "#155040"];
    function mapCommunity(c) {
      var cols = Array.isArray(c.colors) && c.colors.length >= 2 ? c.colors : DEFAULT_COLORS;
      return {
        id: c.id,
        slug: c.slug,
        n: (c.name || "").toUpperCase(),
        m: String(c.members != null ? c.members : 0),
        a: c.joined ? "Te has unido" : "Pública",
        c: cols,
        desc: c.description || "Comunidad de 1212.",
        goal: c.goal || "Define el objetivo del grupo.",
        joined: !!c.joined,
        parts: [],   // miembros: se cargan al abrir detalle
        msgs: [],    // mensajes: idem
      };
    }
    function loadCommunities() {
      window.API.call("/communities").then(function (list) {
        var coms = (list || []).map(mapCommunity);
        logic.setState({ communities: coms });
      }).catch(function (e) { console.warn("[bridge] communities:", e.message); });
    }

    // ------- DETALLE DE COMUNIDAD: chat + miembros reales -------
    // El nombre del usuario actual (para marcar mensajes propios con me:true).
    function mapPart(p) {
      return { nm: p.display_name || p.username, lvl: p.current_level || 1, c: ["#9A8748", "#D0AE5A"] };
    }

    // El diseño de la comunidad muestra info + participantes (NO tiene UI de chat
    // visible, aunque su lógica sendMsg/msgs exista huérfana). Por eso solo
    // cargamos los MIEMBROS reales al abrir el detalle.
    function loadComDetail(ci) {
      var com = logic.state.communities[ci];
      if (!com || com.id == null) return;
      var id = com.id;
      // unirse es idempotente; necesario para poder leer la lista de miembros.
      window.API.joinCommunity(id).catch(function () {}).then(function () {
        return window.API.comMembers(id).catch(function () { return []; });
      }).then(function (rows) {
        var parts = (rows || []).map(mapPart);
        logic.setState(function (st) {
          return {
            communities: st.communities.map(function (c, i) {
              return i === ci ? Object.assign({}, c, { parts: parts, joined: true }) : c;
            }),
          };
        });
      }).catch(function (e) { console.warn("[bridge] comDetail:", e.message); });
    }

    // openCom(i): abre el detalle (lo hace el original) + carga miembros reales.
    var _openCom = logic.openCom && logic.openCom.bind(logic);
    if (_openCom) {
      logic.openCom = function (i) { _openCom(i); loadComDetail(i); };
    }

    // createCom(): crea la comunidad real (POST /communities) y usa el id real.
    // El diseño no genera slug; lo derivamos del nombre.
    function slugify(s) {
      return (s || "")
        .normalize("NFD").replace(/[̀-ͯ]/g, "") // quita acentos
        .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        .slice(0, 40) || "comunidad";
    }
    var _createCom = logic.createCom && logic.createCom.bind(logic);
    if (_createCom) {
      logic.createCom = function () {
        var d = logic.state.newCom;
        if (!d || !(d.name || "").trim()) { logic.setState({ sheet: null }); return; }
        var payload = {
          slug: slugify(d.name) + "-" + Date.now().toString(36).slice(-4), // único
          name: d.name.trim(),
          description: (d.desc || "").trim() || undefined,
          goal: (d.goal || "").trim() || undefined,
          colors: Array.isArray(d.c) ? d.c : undefined,
          isPrivate: false,
        };
        // cerramos la hoja ya; navegamos al detalle cuando llegue el id real.
        logic.setState({ sheet: null });
        window.API.createCommunity(payload).then(function (com) {
          var mapped = mapCommunity(com);
          // creador entra como moderador; lo marcamos unido y abrimos su detalle.
          mapped.joined = true;
          logic.setState(function (st) {
            return {
              communities: [mapped].concat(st.communities),
              newCom: null,
              selCom: 0,
              comTab: "foro",
              stack: st.stack.concat([st.screen]),
              screen: "comDetail",
            };
          });
          loadComDetail(0);
        }).catch(function (e) { console.warn("[bridge] createCom:", e.message); });
      };
    }

    // saveEditCom(): edita la comunidad en el backend (PATCH). El diseño ya
    // actualiza el state local; aquí persistimos.
    var _saveEditCom = logic.saveEditCom && logic.saveEditCom.bind(logic);
    if (_saveEditCom) {
      logic.saveEditCom = function () {
        var d = logic.state.newCom;
        var id = logic.state.editingCom;
        _saveEditCom(); // actualiza UI local + cierra hoja
        if (!d || id == null) return;
        window.API.updateCommunity(id, {
          name: (d.name || "").trim() || undefined,
          description: (d.desc || "").trim() || undefined,
          goal: (d.goal || "").trim() || undefined,
          colors: Array.isArray(d.c) ? d.c : undefined,
        }).catch(function (e) { console.warn("[bridge] saveEditCom:", e.message); });
      };
    }

    // ------- BUSCAR PERFILES: resultados reales -------
    // buildSearch() filtra this.USERS por searchQuery. Alimentamos this.USERS con
    // resultados reales de /profiles/search (debounce) y forzamos re-render.
    function mapUser(p) {
      return {
        nm: p.display_name || p.username,
        user: "@" + p.username,
        username: p.username, // plano, para enriquecer el perfil al abrirlo
        lvl: p.current_level || 1,
        c: ["#9A8748", "#D0AE5A"],
        links: [],
        city: p.city || null,
      };
    }
    var searchTimer = null;
    // El input de buscar es value-controlado por searchQuery (state). Interceptamos
    // el input, sincronizamos searchQuery en el state (para que el texto NO se borre)
    // y, con debounce, alimentamos this.USERS con /profiles/search.
    document.addEventListener("input", function (ev) {
      var el = ev.target;
      if (!el || el.tagName !== "INPUT") return;
      var ph = (el.getAttribute("placeholder") || "");
      if (ph.indexOf("nombre de usuario") < 0) return; // solo el input de buscar
      var raw = el.value || "";
      var term = raw.trim();
      // mantener el texto en el state (si no, el value-controlado lo resetea)
      logic.setState({ searchQuery: raw });
      clearTimeout(searchTimer);
      if (term.length < 2) { logic.USERS = []; return; }
      searchTimer = setTimeout(function () {
        window.API.call("/profiles/search?q=" + encodeURIComponent(term)).then(function (rows) {
          logic.USERS = (rows || []).map(mapUser);
          logic.forceUpdate && logic.forceUpdate();
        }).catch(function (e) { console.warn("[bridge] search:", e.message); });
      }, 300);
    }, true);

    // ------- PERFIL PÚBLICO: al abrir un miembro, enriquecer con datos reales -------
    // openMember(p) abre la hoja con selMember. Si tenemos el username (de la
    // búsqueda), pedimos /profiles/:username y rellenamos city/nivel reales.
    function findUsername(p) {
      if (p && p.username) return p.username;
      if (p && p.user) return String(p.user).replace(/^@/, "");
      // buscar en USERS por nombre
      var hit = (logic.USERS || []).filter(function (u) { return u.nm === (p && p.nm); })[0];
      return hit && hit.username;
    }
    var _openMember = logic.openMember && logic.openMember.bind(logic);
    if (_openMember) {
      logic.openMember = function (p) {
        _openMember(p); // abre la hoja ya (datos que haya)
        var un = findUsername(p);
        if (!un) return;
        window.API.call("/profiles/" + encodeURIComponent(un), { auth: false }).then(function (prof) {
          if (!prof) return;
          logic.setState(function (st) {
            if (!st.selMember) return {};
            var m = Object.assign({}, st.selMember, {
              nm: prof.display_name || st.selMember.nm,
              user: "@" + prof.username,
              city: prof.city || st.selMember.city,
              lvl: (prof.level && prof.level.current_level) || st.selMember.lvl,
            });
            return { selMember: m };
          });
        }).catch(function (e) { console.warn("[bridge] perfil:", e.message); });
      };
    }

    // ------- DIARIO: entrada de hoy + historial reales -------
    // El diseño tiene un <textarea> sin handler de guardado y lee this.JOURNALS
    // (mock) para "Entradas anteriores". Interceptamos el textarea por placeholder
    // (cero cambios en el markup): cargamos la entrada de hoy y guardamos con
    // debounce vía PUT /journal/:fecha.
    var MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    var DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    function todayISO() {
      var d = new Date();
      return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    }
    function fmtEntryDate(iso) {
      // iso 'YYYY-MM-DD' (o con tiempo) -> "Lunes 22 jun"
      var s = String(iso).slice(0, 10).split("-");
      if (s.length < 3) return iso;
      var dt = new Date(+s[0], +s[1] - 1, +s[2]);
      return DIAS[dt.getDay()] + " " + (+s[2]) + " " + MESES[+s[1] - 1];
    }
    function loadJournal() {
      // entrada de hoy -> rellenar el textarea
      window.API.journalGet(todayISO()).then(function (e) {
        var body = (e && e.body) || "";
        var ta = document.querySelector('textarea[placeholder*="sobre tu día"]');
        if (ta && document.activeElement !== ta) ta.value = body;
      }).catch(function () {});
      // historial -> alimentar this.JOURNALS para "Entradas anteriores"
      window.API.journalList().then(function (list) {
        logic.JOURNALS = (list || []).map(function (e) {
          return { d: fmtEntryDate(e.entry_date), t: e.body || "" };
        });
        logic.forceUpdate && logic.forceUpdate();
      }).catch(function (e) { console.warn("[bridge] journalList:", e.message); });
    }
    var journalTimer = null;
    document.addEventListener("input", function (ev) {
      var el = ev.target;
      if (!el || el.tagName !== "TEXTAREA") return;
      if ((el.getAttribute("placeholder") || "").indexOf("sobre tu día") < 0) return;
      var body = el.value;
      clearTimeout(journalTimer);
      journalTimer = setTimeout(function () {
        window.API.journalSave(todayISO(), body).catch(function (e) { console.warn("[bridge] journalSave:", e.message); });
      }, 800);
    }, true);

    // Botón "Guardar entrada" del diario: guarda ya, cierra el teclado y refresca
    // el historial. Se identifica por id (#journalSave, añadido al markup).
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest("#journalSave");
      if (!b) return;
      ev.preventDefault();
      var ta = document.querySelector('textarea[placeholder*="sobre tu día"]');
      var body = ta ? ta.value : "";
      if (ta) ta.blur(); // cierra el teclado
      clearTimeout(journalTimer);
      var orig = b.textContent;
      b.textContent = "Guardando…";
      window.API.journalSave(todayISO(), body).then(function () {
        b.textContent = "Guardado ✓";
        loadJournal();
        setTimeout(function () { b.textContent = orig; }, 1500);
      }).catch(function (e) {
        console.warn("[bridge] journalSave:", e.message);
        b.textContent = orig;
      });
    }, true);

    // ------- MAPA: globo con usuarios reales cercanos (PostGIS) -------
    // initGlobe() del diseño pinta this.USERS (pointLat='lat', pointLng='lng').
    // Al entrar a 'mapa': geolocalizamos el dispositivo, guardamos la posición
    // (PUT /location/me), pedimos cercanos (GET /location/nearby) y alimentamos
    // this.USERS [yo + cercanos]; luego reconstruimos el globo.
    function mapNearby(p, myLat, myLng, isMe) {
      var lat = p.lat != null ? p.lat : myLat;
      var lng = p.lng != null ? p.lng : myLng;
      return {
        nm: p.display_name || p.username || "Tú",
        user: p.username ? "@" + p.username : "",
        username: p.username,
        lvl: p.current_level || 1,
        c: ["#9A8748", "#D0AE5A"],
        city: p.city || "",
        links: [], // el diseño itera u.links.map en la búsqueda; nunca undefined
        lat: lat, lng: lng,
        me: !!isMe,
      };
    }
    // ============================================================================
    //  MAPA — MapLibre GL JS + OpenStreetMap (OpenFreeMap dark), globe 3D.
    //  Reemplaza globe.gl. Tiempo real por polling de /location/nearby.
    //  Marcadores: yo = punto azul pulsante; otros = puntos blancos con glow.
    //  Click en otro usuario -> bottom sheet con su perfil (openMember).
    // ============================================================================
    var MAP = {
      gl: null,            // instancia MapLibre
      markers: {},         // username -> { el, marker }
      myLat: null, myLng: null, myUsername: null,
      poll: null,          // intervalo de polling
      built: false,
    };
    var MAP_STYLE = "https://tiles.openfreemap.org/styles/dark"; // estilo nocturno OSM, sin API key

    // Override de initGlobe(): el diseño lo llama al entrar al mapa. Construimos
    // MapLibre en #globeHost. Idempotente: no recrea si ya existe.
    if (!logic.__globeWrapped) {
      // El diseño rastrea el mapa con this._globe (en componentDidUpdate decide
      // crear/destruir según ese flag). Lo mantenemos sincronizado con MAP.gl,
      // si no, al salir no se destruye y al reentrar no se reconstruye.
      logic.initGlobe = function () { logic._globe = true; buildMapLibre(); };
      logic.destroyGlobe = function () { teardownMap(); logic._globe = null; };
      logic.__globeWrapped = true;
    }

    function teardownMap() {
      if (MAP.poll) { clearInterval(MAP.poll); MAP.poll = null; }
      if (MAP.gl) { try { MAP.gl.remove(); } catch (e) {} MAP.gl = null; }
      MAP.markers = {}; MAP.built = false;
      MAP.meCache = null; MAP.hasRealGeo = false;
      MAP.myLat = null; MAP.myLng = null;
    }

    // Crea el elemento DOM de un marcador (yo azul pulsante / otros blanco glow).
    function makeMarkerEl(isMe) {
      var el = document.createElement("div");
      el.className = isMe ? "mk-me" : "mk-other";
      el.style.cssText = "width:18px;height:18px;border-radius:50%;cursor:pointer;"
        + (isMe
          ? "background:#4FA3FF;box-shadow:0 0 0 4px rgba(79,163,255,.25),0 0 14px 3px rgba(79,163,255,.7);"
          : "background:#fff;box-shadow:0 0 0 3px rgba(255,255,255,.18),0 0 12px 2px rgba(255,255,255,.55);");
      el.style.animation = "mkPulse 2.2s ease-in-out infinite";
      return el;
    }

    // Pinta/actualiza los marcadores sin recrear el mapa (mueve los existentes).
    function renderMarkers(users) {
      if (!MAP.gl || !window.maplibregl) return;
      // Los marcadores son elementos HTML posicionados por lng/lat; NO necesitan
      // que el estilo/tiles estén cargados, solo que el mapa exista. Pintarlos sin
      // esperar a isStyleLoaded/load hace que el punto aparezca de inmediato.
      var seen = {};
      users.forEach(function (u) {
        if (u.lat == null || u.lng == null) return;
        var key = u.username || ("me" + (u.me ? "" : Math.random()));
        seen[key] = true;
        if (MAP.markers[key]) {
          MAP.markers[key].marker.setLngLat([u.lng, u.lat]); // mover, no recrear
          MAP.markers[key].data = u;
        } else {
          var el = makeMarkerEl(!!u.me);
          var marker = new window.maplibregl.Marker({ element: el }).setLngLat([u.lng, u.lat]).addTo(MAP.gl);
          var entry = { el: el, marker: marker, data: u };
          if (!u.me) {
            el.addEventListener("click", function () {
              var d = entry.data;
              if (logic.openMember) logic.openMember({ nm: d.nm, user: d.user, username: d.username, lvl: d.lvl, c: d.c, city: d.city, links: d.links || [] });
            });
          }
          MAP.markers[key] = entry;
        }
      });
      // quitar marcadores de usuarios que ya no están
      Object.keys(MAP.markers).forEach(function (k) {
        if (!seen[k]) { try { MAP.markers[k].marker.remove(); } catch (e) {} delete MAP.markers[k]; }
      });
    }

    // Trae a los usuarios reales (yo + cercanos 'exact') y refresca marcadores.
    // me() se cachea (solo cambia el username/nombre, no en cada tick) para que el
    // refresco sea 1 sola llamada (nearby) y los marcadores aparezcan rápido.
    function paintFrom(me, rows) {
      MAP.myUsername = me && me.username;
      var others = (rows || [])
        .filter(function (r) { return r.username !== MAP.myUsername; })
        .map(function (r) { return mapNearby(r, MAP.myLat, MAP.myLng, false); })
        .filter(function (u) { return u.lat != null && u.lng != null; });
      var list = others;
      if (MAP.hasRealGeo) {
        var meUser = mapNearby({ display_name: me && me.display_name, username: me && me.username, current_level: (me && me.level && me.level.current_level) || (me && me.current_level), city: me && me.city, lat: MAP.myLat, lng: MAP.myLng }, MAP.myLat, MAP.myLng, true);
        list = [meUser].concat(others);
      }
      logic.USERS = list;
      renderMarkers(logic.USERS);
    }
    function refreshUsers() {
      if (MAP.myLat == null) return;
      var mePromise = MAP.meCache ? Promise.resolve(MAP.meCache) : window.API.me().then(function (m) { MAP.meCache = m; return m; });
      Promise.all([mePromise, window.API.nearby(MAP.myLat, MAP.myLng)])
        .then(function (res) { paintFrom(res[0], res[1]); })
        .catch(function (e) { console.warn("[bridge] refreshUsers:", e.message); });
    }

    function buildMapLibre() {
      if (MAP.built) return;
      var host = document.getElementById("globeHost");
      if (!host || !window.maplibregl) { setTimeout(buildMapLibre, 120); return; }
      MAP.built = true;

      MAP.gl = new window.maplibregl.Map({
        container: host,
        style: MAP_STYLE,
        center: [10, 30],
        zoom: 1.6,                  // vista global: se ve el globo
        renderWorldCopies: false,   // mundo único (mejor para globo)
        attributionControl: { compact: true },
        dragRotate: false,          // sin rotación con ratón
        pitchWithRotate: false,
        touchZoomRotate: true,      // zoom/giro táctil
      });

      function applyGlobe() {
        try { MAP.gl.setProjection({ type: "globe" }); } catch (e) { console.warn("[bridge] globe:", e.message); }
        try { MAP.gl.setPaintProperty("background", "background-color", "#05070d"); } catch (e) {}
        // Aro de luz alrededor del globo (halo atmosférico) — más marcado, pero
        // manteniendo el espacio oscuro nocturno y el contraste del mapa.
        try {
          MAP.gl.setFog({
            "color": "rgba(180,205,255,0.45)",     // halo blanco-azulado visible en el borde
            "high-color": "rgba(120,160,230,0.28)", // tinte atmosférico
            "space-color": "#04060c",               // espacio oscuro (contraste)
            "horizon-blend": 0.06,                  // aro más ancho/luminoso
            "star-intensity": 0.08,
          });
        } catch (e) {}
      }
      MAP.gl.on("style.load", applyGlobe);
      MAP.gl.on("load", function () { applyGlobe(); setTimeout(applyGlobe, 400); });

      // Cargamos a los OTROS usuarios cuanto antes (no esperamos a tener geo):
      // usamos la última posición guardada en el backend o una posición por
      // defecto solo para la consulta nearby. El propio marcador se pinta en
      // cuanto la geolocalización del dispositivo responde.
      function startPolling() {
        if (MAP.poll) clearInterval(MAP.poll);
        refreshUsers();
        MAP.poll = setInterval(refreshUsers, 5000);
      }

      if (navigator.geolocation) {
        // 1) intento rápido con baja precisión (responde casi al instante).
        navigator.geolocation.getCurrentPosition(function (pos) {
          MAP.myLat = pos.coords.latitude; MAP.myLng = pos.coords.longitude;
          MAP.hasRealGeo = true;
          window.API.setSharing("exact").catch(function () {});
          window.API.saveLocation(MAP.myLat, MAP.myLng).catch(function () {});
          // giramos hacia mi zona pero MANTENIENDO zoom bajo (~1.9) para conservar
          // el globo esférico y el aro; el usuario acerca a calle con +/- o pellizco.
          if (MAP.gl) MAP.gl.easeTo({ center: [MAP.myLng, MAP.myLat], zoom: 1.9, duration: 1800 });
          startPolling();
          // 2) refinamos con alta precisión en segundo plano (sin bloquear).
          navigator.geolocation.getCurrentPosition(function (hp) {
            MAP.myLat = hp.coords.latitude; MAP.myLng = hp.coords.longitude;
            window.API.saveLocation(MAP.myLat, MAP.myLng).catch(function () {});
            refreshUsers();
          }, function () {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
        }, function (err) {
          console.warn("[bridge] geo:", err && err.message);
          // sin geo: igualmente cargamos a otros usuarios con una pos central.
          MAP.myLat = MAP.myLat || 40; MAP.myLng = MAP.myLng || 0;
          startPolling();
        }, { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 });
      } else {
        MAP.myLat = 40; MAP.myLng = 0; startPolling();
      }
    }

    // Zoom desde los botones +/- del diseño.
    window.__1212_mapZoom = function (dir) {
      if (!MAP.gl) return;
      if (dir === "in") MAP.gl.zoomIn({ duration: 300 });
      else MAP.gl.zoomOut({ duration: 300 });
    };

    function loadMap() {
      // el diseño llama initGlobe al entrar; aquí solo aseguramos el build.
      setTimeout(buildMapLibre, 60);
    }

    // ------- navegación: cargar datos reales al entrar a cada pantalla -------
    // go() es el método de navegación del diseño (this.go('comunidad'|'buscar'|...)).
    // Lo envolvemos UNA vez para disparar cargas reales según destino.
    // Carga las estadísticas reales del perfil (GET /profiles/me/stats).
    function loadStats() {
      window.API.call("/profiles/me/stats").then(function (s) {
        logic.setState({ stats: { diasActivos: s.diasActivos, habitos: s.habitos, racha: s.racha, diario: s.diario } });
      }).catch(function (e) { console.warn("[bridge] stats:", e.message); });
    }

    var _go = logic.go.bind(logic);
    logic.go = function (screen) {
      _go(screen);
      if (screen === "comunidad") loadCommunities();
      if (screen === "buscar") { logic.USERS = []; logic.forceUpdate && logic.forceUpdate(); }
      if (screen === "diario") setTimeout(loadJournal, 60);
      if (screen === "mapa") { logic.USERS = []; setTimeout(loadMap, 80); }
      if (screen === "perfil") { setTimeout(loadStats, 60); setTimeout(loadAccount, 60); }
    };
    // El diario también se alcanza por el tab inferior (tab('diario')), no solo go().
    var _tab = logic.tab && logic.tab.bind(logic);
    if (_tab) {
      logic.tab = function (s) {
        _tab(s);
        if (s === "diario") setTimeout(loadJournal, 60);
      };
    }

    console.info("[bridge] cableado OK");
  }
})();
