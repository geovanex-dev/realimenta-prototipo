/* =========================================================
   Ambiente: INSTITUIÇÃO RECEPTORA (Lar Esperança)
   ========================================================= */
MODULES.instituicao = {
  envLabel: 'Ambiente da Instituição',
  org: { name: 'Lar Esperança', sub: 'ONG — Abrigo infantil · Vila Clementino', initials: 'LE' },
  nav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', section: 'Recebimento' },
    { id: 'necessidades', label: 'Necessidades', icon: 'clipboard' },
    { id: 'ofertas', label: 'Ofertas de doações', icon: 'inbox', badge: () => { const n = instOffers().filter(o => o.status === 'pending').length; return n ? { text: n } : null; } },
    { id: 'recebimentos', label: 'Acompanhar recebimentos', icon: 'route' },
    { id: 'historico', label: 'Histórico', icon: 'history' },
  ],
  pages: {},
};

function instOffers() {
  const f = STATE.flow;
  const offers = [...STATE.otherOffers];
  if (f.step >= 2) {
    offers.unshift({
      id: 'demo', code: f.code, bakery: BAKERY.name, items: f.items.map(i => i.name).join(', '),
      emoji: '🥖', qty: f.items.map(i => `${i.qty} ${i.unit}`).join(' · '), kg: f.kg,
      val: f.items.map(i => i.val).sort()[0], storage: 'Ambiente + refrigerado (caixa térmica informada)',
      deadline: '1h 58min', distance: 2.1, status: f.step >= 3 ? 'accepted' : 'pending', demo: true,
      itemsDetail: f.items, inst: instById(f.institutionId),
    });
  }
  return offers;
}
function offerAccepted(offer) { return offer.status === 'accepted'; }

