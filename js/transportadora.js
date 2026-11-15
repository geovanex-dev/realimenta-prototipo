/* =========================================================
   Ambiente: EMPRESA DE TRANSPORTE (EcoLog Transportes)
   ========================================================= */
MODULES.transportadora = {
  envLabel: 'Ambiente da Transportadora',
  org: { name: 'EcoLog Transportes', sub: 'Logística urbana · Vila Mariana', initials: 'EL' },
  nav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Operação' },
    { id: 'solicitacoes', label: 'Solicitações', icon: 'inbox', badge: () => { const n = transRequests().filter(r => r.status === 'pending').length; return n ? { text: n } : null; } },
    { id: 'entregas', label: 'Gerenciar entregas', icon: 'route', badge: () => { const n = activeJobs().length; return n ? { text: n, soft: true } : null; } },
    { id: 'historico', label: 'Histórico', icon: 'history' },
  ],
  pages: {},
};

function transRequests() {
  const f = STATE.flow;
  const reqs = [...STATE.otherRequests];
  if (f.step === 4) {
    const inst = instById(f.institutionId);
    reqs.unshift({
      id: 'demo', code: f.code.replace('DOA', 'TR'), from: BAKERY.name, fromAddr: BAKERY.address,
      to: inst.name, toAddr: inst.address, food: f.items.map(i => i.name).join(', '),
      kg: f.kg, volume: `≈ ${Math.max(2, Math.ceil(f.kg / 6))} caixas (${NUM(f.kg / 40, 1)} m³)`,
      when: 'Hoje, ' + (carrierById(f.carrierId).id === 'ecolog' ? carrierById(f.carrierId).pickup : '16:00'),
      temp: 'Ambiente + refrigerado (caixa térmica)', distance: +(carrierById(f.carrierId).distance + inst.distance).toFixed(1),
      status: 'pending', value: 'Parceria social', demo: true,
    });
  }
  return reqs;
}
function activeJobs() {
  const f = STATE.flow;
  const jobs = [...STATE.activeDeliveries];
  if (f.step >= 5 && f.step < 8) {
    const inst = instById(f.institutionId), c = carrierById(f.carrierId);
    const ts = transportStatus();
    jobs.unshift({ code: f.code.replace('DOA', 'TR'), from: BAKERY.name, to: inst.name, kg: f.kg, status: f.inTransit ? 'Em transporte' : ts.label, eta: c.delivery, demo: true });
  }
  return jobs;
}

