/* =========================================================
   Núcleo: roteamento, layout, modais, toasts, fluxo da demo
   ========================================================= */
const MODULES = {};
const SESSION_KEY = 'realimenta_session_v1';

const App = {
  user: null,
  route: { profile: null, page: null },
  ui: {},

  get session() { return localStorage.getItem(SESSION_KEY); },
  login(userKey, page) {
    localStorage.setItem(SESSION_KEY, userKey);
    const u = USERS[userKey];
    location.hash = `#/${u.profile}/${page || 'dashboard'}`;
  },
  logout() { localStorage.removeItem(SESSION_KEY); location.hash = '#/login'; },
  go(page) { location.hash = `#/${this.route.profile}/${page}`; },
  isManager() { return this.session === 'gerente'; },

  parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [profile, page] = h.split('/');
    return { profile: profile || '', page: page || 'dashboard' };
  },

  render(keepScroll) {
    const y = window.scrollY;
    const r = this.parse();
    const prevPage = `${this.route.profile}/${this.route.page}`;
    this.route = r;
    const root = document.getElementById('app');
    document.body.className = '';
    closeTip();

    if (!r.profile) { root.innerHTML = Landing.render(); window.scrollTo(0, 0); return; }
    if (r.profile === 'login') { root.innerHTML = Landing.login(); window.scrollTo(0, 0); return; }

    const userKey = this.session;
    const mod = MODULES[r.profile];
    if (!mod || !userKey || USERS[userKey].profile !== r.profile) {
      // Perfil não autenticado para este ambiente → volta ao login
      if (!mod) { location.hash = '#/'; return; }
      if (userKey && USERS[userKey].profile !== r.profile) { location.hash = `#/${USERS[userKey].profile}/dashboard`; return; }
      location.hash = '#/login'; return;
    }
    this.user = USERS[userKey];
    document.body.classList.add(`theme-${r.profile}`);
    if (!mod.pages[r.page]) { this.go('dashboard'); return; }

    STATE.seen = STATE.seen || {};
    STATE.seen[`${r.profile}/${r.page}`] = true;
    if (r.page === 'relatorios' && STATE.flow.step >= 8) STATE.seen.impactAfter = true;
    save();

    const navItem = mod.nav.find(n => n.id === r.page) || {};
    const locked = navItem.ai && !this.isManager();
    const content = locked ? lockedScreen(navItem) : mod.pages[r.page]();
    root.innerHTML = shell(mod, r.page, content);
    if (mod.after && mod.after[r.page] && !locked) mod.after[r.page]();
    window.scrollTo(0, keepScroll && prevPage === `${r.profile}/${r.page}` ? y : 0);
  },
  refresh() { this.render(true); },
};

/* ---------------- Layout ---------------- */
function shell(mod, page, content) {
  const u = App.user;
  const notifs = STATE.notifs[App.route.profile] || [];
  const unread = notifs.filter(n => n.unread).length;
  let navHtml = '', lastSection = null;
  mod.nav.forEach(n => {
    if (n.section && n.section !== lastSection) {
      navHtml += `<div class="nav-label">${n.sectionIcon ? icon(n.sectionIcon, 12) : ''}${n.section}</div>`;
      lastSection = n.section;
    }
    const locked = n.ai && !App.isManager();
    const badge = !locked && n.badge ? n.badge() : null;
    navHtml += `<button class="nav-item ${page === n.id ? 'active' : ''} ${locked ? 'locked' : ''}" onclick="App.go('${n.id}'); closeSidebar()">
      ${icon(n.icon, 18)}<span>${n.label}</span>
      ${locked ? `<span class="lock">${icon('lock', 13)}</span>` : badge ? `<span class="nav-badge ${badge.soft ? 'soft' : ''}">${badge.text}</span>` : ''}
    </button>`;
  });
  return `
  <div class="shell">
    <aside class="sidebar" id="sidebar">
      <a class="brand" href="#/" title="Página inicial">
        <span class="brand-logo">${icon('leaf', 20)}</span>
        <span>ReAlimenta<small>${mod.envLabel}</small></span>
      </a>
      <div class="side-org">
        <div class="avatar">${mod.org.initials}</div>
        <div><strong>${mod.org.name}</strong><span>${mod.org.sub}</span></div>
      </div>
      <nav class="nav">${navHtml}</nav>
      <div class="side-foot">
        <div class="side-help">
          <strong>Modo demonstração</strong>
          <p>Siga o roteiro guiado para apresentar o fluxo completo entre os 3 perfis.</p>
          <button onclick="Demo.open()">${icon('presentation', 14)} Abrir roteiro</button>
        </div>
        <button class="nav-item" onclick="App.logout()">${icon('logout', 18)}<span>Sair</span></button>
      </div>
    </aside>
    <div class="overlay" id="overlay" onclick="closeSidebar()"></div>
    <div class="main">
      <header class="topbar">
        <button class="icon-btn menu-btn" onclick="openSidebar()">${icon('menu', 18)}</button>
        <div class="topbar-right">
          <span class="today-chip hide-sm">${icon('calendar', 14)} ${TODAY.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
          <div style="position:relative">
            <button class="icon-btn" onclick="toggleNotifs(event)" title="Notificações">${icon('bell', 18)}${unread ? '<span class="dot"></span>' : ''}</button>
            <div id="notif-holder"></div>
          </div>
          <div style="position:relative">
            <button class="user-chip" onclick="toggleUserMenu(event)">
              <span class="avatar" style="background:var(--accent)">${u.initials}</span>
              <div><strong>${u.name}</strong><span>${u.role}</span></div>
              ${icon('chevronDown', 14, 'style="color:var(--gray-400)"')}
            </button>
            <div id="user-menu-holder"></div>
          </div>
        </div>
      </header>
      <main class="page" id="page">${content}</main>
    </div>
  </div>
  ${Demo.render()}`;
}

