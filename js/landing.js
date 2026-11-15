/* =========================================================
   Página de apresentação + tela de acesso por perfil
   ========================================================= */
const Landing = {
  selected: 'gerente',

  render() {
    const m = STATE.monthly;
    const donated = m.donated.reduce((a, b) => a + b, 0);
    const demand = 320, max = 420;
    const planRow = (label, total, color) => `<div class="mb">
      <div class="flex-between small mb-sm"><span class="bold">${label}</span><span><b>${total} pães</b> <span class="muted">· sobra ${total - demand}</span></span></div>
      <div style="display:flex;height:14px;border-radius:999px;overflow:hidden;background:var(--gray-100)">
        <span style="width:${(demand / max) * 100}%;background:${color}"></span>
        <span style="width:${((total - demand) / max) * 100}%;background:var(--orange-500)"></span>
      </div>
    </div>`;
    return `<div class="landing">
      <nav class="landing-nav">
        <div class="brand"><span class="brand-logo">${icon('leaf', 20)}</span><span>ReAlimenta<small>Plataforma Inteligente contra o Desperdício</small></span></div>
        <div class="links"><a href="#problema" onclick="event.preventDefault();document.getElementById('problema').scrollIntoView({behavior:'smooth'})">O problema</a><a href="#" onclick="event.preventDefault();document.getElementById('perfis').scrollIntoView({behavior:'smooth'})">Perfis</a><a href="#" onclick="event.preventDefault();document.getElementById('fluxo').scrollIntoView({behavior:'smooth'})">Como funciona</a></div>
        <div class="flex"><button class="btn btn-primary" onclick="location.hash='#/login'">${icon('user', 16)} Acessar plataforma</button></div>
      </nav>

      <section class="hero">
        <div>
          <span class="hero-badge"><span>Novo</span> Inteligência Artificial para padarias</span>
          <h1>Produza o necessário.<br/><em>Doe o excedente.</em><br/>Reduza o desperdício.</h1>
          <p class="lead">Plataforma com Inteligência Artificial integrada, que prevê a demanda da padaria e evita o desperdício já na produção. O que sobrar em condições de consumo vira doação, com coleta e entrega rastreadas.</p>
          <div class="hero-actions">
            <button class="btn btn-primary btn-lg" onclick="location.hash='#/login'">${icon('play', 16)} Iniciar demonstração</button>
            <button class="btn btn-outline btn-lg" onclick="document.getElementById('fluxo').scrollIntoView({behavior:'smooth'})">Ver como funciona</button>
          </div>
          <div class="xs muted" style="margin-top:40px;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Resultados de uma padaria em 6 meses de uso</div>
          <div class="hero-stats" style="margin-top:12px">
            <div><strong>66% menos</strong><span>desperdício</span></div>
            <div><strong>${BRL(m.savings.reduce((a, b) => a + b, 0))}</strong><span>economizados</span></div>
            <div><strong>${NUM(donated)} kg</strong><span>de alimentos doados</span></div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="mock-window">
            <div class="mw-head"><i></i><i></i><i></i></div>
            <div class="flex-between mb"><div><div class="bold">Produção de amanhã — Pão francês</div><div class="xs muted">A IA prevê a venda de <b>${demand} pães</b></div></div>${aiBadge('IA')}</div>
            ${planRow('Sem IA (produção habitual)', 420, 'var(--gray-400)')}
            ${planRow('Com IA (recomendado)', 335, 'var(--green-600)')}
            <div class="flex xs muted mb" style="gap:14px"><span class="flex" style="gap:6px"><i class="legend-dot" style="background:var(--green-600)"></i>Vendido</span><span class="flex" style="gap:6px"><i class="legend-dot" style="background:var(--orange-500)"></i>Sobra</span></div>
            <div class="mini-stat" style="background:var(--green-50)"><span>Resultado</span><strong class="text-green">85 pães a menos no lixo</strong></div>
          </div>
          <div class="float-card fc1"><div class="kpi-icon ic-orange" style="width:34px;height:34px">${icon('alert', 16)}</div><div><b>Alerta de desperdício</b><div class="muted xs">20 croissants vencem amanhã</div></div></div>
          <div class="float-card fc2"><div class="kpi-icon ic-teal" style="width:34px;height:34px">${icon('handHeart', 16)}</div><div><b>Doação entregue</b><div class="muted xs">14,5 kg · Lar Esperança</div></div></div>
        </div>
      </section>

      <section class="section" id="problema">
        <div class="section-head"><span class="eyebrow">O problema</span><h2>Alimento bom indo para o lixo todos os dias</h2><p>Sem previsão, a produção é feita na intuição — e a sobra do fim do dia vira descarte.</p></div>
        <div class="problem-grid">
          <div class="problem-card"><div class="num">~30%</div><h3>da produção diária</h3><p>pode virar sobra quando a produção não acompanha a demanda real.</p></div>
          <div class="problem-card"><div class="num">R$ 4,7 mil</div><h3>perdidos por mês</h3><p>em insumos, energia e mão de obra descartados (cenário fictício).</p></div>
          <div class="problem-card good"><div class="num">3 em 1</div><h3>solução integrada</h3><p><b>Prevenir</b> com IA, <b>redistribuir</b> com doação, <b>entregar</b> com rastreio.</p></div>
        </div>
      </section>

      <section class="section alt" id="perfis"><div class="section-head"><span class="eyebrow">Três ambientes</span><h2>Um painel dedicado para cada perfil</h2><p>Cada perfil acessa um ambiente próprio, com as informações e ações do seu papel na operação.</p></div>
        
        <div class="profile-grid">
          ${this.profileCard('gerente', 'Padaria', 'Registra estoque e produção, recebe previsões da IA e aprova doações.', ['Previsão de demanda com IA', 'Recomendações para o gerente', 'Doações e relatórios de impacto'], 'store', '#16a34a', '#f0fdf4', true)}
          ${this.profileCard('instituicao', 'Instituição receptora', 'Cadastra necessidades e responde às ofertas de doação.', ['Cadastro de necessidades', 'Aceitar ou recusar ofertas', 'Confirmar o recebimento'], 'handHeart', '#0d9488', '#f0fdfa')}
          ${this.profileCard('transportadora', 'Empresa de transporte', 'Recebe solicitações de coleta e atualiza as entregas.', ['Aceitar ou recusar serviços', 'Atualizar status da entrega', 'Histórico de transportes'], 'truck', '#2563eb', '#eff6ff')}
        </div>
      </section>

      <section class="section" id="fluxo">
        <div class="section-head"><span class="eyebrow">Como funciona</span><h2>Da previsão à entrega, em um fluxo rastreável</h2><p>A prevenção vem primeiro. A doação é destinada apenas ao excedente que continua próprio para consumo.</p></div>
        <div class="flow-steps">
          ${[
            ['Registro', 'Padaria registra vendas, produção e estoque.', 'Padaria', 'green'],
            ['Previsão', 'A IA analisa o histórico e prevê a demanda dos próximos dias.', 'IA', 'violet'],
            ['Recomendação', 'A IA aponta riscos de desperdício e sugere ajustes.', 'IA', 'violet'],
            ['Decisão', 'O gerente aprova ou rejeita cada recomendação.', 'Gerente', 'green'],
            ['Doação', 'Excedente próprio para consumo é ofertado a uma instituição recomendada.', 'Gerente + IA', 'green'],
            ['Aceite', 'A instituição avalia e aceita a oferta.', 'Instituição', 'teal'],
            ['Logística', 'Uma transportadora aceita, coleta e entrega os alimentos.', 'Transportadora', 'blue'],
            ['Impacto', 'Recebimento confirmado e indicadores atualizados.', 'Todos', 'orange'],
          ].map((s, i) => `<div class="flow-step"><div class="fs-num ic-${s[3]}">${i + 1}</div><span class="who text-${s[3] === 'teal' ? 'green' : s[3]}">${s[2]}</span><h4>${s[0]}</h4><p>${s[1]}</p></div>`).join('')}
        </div>
        <div class="disclaimer mt" style="max-width:820px;margin:24px auto 0">${icon('shield', 16)}<span><b>Importante:</b> a IA não certifica a segurança dos alimentos. A avaliação sanitária e as boas práticas de manipulação, armazenamento e transporte permanecem sob responsabilidade da padaria e dos parceiros.</span></div>
        <div class="center mt"><button class="btn btn-primary btn-lg" onclick="location.hash='#/login'">${icon('play', 16)} Iniciar demonstração</button></div>
      </section>

      <footer class="landing-footer"><span>ReAlimenta — Protótipo acadêmico navegável. Todos os dados são fictícios.</span><span>Projeto universitário · ${TODAY.getFullYear()}</span></footer>
    </div>`;
  },

  profileCard(key, title, text, items, ic, c, soft, ai) {
    return `<div class="profile-card" style="--pc:${c};--pc-soft:${soft}">
      ${ai ? `<span class="ai-tag">${aiBadge('Com IA')}</span>` : `<span class="ai-tag">${badge('Sem IA', 'gray')}</span>`}
      <div class="pc-icon">${icon(ic, 26)}</div>
      <h3>${title}</h3><p>${text}</p>
      <ul>${items.map(i => `<li>${icon('checkCircle', 15)}${i}</li>`).join('')}</ul>
      <button class="btn btn-outline btn-block" onclick="Landing.selected='${key}';location.hash='#/login'">Acessar como ${title.toLowerCase()} ${icon('arrowRight', 15)}</button>
    </div>`;
  },

  login() {
    const opts = [
      { key: 'padaria', user: ['gerente', 'funcionario'], title: 'Padaria', sub: 'Padaria Pão Dourado — gestão, IA e doações', ic: 'store', c: '#16a34a', soft: '#f0fdf4', ring: 'rgba(22,163,74,.15)' },
      { key: 'instituicao', user: ['instituicao'], title: 'Instituição receptora', sub: 'Lar Esperança — ONG / abrigo infantil', ic: 'handHeart', c: '#0d9488', soft: '#f0fdfa', ring: 'rgba(13,148,136,.15)' },
      { key: 'transportadora', user: ['transportadora'], title: 'Empresa de transporte', sub: 'EcoLog Transportes — logística parceira', ic: 'truck', c: '#2563eb', soft: '#eff6ff', ring: 'rgba(37,99,235,.15)' },
    ];
    const sel = this.selected;
    const selProfile = USERS[sel].profile;
    const u = USERS[sel];
    const emails = { gerente: 'mariana@paodourado.com.br', funcionario: 'carlos@paodourado.com.br', instituicao: 'ana@laresperanca.org.br', transportadora: 'ricardo@ecolog.com.br' };
    return `<div class="login-wrap">
      <div class="login-side">
        <a class="brand" href="#/"><span class="brand-logo" style="background:rgba(255,255,255,.15);box-shadow:none">${icon('leaf', 20)}</span><span>ReAlimenta<small>Plataforma Inteligente contra o Desperdício</small></span></a>
        <div style="position:relative;z-index:1">
          <h2>Prevenir primeiro. Doar o excedente. Medir o impacto.</h2>
          <p>Um único fluxo conecta padarias, instituições sociais e transportadoras — com a Inteligência Artificial ajudando a padaria a produzir na medida certa.</p>
        </div>
        <div class="login-quote">
          <div class="flex mb-sm">${icon('sparkles', 16)}<b>Resultado do cenário de demonstração</b></div>
          Redução de <b>66%</b> no desperdício mensal, <b>${NUM(STATE.monthly.donated.reduce((a, b) => a + b, 0))} kg</b> doados e <b>${BRL(STATE.monthly.savings.reduce((a, b) => a + b, 0))}</b> de economia estimada em 6 meses.
        </div>
      </div>
      <div class="login-main">
        <div class="login-box">
          <button class="btn btn-ghost btn-sm mb" onclick="location.hash='#/'">${icon('arrowLeft', 14)} Voltar à apresentação</button>
          <h1>Acessar a plataforma</h1>
          <p>Selecione o perfil de acesso para entrar no ambiente correspondente.</p>
          <div class="role-options">
            ${opts.map(o => `<button class="role-option ${selProfile === o.key ? 'selected' : ''}" style="--rc:${o.c};--rc-soft:${o.soft};--rc-ring:${o.ring}" onclick="Landing.pick('${o.user[0]}')">
              <span class="ro-icon">${icon(o.ic, 20)}</span>
              <span><strong>${o.title}</strong><span>${o.sub}</span></span>
              <span class="ro-check">${selProfile === o.key ? icon('check', 12) : ''}</span>
            </button>`).join('')}
          </div>
          ${selProfile === 'padaria' ? `<div class="subrole">
            <button class="${sel === 'gerente' ? 'active' : ''}" onclick="Landing.pick('gerente')">${icon('user', 13)} Gerente / Proprietário</button>
            <button class="${sel === 'funcionario' ? 'active' : ''}" onclick="Landing.pick('funcionario')">${icon('chef', 13)} Funcionário</button>
          </div>
          <div class="callout ${sel === 'gerente' ? 'ai' : 'gray'} mb" style="padding:10px 12px">
            <div class="co-icon" style="width:28px;height:28px">${icon(sel === 'gerente' ? 'sparkles' : 'lock', 14)}</div>
            <p style="margin:0">${sel === 'gerente' ? 'Acesso completo: IA, previsões, recomendações, aprovações e doações.' : 'Acesso operacional: registro de estoque e produção. Sem acesso às funções de IA.'}</p>
          </div>` : ''}
          <div class="col">
            <div class="field"><label>E-mail</label><input class="input" value="${emails[sel]}" /></div>
            <div class="field"><label>Senha</label><input class="input" type="password" value="demonstracao" /></div>
            <button class="btn btn-primary btn-lg btn-block mt-sm" style="--accent:${opts.find(o => o.key === selProfile).c}" onclick="App.login('${sel}')">Entrar como ${u.name} ${icon('arrowRight', 16)}</button>
          </div>
          <p class="xs muted center mt">Protótipo acadêmico — credenciais de demonstração já preenchidas.</p>
        </div>
      </div>
    </div>`;
  },
  pick(k) { this.selected = k; App.render(); },
};