(function () {
  const M = MODULES.transportadora;
  window.Trans = {};
  const STATUS = ['Aguardando coleta', 'Coleta realizada', 'Em transporte', 'Entregue'];
  const STATUS_ICON = ['clock', 'package', 'truck', 'mapPin'];
  const STATUS_COLOR = ['amber', 'teal', 'blue', 'green'];

  /* ---------- DASHBOARD ---------- */
  M.pages.dashboard = function () {
    const reqs = transRequests().filter(r => r.status === 'pending');
    const jobs = activeJobs();
    const done = STATE.transHistory.filter(t => t.status === 'Entregue');
    const kgWeek = done.reduce((a, t) => a + t.kg, 0);
    return `${pageHead('Dashboard', `Olá, ${App.user.name.split(' ')[0]} — EcoLog Transportes`,
      `<button class="btn btn-primary" onclick="App.go('solicitacoes')">${icon('inbox', 16)} Ver solicitações ${reqs.length ? `(${reqs.length})` : ''}</button>`, ['dashboard', 'blue'])}

      ${STATE.flow.step === 4 ? `<div class="callout info mb"><div class="co-icon">${icon('truck', 16)}</div><div style="flex:1"><strong>Nova solicitação ${STATE.flow.code.replace('DOA', 'TR')} da ${BAKERY.name}</strong><p>${NUM(STATE.flow.kg, 1)} kg · entrega em ${instById(STATE.flow.institutionId).name}</p></div><button class="btn btn-primary btn-sm" onclick="App.go('solicitacoes')">Responder ${icon('arrowRight', 14)}</button></div>` : ''}

      <div class="grid g-3 mb">
        ${kpi({ label: 'Solicitações disponíveis', value: reqs.length, iconName: 'inbox', color: 'blue', foot: 'aguardando resposta' })}
        ${kpi({ label: 'Entregas em andamento', value: jobs.length, iconName: 'truck', color: 'violet', foot: jobs.filter(j => j.status === 'Aguardando coleta').length + ' aguardando coleta' })}
        ${kpi({ label: 'Concluídas no período', value: done.length, iconName: 'packageCheck', color: 'green', foot: `${NUM(kgWeek, 1)} kg transportados` })}
      </div>

      <div class="card">
        <div class="card-head"><h3>${icon('route', 16)} Entregas ativas</h3><button class="btn btn-ghost btn-sm" onclick="App.go('entregas')">Gerenciar ${icon('arrowRight', 13)}</button></div>
        <div class="card-body">
          ${jobs.length ? jobs.map(j => `<div class="list-row">
            <div class="kpi-icon ic-${j.status === 'Em transporte' ? 'blue' : j.status === 'Entregue' ? 'green' : 'amber'}" style="width:38px;height:38px">${icon(STATUS_ICON[STATUS.indexOf(j.status)] || 'truck', 18)}</div>
            <div style="flex:1"><b>${j.code}</b> · ${j.from} → ${j.to}<div class="xs muted">${NUM(j.kg, 1)} kg · chegada prevista ${j.eta}</div></div>
            ${badge(j.status, STATUS_COLOR[STATUS.indexOf(j.status)] || 'blue', true)}
          </div>`).join('') : `<div class="empty"><div class="em-icon">${icon('truck', 24)}</div><h4>Nenhuma entrega ativa</h4><p>Aceite uma solicitação para iniciar um transporte.</p></div>`}
        </div>
      </div>`;
  };

  /* ---------- SOLICITAÇÕES ---------- */
  M.pages.solicitacoes = function () {
    const reqs = transRequests();
    const pending = reqs.filter(r => r.status === 'pending');
    const answered = reqs.filter(r => r.status !== 'pending');
    return `${pageHead('Solicitações de transporte', 'Coletas aprovadas pelas padarias aguardando aceite', '', ['inbox', 'blue'])}
      ${pending.length ? `<div class="grid g-2 mb">${pending.map(r => reqCard(r)).join('')}</div>` : `<div class="card mb"><div class="empty"><div class="em-icon">${icon('inbox', 26)}</div><h4>Nenhuma solicitação pendente</h4><p>Quando uma padaria escolher a EcoLog, a solicitação aparecerá aqui.</p></div></div>`}
      ${answered.length ? `<div class="card"><div class="card-head"><h3>Respondidas</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Trajeto</th><th>Peso</th><th>Decisão</th></tr></thead><tbody>
          ${answered.map(r => `<tr><td><b>${r.code}</b></td><td class="muted">${r.from} → ${r.to}</td><td>${NUM(r.kg, 1)} kg</td><td>${r.status === 'accepted' ? badge('Aceita', 'green', true) : badge('Recusada', 'red', true)}</td></tr>`).join('')}
        </tbody></table></div></div>` : ''}`;
  };

  function reqCard(r) {
    return `<div class="offer ${r.demo ? 'highlight' : ''}">
      <div class="offer-head">
        <div class="kpi-icon ic-blue">${icon('truck', 20)}</div>
        <div style="flex:1"><strong>${r.code}</strong><div class="xs muted">${r.value}</div></div>
        <span class="deadline">${icon('clock', 13)} ${r.when}</span>
      </div>
      <div class="offer-body">
        <div class="ob-item full"><span>${icon('store', 12)} Local de coleta</span><strong>${r.from}</strong><div class="xs muted">${r.fromAddr}</div></div>
        <div class="ob-item full"><span>${icon('mapPin', 12)} Local de entrega</span><strong>${r.to}</strong><div class="xs muted">${r.toAddr}</div></div>
        <div class="ob-item"><span>${icon('package', 12)} Alimento</span><strong>${r.food}</strong></div>
        <div class="ob-item"><span>${icon('weight', 12)} Quantidade / volume</span><strong>${NUM(r.kg, 1)} kg · ${r.volume}</strong></div>
        <div class="ob-item"><span>${icon('thermometer', 12)} Requisito térmico</span><strong>${r.temp}</strong></div>
        <div class="ob-item"><span>${icon('route', 12)} Distância estimada</span><strong>${NUM(r.distance, 1)} km</strong></div>
      </div>
      <div class="offer-foot">
        <span class="muted xs">${icon('info', 12)} A doação só é confirmada após o seu aceite.</span>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="btn btn-danger btn-sm" onclick="Trans.refuse('${r.id}')">${icon('x', 14)} Recusar</button>
          <button class="btn btn-primary btn-sm" onclick="Trans.accept('${r.id}')">${icon('check', 14)} Aceitar transporte</button>
        </div>
      </div>
    </div>`;
  }

  Trans.accept = id => {
    if (id === 'demo') {
      modal({
        title: 'Aceitar a solicitação de transporte?', iconName: 'truck', iconColor: 'blue',
        sub: `${STATE.flow.code.replace('DOA', 'TR')} · ${BAKERY.name} → ${instById(STATE.flow.institutionId).name}`,
        body: `<div class="grid g-3"><div class="mini-stat"><span>Coleta</span><strong>${carrierById(STATE.flow.carrierId).pickup}</strong></div><div class="mini-stat"><span>Entrega</span><strong>${carrierById(STATE.flow.carrierId).delivery}</strong></div><div class="mini-stat"><span>Carga</span><strong>${NUM(STATE.flow.kg, 1)} kg</strong></div></div>
        <div class="callout warn mt"><div class="co-icon">${icon('alert', 15)}</div><p style="margin:0">Itens refrigerados devem ser transportados em caixa térmica e entregues dentro da janela de recebimento da instituição.</p></div>`,
        foot: `<button class="btn btn-outline" onclick="closeModal()">Voltar</button><button class="btn btn-primary" onclick="Trans.doAccept()">${icon('check', 15)} Confirmar aceite</button>`,
      });
      return;
    }
    const r = STATE.otherRequests.find(x => x.id === id);
    r.status = 'accepted';
    STATE.activeDeliveries.push({ code: r.code, from: r.from, to: r.to, kg: r.kg, status: 'Aguardando coleta', eta: r.when.replace('Amanhã, ', '').replace('Hoje, ', '') });
    save(); App.refresh(); toast('success', 'Solicitação aceita', `Coleta ${r.code} adicionada às suas entregas.`);
  };
  Trans.doAccept = () => { Flow.carrierAccept(); closeModal(); App.refresh(); toast('success', 'Solicitação aceita!', 'Padaria e instituição foram notificadas. Bom trajeto!'); };
  Trans.refuse = id => {
    modal({
      title: 'Recusar solicitação?', iconName: 'xCircle', iconColor: 'red', sub: 'A padaria poderá escolher outra transportadora',
      body: `<div class="field"><label>Motivo</label><select class="select" id="tr-why"><option>Sem veículo disponível no horário</option><option>Fora da área de atendimento</option><option>Capacidade térmica indisponível</option><option>Outro motivo</option></select></div>`,
      foot: `<button class="btn btn-outline" onclick="closeModal()">Voltar</button><button class="btn btn-danger" onclick="Trans.doRefuse('${id}')">${icon('x', 15)} Confirmar recusa</button>`,
    });
  };
  Trans.doRefuse = id => {
    const why = document.getElementById('tr-why').value;
    if (id === 'demo') Flow.carrierRefuse(why);
    else STATE.otherRequests.find(x => x.id === id).status = 'refused';
    save(); closeModal(); App.refresh(); toast('info', 'Solicitação recusada', 'A padaria foi notificada.');
  };

  /* ---------- ENTREGAS ---------- */
  M.pages.entregas = function () {
    const f = STATE.flow;
    const jobs = activeJobs();
    return `${pageHead('Gerenciamento de entregas', 'Atualize o status de cada transporte em tempo real', '', ['route', 'blue'])}
      <div class="col" style="gap:18px">
        ${jobs.length ? jobs.map(j => jobCard(j)).join('') : `<div class="card"><div class="empty"><div class="em-icon">${icon('truck', 26)}</div><h4>Nenhuma entrega em andamento</h4><p>Aceite solicitações para iniciar transportes.</p><button class="btn btn-primary mt-sm" onclick="App.go('solicitacoes')">Ver solicitações</button></div></div>`}
      </div>`;
  };

  function jobCard(j) {
    const idx = STATUS.indexOf(j.status);
    const demo = j.demo;
    return `<div class="card ${demo ? 'highlight offer' : ''}">
      <div class="card-head"><div><h3>${icon('truck', 16)} ${j.code} · ${j.from} → ${j.to}</h3><p>${NUM(j.kg, 1)} kg · chegada prevista ${j.eta}</p></div>${badge(j.status, STATUS_COLOR[idx], true)}</div>
      <div class="card-body">
        <div class="stepper">${STATUS.map((s, i) => `<div class="st-step ${i < idx ? 'done' : i === idx ? 'current' : ''}">
          <div class="st-dot">${i < idx ? icon('check', 15) : icon(STATUS_ICON[i], 14)}</div>
          <div class="st-label">${s}</div><div class="st-time">${i === idx ? 'Agora' : i < idx ? '✓' : '—'}</div></div>`).join('')}</div>
        ${demo ? `<div class="divider"></div>${routeMap()}` : ''}
      </div>
      <div class="card-foot">
        <span class="muted small">${demo ? 'Atualizações são visíveis para a padaria e a instituição.' : 'Entrega gerenciada pela equipe de campo.'}</span>
        ${idx < 3 ? `<button class="btn btn-primary" onclick="Trans.advance('${j.code}', ${demo})">${icon('arrowRight', 15)} Avançar: ${STATUS[idx + 1]}</button>` : `<span class="badge b-green">${icon('checkCircle', 12)} Finalizada — aguardando confirmação da instituição</span>`}
      </div>
    </div>`;
  }

  Trans.advance = (code, demo) => {
    if (!demo) { toast('info', 'Status atualizado', 'Progresso registrado (simulação).'); return; }
    const f = STATE.flow;
    if (f.step === 5) { Flow.collect(); toast('success', 'Coleta realizada', `${NUM(f.kg, 1)} kg retirados na padaria.`); }
    else if (f.step === 6 && !f.inTransit) { Flow.transit(); toast('info', 'Em transporte', 'O veículo saiu para a entrega.'); }
    else if (f.step >= 6) { Flow.deliver(); toast('success', 'Entrega realizada!', 'Aguardando a instituição confirmar o recebimento.'); }
    App.refresh();
  };

  /* ---------- HISTÓRICO ---------- */
  M.pages.historico = function () {
    const h = STATE.transHistory;
    const done = h.filter(x => x.status === 'Entregue');
    return `${pageHead('Histórico de transportes', 'Serviços realizados pela EcoLog',
      `<button class="btn btn-outline" onclick="toast('info','Exportando...','Gerando arquivo CSV ilustrativo.')">${icon('download', 15)} Exportar</button>`, ['history', 'blue'])}
      <div class="grid g-4 mb">
        <div class="card kpi"><div class="kpi-top"><div><div class="kpi-label">Serviços realizados</div><div class="kpi-value" style="margin-top:6px">${done.length}</div></div><div class="kpi-icon ic-blue">${icon('truck', 20)}</div></div></div>
        <div class="card kpi"><div class="kpi-top"><div><div class="kpi-label">Alimentos transportados</div><div class="kpi-value" style="margin-top:6px">${NUM(done.reduce((a, x) => a + x.kg, 0), 1)}<small>kg</small></div></div><div class="kpi-icon ic-green">${icon('package', 20)}</div></div></div>
        <div class="card kpi"><div class="kpi-top"><div><div class="kpi-label">Km percorridos</div><div class="kpi-value" style="margin-top:6px">${NUM(done.reduce((a, x) => a + x.km, 0), 1)}<small>km</small></div></div><div class="kpi-icon ic-violet">${icon('route', 20)}</div></div></div>
        <div class="card kpi"><div class="kpi-top"><div><div class="kpi-label">Taxa de conclusão</div><div class="kpi-value" style="margin-top:6px">${Math.round((done.length / h.length) * 100)}%</div></div><div class="kpi-icon ic-teal">${icon('checkCircle', 20)}</div></div></div>
      </div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Código</th><th>Data</th><th>Padaria</th><th>Instituição receptora</th><th>Peso</th><th>Distância</th><th>Status final</th></tr></thead><tbody>
        ${h.map(x => `<tr ${x.demo ? 'class="row-new"' : ''}><td><b>${x.code}</b></td><td>${fmtShort(x.date)}</td><td>${x.from}</td><td>${x.to}</td><td><b>${NUM(x.kg, 1)} kg</b></td><td class="muted">${NUM(x.km, 1)} km</td><td>${badge(x.status, x.status === 'Entregue' ? 'green' : 'red', true)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  };
})();