function lockedScreen(n) {
  return `<div class="locked-screen card card-pad" style="padding:40px">
    <div class="ls-icon">${icon('lock', 32)}</div>
    <h2>Acesso restrito ao gerente</h2>
    <p class="muted mt-sm">A área <b>${n.label}</b> utiliza recursos de Inteligência Artificial. Funcionários podem realizar registros operacionais (estoque e produção), mas previsões, recomendações e decisões sobre doações são exclusivas do gerente ou proprietário.</p>
    <div class="flex mt" style="justify-content:center">
      <button class="btn btn-outline" onclick="App.go('producao')">${icon('factory', 16)} Ir para Produção</button>
      <button class="btn btn-primary" onclick="switchUser('gerente','${n.id}')">${icon('user', 16)} Entrar como gerente</button>
    </div>
  </div>`;
}

function pageHead(title, sub, actions = '', iconName, crumbs) {
  return `<div class="page-head">
    <div>
      ${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}
      <h1>${iconName ? `<span class="kpi-icon ic-${iconName[1] || 'green'}" style="width:36px;height:36px">${icon(iconName[0], 19)}</span>` : ''}${title}</h1>
      ${sub ? `<p>${sub}</p>` : ''}
    </div>
    ${actions ? `<div class="actions">${actions}</div>` : ''}
  </div>`;
}

function kpi({ label, value, unit, iconName, color = 'green', foot, trend, trendDir = 'up', spark, sparkColor, cls = '' }) {
  return `<div class="card kpi ${cls}">
    <div class="kpi-top">
      <div><div class="kpi-label">${label}</div><div class="kpi-value mt-sm" style="margin-top:6px">${value}${unit ? `<small>${unit}</small>` : ''}</div></div>
      <div class="kpi-icon ic-${color}">${icon(iconName, 20)}</div>
    </div>
    <div class="kpi-foot">${trend ? `<span class="trend ${trendDir}">${icon(trendDir === 'down' ? 'trendDown' : trendDir === 'warn' ? 'alert' : 'trendUp', 12)}${trend}</span>` : ''}<span>${foot || ''}</span></div>
    ${spark ? Charts.sparkline(spark, sparkColor) : ''}
  </div>`;
}

function badge(text, color = 'gray', dot = false) { return `<span class="badge b-${color}">${dot ? '<span class="bdot"></span>' : ''}${text}</span>`; }
function aiBadge(text = 'IA') { return `<span class="badge ai-badge">${icon('sparkles', 12)}${text}</span>`; }
function validityBadge(val) {
  const d = daysBetween(val);
  if (d < 0) return badge('Vencido', 'red', true);
  if (d === 0) return badge('Vence hoje', 'red', true);
  if (d === 1) return badge('Vence amanhã', 'orange', true);
  if (d <= 3) return badge(`Vence em ${d} dias`, 'amber', true);
  return badge(`${d} dias`, 'green', true);
}

