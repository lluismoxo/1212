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

    // 2) Botones Google/Apple -> login real. El diseño los liga a goProfile.
    //    Interceptamos el click en captura: si no hay sesión, pedimos login y
    //    saltamos a home; si ya hay, vamos directo.
    document.addEventListener("click", async function (ev) {
      var b = ev.target.closest && ev.target.closest("button");
      if (!b) return;
      var txt = (b.textContent || "").trim();
      if (txt.indexOf("Continuar con Google") === 0 || txt.indexOf("Continuar con Apple") === 0) {
        ev.preventDefault();
        ev.stopPropagation();
        if (!window.API.isLoggedIn()) {
          var ok = await authModal();
          if (!ok) return;
        }
        logic.setState({ screen: "home", stack: [] });
        loadData(logic);
      }
    }, true);

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
    // ------- BUSCAR PERFILES: resultados reales -------
    // buildSearch() filtra this.USERS por searchQuery. Alimentamos this.USERS con
    // resultados reales de /profiles/search (debounce) y forzamos re-render.
    function mapUser(p) {
      return {
        nm: p.display_name || p.username,
        user: "@" + p.username,
        lvl: p.current_level || 1,
        c: ["#9A8748", "#D0AE5A"],
        links: [],
        city: p.city || null,
      };
    }
    var searchTimer = null;
    // onSearchInput vive en el objeto de renderVals (se recrea cada render), así que
    // no podemos envolverlo una vez. En su lugar interceptamos el input por evento.
    document.addEventListener("input", function (ev) {
      var el = ev.target;
      if (!el || el.tagName !== "INPUT") return;
      var ph = (el.getAttribute("placeholder") || "");
      if (ph.indexOf("nombre de usuario") < 0) return; // solo el input de buscar
      var term = (el.value || "").trim();
      clearTimeout(searchTimer);
      if (term.length < 2) { logic.USERS = []; logic.forceUpdate && logic.forceUpdate(); return; }
      searchTimer = setTimeout(function () {
        window.API.call("/profiles/search?q=" + encodeURIComponent(term)).then(function (rows) {
          logic.USERS = (rows || []).map(mapUser);
          logic.forceUpdate && logic.forceUpdate();
        }).catch(function (e) { console.warn("[bridge] search:", e.message); });
      }, 300);
    }, true);

    // ------- navegación: cargar datos reales al entrar a cada pantalla -------
    // go() es el método de navegación del diseño (this.go('comunidad'|'buscar'|...)).
    // Lo envolvemos UNA vez para disparar cargas reales según destino.
    var _go = logic.go.bind(logic);
    logic.go = function (screen) {
      _go(screen);
      if (screen === "comunidad") loadCommunities();
      if (screen === "buscar") { logic.USERS = []; logic.forceUpdate && logic.forceUpdate(); }
    };

    console.info("[bridge] cableado OK");
  }
})();
