/* =========================================================
   Ambiente: PADARIA (gerente e funcionário)
   ========================================================= */
MODULES.padaria = {
  envLabel: 'Ambiente da Padaria',
  org: { name: BAKERY.name, sub: BAKERY.unit, initials: 'PD' },
  nav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Operação' },
    { id: 'estoque', label: 'Estoque', icon: 'box' },
    { id: 'producao', label: 'Produção', icon: 'factory' },
    { id: 'previsao', label: 'Previsão de demanda', icon: 'sparkles', section: 'Inteligência Artificial', sectionIcon: 'sparkles', ai: true },
    { id: 'recomendacoes', label: 'Recomendações', icon: 'lightbulb', ai: true, badge: () => { const n = STATE.recos.filter(r => r.status === 'pending').length; return n ? { text: n } : null; } },
    { id: 'doacoes', label: 'Excedentes e doações', icon: 'heart', section: 'Logística solidária', ai: true, badge: () => (Flow.selectedItems().length && STATE.flow.step < 1 ? { text: `${NUM(Flow.totalKg(), 1)}kg`, soft: true } : null) },
    { id: 'transporte', label: 'Seleção de transporte', icon: 'truck', ai: true },
    { id: 'acompanhamento', label: 'Acompanhar doações', icon: 'route' },
    { id: 'relatorios', label: 'Relatórios e impacto', icon: 'chart', section: 'Análise', ai: true },
  ],
  after: {},
  pages: {},

  filterStock: 'todos',
  prodTab: 'hoje',
  donateInst: null,
  transportSel: null,
};