/* ---------------- Sidebar mobile ---------------- */
function openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('show'); }
function closeSidebar() { const s = document.getElementById('sidebar'); if (s) { s.classList.remove('open'); document.getElementById('overlay').classList.remove('show'); } }

/* ---------------- Menus ---------------- */
function closeMenus() { ['notif-holder', 'user-menu-holder'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; }); }
document.addEventListener('click', e => { if (!e.target.closest('.notif-panel') && !e.target.closest('.icon-btn') && !e.target.closest('.user-chip')) closeMenus(); });

function toggleNotifs(e) {
  e.stopPropagation();
  const holder = document.getElementById('notif-holder');
  if (holder.innerHTML) { holder.innerHTML = ''; return; }
  closeMenus();
  const list = STATE.notifs[App.route.profile] || [];
  holder.innerHTML = `<div class="notif-panel">
    <div class="np-head"><strong>Notificações</strong><button class="btn btn-ghost btn-xs" onclick="markAllRead()">Marcar como lidas</button></div>
    <div class="np-list">${list.length ? list.map(n => `<div class="np-item ${n.unread ? 'unread' : ''}">
      <div class="kpi-icon ic-${n.color}" style="width:32px;height:32px">${icon(n.icon, 16)}</div>
      <div><strong>${n.title}</strong><div class="muted">${n.text}</div><span>${n.time}</span></div>
    </div>`).join('') : '<div class="empty">Sem notificações</div>'}</div>
  </div>`;
}
function markAllRead() { (STATE.notifs[App.route.profile] || []).forEach(n => n.unread = false); save(); App.refresh(); }

function toggleUserMenu(e) {
  e.stopPropagation();
  const holder = document.getElementById('user-menu-holder');
  if (holder.innerHTML) { holder.innerHTML = ''; return; }
  closeMenus();
  const opt = (key, label, ic) => `<button class="nav-item ${App.session === key ? 'active' : ''}" onclick="switchUser('${key}')">${icon(ic, 16)}<span>${label}<br><span class="xs muted">${USERS[key].name}</span></span></button>`;
  holder.innerHTML = `<div class="notif-panel" style="width:280px;padding:8px">
    <div class="nav-label" style="padding-top:6px">Alternar perfil (demonstração)</div>
    ${opt('gerente', 'Padaria — Gerente', 'store')}
    ${opt('funcionario', 'Padaria — Funcionário', 'chef')}
    ${opt('instituicao', 'Instituição receptora', 'handHeart')}
    ${opt('transportadora', 'Empresa de transporte', 'truck')}
    <div class="divider" style="margin:6px 0"></div>
    <button class="nav-item" onclick="App.logout()">${icon('logout', 16)}<span>Sair</span></button>
  </div>`;
}
function switchUser(key, page) {
  App.login(key, page);
  const u = USERS[key];
  toast('info', `Perfil: ${u.name}`, u.role);
}

/* ---------------- Modal & Toast ---------------- */
function modal({ title, sub, body, foot, iconName, iconColor = 'green', wide }) {
  document.getElementById('modal-root').innerHTML = `<div class="modal-backdrop" onclick="if(event.target===this) closeModal()">
    <div class="modal ${wide ? 'wide' : ''}">
      <div class="modal-head">
        ${iconName ? `<div class="kpi-icon ic-${iconColor}">${icon(iconName, 20)}</div>` : ''}
        <div><h3>${title}</h3>${sub ? `<p>${sub}</p>` : ''}</div>
        <button class="btn btn-ghost btn-icon close" onclick="closeModal()">${icon('x', 18)}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>
  </div>`;
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function toast(type, title, text) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  const ic = { success: 'check', warn: 'alert', info: 'info', ai: 'sparkles', error: 'x' }[type] || 'info';
  el.className = `toast ${type}`;
  el.innerHTML = `<div class="t-icon">${icon(ic, 15)}</div><div><strong>${title}</strong>${text ? `<p>${text}</p>` : ''}</div>`;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 3800);
}

/* ---------------- Tooltips dos gráficos ---------------- */
let tipEl;
function closeTip() { if (tipEl) tipEl.classList.remove('show'); }
document.addEventListener('mousemove', e => {
  const t = e.target.closest && e.target.closest('[data-tip]');
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'chart-tooltip'; document.body.appendChild(tipEl); }
  if (!t) { tipEl.classList.remove('show'); return; }
  tipEl.innerHTML = t.getAttribute('data-tip');
  tipEl.classList.add('show');
  const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  let x = e.clientX + 14, y = e.clientY - h - 10;
  if (x + w > window.innerWidth - 10) x = e.clientX - w - 14;
  if (y < 10) y = e.clientY + 16;
  tipEl.style.left = x + 'px'; tipEl.style.top = y + 'px';
});

