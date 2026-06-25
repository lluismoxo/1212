// 1212 — web-app propia. Diseño del prototipo + datos reales del backend.
(function () {
  var BASE = location.origin;
  var app = document.getElementById('app');
  var TOK = { a: '1212_access', r: '1212_refresh' };

  // ---------- API ----------
  function getA(){ try { return localStorage.getItem(TOK.a); } catch(e){ return null; } }
  function setT(a,r){ try { localStorage.setItem(TOK.a,a); localStorage.setItem(TOK.r,r); } catch(e){} }
  function clearT(){ try { localStorage.removeItem(TOK.a); localStorage.removeItem(TOK.r); } catch(e){} }
  async function refreshTok(){
    var r; try { r = localStorage.getItem(TOK.r); } catch(e){}
    if(!r) return null;
    var res = await fetch(BASE+'/auth/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refreshToken:r})});
    if(!res.ok){ clearT(); return null; }
    var d = await res.json(); setT(d.accessToken,d.refreshToken); return d.accessToken;
  }
  async function api(path,opts){
    opts = opts||{}; var auth = opts.auth!==false;
    async function go(t){ var h={'Content-Type':'application/json'}; if(t) h.Authorization='Bearer '+t;
      return fetch(BASE+path,{method:opts.method||'GET',headers:h,body:opts.body!==undefined?JSON.stringify(opts.body):undefined}); }
    var res = await go(auth?getA():null);
    if(res.status===401 && auth){ var f=await refreshTok(); if(f) res=await go(f); }
    if(!res.ok){ var code='error'; try{ code=(await res.json()).error||'error'; }catch(e){} var er=new Error(code); er.code=code; er.status=res.status; throw er; }
    return res.status===204?null:res.json();
  }

  // ---------- estado ----------
  var S = { me:null, level:null, tab:'home' };

  // ---------- helpers UI ----------
  function el(html){ var d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }
  function setScreen(node){ app.innerHTML=''; app.appendChild(node); }
  function loading(){ setScreen(el('<div class="center"><div class="spinner"></div></div>')); }
  var ICON = {
    home:'<path d="M12 3l8 16H4z"/><circle cx="12" cy="14" r="2"/>',
    habitos:'<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v3M16 2v3M8.5 14.5l2 2 3.5-4"/>',
    tareas:'<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    diario:'<path d="M6 3h11a2 2 0 0 1 2 2v16H8a2 2 0 0 1-2-2z"/><path d="M10 3v18M14 8h2M14 12h2"/>',
    users:'<circle cx="9" cy="9" r="3"/><path d="M3 19a6 6 0 0 1 12 0"/><circle cx="17.5" cy="7" r="2.2"/><path d="M16 13.2A5 5 0 0 1 21 18"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/>'
  };
  function svg(name,color,size){ size=size||22; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="'+(color||'#fff')+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+ICON[name]+'</svg>'; }

  // ---------- AUTH ----------
  function authScreen(mode){
    mode = mode || 'login';
    var node = el(
      '<div class="screen vp" style="display:flex;flex-direction:column;justify-content:flex-end;min-height:100vh;background:radial-gradient(80% 45% at 50% 8%,rgba(230,199,122,.07),transparent 60%),#070707">'
      + '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px">'
      +   '<div style="font-size:40px;font-weight:300;letter-spacing:14px;padding-left:14px">1212</div>'
      +   '<div style="font-size:12px;letter-spacing:4px;color:rgba(255,255,255,.4);text-transform:uppercase">Evoluciona</div>'
      + '</div>'
      + '<div style="display:flex;flex-direction:column;gap:12px;padding-bottom:30px">'
      +   '<div style="display:flex;gap:4px;padding:4px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);margin-bottom:6px">'
      +     '<button id="tabLogin" style="flex:1;height:38px;border:none;border-radius:10px;background:'+(mode==='login'?'rgba(255,255,255,.1)':'transparent')+';color:'+(mode==='login'?'#fff':'rgba(255,255,255,.5)')+';font-weight:600;cursor:pointer">Entrar</button>'
      +     '<button id="tabReg" style="flex:1;height:38px;border:none;border-radius:10px;background:'+(mode==='register'?'rgba(255,255,255,.1)':'transparent')+';color:'+(mode==='register'?'#fff':'rgba(255,255,255,.5)')+';font-weight:600;cursor:pointer">Crear cuenta</button>'
      +   '</div>'
      +   (mode==='register'?'<input id="name" class="input" placeholder="Nombre"/>':'')
      +   '<input id="email" class="input" type="email" autocapitalize="none" placeholder="Email"/>'
      +   '<input id="pass" class="input" type="password" placeholder="Contraseña"/>'
      +   '<button id="go" class="btn lg">'+(mode==='register'?'Crear cuenta':'Entrar')+'</button>'
      +   '<div id="err" style="color:#ff6b6b;font-size:13px;text-align:center;min-height:18px"></div>'
      + '</div></div>'
    );
    setScreen(node);
    node.querySelector('#tabLogin').onclick=function(){ authScreen('login'); };
    node.querySelector('#tabReg').onclick=function(){ authScreen('register'); };
    node.querySelector('#go').onclick=async function(){
      var email=(node.querySelector('#email').value||'').trim();
      var pass=node.querySelector('#pass').value||'';
      var err=node.querySelector('#err');
      if(!email||!pass){ err.textContent='Introduce email y contraseña.'; return; }
      try{
        var d;
        if(mode==='register'){ var name=(node.querySelector('#name').value||'Usuario').trim();
          d=await api('/auth/register',{method:'POST',auth:false,body:{email:email,password:pass,name:name}});
        } else { d=await api('/auth/login-password',{method:'POST',auth:false,body:{email:email,password:pass}}); }
        setT(d.accessToken,d.refreshToken);
        await boot();
      }catch(e){
        err.textContent = e.code==='email_taken'?'Ese email ya existe.':e.code==='invalid_credentials'?'Email o contraseña incorrectos.':'No se pudo continuar.';
      }
    };
  }

  // ---------- HOME ----------
  async function homeScreen(){
    loading();
    var streak=0, todayCount=0;
    try{ streak=(await api('/habits/streak')).streak; }catch(e){}
    try{ todayCount=(await api('/habits/today')).length; }catch(e){}
    try{ S.level=await api('/levels/me'); }catch(e){}
    var lvNum=(S.level&&S.level.current_level)||1, prog=(S.level&&S.level.progress)||0;
    var lv=LEVELS[lvNum-1];
    var aura=lv.aura;
    var node=el(
      '<div class="screen vp" style="overflow-y:auto;background:radial-gradient(95% 42% at 50% 0%,'+hexA(aura,.12)+',transparent 56%),#070707">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
      +   '<div><div class="faint" style="font-size:13px">Bienvenido</div><div style="font-size:17px;font-weight:600">'+esc(S.me.display_name)+'</div></div>'
      +   '<div style="display:flex;align-items:center;gap:8px">'
      +     '<div class="glass" style="display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:14px"><svg width="15" height="15" viewBox="0 0 24 24" fill="#E6C77A"><path d="M12 2c1 3-1 4-1 6 0 1 1 2 2 2 2 0 3-2 3-2 2 2 3 4 3 7a7 7 0 0 1-14 0c0-3 2-5 3-7 1 2 2 2 2 0 0-3 2-4 2-6z"/></svg><span class="gold" style="font-size:14px;font-weight:600">'+streak+'</span></div>'
      +     '<button id="toProfile" class="glass lg" style="width:40px;height:40px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer">'+svg('user','#fff',20)+'</button>'
      +   '</div>'
      + '</div>'
      + '<div id="toLevels" style="display:flex;flex-direction:column;align-items:center;text-align:center;cursor:pointer;margin:22px 0 40px">'
      +   crystalSVG(lv,130)
      +   '<div class="faint" style="font-size:12px;letter-spacing:4px;text-transform:uppercase;margin-top:10px">Nivel '+lv.n+'</div>'
      +   '<div style="font-size:34px;font-weight:800;letter-spacing:-.7px;margin-top:4px">'+lv.name+'</div>'
      +   '<div style="width:240px;max-width:86%;margin-top:20px"><div style="height:7px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden"><div style="height:100%;width:'+prog+'%;border-radius:4px;background:linear-gradient(90deg,'+aura+',#fff)"></div></div><div class="muted" style="font-size:12px;margin-top:9px">Progreso de evolución</div></div>'
      + '</div>'
      + '<div id="grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:22px"></div>'
      + '<div class="muted" style="font-size:13px;font-weight:600;margin-bottom:12px">Resumen del día</div>'
      + '<div style="display:flex;gap:10px">'
      +   '<div class="glass" style="flex:1;padding:18px 16px;border-radius:20px"><div style="font-size:28px;font-weight:700">'+todayCount+'</div><div class="faint" style="font-size:12px;margin-top:2px">Hábitos hoy</div></div>'
      +   '<div class="glass" style="flex:1;padding:18px 16px;border-radius:20px"><div class="gold" style="font-size:28px;font-weight:700">'+streak+'</div><div class="faint" style="font-size:12px;margin-top:2px">Días de racha</div></div>'
      + '</div>'
      + '</div>'
    );
    var acts=[['habitos','Hábitos','habits'],['tareas','Tareas','tasks'],['diario','Diario','journal'],['users','Comunidad','communities'],['globe','Mapa','map'],['search','Buscar','search']];
    var grid=node.querySelector('#grid');
    acts.forEach(function(a){
      var b=el('<button class="lg glass" style="display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:16px;border:none;border-radius:20px;color:#fff;cursor:pointer;text-align:left">'+svg(a[0],aura,22)+'<span style="font-size:13px;font-weight:500">'+a[1]+'</span></button>');
      b.onclick=function(){ go(a[2]); };
      grid.appendChild(b);
    });
    node.querySelector('#toProfile').onclick=function(){ go('profile'); };
    node.querySelector('#toLevels').onclick=function(){ go('levels'); };
    setScreen(node);
    addNav(node,'home');
  }

  // ---------- HÁBITOS ----------
  async function habitsScreen(){
    loading();
    var habits=[],today=new Set(),comp=null;
    try{ habits=await api('/habits'); }catch(e){}
    try{ (await api('/habits/today')).forEach(function(t){today.add(t.habit_id);}); }catch(e){}
    try{ comp=(await api('/levels/me')).current_month_compliance; }catch(e){}
    var node=el('<div class="screen vp" style="overflow-y:auto">'
      + '<h1 class="h1">Hábitos</h1>'
      + (comp!=null?'<div class="gold" style="font-size:13px;margin:8px 0 4px">Cumplimiento de este mes: '+comp+'% · necesitas 70% para subir de nivel</div>':'')
      + '<div style="display:flex;gap:10px;margin:18px 0">'
      +   '<input id="nh" class="input" style="flex:1;height:52px" placeholder="Nuevo hábito…"/>'
      +   '<button id="add" style="width:52px;height:52px;border:none;border-radius:16px;background:#E6C77A;color:#070707;font-size:24px;font-weight:700;cursor:pointer">+</button>'
      + '</div>'
      + '<div id="list" style="display:flex;flex-direction:column;gap:10px"></div>'
      + '<div class="faint" style="font-size:12px;text-align:center;margin-top:14px">Toca para marcar/desmarcar hoy · mantén pulsado para eliminar</div>'
      + '</div>');
    var list=node.querySelector('#list');
    function row(h){
      var done=today.has(h.id);
      var r=el('<div class="glass lg" style="display:flex;align-items:center;gap:12px;padding:16px;border-radius:16px;cursor:pointer">'
        + '<div style="width:26px;height:26px;border-radius:50%;border:'+(done?'none':'1.7px solid rgba(255,255,255,.25)')+';background:'+(done?'#E6C77A':'transparent')+';display:flex;align-items:center;justify-content:center;color:#070707;font-weight:700">'+(done?'✓':'')+'</div>'
        + '<span style="flex:1;'+(done?'color:rgba(255,255,255,.4)':'')+'">'+esc(h.name)+'</span></div>');
      var pressTimer;
      r.onclick=async function(){
        var nd=!today.has(h.id);
        try{ await api('/habits/'+h.id+'/log',{method:'PUT',body:{done:nd}}); if(nd)today.add(h.id);else today.delete(h.id); habitsScreen(); }catch(e){}
      };
      r.oncontextmenu=function(e){e.preventDefault();};
      r.addEventListener('touchstart',function(){ pressTimer=setTimeout(function(){ del(h); },600); });
      r.addEventListener('touchend',function(){ clearTimeout(pressTimer); });
      r.addEventListener('mousedown',function(){ pressTimer=setTimeout(function(){ del(h); },600); });
      r.addEventListener('mouseup',function(){ clearTimeout(pressTimer); });
      return r;
    }
    async function del(h){ if(!confirm('¿Eliminar "'+h.name+'"?'))return; try{ await api('/habits/'+h.id,{method:'DELETE'}); habitsScreen(); }catch(e){} }
    if(habits.length) habits.forEach(function(h){ list.appendChild(row(h)); });
    else list.appendChild(el('<div class="faint" style="text-align:center;padding:40px">Crea tu primer hábito.</div>'));
    node.querySelector('#add').onclick=async function(){
      var v=(node.querySelector('#nh').value||'').trim(); if(!v)return;
      try{ await api('/habits',{method:'POST',body:{name:v}}); habitsScreen(); }catch(e){}
    };
    setScreen(node); addNav(node,'habits');
  }

  // ---------- TAREAS ----------
  async function tasksScreen(){
    loading();
    var tasks=[]; try{ tasks=await api('/tasks'); }catch(e){}
    var node=el('<div class="screen vp" style="overflow-y:auto">'
      + '<h1 class="h1">Tareas del día</h1>'
      + '<div style="display:flex;gap:10px;margin:18px 0">'
      +   '<input id="nt" class="input" style="flex:1;height:52px" placeholder="Añadir una tarea…"/>'
      +   '<button id="add" style="width:52px;height:52px;border:none;border-radius:16px;background:#E6C77A;color:#070707;font-size:24px;font-weight:700;cursor:pointer">+</button>'
      + '</div><div id="list" style="display:flex;flex-direction:column;gap:10px"></div></div>');
    var list=node.querySelector('#list');
    function row(t){
      var r=el('<div class="glass" style="display:flex;align-items:center;gap:12px;padding:16px;border-radius:16px">'
        + '<div class="chk lg" style="width:26px;height:26px;border-radius:50%;border:'+(t.done?'none':'1.7px solid rgba(255,255,255,.25)')+';background:'+(t.done?'#E6C77A':'transparent')+';display:flex;align-items:center;justify-content:center;color:#070707;font-weight:700;cursor:pointer">'+(t.done?'✓':'')+'</div>'
        + '<span style="flex:1;'+(t.done?'text-decoration:line-through;color:rgba(255,255,255,.4)':'')+'">'+esc(t.text)+'</span>'
        + '<button class="del" style="background:none;border:none;color:rgba(255,255,255,.3);font-size:18px;cursor:pointer">×</button></div>');
      r.querySelector('.chk').onclick=async function(){ try{ await api('/tasks/'+t.id,{method:'PATCH',body:{done:!t.done}}); tasksScreen(); }catch(e){} };
      r.querySelector('.del').onclick=async function(){ try{ await api('/tasks/'+t.id,{method:'DELETE'}); tasksScreen(); }catch(e){} };
      return r;
    }
    if(tasks.length) tasks.forEach(function(t){ list.appendChild(row(t)); });
    else list.appendChild(el('<div class="faint" style="text-align:center;padding:40px">Todo hecho. Disfruta el día.</div>'));
    node.querySelector('#add').onclick=async function(){ var v=(node.querySelector('#nt').value||'').trim(); if(!v)return; try{ await api('/tasks',{method:'POST',body:{text:v}}); tasksScreen(); }catch(e){} };
    setScreen(node); addNav(node,'tasks');
  }

  // ---------- DIARIO ----------
  async function journalScreen(){
    loading();
    var today=new Date().toISOString().slice(0,10), entry=null;
    try{ entry=await api('/journal/'+today); }catch(e){}
    var node=el('<div class="screen vp" style="overflow-y:auto">'
      + '<h1 class="h1">Diario</h1>'
      + '<div class="muted" style="font-size:14px;margin:8px 0 18px">Hoy</div>'
      + '<textarea id="body" class="vp" style="width:100%;min-height:220px;border-radius:20px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);color:#fff;font-size:16px;line-height:1.6;padding:18px;outline:none;resize:none" placeholder="Escribe sobre tu día…">'+esc(entry&&entry.body||'')+'</textarea>'
      + '<button id="save" class="btn lg" style="margin-top:16px">Guardar</button></div>');
    node.querySelector('#save').onclick=async function(){
      var b=node.querySelector('#body').value;
      try{ await api('/journal/'+today,{method:'PUT',body:{body:b}}); this.textContent='Guardado ✓'; var self=this; setTimeout(function(){self.textContent='Guardar';},1500);}catch(e){}
    };
    setScreen(node); addNav(node,'diario');
  }

  // ---------- COMUNIDADES ----------
  async function communitiesScreen(){
    loading();
    var coms=[]; try{ coms=await api('/communities'); }catch(e){}
    var node=el('<div class="screen vp" style="overflow-y:auto"><div style="display:flex;align-items:center;gap:14px;margin-bottom:18px"><button id="bk" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:20px;cursor:pointer">‹</button><h1 class="h1" style="font-size:22px">Comunidad</h1></div><div id="list" style="display:flex;flex-direction:column;gap:12px"></div></div>');
    var list=node.querySelector('#list');
    if(coms.length) coms.forEach(function(c){
      var r=el('<div class="glass lg" style="display:flex;align-items:center;gap:12px;padding:16px;border-radius:18px;cursor:pointer"><div style="flex:1"><div style="font-size:16px;font-weight:600">'+esc(c.name)+'</div>'+(c.description?'<div class="muted" style="font-size:13px;margin-top:4px">'+esc(c.description)+'</div>':'')+'<div class="faint" style="font-size:12px;margin-top:6px">'+c.members+' miembros</div></div><span style="font-size:14px;font-weight:600;color:'+(c.joined?'#E6C77A':'#fff')+'">'+(c.joined?'Abrir':'Unirse')+'</span></div>');
      r.onclick=async function(){ if(!c.joined){ try{ await api('/communities/'+c.id+'/join',{method:'POST'}); }catch(e){} } communitiesScreen(); };
      list.appendChild(r);
    });
    else list.appendChild(el('<div class="faint" style="text-align:center;padding:40px">No hay comunidades.</div>'));
    node.querySelector('#bk').onclick=function(){ go('home'); };
    setScreen(node); addNav(node,'home');
  }

  // ---------- BUSCAR ----------
  async function searchScreen(){
    var node=el('<div class="screen vp" style="overflow-y:auto"><div style="display:flex;align-items:center;gap:14px;margin-bottom:16px"><button id="bk" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:20px;cursor:pointer">‹</button><h1 class="h1" style="font-size:22px">Buscar perfiles</h1></div><input id="q" class="input" placeholder="Nombre o usuario…" autocapitalize="none"/><div id="res" style="display:flex;flex-direction:column;gap:10px;margin-top:18px"></div></div>');
    var res=node.querySelector('#res'), t;
    node.querySelector('#q').oninput=function(){
      var term=this.value.trim(); clearTimeout(t);
      if(term.length<2){ res.innerHTML=''; return; }
      t=setTimeout(async function(){
        try{ var rs=await api('/profiles/search?q='+encodeURIComponent(term)); res.innerHTML='';
          if(!rs.length){ res.appendChild(el('<div class="faint" style="text-align:center;padding:20px">Sin resultados.</div>')); return; }
          rs.forEach(function(p){ res.appendChild(el('<div class="glass" style="padding:16px;border-radius:16px"><div style="font-size:16px;font-weight:600">'+esc(p.display_name)+'</div><div class="muted" style="font-size:13px">@'+esc(p.username)+(p.city?' · '+esc(p.city):'')+'</div></div>')); });
        }catch(e){}
      },300);
    };
    node.querySelector('#bk').onclick=function(){ go('home'); };
    setScreen(node); addNav(node,'home');
  }

  // ---------- NIVELES ----------
  async function levelsScreen(){
    loading();
    var cur=1; try{ cur=(await api('/levels/me')).current_level; }catch(e){}
    var sel=cur;
    function render(){
      var lv=LEVELS[sel-1];
      var node=el('<div class="screen vp" style="overflow-y:auto;background:radial-gradient(95% 42% at 50% 0%,'+hexA(lv.aura,.12)+',transparent 56%),#070707"><div style="display:flex;align-items:center;justify-content:space-between"><button id="bk" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:20px;cursor:pointer">‹</button><span style="font-weight:600">Niveles</span><div style="width:40px"></div></div>'
        + '<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:20px 0">'+crystalSVG(lv,140)+'<div class="faint" style="font-size:12px;letter-spacing:3px;text-transform:uppercase;margin-top:10px">Nivel '+lv.n+'</div><div style="font-size:28px;font-weight:700;margin-top:2px">'+lv.name+'</div><div class="muted" style="font-size:14px;max-width:260px;margin-top:8px;line-height:1.5">'+lv.desc+'</div></div>'
        + '<div id="nodes" style="display:flex;flex-direction:column;gap:8px"></div></div>');
      var nodes=node.querySelector('#nodes');
      LEVELS.forEach(function(l){ var u=l.n<=cur;
        var r=el('<div class="glass lg" style="display:flex;align-items:center;gap:14px;padding:16px;border-radius:16px;cursor:pointer;'+(l.n===sel?'background:rgba(255,255,255,.1)':'')+'"><span style="font-size:18px;font-weight:800;width:24px;color:'+(u?l.aura:'rgba(255,255,255,.4)')+'">'+l.n+'</span><span style="flex:1;'+(u?'':'color:rgba(255,255,255,.4)')+'">'+l.name+'</span>'+(u?'':'<span>🔒</span>')+'</div>');
        r.onclick=function(){ sel=l.n; render(); }; nodes.appendChild(r);
      });
      node.querySelector('#bk').onclick=function(){ go('home'); };
      setScreen(node); addNav(node,'home');
    }
    render();
  }

  // ---------- PERFIL ----------
  async function profileScreen(){
    loading();
    var p=S.me, lvl=1; try{ p=await api('/profiles/me'); }catch(e){} try{ lvl=(await api('/levels/me')).current_level; }catch(e){}
    var lv=LEVELS[lvl-1];
    var node=el('<div class="screen vp" style="overflow-y:auto"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><button id="bk" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:20px;cursor:pointer">‹</button><span style="font-weight:600">Perfil</span><div style="width:40px"></div></div>'
      + '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0">'+crystalSVG(lv,90)+'<div style="font-size:22px;font-weight:700;margin-top:8px">'+esc(p.display_name)+'</div><div class="muted">@'+esc(p.username)+'</div><div class="gold">Nivel '+lv.n+' · '+lv.name+'</div></div>'
      + '<div class="muted" style="font-size:13px;font-weight:600;margin:16px 0 10px">Ubicación pública</div>'
      + '<div id="seg" style="display:flex;gap:4px;padding:4px;border-radius:16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)"></div>'
      + '<div style="display:flex;flex-direction:column;gap:10px;margin-top:22px">'
      +   '<button id="out" class="glass lg" style="padding:16px;border:none;border-radius:16px;color:#fff;cursor:pointer">Cerrar sesión</button>'
      +   '<button id="del" class="lg" style="padding:16px;border-radius:16px;background:rgba(255,79,79,.08);border:1px solid rgba(255,79,79,.3);color:#ff6b6b;font-weight:600;cursor:pointer">Eliminar cuenta</button>'
      + '</div></div>');
    var seg=node.querySelector('#seg');
    [['exact','Exacta'],['city','Ciudad'],['off','Oculta']].forEach(function(o){
      var on=p.location_sharing===o[0];
      var b=el('<button class="lg" style="flex:1;height:38px;border:none;border-radius:12px;background:'+(on?'rgba(230,199,122,.15)':'transparent')+';color:'+(on?'#E6C77A':'rgba(255,255,255,.5)')+';font-weight:600;cursor:pointer">'+o[1]+'</button>');
      b.onclick=async function(){ try{ await api('/profiles/me',{method:'PATCH',body:{locationSharing:o[0]}}); p.location_sharing=o[0]; profileScreen(); }catch(e){} };
      seg.appendChild(b);
    });
    node.querySelector('#bk').onclick=function(){ go('home'); };
    node.querySelector('#out').onclick=async function(){ try{ await api('/auth/logout',{method:'POST',auth:false,body:{refreshToken:localStorage.getItem(TOK.r)}}); }catch(e){} clearT(); authScreen('login'); };
    node.querySelector('#del').onclick=async function(){ if(!confirm('¿Eliminar tu cuenta? No se puede deshacer.'))return; try{ await api('/auth/account',{method:'DELETE'}); }catch(e){} clearT(); authScreen('login'); };
    setScreen(node);
  }

  // ---------- MAPA (simple) ----------
  async function mapScreen(){
    var node=el('<div class="screen vp"><div style="display:flex;align-items:center;gap:14px;margin-bottom:16px"><button id="bk" style="width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font-size:20px;cursor:pointer">‹</button><h1 class="h1" style="font-size:22px">Mapa global</h1></div><div class="faint" style="text-align:center;padding:40px">El mapa con personas cercanas estará disponible en el móvil (usa tu ubicación).</div></div>');
    node.querySelector('#bk').onclick=function(){ go('home'); };
    setScreen(node); addNav(node,'home');
  }

  // ---------- nav + router ----------
  function addNav(node, active){
    var nav=el('<div class="nav glass" style="border:none"></div>');
    [['home','Inicio','home'],['habitos','Hábitos','habits'],['tareas','Tareas','tasks'],['diario','Diario','journal']].forEach(function(t){
      var b=el('<button class="'+(active===t[2]?'on':'')+'">'+svg(t[0],active===t[2]?'#fff':'rgba(255,255,255,.4)',24)+'<span>'+t[1]+'</span></button>');
      b.onclick=function(){ go(t[2]); }; nav.appendChild(b);
    });
    node.appendChild(nav);
  }
  function go(screen){
    S.tab=screen;
    ({home:homeScreen,habits:habitsScreen,tasks:tasksScreen,journal:journalScreen,communities:communitiesScreen,search:searchScreen,levels:levelsScreen,profile:profileScreen,map:mapScreen}[screen]||homeScreen)();
  }

  // ---------- utils ----------
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function hexA(h,a){ h=h.replace('#',''); return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+a+')'; }

  // ---------- boot ----------
  async function boot(){
    loading();
    if(!getA()){ authScreen('login'); return; }
    try{ S.me=await api('/profiles/me'); go('home'); }
    catch(e){ clearT(); authScreen('login'); }
  }
  boot();
})();