(function () {
  const M = MODULES.padaria;
  const mgr = () => App.isManager();

  /* =============== DASHBOARD =============== */
  M.pages.dashboard = function () {
    if (!mgr()) return staffDash();
    const m = STATE.monthly;
    const stockQty = STATE.stock.reduce((a, s) => a + s.qty, 0);
    const low = STATE.stock.filter(s => s.qty < s.min).length;
    const pendingRecos = STATE.recos.filter(r => r.status === 'pending').length;
    const tomorrowDemand = PRODUCTS.reduce((a, p) => a + SERIES[p.id].fc[0].forecast, 0);
    const todaySold = STATE.production.filter(p => p.date === iso(0)).reduce((a, p) => a + p.sold, 0);
    const diff = Math.round(((tomorrowDemand - todaySold) / todaySold) * 100);
    const f = STATE.flow;

    // gráfico agregado 14 dias: produção x vendas
    const labels = [], prod = [], sold = [];
    for (let i = -13; i <= 0; i++) {
      labels.push(i === 0 ? 'Hoje' : fmtShort(i));
      const rows = STATE.production.filter(p => p.date === iso(i));
      if (rows.length) {
        prod.push(rows.reduce((a, r) => a + r.produced, 0));
        sold.push(rows.reduce((a, r) => a + r.sold, 0));
      } else {
        // dias anteriores aos registros manuais: usa o histórico simulado
        prod.push(PRODUCTS.reduce((a, p) => a + (SERIES[p.id].hist.find(h => h.day === i)?.produced || 0), 0));
        sold.push(PRODUCTS.reduce((a, p) => a + (SERIES[p.id].hist.find(h => h.day === i)?.sold || 0), 0));
      }
    }
    return `${pageHead('Dashboard', `Visão geral da operação — ${BAKERY.unit}`,
      `<button class="btn btn-outline" onclick="App.go('producao')">${icon('factory', 16)} Registrar produção</button>
       <button class="btn btn-primary" onclick="App.go('previsao')">${icon('sparkles', 16)} Análise da IA</button>`,
      ['dashboard', 'green'])}

      <div class="ai-banner mb">
        <div class="ai-orb">${icon('brain', 26)}</div>
        <div style="flex:1;min-width:220px">
          <div class="flex" style="gap:8px"><h2>Assistente de IA</h2><span class="badge" style="background:rgba(255,255,255,.18);color:#fff">${'<span class="pulse-dot"></span>'} Online</span></div>
          <p>Previsão de <b>queda de 15% no pão francês amanhã</b> e ~${NUM(Flow.totalKg(), 1)} kg de excedente próprio para doação.</p>
        </div>
        <div class="ab-stat"><strong>${pendingRecos}</strong><span>recomendações pendentes</span></div>
        <div class="ab-actions">
          <button class="btn btn-white" onclick="App.go('recomendacoes')">${icon('lightbulb', 16)} Ver recomendações</button>
          ${f.step < 1 ? `<button class="btn" style="background:rgba(255,255,255,.14);color:#fff" onclick="App.go('doacoes')">${icon('heart', 16)} Doar excedente</button>` : ''}
        </div>
      </div>

      <div class="grid g-4 mb">
        ${kpi({ label: 'Estoque atual', value: NUM(stockQty), unit: 'itens', iconName: 'box', color: 'teal', foot: low ? `${low} abaixo do mínimo` : 'níveis ok' })}
        ${kpi({ label: 'Demanda prevista', value: NUM(tomorrowDemand), unit: 'un amanhã', iconName: 'sparkles', color: 'violet', cls: 'ai-kpi', trend: `${diff > 0 ? '+' : ''}${diff}%`, trendDir: diff >= 0 ? 'up' : 'down', foot: 'vs. hoje' })}
        ${kpi({ label: 'Desperdício evitado', value: NUM(m.avoided[5], 1), unit: 'kg no mês', iconName: 'recycle', color: 'green', trend: '↑', foot: 'prevenção + doação' })}
        ${kpi({ label: 'Doados no mês', value: NUM(m.donated[5], 1), unit: 'kg', iconName: 'handHeart', color: 'teal', foot: `${m.donationsDone[5]} doações` })}
      </div>

      ${f.step > 0 && f.step < 8 ? `<div class="callout info mb"><div class="co-icon">${icon('route', 16)}</div><div style="flex:1"><strong>Doação ${f.code} em andamento</strong><p>${NUM(f.kg, 1)} kg → ${instById(f.institutionId).name} · ${(transportStatus() || { label: 'em andamento' }).label}</p></div><button class="btn btn-primary btn-sm" onclick="App.go('acompanhamento')">Acompanhar ${icon('arrowRight', 14)}</button></div>` : ''}
      ${f.step >= 8 ? `<div class="callout success mb"><div class="co-icon">${icon('checkCircle', 16)}</div><div style="flex:1"><strong>Doação ${f.code} concluída</strong><p>${NUM(f.kg, 1)} kg entregues a ${instById(f.institutionId).name}.</p></div><button class="btn btn-outline btn-sm" onclick="App.go('relatorios')">Ver impacto ${icon('arrowRight', 14)}</button></div>` : ''}

      <div class="grid g-2-1">
        <div class="card">
          <div class="card-head"><h3>${icon('chart', 16)} Produção × vendas — 14 dias</h3>
            <div class="chart-legend"><span><i style="background:#16a34a"></i>Vendido</span><span><i style="background:#cbd5d0"></i>Produzido</span></div></div>
          <div class="card-body">${Charts.line({ id: 'dpv', labels, series: [{ name: 'Produzido', color: '#cbd5d0', values: prod, dots: false }, { name: 'Vendido', color: '#16a34a', values: sold, area: true }], height: 250 })}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('alert', 16)} Alertas</h3><button class="btn btn-ghost btn-sm" onclick="App.go('recomendacoes')">Ver todos</button></div>
          <div class="card-body"><div class="alert-list">
            <div class="alert-item"><div class="ai-icon ic-violet">${icon('trendDown', 16)}</div><div style="flex:1"><strong>Pão francês: -15% amanhã</strong><p>Chuva + feriado escolar</p></div>${badge('IA', 'violet')}</div>
            <div class="alert-item"><div class="ai-icon ic-orange">${icon('clock', 16)}</div><div style="flex:1"><strong>20 croissants vencem amanhã</strong></div>${badge('48h', 'orange')}</div>
            <div class="alert-item"><div class="ai-icon ic-red">${icon('box', 16)}</div><div style="flex:1"><strong>Manteiga abaixo do mínimo</strong></div>${badge('8 kg', 'red')}</div>
            <div class="alert-item"><div class="ai-icon ic-teal">${icon('handHeart', 16)}</div><div style="flex:1"><strong>~${NUM(Flow.totalKg(), 1)} kg de excedente para doar</strong></div><button class="btn btn-ghost btn-xs" onclick="App.go('doacoes')">Doar</button></div>
          </div></div>
        </div>
      </div>`;
  };

  /* Dashboard do funcionário (sem IA) */
  function staffDash() {
    const today = STATE.production.filter(p => p.date === iso(0));
    const produced = today.reduce((a, p) => a + p.produced, 0);
    const sold = today.reduce((a, p) => a + p.sold, 0);
    const expiring = STATE.stock.filter(s => { const d = daysBetween(s.val); return d >= 0 && d <= 2; });
    return `${pageHead('Dashboard operacional', `Bom dia, ${App.user.name.split(' ')[0]} — registros do dia`,
      `<button class="btn btn-outline" onclick="App.go('estoque')">${icon('box', 16)} Registrar estoque</button>
       <button class="btn btn-primary" onclick="App.go('producao')">${icon('factory', 16)} Registrar produção</button>`,
      ['dashboard', 'green'])}
      <div class="grid g-4 mb">
        ${kpi({ label: 'Produzido hoje', value: NUM(produced), unit: 'un', iconName: 'factory', foot: `${today.length} lotes registrados` })}
        ${kpi({ label: 'Vendido hoje', value: NUM(sold), unit: 'un', iconName: 'chart', color: 'teal', foot: `${Math.round((sold / produced) * 100)}% de aproveitamento` })}
        ${kpi({ label: 'Restante no dia', value: NUM(produced - sold), unit: 'un', iconName: 'box', color: 'orange', foot: 'avaliar destino ao fechar' })}
        ${kpi({ label: 'Vencem em 48h', value: expiring.length, unit: 'itens', iconName: 'clock', color: 'red', foot: 'priorizar na vitrine' })}
      </div>
      <div class="callout info mb"><div class="co-icon">${icon('info', 16)}</div><div><strong>Seu perfil é operacional</strong><p>Você registra estoque e produção. As análises de IA, recomendações e decisões sobre doações são feitas pelo gerente.</p></div></div>
      <div class="card">
        <div class="card-head"><h3>${icon('alert', 16)} Itens próximos do vencimento</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Alimento</th><th>Quantidade</th><th>Validade</th><th>Armazenamento</th><th>Situação</th></tr></thead><tbody>
          ${expiring.map(s => `<tr><td><div class="prod-cell"><span class="prod-emoji">${s.emoji}</span><b>${s.name}</b></div></td><td>${s.qty} ${s.unit}</td><td>${fmtShort(s.val)}</td><td class="muted">${s.storage}</td><td>${validityBadge(s.val)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
  }

  /* =============== ESTOQUE =============== */
  M.pages.estoque = function () {
    const f = M.filterStock;
    const cats = ['todos', ...new Set(STATE.stock.map(s => s.cat))];
    const rows = STATE.stock.filter(s => {
      if (f === 'todos') return true;
      if (f === 'vencendo') return daysBetween(s.val) >= 0 && daysBetween(s.val) <= 3;
      if (f === 'baixo') return s.qty < s.min;
      return s.cat === f;
    });
    const expiring = STATE.stock.filter(s => daysBetween(s.val) <= 3).length;
    const low = STATE.stock.filter(s => s.qty < s.min).length;
    return `${pageHead('Cadastro de estoque', 'Alimentos e insumos com controle de validade e armazenamento',
      `<button class="btn btn-primary" onclick="Padaria.stockModal()">${icon('plus', 16)} Cadastrar alimento</button>`, ['box', 'green'])}
      <div class="card">
        <div class="card-head"><div class="chip-select">${cats.map(c => `<button class="chip ${f === c ? 'on' : ''}" onclick="Padaria.filterStock('${c}')">${{ todos: 'Todos', vencendo: '⏰ Vencendo', baixo: '⚠ Estoque baixo' }[c] || c}</button>`).join('')}</div></div>
        <div class="table-wrap"><table class="table"><thead><tr>
          <th>Alimento</th><th>Quantidade</th><th>Validade</th><th>Situação</th><th class="right">Ações</th>
        </tr></thead><tbody>
          ${rows.map(s => {
            const pct = Math.min(100, Math.round((s.qty / s.min) * 100));
            const barColor = s.qty < s.min ? 'red' : pct < 150 ? 'amber' : 'green';
            return `<tr ${s.justAdded ? 'class="row-new"' : ''}>
            <td><div class="prod-cell"><span class="prod-emoji">${s.emoji}</span><div><b>${s.name}</b><div class="xs muted">${s.cat} · ${s.storage}</div></div></div></td>
            <td><b>${NUM(s.qty)}</b> ${s.unit}<div class="progress thin ${barColor}" style="width:70px;margin-top:4px"><span style="width:${Math.min(pct, 100)}%"></span></div><div class="xs muted">mín. ${s.min} ${s.unit}</div></td>
            <td>${fmtShort(s.val)}<div class="xs muted">fab. ${fmtShort(s.fab)}</div></td>
            <td>${validityBadge(s.val)}${s.qty < s.min ? ` ${badge('Baixo', 'red', true)}` : ''}</td>
            <td><div class="row-actions"><button class="btn btn-ghost btn-icon" title="Editar" onclick="Padaria.stockModal(${s.id})">${icon('edit', 15)}</button><button class="btn btn-ghost btn-icon" title="Excluir" onclick="Padaria.delStock(${s.id})" style="color:var(--red-600)">${icon('trash', 15)}</button></div></td>
          </tr>`; }).join('')}
        </tbody></table>${rows.length === 0 ? '<div class="empty"><div class="em-icon">' + icon('search', 24) + '</div><h4>Nenhum item encontrado</h4><p>Ajuste os filtros ou cadastre um novo alimento.</p></div>' : ''}</div>
      </div>`;
  };

  const STOCK_CATS = ['Pães', 'Bolos e doces', 'Folhados', 'Salgados', 'Insumos'];
  const EMOJIS = ['🥖', '🍞', '🥐', '🍰', '🍩', '🧀', '🥯', '🥧', '🧈', '🥛', '🥚', '🌾', '🫙', '🧁', '🍪'];
  window.Padaria = {
    filterStock(c) { M.filterStock = c; App.refresh(); },

    stockModal(id) {
      const s = id ? STATE.stock.find(x => x.id === id) : null;
      modal({
        title: s ? 'Editar alimento' : 'Cadastrar alimento', iconName: 'box', wide: true,
        sub: s ? s.name : 'Registre um novo item no estoque',
        body: `<div class="form-grid g3">
          <div class="field full"><label>Nome do alimento</label><input class="input" id="f-name" value="${s ? s.name : ''}" placeholder="Ex.: Pão sírio"></div>
          <div class="field"><label>Categoria</label><select class="select" id="f-cat">${STOCK_CATS.map(c => `<option ${s && s.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="field"><label>Quantidade</label><input class="input" id="f-qty" type="number" min="0" step="0.1" value="${s ? s.qty : ''}" placeholder="0"></div>
          <div class="field"><label>Unidade</label><select class="select" id="f-unit">${['un', 'pct', 'kg', 'L'].map(u => `<option ${s && s.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
          <div class="field"><label>Data de fabricação</label><input class="input" id="f-fab" type="date" value="${s ? s.fab : iso(0)}"></div>
          <div class="field"><label>Data de validade</label><input class="input" id="f-val" type="date" value="${s ? s.val : iso(3)}"></div>
          <div class="field"><label>Quantidade mínima</label><input class="input" id="f-min" type="number" min="0" value="${s ? s.min : 10}"></div>
          <div class="field full"><label>Condições de armazenamento</label><input class="input" id="f-sto" value="${s ? s.storage : ''}" placeholder="Ex.: Refrigerado (2 °C a 8 °C)"></div>
          <div class="field full"><label>Ícone</label><div class="chip-select" id="f-emoji">${EMOJIS.map(e => `<button class="chip ${(s ? s.emoji : '🥖') === e ? 'on' : ''}" onclick="this.parentNode.querySelectorAll('.chip').forEach(c=>c.classList.remove('on'));this.classList.add('on')" data-e="${e}">${e}</button>`).join('')}</div></div>
        </div>`,
        foot: `<button class="btn btn-outline" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="Padaria.saveStock(${s ? s.id : 'null'})">${icon('check', 15)} ${s ? 'Salvar alterações' : 'Cadastrar'}</button>`,
      });
    },
    saveStock(id) {
      const v = id2 => document.getElementById(id2).value;
      if (!v('f-name').trim() || !v('f-qty')) { toast('error', 'Dados incompletos', 'Informe ao menos o nome e a quantidade.'); return; }
      const emoji = document.querySelector('#f-emoji .chip.on')?.dataset.e || '🥖';
      const obj = { name: v('f-name').trim(), cat: v('f-cat'), qty: +v('f-qty'), unit: v('f-unit'), fab: v('f-fab'), val: v('f-val'), storage: v('f-sto') || 'Temperatura ambiente', min: +v('f-min'), emoji };
      if (id) Object.assign(STATE.stock.find(x => x.id === id), obj);
      else STATE.stock.unshift({ id: Math.max(...STATE.stock.map(x => x.id)) + 1, justAdded: true, ...obj });
      save(); closeModal(); App.refresh();
      toast('success', id ? 'Item atualizado' : 'Alimento cadastrado', `${obj.name} · ${obj.qty} ${obj.unit}`);
    },
    delStock(id) {
      const s = STATE.stock.find(x => x.id === id);
      modal({
        title: 'Excluir item?', iconName: 'trash', iconColor: 'red', sub: s.name,
        body: `<p class="muted">O item <b>${s.name}</b> (${s.qty} ${s.unit}) será removido do estoque. Essa ação é simulada no protótipo.</p>`,
        foot: `<button class="btn btn-outline" onclick="closeModal()">Cancelar</button><button class="btn btn-danger" onclick="Padaria.doDelStock(${id})">${icon('trash', 15)} Excluir</button>`,
      });
    },
    doDelStock(id) { STATE.stock = STATE.stock.filter(x => x.id !== id); save(); closeModal(); App.refresh(); toast('success', 'Item removido'); },

    /* =============== PRODUÇÃO =============== */
    prodTab(t) { M.prodTab = t; App.refresh(); },
    prodModal() {
      modal({
        title: 'Registrar produção', iconName: 'factory', wide: true,
        sub: `Lançamento diário · ${fmtDate(0)}`,
        body: `<div class="form-grid">
          <div class="field full"><label>Produto produzido</label><select class="select" id="p-prod">${PRODUCTS.map(p => `<option value="${p.id}">${p.emoji} ${p.name} (${p.unit})</option>`).join('')}</select></div>
          <div class="field"><label>Quantidade produzida</label><input class="input" id="p-qty" type="number" min="0" placeholder="0" oninput="Padaria.calcRest()"></div>
          <div class="field"><label>Quantidade vendida</label><input class="input" id="p-sold" type="number" min="0" placeholder="0" oninput="Padaria.calcRest()"></div>
          <div class="field"><label>Data</label><input class="input" id="p-date" type="date" value="${iso(0)}"></div>
          <div class="field"><label>Horário</label><input class="input" id="p-time" type="time" value="${nowTime()}"></div>
          <div class="field full"><div class="mini-stat" style="flex-direction:row;justify-content:space-between;align-items:center"><span>Quantidade restante (calculada)</span><strong id="p-rest" style="font-size:22px">0</strong></div></div>
        </div>`,
        foot: `<button class="btn btn-outline" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="Padaria.saveProd()">${icon('check', 15)} Registrar</button>`,
      });
    },
    calcRest() {
      const q = +document.getElementById('p-qty').value || 0, s = +document.getElementById('p-sold').value || 0;
      document.getElementById('p-rest').textContent = Math.max(0, q - s);
    },
    saveProd() {
      const v = id2 => document.getElementById(id2).value;
      if (!v('p-qty')) { toast('error', 'Informe a quantidade produzida'); return; }
      const q = +v('p-qty'), s = Math.min(+v('p-sold') || 0, q);
      STATE.production.unshift({ id: Date.now(), pid: v('p-prod'), date: v('p-date'), time: v('p-time'), produced: q, sold: s, by: App.user.name, justAdded: true });
      save(); closeModal(); App.refresh();
      toast('success', 'Produção registrada', `${PRODUCT_BY_ID[v('p-prod')].name} · ${q} un · restam ${q - s}`);
    },
    editSold(id) {
      const p = STATE.production.find(x => x.id === id);
      const prod = PRODUCT_BY_ID[p.pid];
      modal({
        title: 'Atualizar vendas', iconName: 'chart', sub: `${prod.name} · ${fmtShort(p.date)} ${p.time}`,
        body: `<div class="field"><label>Quantidade vendida (máx. ${p.produced} ${prod.unit})</label><input class="input" id="e-sold" type="number" min="0" max="${p.produced}" value="${p.sold}"></div>`,
        foot: `<button class="btn btn-outline" onclick="closeModal()">Cancelar</button><button class="btn btn-primary" onclick="Padaria.saveSold(${id})">Salvar</button>`,
      });
    },
    saveSold(id) {
      const p = STATE.production.find(x => x.id === id);
      const v = Math.min(Math.max(0, +document.getElementById('e-sold').value || 0), p.produced);
      p.sold = v; save(); closeModal(); App.refresh(); toast('success', 'Vendas atualizadas');
    },
  };

  M.pages.producao = function () {
    const tab = M.prodTab;
    const dates = [...new Set(STATE.production.map(p => p.date))].sort().reverse();
    const selDate = tab === 'hoje' ? iso(0) : tab;
    const rows = STATE.production.filter(p => p.date === selDate).sort((a, b) => a.time.localeCompare(b.time));
    const totP = rows.reduce((a, r) => a + r.produced, 0), totS = rows.reduce((a, r) => a + r.sold, 0);
    return `${pageHead('Controle de produção', 'Registro diário de produção, vendas e sobras',
      `<button class="btn btn-primary" onclick="Padaria.prodModal()">${icon('plus', 16)} Registrar produção</button>`, ['factory', 'green'])}
      <div class="card mb">
        <div class="tabs">
          <button class="tab ${tab === 'hoje' ? 'active' : ''}" onclick="Padaria.prodTab('hoje')">Hoje</button>
          ${dates.filter(d => d !== iso(0)).map(d => `<button class="tab ${tab === d ? 'active' : ''}" onclick="Padaria.prodTab('${d}')">${addDays(daysBetween(d)).toLocaleDateString('pt-BR', { weekday: 'short' })} ${fmtShort(d)}</button>`).join('')}
        </div>
        <div class="card-body"><div class="grid g-3">
          <div class="mini-stat"><span>Total produzido</span><strong>${NUM(totP)} un</strong></div>
          <div class="mini-stat"><span>Total vendido</span><strong class="text-green">${NUM(totS)} un</strong></div>
          <div class="mini-stat"><span>Restante</span><strong class="${totP - totS > totS * 0.15 ? 'text-orange' : ''}">${NUM(totP - totS)} un</strong></div>
        </div></div>
        <div class="table-wrap"><table class="table"><thead><tr>
          <th>Produto</th><th>Horário</th><th>Produzido</th><th>Vendido</th><th>Restante</th><th>Aproveitamento</th><th class="right">Ações</th>
        </tr></thead><tbody>
          ${rows.map(r => {
            const p = PRODUCT_BY_ID[r.pid]; const rest = r.produced - r.sold; const y = Math.round((r.sold / r.produced) * 100);
            return `<tr ${r.justAdded ? 'class="row-new"' : ''}><td><div class="prod-cell"><span class="prod-emoji">${p.emoji}</span><div><b>${p.name}</b></div></div></td>
            <td>${r.time}</td><td><b>${NUM(r.produced)}</b> ${p.unit}</td><td>${NUM(r.sold)} ${p.unit}</td>
            <td>${rest > 0 ? `<b class="text-orange">${NUM(rest)}</b> ${p.unit}` : '<span class="muted">0</span>'}</td>
            <td><div class="flex" style="gap:8px"><div class="progress thin" style="width:60px"><span style="width:${y}%"></span></div><span class="small semi">${y}%</span></div></td>
            <td class="right"><button class="btn btn-ghost btn-xs" onclick="Padaria.editSold(${r.id})">${icon('edit', 12)} Vendas</button></td></tr>`;
          }).join('')}
        </tbody></table>${rows.length === 0 ? '<div class="empty"><div class="em-icon">' + icon('factory', 24) + '</div><h4>Nenhum registro neste dia</h4><p>Use o botão "Registrar produção".</p></div>' : ''}</div>
      </div>`;
  };

  /* =============== PREVISÃO DE DEMANDA (IA) =============== */
  M.forecastProd = 'pf';
  M.pages.previsao = function () {
    const pid = M.forecastProd;
    const p = PRODUCT_BY_ID[pid], s = SERIES[pid];
    const approved = STATE.recos.filter(r => r.status === 'approved' && r.pid === pid);
    const labels = [], histVals = [], prodVals = [], fcVals = [], low = [], high = [];
    s.hist.forEach(h => { labels.push(fmtShort(h.day)); histVals.push(h.sold); prodVals.push(h.produced); fcVals.push(null); low.push(null); high.push(null); });
    labels.push('Hoje'); histVals.push(s.hist[s.hist.length - 1].sold); prodVals.push(s.hist[s.hist.length - 1].produced); fcVals.push(s.hist[s.hist.length - 1].sold); low.push(null); high.push(null);
    s.fc.forEach((f, i) => { labels.push(weekday(f.day)); histVals.push(null); prodVals.push(null); fcVals.push(f.forecast); low.push(f.low); high.push(f.high); });

    const demand7 = PRODUCTS.map(pp => ({ p: pp, d: SERIES[pp.id].fc.slice(0, 7).reduce((a, x) => a + x.forecast, 0) })).sort((a, b) => b.d - a.d);
    const maxD = demand7[0].d;
    const excedentes = PRODUCTS.map(pp => {
      const planned = STATE.plan[pp.id] ?? Math.round(pp.base * 1.1);
      const f1 = SERIES[pp.id].fc[0].forecast;
      return { p: pp, excess: Math.max(0, planned - f1), f1, planned };
    }).filter(e => e.excess > 3).sort((a, b) => b.excess - a.excess).slice(0, 4);
    const totalEx = excedentes.reduce((a, e) => a + e.excess, 0);

    return `${pageHead('Previsão de demanda', 'A IA cruza histórico de vendas, produção e estoque para projetar os próximos 7 dias',
      `<button class="btn btn-outline" onclick="Padaria.regenerate()">${icon('refresh', 16)} Recalcular previsão</button>
       <button class="btn btn-primary" onclick="App.go('recomendacoes')">${icon('lightbulb', 16)} Ver recomendações</button>`,
      ['sparkles', 'violet'],
      `Operação ${icon('chevronRight', 12)} <b class="text-violet">Inteligência Artificial</b>`)}

      <div class="card mb"><div class="card-body">
        <div class="flex-between mb"><div><h3 class="flex" style="gap:8px">${icon('cpu', 17)} Como a IA prevê a demanda</h3></div>${aiBadge('Simulado')}</div>
        <div class="pipeline">
          ${[
            ['database', 'blue', '1. Coleta dados', 'Vendas, produção e estoque'],
            ['calendar', 'teal', '2. Encontra padrões', 'Dia da semana e tendências'],
            ['cloud', 'orange', '3. Fatores externos', 'Clima, feriados e eventos'],
            ['brain', 'violet', '4. Gera a previsão', 'Demanda dos próximos 7 dias'],
          ].map(x => `<div class="pipe-step"><div class="ps-icon ic-${x[1]}">${icon(x[0], 17)}</div><strong>${x[2]}</strong><span>${x[3]}</span></div>`).join('')}
        </div>
      </div></div>

      <div class="grid g-3-2 mb">
        <div class="card">
          <div class="card-head">
            <div><h3>${icon('trendUp', 16)} Previsão de vendas — ${p.emoji} ${p.name}</h3><p>Histórico de 14 dias + projeção de 7 dias com intervalo de confiança</p></div>
            <div class="chart-legend"><span><i style="background:#16a34a"></i>Vendido</span><span><i style="background:#cbd5d0"></i>Produzido</span><span style="color:#7c3aed"><i class="dash" style="color:#8b5cf6"></i>Previsão IA</span></div>
          </div>
          <div class="card-body">
            <div class="chip-select mb">${PRODUCTS.map(pp => `<button class="chip ${pid === pp.id ? 'on' : ''}" onclick="Padaria.fcast('${pp.id}')">${pp.emoji} ${pp.name}</button>`).join('')}</div>
            ${Charts.line({ id: 'fc', labels, split: 14, series: [
              { name: 'Produzido', color: '#cbd5d0', values: prodVals, dots: false },
              { name: 'Vendido', color: '#16a34a', values: histVals },
              { name: 'Previsão IA', color: '#8b5cf6', values: fcVals, dashed: true },
            ], band: { low, high }, height: 290, unit: ` ${p.unit}`, highlight: 15 })}
            ${approved.length ? `<div class="callout success mt-sm"><div class="co-icon">${icon('checkCircle', 16)}</div><div><strong>Ajuste aplicado pelo gerente</strong><p>A recomendação de redução foi aprovada — a produção de amanhã já reflete a nova quantidade.</p></div></div>` : ''}
          </div>
        </div>
        <div class="col" style="gap:18px">
          <div class="card"><div class="card-head"><h3>${icon('flame' in ICONS ? 'flame' : 'trendUp', 16)} Procura nos próximos 7 dias</h3></div>
            <div class="card-body"><div class="bar-list">
              ${demand7.map((d, i) => `<div class="bar-row"><div class="br-name">${d.p.emoji} ${d.p.name} ${i === 0 ? badge('maior', 'green') : i === demand7.length - 1 ? badge('menor', 'orange') : ''}</div><div class="progress ${i === 0 ? '' : i === demand7.length - 1 ? 'orange' : 'thin'}"><span style="width:${(d.d / maxD) * 100}%"></span></div><div class="br-val">${NUM(d.d)}</div></div>`).join('')}
            </div></div>
          </div>
          <div class="card"><div class="card-head"><h3>${icon('alert', 16)} Possíveis excedentes</h3><p>Produção planejada acima da demanda prevista</p></div>
            <div class="card-body"><div class="bar-list">
              ${excedentes.map(e => `<div class="bar-row"><div class="br-name">${e.p.emoji} ${e.p.name}</div><div class="progress orange"><span style="width:${(e.excess / e.planned) * 100}%"></span></div><div class="br-val text-orange">+${e.excess}</div></div>`).join('')}
              <div class="callout warn mt-sm" style="grid-column:1/-1"><div class="co-icon">${icon('alert', 15)}</div><div><strong>~${NUM(totalEx)} unidades em risco de sobra amanhã</strong><p>A IA já preparou ajustes — veja em Recomendações.</p></div></div>
            </div></div>
          </div>
        </div>
      </div>

      <div class="card mb">
        <div class="card-head"><div><h3>${icon('clipboardCheck', 16)} Plano de produção para amanhã (${fmtShort(1)} · ${weekday(1)})</h3><p>Quantidade recomendada pela IA × produção habitual</p></div>${aiBadge('Recomendado pela IA')}</div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>Demanda prevista</th><th>Quantidade recomendada</th><th>Ajuste vs. habitual</th><th>Status</th></tr></thead><tbody>
          ${PRODUCTS.map(pp => {
            const f1 = SERIES[pp.id].fc[0];
            const habit = STATE.plan[pp.id] ?? Math.round(pp.base * 1.1);
            let rec = Math.round(f1.forecast * 1.12);
            const reco = STATE.recos.find(r => r.pid === pp.id);
            const approved = reco && reco.status === 'approved';
            const delta = rec - habit;
            return `<tr>
              <td><div class="prod-cell"><span class="prod-emoji">${pp.emoji}</span><b>${pp.name}</b></div></td>
              <td><b>${f1.forecast}</b> ${pp.unit}</td>
              <td><b class="text-violet">${rec} ${pp.unit}</b></td>
              <td>${delta < 0 ? `<span class="trend down">${icon('trendDown', 12)}${Math.round((delta / habit) * 100)}%</span>` : delta > 0 ? `<span class="trend up">${icon('trendUp', 12)}+${Math.round((delta / habit) * 100)}%</span>` : '<span class="muted">—</span>'}</td>
              <td>${approved ? badge('Ajuste aprovado', 'green', true) : delta < -5 ? badge('Sugestão pendente', 'amber', true) : badge('Manter', 'gray', true)}</td>
            </tr>`;
          }).join('')}
        </tbody></table></div>
      </div>

      <div class="callout ai"><div class="co-icon">${icon('brain', 16)}</div><div><strong>Como ler</strong><p>Verde = vendido · violeta tracejado = previsão da IA (a faixa clara é a margem esperada).</p></div></div>`;
  };
  Padaria.fcast = pid => { M.forecastProd = pid; App.refresh(); };
  Padaria.regenerate = () => {
    toast('ai', 'IA recalculando...', 'Analisando vendas, produção e fatores externos.');
    setTimeout(() => { toast('success', 'Previsão atualizada', 'Confiança média do modelo: 91%'); }, 1600);
  };

  /* =============== RECOMENDAÇÕES =============== */
  M.pages.recomendacoes = function () {
    const recos = STATE.recos;
    const pending = recos.filter(r => r.status === 'pending');
    const priColor = { alta: 'red', média: 'amber', baixa: 'green' };
    const typeIcon = { reduce: 'trendDown', expiring: 'clock', over: 'trendUp', stock: 'box', donate: 'heart' };
    const typeColor = { reduce: 'violet', expiring: 'orange', over: 'blue', stock: 'red', donate: 'teal' };
    return `${pageHead('Recomendações inteligentes', 'A IA analisa e recomenda — decisões importantes passam pela sua aprovação',
      `<button class="btn btn-outline" onclick="App.go('previsao')">${icon('sparkles', 16)} Ver previsões</button>`, ['lightbulb', 'violet'])}

      <div class="grid g-3 mb">
        <div class="card kpi"><div class="kpi-top"><div><div class="kpi-label">Aguardando decisão</div><div class="kpi-value text-orange" style="margin-top:6px">${pending.length}</div></div><div class="kpi-icon ic-orange">${icon('lightbulb', 20)}</div></div></div>
        <div class="card kpi"><div class="kpi-top"><div><div class="kpi-label">Aprovadas</div><div class="kpi-value text-green" style="margin-top:6px">${recos.filter(r => r.status === 'approved').length}</div></div><div class="kpi-icon ic-green">${icon('checkCircle', 20)}</div></div></div>
        <div class="card kpi"><div class="kpi-top"><div><div class="kpi-label">Impacto estimado se aprovadas</div><div class="kpi-value" style="margin-top:6px">${NUM(pending.reduce((a, r) => a + r.savedKg, 0), 1)}<small>kg evitados</small></div></div><div class="kpi-icon ic-violet">${icon('recycle', 20)}</div></div></div>
      </div>

      <div class="grid g-2">
        ${recos.map(r => `<div class="reco ${r.status}">
          <div class="reco-head">
            <div class="rh-icon ic-${typeColor[r.type]}">${icon(typeIcon[r.type], 20)}</div>
            <div style="flex:1">
              <div class="flex-between"><h4>${r.title}</h4>${aiBadge(`${r.confidence}%`)}</div>
              <div class="rh-meta">${badge(`Prioridade ${r.priority}`, priColor[r.priority], true)}${badge(r.area, 'gray')}</div>
            </div>
          </div>
          <div class="reco-body" style="grid-template-columns:1fr;gap:10px">
            <div class="reco-quote">${icon('sparkles', 16)}<span><i>"${r.quote}"</i></span></div>
            <div class="reco-sec"><div class="rs-icon ic-violet">${icon('zap', 13)}</div><div><h5>Ação sugerida</h5><p>${r.action}</p></div></div>
            <div class="reco-sec"><div class="rs-icon ic-green">${icon('target', 13)}</div><div><h5>Benefício esperado</h5><p>${r.benefit}</p></div></div>
          </div>
          <div class="reco-foot">
            <div class="confidence"><span>Confiança</span><div class="progress violet"><span style="width:${r.confidence}%"></span></div><b>${r.confidence}%</b></div>
            <div style="flex:1"></div>
            ${r.status === 'pending' ? `
              <button class="btn btn-ghost btn-sm" onclick="Padaria.recoDetail('${r.id}')">${icon('eye', 14)} Analisar</button>
              <button class="btn btn-danger btn-sm" onclick="Padaria.recoReject('${r.id}')">${icon('x', 14)} Rejeitar</button>
              <button class="btn btn-green btn-sm" onclick="Padaria.recoApprove('${r.id}')">${icon('check', 14)} Aprovar</button>`
            : r.status === 'approved' ? `<span class="badge b-green">${icon('checkCircle', 12)} Aprovada pelo gerente — ${r.decidedAt || 'hoje'}</span>`
            : `<span class="badge b-red">${icon('xCircle', 12)} Rejeitada — ${r.decidedAt || 'hoje'}</span>`}
          </div>
        </div>`).join('')}
      </div>`;
  };

  Padaria.recoApprove = id => {
    const r = STATE.recos.find(x => x.id === id);
    const doApprove = () => {
      r.status = 'approved'; r.decidedAt = nowTime();
      if (r.type === 'reduce' && r.pid) {
        const newQty = Math.round(SERIES[r.pid].fc[0].forecast * 1.12);
        STATE.plan[r.pid] = newQty;
      }
      save(); closeModal(); App.refresh();
      toast('success', 'Recomendação aprovada', r.type === 'reduce' ? 'O plano de produção de amanhã foi ajustado.' : 'A ação sugerida foi registrada.');
      if (id === 'r5') setTimeout(() => App.go('doacoes'), 700);
    };
    if (r.type === 'reduce') {
      modal({
        title: 'Aprovar ajuste de produção?', iconName: 'checkCircle', sub: r.title,
        body: `<div class="grid g-2"><div class="mini-stat"><span>Produção planejada</span><strong>${STATE.plan[r.pid]} un</strong></div><div class="mini-stat" style="background:var(--green-50)"><span>Após o ajuste da IA</span><strong class="text-green">${Math.round(SERIES[r.pid].fc[0].forecast * 1.12)} un</strong></div></div>
          <p class="muted mt-sm">A ordem de produção de amanhã será atualizada e a equipe será notificada.</p>`,
        foot: `<button class="btn btn-outline" onclick="closeModal()">Voltar</button><button class="btn btn-green" onclick="Padaria._confirmApprove()">${icon('check', 15)} Confirmar aprovação</button>`,
      });
      Padaria._confirmApprove = doApprove;
    } else doApprove();
  };
  Padaria.recoReject = id => {
    const r = STATE.recos.find(x => x.id === id);
    modal({
      title: 'Rejeitar recomendação?', iconName: 'xCircle', iconColor: 'red', sub: r.title,
      body: `<div class="field"><label>Motivo (opcional — ajuda a IA a aprender)</label><textarea class="textarea" id="rej-why" placeholder="Ex.: feriado municipal cancelado; expectativa de maior movimento"></textarea></div>`,
      foot: `<button class="btn btn-outline" onclick="closeModal()">Voltar</button><button class="btn btn-danger" onclick="Padaria.doReject('${id}')">${icon('x', 15)} Rejeitar</button>`,
    });
  };
  Padaria.doReject = id => {
    const r = STATE.recos.find(x => x.id === id);
    r.status = 'rejected'; r.decidedAt = nowTime(); r.why = document.getElementById('rej-why').value;
    save(); closeModal(); App.refresh(); toast('info', 'Recomendação rejeitada', 'Seu feedback ajuda a refinar as próximas análises.');
  };
  Padaria.recoDetail = id => {
    const r = STATE.recos.find(x => x.id === id);
    modal({
      title: r.title, iconName: 'lightbulb', iconColor: 'violet', wide: true,
      sub: `Recomendação da IA · confiança ${r.confidence}%`,
      body: `<div class="reco-quote mb">${icon('sparkles', 16)}<span><i>"${r.quote}"</i></span></div>
        <dl class="kv" style="grid-template-columns:160px 1fr"><dt>Problema identificado</dt><dd style="text-align:left;font-weight:500">${r.problem}</dd><dt>Motivo</dt><dd style="text-align:left;font-weight:500">${r.reason}</dd><dt>Ação sugerida</dt><dd style="text-align:left;font-weight:500">${r.action}</dd><dt>Benefício esperado</dt><dd style="text-align:left;font-weight:500">${r.benefit}</dd></dl>
        <div class="disclaimer mt">${icon('shield', 15)}<span>A IA recomenda, mas a decisão final é sua. A avaliação sanitária dos alimentos permanece sob responsabilidade da padaria.</span></div>`,
      foot: r.status === 'pending' ? `<button class="btn btn-danger" onclick="closeModal();Padaria.recoReject('${id}')">${icon('x', 15)} Rejeitar</button><button class="btn btn-green" onclick="closeModal();Padaria.recoApprove('${id}')">${icon('check', 15)} Aprovar</button>` : `<button class="btn btn-outline" onclick="closeModal()">Fechar</button>`,
    });
  };

  /* =============== EXCEDENTES E DOAÇÕES =============== */
  M.pages.doacoes = function () {
    const f = STATE.flow;
    if (f.step >= 1) return donationInProgress();
    const items = STATE.surplus.filter(s => !s.donated);
    const sel = items.filter(s => s.selected);
    const kg = sel.reduce((a, s) => a + s.kg, 0);
    const inst = M.donateInst ? instById(M.donateInst) : null;
    const ranked = [...INSTITUTIONS].filter(i => !STATE.flow.refusedInst.includes(i.id)).sort((a, b) => b.match - a.match);
    const best = ranked[0];

    return `${pageHead('Gestão de excedentes e doações', 'Destine alimentos excedentes próprios para consumo a instituições parceiras',
      '', ['heart', 'teal'], `Logística solidária ${icon('chevronRight', 12)} <b>Nova doação</b>`)}

      <div class="callout ai mb"><div class="co-icon">${icon('sparkles', 16)}</div><div><strong>A IA identificou ~${NUM(items.reduce((a, s) => a + s.kg, 0), 1)} kg de excedente próprio para consumo</strong><p>Selecione os itens, confirme a segurança e escolha a instituição.</p></div></div>

      <div class="grid g-3-2">
        <div>
          <div class="card mb">
            <div class="card-head"><div><h3>${icon('package', 16)} Alimentos disponíveis para doação</h3><p>Selecione o que será destinado · ${fmtDate(0)}</p></div><div class="chart-legend"><span><i style="background:#16a34a"></i>Selecionados: <b>${NUM(kg, 1)} kg</b></span></div></div>
            <div class="table-wrap"><table class="table"><thead><tr><th></th><th>Alimento</th><th>Quantidade</th><th>Validade</th><th>Peso est.</th></tr></thead><tbody>
              ${items.map(s => `<tr>
                <td><div class="cbox ${s.selected ? 'on' : ''}" onclick="Padaria.toggleSurplus('${s.id}')">${s.selected ? icon('check', 12) : ''}</div></td>
                <td><div class="prod-cell"><span class="prod-emoji">${s.emoji}</span><div><b>${s.name}</b><div class="xs muted">${s.cat} · ${s.storage}</div></div></div></td>
                <td><b>${s.qty}</b> ${s.unit}</td><td>${validityBadge(s.val)}</td>
                <td><b>${NUM(s.kg, 1)}</b> kg</td></tr>`).join('')}
            </tbody></table></div>
          </div>
          <div class="card"><div class="card-body">
            <div class="check-row" onclick="Padaria.toggleSafety()">
              <div class="cbox ${STATE.flow.safetyChecked ? 'on' : ''}" id="safety-box">${STATE.flow.safetyChecked ? icon('check', 12) : ''}</div>
              <span><b>Confirmação de segurança alimentar</b> — Declaro que os itens selecionados estão próprios para consumo, dentro da validade e armazenados conforme as boas práticas (RDC 216/2004).</span>
            </div>
            <div class="disclaimer mt-sm">${icon('shield', 14)}<span>A IA <b>não certifica</b> a segurança dos alimentos — a avaliação sanitária é responsabilidade da padaria.</span></div>
          </div></div>
        </div>

        <div class="col" style="gap:18px">
          <div class="card">
            <div class="card-head"><div><h3>${icon('sparkles', 16)} Instituições recomendadas</h3><p>Ordenadas por localização, capacidade, necessidade e compatibilidade</p></div></div>
            <div class="card-body"><div class="col">
              ${ranked.map((i, idx) => `<div class="select-card ${M.donateInst === i.id ? 'selected' : ''} ${idx === 0 ? 'recommended' : ''}" onclick="Padaria.pickInst('${i.id}')">
                ${idx === 0 ? `<div class="sc-ribbon">${aiBadge('Melhor compatibilidade')}</div>` : ''}
                <div class="sc-head" ${idx === 0 ? 'style="margin-top:6px"' : ''}>
                  <div class="avatar lg" style="background:${i.color}">${i.initials}</div>
                  <div style="flex:1"><strong>${i.name}</strong><div class="xs muted">${i.type}</div></div>
                  <div class="match"><div class="match-ring" style="--p:${i.match}"><span>${i.match}%</span></div></div>
                </div>
                <div class="sc-stats">
                  <div class="sc-stat"><span>${icon('mapPin', 11)} Distância</span><strong>${NUM(i.distance, 1)} km</strong></div>
                  <div class="sc-stat"><span>${icon('box', 11)} Capacidade</span><strong>${i.capacity - i.used} kg</strong></div>
                  <div class="sc-stat"><span>${icon('clock', 11)} Recebimento</span><strong class="small">${i.hours.split(',')[0]}</strong></div>
                </div>
                ${kg > 0 && kg > i.capacity - i.used ? `<div class="callout danger" style="padding:8px 10px"><div class="co-icon" style="width:24px;height:24px">${icon('alert', 13)}</div><p style="margin:0"><b>Capacidade insuficiente</b> — restam ${i.capacity - i.used} kg; seleção exige ${NUM(kg, 1)} kg.</p></div>` : ''}
                <div class="reasons">${i.reasons.slice(0, 2).map(r => `<span class="badge ${r.includes('não') || r.includes('insuficiente') || r.includes('limitada') || r.includes('esgotada') ? 'b-amber' : 'b-green'}">${icon('check', 11)}${r}</span>`).join('')}</div>
                <div class="sc-radio">${M.donateInst === i.id ? icon('check', 13) : ''}</div>
              </div>`).join('')}
            </div></div>
            <div class="card-foot">
              <div class="muted small">${inst ? `${icon('check', 13)} ${inst.name} — ${inst.address}` : 'Selecione uma instituição'}</div>
              <button class="btn btn-primary btn-lg" onclick="Padaria.sendOffer()" ${sel.length === 0 ? 'disabled' : ''}>${icon('send', 16)} Enviar oferta (${NUM(kg, 1)} kg)</button>
            </div>
          </div>
        </div>
      </div>`;
  };

  function donationInProgress() {
    const f = STATE.flow;
    const inst = instById(f.institutionId);
    return `${pageHead('Gestão de excedentes e doações', `Oferta ${f.code} em andamento`, '',
      ['heart', 'teal'], `Logística solidária ${icon('chevronRight', 12)} <b>${f.code}</b>`)}
      <div class="card mb"><div class="card-head"><div><h3>${icon('route', 16)} Andamento da doação ${f.code}</h3><p>${NUM(f.kg, 1)} kg · ${inst.name}</p></div>${badge('Em andamento', 'amber', true)}</div>
      <div class="card-body">${flowStepper()}</div>
      <div class="card-foot"><span class="muted small">${f.step === 2 ? `Aguardando resposta de ${inst.name} (prazo: 2h)` : f.step === 3 ? 'Instituição aceitou — selecione uma transportadora' : 'Acompanhe em "Acompanhar doações"'}</span>
      ${f.step === 3 ? `<button class="btn btn-primary" onclick="App.go('transporte')">${icon('truck', 15)} Selecionar transporte</button>` : `<button class="btn btn-outline" onclick="App.go('acompanhamento')">${icon('route', 15)} Ver acompanhamento</button>`}</div></div>
      <div class="card"><div class="card-head"><h3>${icon('package', 16)} Itens da doação</h3></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Alimento</th><th>Quantidade</th><th>Validade</th><th>Armazenamento</th><th>Peso</th></tr></thead><tbody>
        ${f.items.map(i => `<tr><td><div class="prod-cell"><span class="prod-emoji">${i.emoji}</span><div><b>${i.name}</b><div class="xs muted">${i.cat}</div></div></div></td><td><b>${i.qty}</b> ${i.unit}</td><td>${validityBadge(i.val)}</td><td class="muted small">${i.storage}</td><td>${NUM(i.kg, 1)} kg</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }

  Padaria.toggleSurplus = id => { const s = STATE.surplus.find(x => x.id === id); s.selected = !s.selected; save(); App.refresh(); };
  Padaria.toggleSafety = () => { STATE.flow.safetyChecked = !STATE.flow.safetyChecked; save(); App.refresh(); };
  Padaria.pickInst = id => { M.donateInst = id; STATE.seen.instRec = true; save(); App.refresh(); };
  Padaria.sendOffer = () => {
    if (!M.donateInst) { toast('warn', 'Selecione uma instituição', 'A IA recomendou a mais compatível — basta confirmar.'); return; }
    if (!STATE.flow.safetyChecked) { toast('warn', 'Confirmação necessária', 'Confirme a avaliação de segurança alimentar dos itens.'); return; }
    const inst = instById(M.donateInst);
    const kg = Flow.totalKg();
    if (kg > inst.capacity - inst.used) { toast('error', 'Capacidade insuficiente', `${inst.name} comporta apenas ${inst.capacity - inst.used} kg hoje.`); return; }
    modal({
      title: 'Confirmar oferta de doação', iconName: 'send', sub: `${BAKERY.name} → ${inst.name}`,
      body: `<div class="grid g-3"><div class="mini-stat"><span>Itens</span><strong>${Flow.selectedItems().length}</strong></div><div class="mini-stat"><span>Peso estimado</span><strong>${NUM(kg, 1)} kg</strong></div><div class="mini-stat"><span>Prazo de resposta</span><strong>2 horas</strong></div></div>
        <div class="callout info mt"><div class="co-icon">${icon('info', 15)}</div><p style="margin:0">A instituição será notificada e poderá aceitar ou recusar. Após o aceite, você selecionará a transportadora.</p></div>`,
      foot: `<button class="btn btn-outline" onclick="closeModal()">Voltar</button><button class="btn btn-primary" onclick="Padaria.doSend('${inst.id}')">${icon('send', 15)} Enviar oferta</button>`,
    });
  };
  Padaria.doSend = instId => {
    Flow.approve(instId); closeModal(); App.refresh();
    toast('success', `Oferta ${STATE.flow.code} enviada`, `${instById(instId).name} foi notificada.`);
    setTimeout(() => toast('ai', 'Simulação', 'Mude para o perfil da Instituição para aceitar a oferta — ou use o roteiro guiado.'), 2000);
  };

  /* =============== SELEÇÃO DE TRANSPORTE =============== */
  M.pages.transporte = function () {
    const f = STATE.flow;
    if (f.step >= 4) {
      const c = carrierById(f.carrierId);
      return `${pageHead('Seleção de transporte', `Solicitação ${f.code.replace('DOA', 'TR')}`, '', ['truck', 'blue'])}
        <div class="callout ${f.step >= 5 ? 'success' : 'info'} mb"><div class="co-icon">${icon(f.step >= 5 ? 'checkCircle' : 'clock', 16)}</div><div><strong>${f.step >= 5 ? `${c.name} aceitou a solicitação` : `Solicitação enviada à ${c.name}`}</strong><p>${f.step >= 5 ? `Coleta prevista às ${c.pickup} · entrega prevista às ${c.delivery}.` : 'Aguardando resposta da transportadora.'}</p></div></div>
        <div class="card"><div class="card-head"><h3>${icon('route', 16)} Resumo do transporte</h3></div><div class="card-body">${routeMap()}</div>
        <div class="card-foot"><span class="muted small">Coleta em ${BAKERY.name} → entrega em ${instById(f.institutionId).name}</span><button class="btn btn-outline" onclick="App.go('acompanhamento')">${icon('route', 15)} Acompanhar</button></div></div>`;
    }
    if (f.step < 3) {
      return `${pageHead('Seleção de transporte', 'Escolha a empresa que fará a coleta e entrega da doação', '', ['truck', 'blue'])}
        <div class="card"><div class="empty" style="padding:56px 20px"><div class="em-icon">${icon('truck', 28)}</div>
        <h4>${f.step >= 1 ? 'Aguardando aceite da instituição' : 'Nenhuma doação aguardando transporte'}</h4>
        <p>${f.step >= 1 ? `A seleção de transporte será liberada quando ${instById(f.institutionId).name} aceitar a oferta ${f.code}.` : 'Inicie uma doação a partir dos excedentes e aguarde o aceite da instituição.'}</p>
        <button class="btn btn-primary mt-sm" onclick="App.go('${f.step >= 1 ? 'acompanhamento' : 'doacoes'}')">${f.step >= 1 ? 'Acompanhar doação' : 'Ir para excedentes'}</button></div></div>`;
    }
    const inst = instById(f.institutionId);
    const ranked = [...CARRIERS].filter(c => !f.refusedCarrier.includes(c.id)).sort((a, b) => b.match - a.match);
    const sel = M.transportSel ? carrierById(M.transportSel) : null;
    return `${pageHead('Seleção de transporte', `Doação ${f.code} · ${NUM(f.kg, 1)} kg · ${inst.name}`,
      '', ['truck', 'blue'], `Logística solidária ${icon('chevronRight', 12)} <b>Transporte</b>`)}
      <div class="callout ai mb"><div class="co-icon">${icon('sparkles', 16)}</div><div><strong>A IA recomendou a ${ranked[0].name}</strong><p>Você pode escolher outra — a solicitação só vale após o aceite da transportadora.</p></div></div>
      <div class="route mb">
        <div class="route-pt"><span>${icon('store', 11)} Coleta</span><strong>${BAKERY.name}</strong><p>${BAKERY.address}</p></div>
        <div class="route-mid"><div class="line"></div><span>${NUM(inst.distance + 1.2, 1)} km</span></div>
        <div class="route-pt"><span>${icon('heart', 11)} Entrega</span><strong>${inst.name}</strong><p>${inst.address} · recebe até ${inst.hours.split('às ')[1] || '18h'}</p></div>
      </div>
      <div class="grid g-2 mb">
        ${ranked.map((c, idx) => `<div class="select-card ${M.transportSel === c.id ? 'selected' : ''} ${idx === 0 ? 'recommended' : ''}" onclick="Padaria.pickCarrier('${c.id}')">
          ${idx === 0 ? `<div class="sc-ribbon">${aiBadge('Recomendada pela IA')}</div>` : ''}
          <div class="sc-head" ${idx === 0 ? 'style="margin-top:6px"' : ''}>
            <div class="avatar lg" style="background:${c.color}">${c.initials}</div>
            <div style="flex:1"><strong>${c.name}</strong><div class="xs muted">${c.vehicle} · ★ ${c.rating} · ${c.trips} viagens</div></div>
            <div class="match"><div class="match-ring" style="--p:${c.match}"><span>${c.match}%</span></div></div>
          </div>
          <div class="sc-stats" style="grid-template-columns:repeat(4,1fr)">
            <div class="sc-stat"><span>${icon('mapPin', 11)} Distância</span><strong>${NUM(c.distance, 1)} km</strong></div>
            <div class="sc-stat"><span>${icon('weight', 11)} Capacidade</span><strong>${c.capacity} kg</strong></div>
            <div class="sc-stat"><span>${icon('clock', 11)} Coleta</span><strong>${c.pickup}</strong></div>
            <div class="sc-stat"><span>${icon('flag', 11)} Entrega</span><strong>${c.delivery}</strong></div>
          </div>
          <div class="flex">${badge(c.available, c.availableOk ? 'green' : 'gray', true)}${badge(c.co2, c.co2.includes('elétrico') || c.co2.includes('Baixa') ? 'teal' : 'gray')}${f.kg > c.capacity ? badge('Capacidade insuficiente', 'red') : ''}</div>
          <div class="reasons">${c.reasons.slice(0, 2).map(r => `<span class="badge ${r.includes('insuficiente') || r.includes('risco') || r.includes('Sem') || r.includes('apenas') ? 'b-amber' : 'b-blue'}">${icon('check', 11)}${r}</span>`).join('')}</div>
          <div class="sc-radio">${M.transportSel === c.id ? icon('check', 13) : ''}</div>
        </div>`).join('')}
      </div>
      <div class="card"><div class="card-foot" style="border:none">
        <div class="muted small">${sel ? `${icon('check', 13)} <b>${sel.name}</b> — coleta ${sel.pickup}, entrega prevista ${sel.delivery}` : 'Selecione uma transportadora'}</div>
        <button class="btn btn-primary btn-lg" onclick="Padaria.requestCarrier()" ${!sel ? 'disabled' : ''}>${icon('send', 16)} Solicitar transporte</button>
      </div></div>`;
  };
  Padaria.pickCarrier = id => { M.transportSel = id; App.refresh(); };
  Padaria.requestCarrier = () => {
    const c = carrierById(M.transportSel);
    if (STATE.flow.kg > c.capacity) { toast('error', 'Capacidade insuficiente', `${c.name} comporta ${c.capacity} kg; a doação tem ${NUM(STATE.flow.kg, 1)} kg.`); return; }
    modal({
      title: 'Solicitar transporte', iconName: 'send', iconColor: 'blue', sub: `${c.name} · ${STATE.flow.code}`,
      body: `<div class="grid g-3"><div class="mini-stat"><span>Coleta prevista</span><strong>${c.pickup}</strong></div><div class="mini-stat"><span>Entrega prevista</span><strong>${c.delivery}</strong></div><div class="mini-stat"><span>Volume</span><strong>${NUM(STATE.flow.kg, 1)} kg</strong></div></div>
      <div class="callout info mt"><div class="co-icon">${icon('info', 15)}</div><p style="margin:0">A solicitação <b>só será confirmada após o aceite</b> da transportadora.</p></div>`,
      foot: `<button class="btn btn-outline" onclick="closeModal()">Voltar</button><button class="btn btn-primary" onclick="Padaria.doRequest('${c.id}')">${icon('send', 15)} Enviar solicitação</button>`,
    });
  };
  Padaria.doRequest = cid => {
    Flow.requestTransport(cid); closeModal(); App.refresh();
    toast('success', 'Solicitação enviada', `${carrierById(cid).name} foi notificada.`);
    setTimeout(() => toast('ai', 'Simulação', 'Mude para o perfil da Transportadora para aceitar — ou use o roteiro guiado.'), 2000);
  };

  /* =============== ACOMPANHAMENTO =============== */
  M.pages.acompanhamento = function () {
    const f = STATE.flow;
    const hist = STATE.donationsHistory;
    return `${pageHead('Acompanhamento das doações', 'Acompanhe cada etapa da logística reversa em tempo real',
      f.step === 0 && !Flow.selectedItems().length ? '' : f.step === 0 ? `<button class="btn btn-primary" onclick="App.go('doacoes')">${icon('heart', 16)} Nova doação</button>` : '', ['route', 'green'])}

      ${f.step > 0 ? `<div class="grid g-2-1 mb">
        <div class="card">
          <div class="card-head"><div><h3>${icon('route', 16)} Doação ${f.code} — em andamento</h3><p>${NUM(f.kg, 1)} kg → ${instById(f.institutionId).name}${f.carrierId ? ` · ${carrierById(f.carrierId).name}` : ''}</p></div>
            ${badge(transportStatus() ? transportStatus().label : 'Em andamento', transportStatus() ? transportStatus().color : 'amber', true)}</div>
          <div class="card-body">
            ${flowStepper()}
            <div class="divider"></div>
            <h4 class="semi mb-sm">Trajeto ilustrativo</h4>
            ${routeMap()}
            <div class="timeline mt">
              ${f.times[8] ? `<div class="tl-item done"><div class="tl-dot">${icon('check', 13)}</div><div><strong>Recebimento confirmado pela instituição</strong><span>${f.times[8]}${f.note ? ` · "${f.note}"` : ''}</span></div></div>` : ''}
              ${f.times[7] ? `<div class="tl-item done"><div class="tl-dot">${icon('mapPin', 13)}</div><div><strong>Entrega realizada</strong><span>${f.times[7]}</span></div></div>` : ''}
              ${f.times.transit ? `<div class="tl-item done"><div class="tl-dot">${icon('truck', 13)}</div><div><strong>Em transporte</strong><span>${f.times.transit}</span></div></div>` : ''}
              ${f.times[6] ? `<div class="tl-item done"><div class="tl-dot">${icon('package', 13)}</div><div><strong>Coleta realizada na padaria</strong><span>${f.times[6]}</span></div></div>` : ''}
              ${f.times[5] ? `<div class="tl-item done"><div class="tl-dot">${icon('truck', 13)}</div><div><strong>${carrierById(f.carrierId).name} aceitou</strong><span>${f.times[5]}</span></div></div>` : ''}
              ${f.times[4] ? `<div class="tl-item done"><div class="tl-dot">${icon('send', 13)}</div><div><strong>Transporte solicitado</strong><span>${f.times[4]}</span></div></div>` : ''}
              ${f.times[3] ? `<div class="tl-item done"><div class="tl-dot">${icon('handHeart', 13)}</div><div><strong>${instById(f.institutionId).name} aceitou a doação</strong><span>${f.times[3]}</span></div></div>` : ''}
              ${f.times[1] ? `<div class="tl-item done"><div class="tl-dot">${icon('clipboardCheck', 13)}</div><div><strong>Doação aprovada e instituição notificada</strong><span>${f.times[1]}</span></div></div>` : ''}
            </div>
          </div>
        </div>
        <div class="card"><div class="card-head"><h3>${icon('package', 16)} Detalhes</h3></div>
          <div class="card-body"><dl class="kv">
            <dt>Código</dt><dd>${f.code}</dd>
            <dt>Destino</dt><dd>${instById(f.institutionId).name}</dd>
            <dt>Peso total</dt><dd>${NUM(f.kg, 1)} kg</dd>
            <dt>Transporte</dt><dd>${f.carrierId ? carrierById(f.carrierId).name : 'A definir'}</dd>
            <dt>Previsão entrega</dt><dd>${f.carrierId ? carrierById(f.carrierId).delivery : '—'}</dd>
          </dl>
          <div class="divider"></div>
          <div class="bar-list">${f.items.map(i => `<div class="flex-between small"><span>${i.emoji} ${i.name}</span><b>${i.qty} ${i.unit}</b></div>`).join('')}</div>
          ${f.step === 8 ? `<div class="callout success mt"><div class="co-icon">${icon('checkCircle', 15)}</div><div><strong>Doação concluída com sucesso</strong><p>Os indicadores de impacto já foram atualizados.</p></div></div>` : ''}
          </div>
        </div>
      </div>` : `<div class="card mb"><div class="empty" style="padding:40px"><div class="em-icon">${icon('route', 26)}</div><h4>Nenhuma doação em andamento</h4><p>Quando uma doação for iniciada, você acompanha todas as etapas aqui.</p></div></div>`}

      <div class="card">
        <div class="card-head"><h3>${icon('history', 16)} Doações recentes</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Data</th><th>Instituição</th><th>Itens</th><th>Peso</th><th>Transporte</th><th>Status</th></tr></thead><tbody>
          ${hist.map(d => `<tr ${d.demo ? 'class="row-new"' : ''}><td><b>${d.code}</b></td><td>${fmtShort(d.date)}</td><td>${d.inst}</td><td class="muted small">${d.items}</td><td><b>${NUM(d.kg, 1)} kg</b></td><td class="muted">${d.carrier}</td><td>${badge(d.status, d.status === 'Concluída' ? 'green' : 'red', true)}</td></tr>`).join('')}
        </tbody></table></div>
      </div>`;
  };

  /* =============== RELATÓRIOS E IMPACTO =============== */
  M.pages.relatorios = function () {
    const m = STATE.monthly;
    const waste0 = m.waste[0], waste5 = m.waste[5];
    const reduction = Math.round((1 - waste5 / waste0) * 100);
    const donatedTotal = m.donated.reduce((a, b) => a + b, 0);
    const avoidedTotal = m.avoided.reduce((a, b) => a + b, 0);
    const savingsTotal = m.savings.reduce((a, b) => a + b, 0);
    const done = m.donationsDone.reduce((a, b) => a + b, 0), tot = m.donationsTotal.reduce((a, b) => a + b, 0);
    const co2 = avoidedTotal * 2.5, meals = donatedTotal * 4, water = avoidedTotal * 1000;
    const cur = m.donated[5], prev = m.donated[4];
    return `${pageHead('Relatórios e impacto', 'Desempenho da padaria na redução do desperdício — últimos 6 meses',
      `<button class="btn btn-outline" onclick="Padaria.exportReport()">${icon('download', 16)} Exportar relatório</button>`, ['chart', 'green'])}

      ${STATE.flow.step >= 8 ? `<div class="callout success mb"><div class="co-icon">${icon('checkCircle', 16)}</div><div><strong>Doação ${STATE.flow.code} computada nos indicadores</strong><p>${NUM(STATE.flow.kg, 1)} kg doados a ${instById(STATE.flow.institutionId).name} já somam no desempenho do mês.</p></div></div>` : ''}

      <div class="grid g-5 mb">
        ${kpi({ label: 'Desperdício evitado', value: NUM(avoidedTotal, 0), unit: 'kg / 6 meses', iconName: 'recycle', color: 'green', trend: '+' + reduction + '%', foot: 'vs. período anterior' })}
        ${kpi({ label: 'Alimentos doados', value: NUM(donatedTotal, 0), unit: 'kg / 6 meses', iconName: 'handHeart', color: 'teal', trend: `${Math.round((cur / prev - 1) * 100)}%`, trendDir: cur >= prev ? 'up' : 'down', foot: 'mês atual vs. anterior' })}
        ${kpi({ label: 'Redução do desperdício', value: `${reduction}%`, iconName: 'trendDown', color: 'orange', foot: `${NUM(waste0)} kg → ${NUM(waste5)} kg/mês` })}
        ${kpi({ label: 'Economia estimada', value: BRL(savingsTotal), iconName: 'wallet', color: 'blue', foot: 'insumos, energia e descarte' })}
        ${kpi({ label: 'Doações concluídas', value: `${Math.round((done / tot) * 100)}%`, iconName: 'packageCheck', color: 'violet', foot: `${done} de ${tot} doações` })}
      </div>

      <div class="grid g-2-1 mb">
        <div class="card">
          <div class="card-head"><div><h3>${icon('chart', 16)} Evolução mensal</h3><p>Desperdício real caindo × desperdício evitado pela plataforma</p></div>
            <div class="chart-legend"><span><i style="background:#ef4444"></i>Desperdiçado</span><span><i style="background:#16a34a"></i>Evitado</span><span><i style="background:#0d9488"></i>Doado</span></div></div>
          <div class="card-body">${Charts.line({ id: 'rmonth', labels: MONTHS, series: [
            { name: 'Desperdiçado', color: '#ef4444', values: m.waste },
            { name: 'Evitado pela plataforma', color: '#16a34a', values: m.avoided, area: true },
            { name: 'Doado', color: '#0d9488', values: m.donated },
          ], height: 270, unit: ' kg' })}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>${icon('target', 16)} Meta de redução</h3><p>Objetivo: -70% no semestre</p></div>
          <div class="card-body center">
            ${Charts.gauge(reduction, '#16a34a', 190, `meta: 70% · atual: ${reduction}%`)}
            <div class="mini-stat mt"><span>Desperdício no mês atual</span><strong>${NUM(waste5, 0)} kg</strong></div>
          </div>
        </div>
      </div>

      <div class="grid g-3 mb">
        <div class="impact env"><div class="imp-icon">${icon('globe', 22)}</div><h4>Impacto ambiental</h4><div class="imp-val">${NUM(co2, 0)} kg</div><p class="muted small">de CO₂ equivalente evitados</p>
          <ul><li><span>Água economizada</span><b>≈ ${NUM(water / 1000, 1)} m³</b></li><li><span>Resíduo desviado de aterro</span><b>${NUM(avoidedTotal, 0)} kg</b></li><li><span>Árvores equivalentes</span><b>≈ ${Math.round(co2 / 21)}</b></li></ul></div>
        <div class="impact soc"><div class="imp-icon">${icon('users', 22)}</div><h4>Impacto social</h4><div class="imp-val">${NUM(meals)}</div><p class="muted small">refeições complementares estimadas</p>
          <ul><li><span>Instituições atendidas</span><b>4</b></li><li><span>Pessoas alcançadas/mês</span><b>≈ 340</b></li><li><span>Parceira mais frequente</span><b>Lar Esperança</b></li></ul></div>
        <div class="impact eco"><div class="imp-icon">${icon('coins', 22)}</div><h4>Impacto econômico</h4><div class="imp-val">${BRL(savingsTotal)}</div><p class="muted small">economia estimada no semestre</p>
          <ul><li><span>Economia média mensal</span><b>${BRL(savingsTotal / 6)}</b></li><li><span>Produtos evitados</span><b>≈ ${NUM(avoidedTotal * 30)} un</b></li><li><span>Custo de descarte evitado</span><b>${BRL(avoidedTotal * 1.8)}</b></li></ul></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>${icon('clipboard', 16)} Comparativo mensal</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Mês</th><th>Desperdiçado</th><th>Evitado</th><th>Doado</th><th>Economia</th></tr></thead><tbody>
          ${MONTHS.map((mo, i) => `<tr ${i === 5 ? 'style="background:var(--green-50)"' : ''}><td><b>${mo}${i === 5 ? ' (atual)' : ''}</b></td><td>${NUM(m.waste[i], 0)} kg</td><td class="text-green semi">${NUM(m.avoided[i], 0)} kg</td><td class="semi">${NUM(m.donated[i], 1)} kg</td><td>${BRL(m.savings[i])}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="card-foot"><span class="xs muted">* Dados fictícios para demonstração.</span></div>
      </div>`;
  };
  Padaria.exportReport = () => {
    toast('info', 'Exportando relatório...', 'Gerando PDF ilustrativo com os indicadores.');
    setTimeout(() => toast('success', 'Relatório gerado', `relatorio_impacto_${TODAY.getFullYear()}.pdf (simulação)`), 1400);
  };
})();