/* =========================================================
   Fluxo compartilhado da doação (DOA-0147)
   Etapas (flow.step = nº de etapas concluídas):
   1 Aprovada · 2 Instituição notificada · 3 Instituição aceitou
   4 Transporte solicitado · 5 Transportadora aceitou
   6 Coletado · 7 Entregue · 8 Recebimento confirmado
   ========================================================= */
const FLOW_STEPS = [
  { label: 'Doação aprovada pela padaria', who: 'Padaria', color: 'var(--green-700)', icon: 'clipboardCheck' },
  { label: 'Instituição receptora notificada', who: 'Sistema', color: 'var(--gray-500)', icon: 'bell' },
  { label: 'Instituição aceitou a doação', who: 'Instituição', color: 'var(--teal-600)', icon: 'handHeart' },
  { label: 'Transporte solicitado', who: 'Padaria', color: 'var(--green-700)', icon: 'send' },
  { label: 'Transportadora aceitou a solicitação', who: 'Transportadora', color: 'var(--blue-600)', icon: 'truck' },
  { label: 'Alimentos coletados', who: 'Transportadora', color: 'var(--blue-600)', icon: 'package' },
  { label: 'Alimentos entregues', who: 'Transportadora', color: 'var(--blue-600)', icon: 'mapPin' },
  { label: 'Recebimento confirmado', who: 'Instituição', color: 'var(--teal-600)', icon: 'packageCheck' },
];