(function () {
  const M = MODULES.instituicao;
  window.Inst = {};

  /* ---------- DASHBOARD ---------- */
  M.pages.dashboard = function () {
    const offers = instOffers();
    const pending = offers.filter(o => o.status === 'pending');
    const hist = STATE.instHistory;
    const kgMonth = hist.filter(h => h.status === 'Recebida').reduce((a, h) => a + h.kg, 0);
    const f = STATE.flow;
    const waiting = f.step >= 3 && f.step < 8;
    return `${pageHead('Dashboard', 'Bem-vinda, ' + App.user.name.split(' ')[0] + ' — Lar Esperança',
      `<button class="btn btn-outline" onclick="App.go('necessidades')">${icon('clipboard', 16)} Minhas necessidades</button>
       <button class="btn btn-primary" onclick="App.go('ofertas')">${icon('inbox', 16)} Ver ofertas ${pending.length ? `(${pending.length})` : ''}</button>`, ['dashboard', 'teal'])}

      ${f.step === 2 ? `<div class="callout danger mb"><div class="co-icon">${icon('inbox', 16)}</div><div style="flex:1"><strong>Nova oferta da ${BAKERY.name} aguardando resposta</strong><p>${NUM(f.kg, 1)} kg de alimentos — prazo para resposta: 2 horas.</p></div><button class="btn btn-warning btn-sm" onclick="App.go('ofertas')">Responder agora ${icon('arrowRight', 14)}</button></div>` : ''}
      ${f.step === 7 ? `<div class="callout success mb"><div class="co-icon">${icon('packageCheck', 16)}</div><div style="flex:1"><strong>Entrega realizada! Confirme o recebimento</strong><p>A ${carrierById(f.carrierId).name} entregou a doação ${f.code}. Confira os itens e confirme.</p></div><button class="btn btn-green btn-sm" onclick="App.go('recebimentos')">Confirmar recebimento</button></div>` : ''}

      <div class="grid g-3 mb">
        ${kpi({ label: 'Ofertas aguardando resposta', value: pending.length, iconName: 'inbox', color: 'orange', foot: 'responder dentro do prazo' })}
        ${kpi({ label: 'Aguardando recebimento', value: waiting ? 1 : 0, iconName: 'truck', color: 'blue', foot: waiting ? 'a caminho' : 'nenhuma no momento' })}
        ${kpi({ label: 'Recebido no período', value: NUM(kgMonth, 1), unit: 'kg', iconName: 'handHeart', color: 'green', foot: `${hist.filter(h => h.status === 'Recebida').length} doações` })}
      </div>

      <div class="grid g-2-1">
        <div class="card">
          <div class="card-head"><div><h3>${icon('history', 16)} Histórico de recebimentos</h3><p>Últimas doações recebidas pelo Lar Esperança</p></div><button class="btn btn-ghost btn-sm" onclick="App.go('historico')">Ver tudo ${icon('arrowRight', 13)}</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Origem</th><th>Itens</th><th>Peso</th><th>Status</th></tr></thead><tbody>
            ${hist.slice(0, 6).map(h => `<tr ${h.demo ? 'class="row-new"' : ''}><td>${fmtShort(h.date)}</td><td><b>${h.bakery}</b></td><td class="muted small">${h.items}</td><td><b>${NUM(h.kg, 1)} kg</b></td><td>${badge(h.status, h.status === 'Recebida' ? 'green' : 'red', true)}</td></tr>`).join('')}
          </tbody></table></div>
        </div>
        <div class="col" style="gap:18px">
          <div class="card"><div class="card-head"><h3>${icon('clipboard', 16)} Necessidades atuais</h3><button class="btn btn-ghost btn-sm" onclick="App.go('necessidades')">Editar</button></div>
            <div class="card-body">
              <div class="flex flex-wrap mb-sm">${STATE.needs.types.map(t => badge(t, 'teal')).join('')}</div>
              <div class="bar-list">
                <div class="bar-row"><div class="br-name">Necessidade semanal</div><div class="progress"><span style="width:${(STATE.needs.qty / STATE.needs.storage) * 100}%"></span></div><div class="br-val">${STATE.needs.qty} kg</div></div>
              </div>
              <p class="xs muted mt-sm">${icon('clock', 11)} ${STATE.needs.days.join(', ')} · ${STATE.needs.from} às ${STATE.needs.to} · ${STATE.needs.people} pessoas atendidas</p>
            </div>
          </div>
        </div>
      </div>`;
  };

  /* ---------- NECESSIDADES ---------- */
  const TYPES = ['Pães', 'Bolos e doces', 'Salgados', 'Hortifrúti', 'Laticínios', 'Não perecíveis', 'Refeições prontas'];
  const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  M.pages.necessidades = function () {
    const n = STATE.needs;
    return `${pageHead('Cadastro de necessidades', 'Informe o que a instituição pode receber — a IA da padaria usa estes dados para recomendar doações',
      `<button class="btn btn-primary" onclick="Inst.saveNeeds()">${icon('check', 16)} Salvar necessidades</button>`, ['clipboard', 'teal'])}
      <div class="grid g-2-1">
        <div class="card"><div class="card-head"><h3>${icon('clipboard', 16)} Perfil de recebimento</h3></div>
          <div class="card-body"><div class="col" style="gap:18px">
            <div class="field"><label>Tipos de alimentos aceitos</label>
              <div class="chip-select">${TYPES.map(t => `<button class="chip ${n.types.includes(t) ? 'on' : ''}" onclick="this.classList.toggle('on')" data-t="${t}">${t}</button>`).join('')}</div>
            </div>
            <div class="form-grid g3">
              <div class="field"><label>Quantidade necessária (kg/semana)</label><input class="input" id="n-qty" type="number" value="${n.qty}"></div>
              <div class="field"><label>Capacidade de armazenamento (kg)</label><input class="input" id="n-storage" type="number" value="${n.storage}"></div>
              <div class="field"><label>Pessoas atendidas</label><input class="input" id="n-people" type="number" value="${n.people}"></div>
            </div>
            <div class="form-grid g3">
              <div class="field"><label>Disponível a partir de</label><input class="input" id="n-from" type="time" value="${n.from}"></div>
              <div class="field"><label>Até</label><input class="input" id="n-to" type="time" value="${n.to}"></div>
              <div class="field"><label>Armazenamento</label>
                <div class="chip-select">
                  <button class="chip ${n.refrigerated ? 'on' : ''}" onclick="this.classList.toggle('on')" id="n-fridge">${icon('snowflake', 13)} Refrigerado</button>
                  <button class="chip ${n.frozen ? 'on' : ''}" onclick="this.classList.toggle('on')" id="n-frozen">${icon('thermometer', 13)} Congelado</button>
                </div>
              </div>
            </div>
            <div class="field"><label>Dias disponíveis para recebimento</label>
              <div class="chip-select">${DAYS.map(d => `<button class="chip ${n.days.includes(d) ? 'on' : ''}" onclick="this.classList.toggle('on')" data-d="${d}">${d}</button>`).join('')}</div>
            </div>
            <div class="field"><label>Restrições de armazenamento e recebimento</label><textarea class="textarea" id="n-rest">${n.restrictions}</textarea><span class="hint">Ex.: validade mínima, forma de entrega, ponto de acesso</span></div>
          </div></div>
        </div>
        <div class="col" style="gap:18px">
          <div class="callout info"><div class="co-icon">${icon('eye', 15)}</div><div><strong>Visível para a IA das padarias</strong><p>Estes dados alimentam a recomendação de instituições compatíveis. Hoje seu índice de compatibilidade com a ${BAKERY.name} é de <b>94%</b>.</p></div></div>
          <div class="callout warn"><div class="co-icon">${icon('shield', 15)}</div><div><strong>Responsabilidade compartilhada</strong><p>Ao aceitar uma doação, confirme que há condições de receber, armazenar e distribuir os alimentos com segurança.</p></div></div>
        </div>
      </div>`;
  };
  Inst.saveNeeds = () => {
    const n = STATE.needs;
    n.types = [...document.querySelectorAll('.chip[data-t].on')].map(c => c.dataset.t);
    n.days = [...document.querySelectorAll('.chip[data-d].on')].map(c => c.dataset.d);
    n.qty = +document.getElementById('n-qty').value; n.storage = +document.getElementById('n-storage').value;
    n.people = +document.getElementById('n-people').value;
    n.from = document.getElementById('n-from').value; n.to = document.getElementById('n-to').value;
    n.refrigerated = document.getElementById('n-fridge').classList.contains('on');
    n.frozen = document.getElementById('n-frozen').classList.contains('on');
    n.restrictions = document.getElementById('n-rest').value;
    save(); App.refresh(); toast('success', 'Necessidades salvas', 'As padarias verão seu perfil atualizado nas recomendações da IA.');
  };

  /* ---------- OFERTAS ---------- */
  M.pages.ofertas = function () {
    const offers = instOffers();
    const pending = offers.filter(o => o.status === 'pending');
    const answered = offers.filter(o => o.status !== 'pending');
    return `${pageHead('Ofertas de doações', 'Responda às ofertas enviadas pelas padarias dentro do prazo', '', ['inbox', 'teal'])}
      ${pending.length ? `<div class="grid g-2 mb">${pending.map(o => offerCard(o)).join('')}</div>` : `<div class="card mb"><div class="empty"><div class="em-icon">${icon('inbox', 26)}</div><h4>Nenhuma oferta pendente</h4><p>Quando uma padaria disponibilizar excedentes compatíveis, a oferta aparecerá aqui.</p></div></div>`}
      ${answered.length ? `<div class="card"><div class="card-head"><h3>${icon('history', 16)} Respondidas recentemente</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Padaria</th><th>Itens</th><th>Peso</th><th>Decisão</th></tr></thead><tbody>
          ${answered.map(o => `<tr><td><b>${o.bakery}</b></td><td class="muted">${o.items}</td><td>${NUM(o.kg, 1)} kg</td><td>${o.status === 'accepted' ? badge('Aceita', 'green', true) : badge('Recusada', 'red', true)}</td></tr>`).join('')}
        </tbody></table></div></div>` : ''}`;
  };

  function offerCard(o) {
    const accepted = o.status === 'accepted';
    return `<div class="offer ${o.demo ? 'highlight' : ''}">
      <div class="offer-head">
        <span class="prod-emoji" style="width:44px;height:44px;font-size:22px">${o.emoji}</span>
        <div style="flex:1"><strong>${o.bakery}</strong><div class="xs muted">${o.items}</div></div>
        ${o.demo ? aiBadge('Recomendada pela IA') : ''}
        ${accepted ? badge('Aceita', 'green', true) : `<span class="deadline">${icon('clock', 13)} ${o.deadline} para responder</span>`}
      </div>
      <div class="offer-body">
        <div class="ob-item"><span>${icon('weight', 12)} Quantidade</span><strong>${o.qty} · ${NUM(o.kg, 1)} kg</strong></div>
        <div class="ob-item"><span>${icon('calendar', 12)} Validade</span><strong>${fmtShort(o.val)} ${validityBadge(o.val)}</strong></div>
        <div class="ob-item"><span>${icon('thermometer', 12)} Armazenamento</span><strong>${o.storage}</strong></div>
        <div class="ob-item"><span>${icon('mapPin', 12)} Distância</span><strong>${NUM(o.distance, 1)} km da instituição</strong></div>
        ${o.itemsDetail ? `<div class="ob-item full"><span>${icon('package', 12)} Itens oferecidos</span><div class="flex flex-wrap mt-sm" style="gap:6px">${o.itemsDetail.map(i => badge(`${i.emoji} ${i.name} · ${i.qty} ${i.unit}`, 'gray')).join('')}</div></div>` : ''}
      </div>
      <div class="offer-foot">
        ${accepted ? `<span class="muted small">${icon('checkCircle', 13)} Aceita — aguardando a padaria solicitar o transporte.</span><button class="btn btn-outline btn-sm" style="margin-left:auto" onclick="App.go('recebimentos')">${icon('route', 14)} Acompanhar entrega</button>` : `
          <span class="muted xs">${icon('shield', 12)} Ao aceitar, confirme condições de armazenar os alimentos.</span>
          <div style="margin-left:auto;display:flex;gap:8px">
            <button class="btn btn-danger btn-sm" onclick="Inst.refuseOffer('${o.id}')">${icon('x', 14)} Recusar</button>
            <button class="btn btn-green btn-sm" onclick="Inst.acceptOffer('${o.id}')">${icon('check', 14)} Aceitar doação</button>
          </div>`}
      </div>
    </div>`;
  }

  Inst.acceptOffer = id => {
    if (id === 'demo') {
      modal({
        title: 'Aceitar a doação?', iconName: 'handHeart', iconColor: 'teal',
        sub: `${STATE.flow.code} · ${BAKERY.name} · ${NUM(STATE.flow.kg, 1)} kg`,
        body: `<div class="callout warn"><div class="co-icon">${icon('alert', 15)}</div><p style="margin:0">Ao aceitar, você confirma que tem <b>capacidade de receber e armazenar</b> os itens ainda hoje e que eles atendem às necessidades da instituição.</p></div>`,
        foot: `<button class="btn btn-outline" onclick="closeModal()">Voltar</button><button class="btn btn-green" onclick="Inst.doAccept()">${icon('check', 15)} Confirmar aceite</button>`,
      });
      return;
    }
    const o = STATE.otherOffers.find(x => x.id === id);
    o.status = 'accepted'; save(); App.refresh();
    toast('success', 'Doação aceita', `A ${o.bakery} foi notificada e vai agendar o transporte.`);
  };
  Inst.doAccept = () => { Flow.instAccept(); closeModal(); App.refresh(); toast('success', 'Doação aceita!', 'A padaria foi notificada e selecionará uma transportadora.'); };
  Inst.refuseOffer = id => {
    modal({
      title: 'Recusar oferta?', iconName: 'xCircle', iconColor: 'red', sub: 'A padaria será notificada do motivo',
      body: `<div class="field"><label>Motivo da recusa</label><select class="select" id="r-why"><option>Capacidade de armazenamento esgotada hoje</option><option>Tipo de alimento não necessário no momento</option><option>Validade muito curta para distribuição</option><option>Fora do horário de recebimento</option><option>Outro motivo</option></select></div>`,
      foot: `<button class="btn btn-outline" onclick="closeModal()">Voltar</button><button class="btn btn-danger" onclick="Inst.doRefuse('${id}')">${icon('x', 15)} Confirmar recusa</button>`,
    });
  };
  Inst.doRefuse = id => {
    const why = document.getElementById('r-why').value;
    if (id === 'demo') { Flow.instRefuse(why); }
    else { STATE.otherOffers.find(x => x.id === id).status = 'refused'; }
    save(); closeModal(); App.refresh(); toast('info', 'Oferta recusada', 'A padaria foi notificada.');
  };

  /* ---------- RECEBIMENTOS ---------- */
  M.pages.recebimentos = function () {
    const f = STATE.flow;
    const active = f.step >= 3 && f.step < 9;
    const acceptedOthers = STATE.otherOffers.filter(o => o.status === 'accepted');
    return `${pageHead('Acompanhar recebimentos', 'Doações aceitas e acompanhamento do transporte até a entrega', '', ['route', 'teal'])}
      ${active ? `<div class="card mb">
        <div class="card-head"><div><h3>${icon('route', 16)} ${f.code} — ${BAKERY.name}</h3><p>${NUM(f.kg, 1)} kg · ${f.items.map(i => i.name).join(', ')}</p></div>
          ${badge(f.step >= 7 ? 'Entregue — confirme o recebimento' : (transportStatus() || { label: 'Aguardando transporte' }).label, f.step >= 7 ? 'orange' : (transportStatus() || { color: 'amber' }).color, true)}</div>
        <div class="card-body">
          ${flowStepper()}
          ${f.step >= 5 ? `<div class="divider"></div>${routeMap()}
          <div class="grid g-3 mt">
            <div class="mini-stat"><span>Transportadora</span><strong class="small">${carrierById(f.carrierId).name}</strong></div>
            <div class="mini-stat"><span>Veículo</span><strong class="small">${carrierById(f.carrierId).vehicle}</strong></div>
            <div class="mini-stat"><span>Previsão de chegada</span><strong>${carrierById(f.carrierId).delivery}</strong></div>
          </div>` : `<div class="callout info mt"><div class="co-icon">${icon('clock', 15)}</div><p style="margin:0">Doação aceita. A padaria está selecionando a transportadora — você será notificada.</p></div>`}
        </div>
        <div class="card-foot">
          <span class="muted small">${f.step < 7 ? 'O botão de confirmação é liberado após a entrega.' : 'Confira os itens e confirme o recebimento para concluir.'}</span>
          <button class="btn btn-green" ${f.step < 7 ? 'disabled' : ''} onclick="Inst.confirmReceipt()">${icon('packageCheck', 16)} Confirmar recebimento</button>
        </div>
      </div>` : `<div class="card mb"><div class="empty"><div class="em-icon">${icon('route', 26)}</div><h4>Nenhuma entrega em andamento</h4><p>Aceite uma oferta de doação para acompanhar o transporte aqui.</p><button class="btn btn-primary mt-sm" onclick="App.go('ofertas')">${icon('inbox', 15)} Ver ofertas</button></div></div>`}
      ${acceptedOthers.length ? `<div class="card"><div class="card-head"><h3>${icon('truck', 16)} Outras doações aceitas</h3></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Padaria</th><th>Itens</th><th>Peso</th><th>Situação</th></tr></thead><tbody>
        ${acceptedOthers.map(o => `<tr><td><b>${o.bakery}</b></td><td class="muted">${o.items}</td><td>${NUM(o.kg, 1)} kg</td><td>${badge('Aguardando transporte', 'amber', true)}</td></tr>`).join('')}
        </tbody></table></div></div>` : ''}`;
  };
  Inst.confirmReceipt = () => {
    const f = STATE.flow;
    modal({
      title: 'Confirmar recebimento da doação', iconName: 'packageCheck', iconColor: 'teal',
      sub: `${f.code} · ${NUM(f.kg, 1)} kg entregues por ${carrierById(f.carrierId).name}`,
      body: `<div class="col">
        ${['Itens recebidos conferem com a oferta', 'Embalagens íntegras e temperatura adequada', 'Quantidades conferem'].map(t => `<div class="check-row" onclick="this.querySelector('.cbox').classList.toggle('on')"><div class="cbox on">${icon('check', 12)}</div>${t}</div>`).join('')}
        <div class="field"><label>Observação (opcional)</label><input class="input" id="c-note" placeholder="Ex.: recebido em perfeito estado"></div>
        <div class="callout warn"><div class="co-icon">${icon('alert', 15)}</div><p style="margin:0">A confirmação registra que a instituição assumiu a guarda dos alimentos e atualiza os indicadores da padaria.</p></div>
      </div>`,
      foot: `<button class="btn btn-outline" onclick="closeModal()">Voltar</button><button class="btn btn-green" onclick="Inst.doConfirm()">${icon('checkCircle', 15)} Confirmar recebimento</button>`,
    });
  };
  Inst.doConfirm = () => {
    Flow.confirm(document.getElementById('c-note').value);
    closeModal(); App.refresh();
    toast('success', 'Recebimento confirmado!', 'A doação foi concluída e os indicadores da padaria foram atualizados.');
  };

  /* ---------- HISTÓRICO ---------- */
  M.pages.historico = function () {
    const h = STATE.instHistory;
    const received = h.filter(x => x.status === 'Recebida');
    const kg = received.reduce((a, x) => a + x.kg, 0);
    return `${pageHead('Histórico de doações', 'Todas as doações recebidas e respondidas pela instituição',
      `<button class="btn btn-outline" onclick="toast('info','Exportando...','Gerando arquivo CSV ilustrativo.')">${icon('download', 15)} Exportar</button>`, ['history', 'teal'])}
      <div class="grid g-3 mb">
        <div class="card kpi"><div class="kpi-top"><div><div class="kpi-label">Total recebido</div><div class="kpi-value" style="margin-top:6px">${NUM(kg, 1)}<small>kg</small></div></div><div class="kpi-icon ic-teal">${icon('handHeart', 20)}</div></div></div>
        <div class="card kpi"><div class="kpi-top"><div><div class="kpi-label">Doações recebidas</div><div class="kpi-value" style="margin-top:6px">${received.length}</div></div><div class="kpi-icon ic-green">${icon('packageCheck', 20)}</div></div></div>
        <div class="card kpi"><div class="kpi-top"><div><div class="kpi-label">Padarias parceiras</div><div class="kpi-value" style="margin-top:6px">${new Set(received.map(x => x.bakery)).size}</div></div><div class="kpi-icon ic-orange">${icon('store', 20)}</div></div></div>
      </div>
      <div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Data</th><th>Origem (padaria)</th><th>Alimentos</th><th>Peso</th><th>Transporte</th><th>Status</th></tr></thead><tbody>
        ${h.map(x => `<tr ${x.demo ? 'class="row-new"' : ''}><td>${fmtShort(x.date)}</td><td><b>${x.bakery}</b></td><td class="muted">${x.items}</td><td><b>${NUM(x.kg, 1)} kg</b></td><td class="muted">${x.carrier}</td><td>${badge(x.status, x.status === 'Recebida' ? 'green' : 'red', true)}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  };
})();