const Flow = {
  get f() { return STATE.flow; },
  mark(n) { this.f.times[n] = stamp(); },
  selectedItems() { return STATE.surplus.filter(s => s.selected); },
  totalKg() { return this.selectedItems().reduce((a, s) => a + s.kg, 0); },

  approve(instId) {
    const f = this.f;
    f.institutionId = instId;
    f.items = this.selectedItems().map(s => ({ ...s }));
    f.kg = +this.totalKg().toFixed(1);
    f.step = 2; this.mark(1); this.mark(2);
    const inst = instById(instId);
    notify('instituicao', { icon: 'inbox', color: 'teal', title: `Nova oferta: ${BAKERY.name}`, text: `${NUM(f.kg, 1)} kg de pães, bolos e folhados — responda em até 2h.` });
    notify('padaria', { icon: 'send', color: 'green', title: `Oferta ${f.code} enviada`, text: `${inst.name} foi notificada e tem até 2h para responder.` });
    save();
  },
  instAccept() {
    this.f.step = 3; this.mark(3);
    notify('padaria', { icon: 'handHeart', color: 'teal', title: `${instById(this.f.institutionId).name} aceitou a doação`, text: 'Selecione agora uma empresa de transporte.' });
    save();
  },
  instRefuse(reason) {
    const f = this.f;
    f.refusedInst.push(f.institutionId);
    notify('padaria', { icon: 'xCircle', color: 'orange', title: `${instById(f.institutionId).name} recusou a oferta`, text: `Motivo: ${reason}. Escolha outra instituição.` });
    f.step = 0; f.institutionId = null; f.times = {};
    save();
  },
  requestTransport(carrierId) {
    this.f.carrierId = carrierId; this.f.step = 4; this.mark(4);
    notify('transportadora', { icon: 'truck', color: 'blue', title: `Nova solicitação ${this.f.code.replace('DOA', 'TR')}`, text: `${BAKERY.name} → ${instById(this.f.institutionId).name} · ${NUM(this.f.kg, 1)} kg` });
    save();
  },
  carrierAccept() {
    this.f.step = 5; this.mark(5);
    const c = carrierById(this.f.carrierId);
    notify('padaria', { icon: 'truck', color: 'blue', title: `${c.name} aceitou o transporte`, text: `Coleta prevista para ${c.pickup}.` });
    notify('instituicao', { icon: 'truck', color: 'blue', title: 'Transporte confirmado', text: `${c.name} fará a entrega com previsão às ${c.delivery}.` });
    save();
  },
  carrierRefuse(reason) {
    const f = this.f;
    f.refusedCarrier.push(f.carrierId);
    notify('padaria', { icon: 'xCircle', color: 'orange', title: `${carrierById(f.carrierId).name} recusou o transporte`, text: `Motivo: ${reason}. Selecione outra transportadora.` });
    f.carrierId = null; f.step = 3; delete f.times[4];
    save();
  },
  collect() {
    this.f.step = 6; this.mark(6);
    notify('padaria', { icon: 'package', color: 'blue', title: 'Alimentos coletados', text: `A ${carrierById(this.f.carrierId).name} retirou ${NUM(this.f.kg, 1)} kg na padaria.` });
    save();
  },
  transit() {
    this.f.inTransit = true; this.f.times.transit = stamp();
    notify('instituicao', { icon: 'truck', color: 'blue', title: 'Doação a caminho', text: `Previsão de chegada: ${carrierById(this.f.carrierId).delivery}.` });
    save();
  },
  deliver() {
    this.f.step = 7; this.f.inTransit = false; this.mark(7);
    notify('instituicao', { icon: 'mapPin', color: 'teal', title: 'Entrega realizada', text: 'Confira os alimentos e confirme o recebimento.' });
    notify('padaria', { icon: 'mapPin', color: 'blue', title: 'Doação entregue', text: 'Aguardando confirmação de recebimento pela instituição.' });
    save();
  },
  confirm(note) {
    const f = this.f;
    f.step = 8; this.mark(8); f.note = note;
    const m = STATE.monthly;
    m.donated[5] = +(m.donated[5] + f.kg).toFixed(1);
    m.avoided[5] = +(m.avoided[5] + f.kg).toFixed(1);
    m.waste[5] = Math.max(0, +(m.waste[5] - 0).toFixed(1));
    m.savings[5] += Math.round(f.kg * 14);
    m.donationsDone[5] += 1; m.donationsTotal[5] += 1;
    const inst = instById(f.institutionId), c = carrierById(f.carrierId);
    const itemsTxt = f.items.map(i => i.name).join(', ');
    STATE.donationsHistory.unshift({ code: f.code, date: iso(0), inst: inst.name, carrier: c.name, kg: f.kg, items: itemsTxt, status: 'Concluída', demo: true });
    STATE.instHistory.unshift({ date: iso(0), bakery: BAKERY.name, items: itemsTxt, kg: f.kg, carrier: c.name, status: 'Recebida', demo: true });
    STATE.transHistory.unshift({ code: f.code.replace('DOA', 'TR'), date: iso(0), from: BAKERY.name, to: inst.name, kg: f.kg, km: +(c.distance + inst.distance).toFixed(1), status: 'Entregue', demo: true });
    // Remove do estoque as quantidades doadas
    f.items.forEach(it => { const st = STATE.stock.find(s => s.name === it.name); if (st) st.qty = Math.max(0, st.qty - it.qty); });
    STATE.surplus.forEach(s => { if (f.items.find(i => i.id === s.id)) s.donated = true; });
    notify('padaria', { icon: 'checkCircle', color: 'green', title: `Doação ${f.code} concluída!`, text: `${inst.name} confirmou o recebimento de ${NUM(f.kg, 1)} kg. Indicadores atualizados.` });
    notify('transportadora', { icon: 'checkCircle', color: 'green', title: 'Entrega confirmada', text: `${inst.name} confirmou o recebimento.` });
    save();
  },
};

function flowStepper(compact) {
  const f = STATE.flow;
  return `<div class="stepper">${FLOW_STEPS.map((s, i) => {
    const n = i + 1;
    const cls = f.step >= n ? 'done' : f.step + 1 === n ? 'current' : '';
    return `<div class="st-step ${cls}">
      <div class="st-dot">${f.step >= n ? icon('check', 16) : icon(s.icon, 15)}</div>
      <div class="st-label">${s.label}</div>
      ${!compact ? `<div class="st-who" style="color:${s.color}">${s.who}</div>` : ''}
      <div class="st-time">${f.times[n] || (cls === 'current' ? 'Em andamento' : '—')}</div>
    </div>`;
  }).join('')}</div>`;
}

function transportStatus() {
  const f = STATE.flow;
  if (f.step < 5) return null;
  if (f.step >= 7) return { label: 'Entregue', color: 'green', idx: 3 };
  if (f.inTransit) return { label: 'Em transporte', color: 'blue', idx: 2 };
  if (f.step >= 6) return { label: 'Coleta realizada', color: 'teal', idx: 1 };
  return { label: 'Aguardando coleta', color: 'amber', idx: 0 };
}

/* Mapa ilustrativo do trajeto */
function routeMap() {
  const f = STATE.flow;
  const ts = transportStatus();
  const inst = instById(f.institutionId) || INSTITUTIONS[0];
  const c = carrierById(f.carrierId) || CARRIERS[0];
  const P = { c: [12, 72], b: [34, 40], i: [84, 30] };
  let truck = P.c;
  if (ts) truck = ts.idx === 0 ? [22, 58] : ts.idx === 1 ? P.b : ts.idx === 2 ? [60, 30] : P.i;
  if (f.step >= 8) truck = P.i;
  return `<div class="map-box">
    <svg class="map-route" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path d="M12 72 C 18 62, 26 48, 34 40" stroke="#93c5fd" stroke-width="1.2" fill="none" stroke-dasharray="2 1.5" vector-effect="non-scaling-stroke"/>
      <path d="M34 40 C 48 20, 66 44, 84 30" stroke="${ts && ts.idx >= 1 ? '#16a34a' : '#cbd5d0'}" stroke-width="1.5" fill="none" stroke-dasharray="3 2" vector-effect="non-scaling-stroke"/>
    </svg>
    <div class="map-pin" style="left:${P.c[0]}%;top:${P.c[1]}%"><div class="mp-label">${c.name}</div><div class="mp-dot" style="background:#dbeafe;color:#2563eb">${icon('building', 14)}</div></div>
    <div class="map-pin" style="left:${P.b[0]}%;top:${P.b[1]}%"><div class="mp-label">${BAKERY.name}</div><div class="mp-dot" style="background:#16a34a;color:#fff">${icon('store', 14)}</div></div>
    <div class="map-pin" style="left:${P.i[0]}%;top:${P.i[1]}%"><div class="mp-label">${inst.name}</div><div class="mp-dot" style="background:#0d9488;color:#fff">${icon('heart', 14)}</div></div>
    ${ts ? `<div class="map-truck" style="left:${truck[0]}%;top:${truck[1]}%">${icon('truck', 16)}</div>` : ''}
    <div style="position:absolute;left:12px;bottom:10px" class="badge b-gray">${icon('route', 12)} ${NUM(c.distance + inst.distance, 1)} km · mapa ilustrativo</div>
  </div>`;
}

/* =========================================================
   Roteiro guiado da demonstração (13 etapas do fluxo)
   ========================================================= */
const Demo = {
  steps() {
    const s = STATE.seen || {}, f = STATE.flow;
    const r1 = STATE.recos.find(r => r.id === 'r1');
    return [
      { t: 'Padaria registra vendas, produção e estoque', who: 'Padaria', user: 'funcionario', page: 'producao', done: s['padaria/producao'] || s['padaria/estoque'], tip: 'Funcionário registra a produção do dia.' },
      { t: 'IA analisa os dados e prevê a demanda', who: 'IA', user: 'gerente', page: 'previsao', done: s['padaria/previsao'] },
      { t: 'IA identifica riscos e recomenda ações', who: 'IA', user: 'gerente', page: 'recomendacoes', done: s['padaria/recomendacoes'] },
      { t: 'Gerente aprova ou rejeita recomendações', who: 'Gerente', user: 'gerente', page: 'recomendacoes', done: r1 && r1.status !== 'pending', tip: 'Aprove a redução de 15% do pão francês.' },
      { t: 'Gerente inicia a doação do excedente', who: 'Gerente', user: 'gerente', page: 'doacoes', done: s['padaria/doacoes'] || f.step >= 1 },
      { t: 'IA recomenda uma instituição compatível', who: 'IA', user: 'gerente', page: 'doacoes', done: s.instRec || f.step >= 1 },
      { t: 'Gerente aprova a instituição escolhida', who: 'Gerente', user: 'gerente', page: 'doacoes', done: f.step >= 2 },
      { t: 'Instituição recebe a oferta e aceita', who: 'Instituição', user: 'instituicao', page: 'ofertas', done: f.step >= 3 },
      { t: 'Gerente seleciona a transportadora', who: 'Gerente', user: 'gerente', page: 'transporte', done: f.step >= 4 },
      { t: 'Transportadora aceita a solicitação', who: 'Transportadora', user: 'transportadora', page: 'solicitacoes', done: f.step >= 5 },
      { t: 'Coleta e entrega acompanhadas', who: 'Transportadora', user: 'transportadora', page: 'entregas', done: f.step >= 7 },
      { t: 'Instituição confirma o recebimento', who: 'Instituição', user: 'instituicao', page: 'recebimentos', done: f.step >= 8 },
      { t: 'Indicadores atualizados com o impacto', who: 'Padaria', user: 'gerente', page: 'relatorios', done: s.impactAfter },
    ];
  },
  render() {
    if (!STATE.demoOpen) return `<button class="demo-toggle" onclick="Demo.open()"><span class="dt-icon">${icon('presentation', 16)}</span>Roteiro da demonstração</button>`;
    const steps = this.steps();
    const cur = steps.findIndex(s => !s.done);
    const doneCount = steps.filter(s => s.done).length;
    const colors = { Padaria: 'var(--green-700)', Gerente: 'var(--green-700)', IA: 'var(--violet-600)', Instituição: 'var(--teal-600)', Transportadora: 'var(--blue-600)' };
    return `<div class="demo-panel">
      <div class="dp-head">
        <div class="kpi-icon" style="background:rgba(255,255,255,.15);color:#fff;width:36px;height:36px">${icon('presentation', 18)}</div>
        <div style="flex:1"><strong>Roteiro da demonstração</strong><span>${doneCount} de ${steps.length} etapas concluídas</span></div>
        <button class="btn btn-icon" style="color:#fff" onclick="Demo.close()" title="Minimizar">${icon('minus', 18)}</button>
      </div>
      <div style="padding:10px 14px 0"><div class="progress thin"><span style="width:${(doneCount / steps.length) * 100}%"></span></div></div>
      <div class="dp-body">
        ${steps.map((s, i) => `<div class="dp-step ${s.done ? 'done' : i === cur ? 'current' : ''}">
          <div class="dps-n">${s.done ? icon('check', 12) : i + 1}</div>
          <div class="dps-t" style="flex:1"><strong>${s.t}</strong><span class="dps-who" style="color:${colors[s.who]}">${s.who}</span>${i === cur && s.tip ? `<div class="xs muted">${s.tip}</div>` : ''}</div>
          ${i === cur ? `<button class="btn btn-warning btn-xs" onclick="Demo.goto(${i})">Ir ${icon('arrowRight', 12)}</button>` : !s.done ? `<button class="btn btn-ghost btn-xs" onclick="Demo.goto(${i})" title="Abrir tela">${icon('arrowRight', 12)}</button>` : ''}
        </div>`).join('')}
        ${cur === -1 ? `<div class="callout success mt-sm"><div class="co-icon">${icon('checkCircle', 16)}</div><div><strong>Demonstração concluída!</strong><p>Todo o fluxo foi executado entre os três perfis.</p></div></div>` : ''}
      </div>
      <div class="card-foot" style="padding:10px 14px">
        <span class="xs muted">Dados fictícios · protótipo acadêmico</span>
        <button class="btn btn-ghost btn-xs" onclick="Demo.reset()">${icon('refresh', 12)} Reiniciar</button>
      </div>
    </div>`;
  },
  goto(i) {
    const s = this.steps()[i];
    if (App.session === s.user) App.go(s.page); else switchUser(s.user, s.page);
  },
  open() { STATE.demoOpen = true; save(); if (App.route.profile && MODULES[App.route.profile]) App.refresh(); else location.hash = '#/login'; },
  close() { STATE.demoOpen = false; save(); App.refresh(); },
  reset() {
    modal({
      title: 'Reiniciar demonstração?', iconName: 'refresh', iconColor: 'orange',
      sub: 'Todos os dados fictícios voltarão ao estado inicial.',
      body: '<p class="muted">Use esta opção antes de uma nova apresentação. Cadastros, aprovações e o andamento da doação DOA-0147 serão apagados.</p>',
      foot: `<button class="btn btn-outline" onclick="closeModal()">Cancelar</button><button class="btn btn-warning" onclick="Demo.doReset()">Reiniciar</button>`,
    });
  },
  doReset() { resetState(); closeModal(); toast('success', 'Demonstração reiniciada', 'Os dados voltaram ao estado inicial.'); App.login('gerente', 'dashboard'); setTimeout(() => App.render(), 0); },
};

/* ---------------- Inicialização ---------------- */
window.addEventListener('hashchange', () => { closeModal(); App.render(); });
window.addEventListener('DOMContentLoaded', () => App.render());