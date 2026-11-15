/* =========================================================
   Dados fictícios + estado compartilhado (localStorage)
   ========================================================= */
const STORAGE_KEY = 'realimenta_state_v1';
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function addDays(n) { const d = new Date(TODAY); d.setDate(d.getDate() + n); return d; }
function iso(n) { const d = addDays(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function weekdayLong(n) { return addDays(n).toLocaleDateString('pt-BR', { weekday: 'long' }); }
function fmtDate(v, opts) {
  const d = typeof v === 'number' ? addDays(v) : new Date(v + (String(v).length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('pt-BR', opts || { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtShort(v) { return fmtDate(v, { day: '2-digit', month: '2-digit' }); }
function weekday(n) { return addDays(n).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''); }
function nowTime() { return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
function stamp() { return `${fmtShort(0)} às ${nowTime()}`; }
function daysBetween(isoStr) { const d = new Date(isoStr + 'T00:00:00'); return Math.round((d - TODAY) / 86400000); }
const BRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: v >= 1000 ? 0 : 2 });
const NUM = (v, d = 0) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

/* Gerador pseudoaleatório determinístico (dados estáveis entre recarregamentos) */
function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

/* ---------------- Organizações ---------------- */
const BAKERY = {
  name: 'Padaria Pão Dourado',
  unit: 'Unidade Vila Mariana',
  address: 'Rua Domingos de Morais, 1.240 — Vila Mariana, São Paulo/SP',
  cnpj: '12.345.678/0001-90',
};

const USERS = {
  gerente: { name: 'Mariana Souza', initials: 'MS', role: 'Gerente / Proprietária', profile: 'padaria', sub: 'gerente' },
  funcionario: { name: 'Carlos Lima', initials: 'CL', role: 'Funcionário — Produção', profile: 'padaria', sub: 'funcionario' },
  instituicao: { name: 'Ana Paula Ribeiro', initials: 'AR', role: 'Coordenadora — Lar Esperança', profile: 'instituicao' },
  transportadora: { name: 'Ricardo Alves', initials: 'RA', role: 'Operador logístico — EcoLog', profile: 'transportadora' },
};

const INSTITUTIONS = [
  {
    id: 'lar', name: 'Lar Esperança', type: 'ONG — Abrigo infantil', initials: 'LE', color: '#0d9488',
    address: 'Rua Loefgren, 455 — Vila Clementino', distance: 2.1, capacity: 60, used: 22, people: 85,
    accepts: ['Pães', 'Bolos e doces', 'Salgados'], hours: 'Seg–Sáb, 8h às 18h', match: 94,
    reasons: ['2,1 km de distância', 'Necessita de pães e bolos', 'Capacidade disponível: 38 kg', 'Recebe hoje até 18h'],
    rating: 4.9, donations: 12,
  },
  {
    id: 'banco', name: 'Banco de Alimentos Zona Sul', type: 'Banco de alimentos', initials: 'BA', color: '#2563eb',
    address: 'Av. Jabaquara, 2.010 — Saúde', distance: 3.8, capacity: 500, used: 310, people: 1200,
    accepts: ['Pães', 'Bolos e doces', 'Hortifrúti', 'Não perecíveis', 'Laticínios'], hours: 'Seg–Sex, 7h às 17h', match: 86,
    reasons: ['Grande capacidade', 'Aceita todas as categorias', 'Fecha às 17h hoje'],
    rating: 4.8, donations: 7,
  },
  {
    id: 'casa', name: 'Casa de Acolhida São Francisco', type: 'Abrigo para adultos', initials: 'CS', color: '#7c3aed',
    address: 'Rua Vergueiro, 3.880 — Vila Mariana', distance: 5.2, capacity: 30, used: 18, people: 60,
    accepts: ['Pães', 'Salgados', 'Refeições prontas'], hours: 'Todos os dias, 10h às 20h', match: 78,
    reasons: ['Necessita de pães', 'Capacidade limitada: 12 kg', 'Não aceita bolos no momento'],
    rating: 4.7, donations: 5,
  },
  {
    id: 'creche', name: 'Creche Comunitária Sementinha', type: 'Creche comunitária', initials: 'CC', color: '#ea580c',
    address: 'Rua Santa Cruz, 1.102 — Vila Mariana', distance: 4.5, capacity: 25, used: 9, people: 70,
    accepts: ['Pães', 'Bolos e doces', 'Laticínios'], hours: 'Seg–Sex, 7h às 12h', match: 72,
    reasons: ['Necessita de pães e bolos', 'Recebimento apenas pela manhã'],
    rating: 4.9, donations: 3,
  },
  {
    id: 'sopa', name: 'Projeto Sopa Solidária', type: 'Projeto social', initials: 'PS', color: '#64748b',
    address: 'Praça da Árvore, 80 — Saúde', distance: 1.4, capacity: 15, used: 12, people: 140,
    accepts: ['Hortifrúti', 'Não perecíveis'], hours: 'Ter e Qui, 14h às 18h', match: 48,
    reasons: ['Muito próximo', 'Não necessita de pães no momento', 'Capacidade quase esgotada'],
    rating: 4.6, donations: 1,
  },
];

const CARRIERS = [
  {
    id: 'ecolog', name: 'EcoLog Transportes', initials: 'EL', color: '#2563eb', vehicle: 'Van refrigerada (Fiorino)',
    distance: 2.4, capacity: 400, available: 'Disponível agora', availableOk: true, pickup: '14:30', delivery: '15:05',
    match: 92, rating: 4.9, trips: 248, co2: 'Veículo elétrico',
    reasons: ['Mais próxima da padaria', 'Capacidade compatível', 'Veículo com controle de temperatura', 'Elétrico — zero emissão'],
  },
  {
    id: 'rota', name: 'RotaVerde Entregas', initials: 'RV', color: '#16a34a', vehicle: 'Bicicleta cargo + Van',
    distance: 5.1, capacity: 150, available: 'Disponível às 16:00', availableOk: true, pickup: '16:00', delivery: '16:45',
    match: 81, rating: 4.7, trips: 132, co2: 'Baixa emissão',
    reasons: ['Capacidade compatível', 'Coleta mais tarde', 'Sem refrigeração'],
  },
  {
    id: 'trans', name: 'TransSolidária Logística', initials: 'TS', color: '#7c3aed', vehicle: 'Caminhão 3/4 baú',
    distance: 8.3, capacity: 1200, available: 'Disponível amanhã', availableOk: true, pickup: 'Amanhã 08:00', delivery: 'Amanhã 09:00',
    match: 64, rating: 4.8, trips: 410, co2: 'Diesel S10',
    reasons: ['Grande capacidade', 'Coleta apenas amanhã — risco ao prazo de validade'],
  },
  {
    id: 'moto', name: 'Moto Express Social', initials: 'ME', color: '#ea580c', vehicle: 'Motocicleta com baú',
    distance: 1.9, capacity: 30, available: 'Disponível agora', availableOk: true, pickup: '14:15', delivery: '14:40',
    match: 52, rating: 4.5, trips: 87, co2: 'Gasolina',
    reasons: ['Muito rápida', 'Capacidade insuficiente para o volume (exige 2 viagens)'],
  },
];

/* ---------------- Produtos da padaria ---------------- */
const PRODUCTS = [
  { id: 'pf', name: 'Pão francês', emoji: '🥖', cat: 'Pães', unit: 'un', kg: 0.05, price: 0.9, base: 380 },
  { id: 'pfi', name: 'Pão de forma integral', emoji: '🍞', cat: 'Pães', unit: 'pct', kg: 0.5, price: 12.9, base: 34 },
  { id: 'cr', name: 'Croissant', emoji: '🥐', cat: 'Folhados', unit: 'un', kg: 0.08, price: 7.5, base: 70 },
  { id: 'bc', name: 'Bolo de cenoura', emoji: '🍰', cat: 'Bolos e doces', unit: 'un', kg: 0.8, price: 32, base: 14 },
  { id: 'so', name: 'Sonho', emoji: '🍩', cat: 'Bolos e doces', unit: 'un', kg: 0.1, price: 6, base: 55 },
  { id: 'pq', name: 'Pão de queijo', emoji: '🧀', cat: 'Salgados', unit: 'un', kg: 0.04, price: 1.8, base: 220 },
  { id: 'pd', name: 'Pão doce', emoji: '🥯', cat: 'Pães', unit: 'un', kg: 0.1, price: 4.5, base: 48 },
  { id: 'ba', name: 'Baguete', emoji: '🥖', cat: 'Pães', unit: 'un', kg: 0.25, price: 9, base: 40 },
  { id: 'tf', name: 'Torta de frango', emoji: '🥧', cat: 'Salgados', unit: 'un', kg: 1.2, price: 58, base: 8 },
];
const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

/* Histórico (14 dias) + previsão (7 dias) por produto */
function buildSeries() {
  const rnd = seeded(42);
  const series = {};
  PRODUCTS.forEach((p, idx) => {
    const hist = [];
    for (let i = -14; i <= -1; i++) {
      const dow = addDays(i).getDay();
      const weekend = dow === 0 || dow === 6 ? 1.12 : 1;
      const sold = Math.round(p.base * weekend * (0.86 + rnd() * 0.16));
      const overFactor = p.id === 'pf' ? 1.14 : p.id === 'bc' ? 1.3 : p.id === 'cr' ? 1.2 : 1.08;
      const produced = Math.round(p.base * weekend * overFactor * (0.97 + rnd() * 0.05));
      hist.push({ day: i, produced, sold: Math.min(sold, produced) });
    }
    const fc = [];
    for (let i = 1; i <= 7; i++) {
      const dow = addDays(i).getDay();
      const weekend = dow === 0 || dow === 6 ? 1.12 : 1;
      let f = p.base * weekend * (0.93 + rnd() * 0.08);
      if (i === 1 && p.id === 'pf') f = p.base * 0.84;    // queda prevista amanhã (chuva + feriado escolar)
      if (i === 1 && p.id === 'bc') f = p.base * 0.78;
      if (i === 1 && p.id === 'cr') f = p.base * 0.79;
      if (i === 1 && p.id === 'pq') f = p.base * 1.12;   // alta procura
      const v = Math.round(f);
      fc.push({ day: i, forecast: v, low: Math.round(v * 0.9), high: Math.round(v * 1.1) });
    }
    series[p.id] = { hist, fc, idx };
  });
  return series;
}
const SERIES = buildSeries();

/* ---------------- Estado inicial ---------------- */
function initialState() {
  return {
    version: 1,
    day: iso(0),
    stock: [
      { id: 1, name: 'Pão francês', emoji: '🥖', cat: 'Pães', qty: 142, unit: 'un', fab: iso(0), val: iso(1), storage: 'Temperatura ambiente, local seco e arejado', min: 60 },
      { id: 2, name: 'Pão de forma integral', emoji: '🍞', cat: 'Pães', qty: 26, unit: 'pct', fab: iso(-1), val: iso(4), storage: 'Temperatura ambiente, embalagem fechada', min: 10 },
      { id: 3, name: 'Croissant', emoji: '🥐', cat: 'Folhados', qty: 34, unit: 'un', fab: iso(-1), val: iso(1), storage: 'Temperatura ambiente, vitrine fechada', min: 15 },
      { id: 4, name: 'Bolo de cenoura', emoji: '🍰', cat: 'Bolos e doces', qty: 9, unit: 'un', fab: iso(-1), val: iso(2), storage: 'Refrigerado (2 °C a 8 °C)', min: 4 },
      { id: 5, name: 'Sonho', emoji: '🍩', cat: 'Bolos e doces', qty: 20, unit: 'un', fab: iso(0), val: iso(1), storage: 'Refrigerado (2 °C a 8 °C)', min: 12 },
      { id: 6, name: 'Pão de queijo (congelado)', emoji: '🧀', cat: 'Salgados', qty: 480, unit: 'un', fab: iso(-6), val: iso(54), storage: 'Congelado (-18 °C)', min: 200 },
      { id: 7, name: 'Pão doce', emoji: '🥯', cat: 'Pães', qty: 31, unit: 'un', fab: iso(0), val: iso(2), storage: 'Temperatura ambiente, local seco e arejado', min: 15 },
      { id: 8, name: 'Baguete', emoji: '🥖', cat: 'Pães', qty: 18, unit: 'un', fab: iso(0), val: iso(1), storage: 'Temperatura ambiente', min: 10 },
      { id: 9, name: 'Torta de frango', emoji: '🥧', cat: 'Salgados', qty: 3, unit: 'un', fab: iso(0), val: iso(2), storage: 'Refrigerado (0 °C a 5 °C)', min: 3 },
      { id: 10, name: 'Farinha de trigo tipo 1', emoji: '🌾', cat: 'Insumos', qty: 175, unit: 'kg', fab: iso(-30), val: iso(120), storage: 'Local seco, sobre paletes, longe de paredes', min: 100 },
      { id: 11, name: 'Manteiga sem sal', emoji: '🧈', cat: 'Insumos', qty: 8, unit: 'kg', fab: iso(-12), val: iso(5), storage: 'Refrigerado (2 °C a 8 °C)', min: 10 },
      { id: 12, name: 'Leite integral', emoji: '🥛', cat: 'Insumos', qty: 36, unit: 'L', fab: iso(-3), val: iso(3), storage: 'Refrigerado (até 7 °C)', min: 20 },
      { id: 13, name: 'Ovos', emoji: '🥚', cat: 'Insumos', qty: 240, unit: 'un', fab: iso(-5), val: iso(16), storage: 'Local fresco ou refrigerado', min: 180 },
      { id: 14, name: 'Fermento biológico', emoji: '🫙', cat: 'Insumos', qty: 4, unit: 'kg', fab: iso(-10), val: iso(20), storage: 'Refrigerado (2 °C a 8 °C)', min: 3 },
    ],
    production: [
      { id: 101, pid: 'pf', date: iso(0), time: '05:30', produced: 420, sold: 278, by: 'Carlos Lima' },
      { id: 102, pid: 'pq', date: iso(0), time: '06:00', produced: 220, sold: 198, by: 'Carlos Lima' },
      { id: 103, pid: 'cr', date: iso(0), time: '06:15', produced: 80, sold: 46, by: 'Juliana Reis' },
      { id: 104, pid: 'so', date: iso(0), time: '07:00', produced: 60, sold: 40, by: 'Juliana Reis' },
      { id: 105, pid: 'bc', date: iso(0), time: '08:00', produced: 18, sold: 9, by: 'Juliana Reis' },
      { id: 106, pid: 'pd', date: iso(0), time: '08:30', produced: 55, sold: 24, by: 'Carlos Lima' },
      { id: 107, pid: 'ba', date: iso(0), time: '09:00', produced: 45, sold: 27, by: 'Carlos Lima' },
      { id: 108, pid: 'tf', date: iso(0), time: '10:00', produced: 8, sold: 5, by: 'Juliana Reis' },
      { id: 91, pid: 'pf', date: iso(-1), time: '05:30', produced: 430, sold: 371, by: 'Carlos Lima' },
      { id: 92, pid: 'pq', date: iso(-1), time: '06:00', produced: 230, sold: 226, by: 'Carlos Lima' },
      { id: 93, pid: 'cr', date: iso(-1), time: '06:15', produced: 85, sold: 62, by: 'Juliana Reis' },
      { id: 94, pid: 'bc', date: iso(-1), time: '08:00', produced: 18, sold: 11, by: 'Juliana Reis' },
      { id: 95, pid: 'pfi', date: iso(-1), time: '07:30', produced: 40, sold: 29, by: 'Carlos Lima' },
      { id: 96, pid: 'so', date: iso(-1), time: '07:00', produced: 60, sold: 51, by: 'Juliana Reis' },
      { id: 81, pid: 'pf', date: iso(-2), time: '05:30', produced: 425, sold: 362, by: 'Carlos Lima' },
      { id: 82, pid: 'pq', date: iso(-2), time: '06:00', produced: 220, sold: 214, by: 'Carlos Lima' },
      { id: 83, pid: 'cr', date: iso(-2), time: '06:15', produced: 85, sold: 70, by: 'Juliana Reis' },
      { id: 84, pid: 'bc', date: iso(-2), time: '08:00', produced: 16, sold: 12, by: 'Juliana Reis' },
      { id: 85, pid: 'pd', date: iso(-2), time: '08:30', produced: 55, sold: 41, by: 'Carlos Lima' },
      { id: 71, pid: 'pf', date: iso(-3), time: '05:30', produced: 420, sold: 349, by: 'Carlos Lima' },
      { id: 72, pid: 'pfi', date: iso(-3), time: '07:30', produced: 40, sold: 33, by: 'Carlos Lima' },
      { id: 73, pid: 'bc', date: iso(-3), time: '08:00', produced: 18, sold: 13, by: 'Juliana Reis' },
    ],
    /* Plano de produção para amanhã (antes dos ajustes da IA) */
    plan: { pf: 420, pfi: 40, cr: 80, bc: 18, so: 60, pq: 220, pd: 55, ba: 45, tf: 8 },
    recos: [
      {
        id: 'r1', type: 'reduce', pid: 'pf', priority: 'alta', status: 'pending', confidence: 91, scenario: true,
        title: 'Reduzir a produção de pão francês amanhã',
        quote: 'A previsão indica uma queda na procura por pão francês amanhã. Considere reduzir a produção em 15%.',
        problem: 'Produção planejada: 420 un. Demanda prevista: 319 un.',
        reason: 'Chuva forte e feriado escolar amanhã — vendas caem ~14% em dias assim.',
        action: 'Produzir 357 unidades (-15%).',
        benefit: 'Evita ~3,2 kg de sobra e economiza R$ 56,70.',
        savedKg: 3.2, savedBRL: 56.7, area: 'Produção',
      },
      {
        id: 'r2', type: 'expiring', pid: 'cr', priority: 'alta', status: 'pending', confidence: 88,
        title: '20 croissants próximos do vencimento',
        quote: 'Existem 20 unidades de croissant próximas do vencimento. Considere ajustar a produção e priorizar a venda.',
        problem: '20 croissants vencem amanhã; a tarde vende só ~12 unidades.',
        reason: 'Produção acima da demanda há 5 dias (18% de sobra média).',
        action: 'Combo "croissant + café" à tarde e fornada menor amanhã (80 → 62 un).',
        benefit: 'Reduz 75% do risco de perda e gera ~R$ 90 em vendas.',
        savedKg: 1.6, savedBRL: 90, area: 'Vendas',
      },
      {
        id: 'r3', type: 'over', pid: 'bc', priority: 'média', status: 'pending', confidence: 84,
        title: 'Produção de bolo de cenoura acima da demanda prevista',
        quote: 'A quantidade produzida está acima da demanda prevista.',
        problem: 'Produção de 18 bolos/dia; demanda prevista: 11/dia.',
        reason: 'Procura por bolos inteiros caiu 22% — clientes preferem fatias.',
        action: 'Produzir 12 inteiros e vender 3 em fatias.',
        benefit: 'Evita ~4,8 kg de desperdício por semana.',
        savedKg: 4.8, savedBRL: 112, area: 'Produção',
      },
      {
        id: 'r4', type: 'stock', pid: null, priority: 'média', status: 'pending', confidence: 95,
        title: 'Manteiga abaixo do estoque mínimo',
        quote: 'O estoque de manteiga (8 kg) está abaixo do mínimo definido (10 kg) para a produção dos próximos 3 dias.',
        problem: `Estoque: 8 kg. Consumo previsto até ${weekdayLong(3)} (${fmtShort(3)}): 11,5 kg.`,
        reason: 'A procura por croissants deve aumentar nos próximos dias.',
        action: `Comprar 10 kg com entrega até ${weekdayLong(2)} (${fmtShort(2)}).`,
        benefit: 'Evita falta de insumo sem comprar em excesso.',
        savedKg: 0, savedBRL: 0, area: 'Estoque',
      },
      {
        id: 'r5', type: 'donate', pid: null, priority: 'alta', status: 'pending', confidence: 90, scenario: true,
        title: 'Excedente próprio para consumo: iniciar doação',
        quote: 'Mesmo após os ajustes, há cerca de 15 kg de alimentos excedentes dentro da validade. Considere doá-los ainda hoje.',
        problem: 'Pães, bolos e croissants não serão vendidos até o fechamento.',
        reason: 'Itens dentro da validade, mas a venda restante do dia não absorve o volume.',
        action: 'Disponibilizar o excedente para doação.',
        benefit: '~15 kg viram ~60 refeições em vez de descarte.',
        savedKg: 0, savedBRL: 0, area: 'Doação',
      },
    ],
    surplus: [
      { id: 's1', name: 'Pão francês', emoji: '🥖', cat: 'Pães', qty: 80, unit: 'un', kg: 4.0, fab: iso(0), val: iso(1), storage: 'Temperatura ambiente', selected: true },
      { id: 's2', name: 'Pão de forma integral', emoji: '🍞', cat: 'Pães', qty: 8, unit: 'pct', kg: 4.0, fab: iso(-1), val: iso(4), storage: 'Temperatura ambiente, embalagem fechada', selected: true },
      { id: 's3', name: 'Croissant', emoji: '🥐', cat: 'Folhados', qty: 14, unit: 'un', kg: 1.1, fab: iso(-1), val: iso(1), storage: 'Temperatura ambiente', selected: true },
      { id: 's4', name: 'Bolo de cenoura', emoji: '🍰', cat: 'Bolos e doces', qty: 4, unit: 'un', kg: 3.2, fab: iso(-1), val: iso(2), storage: 'Refrigerado (2 °C a 8 °C)', selected: true },
      { id: 's5', name: 'Pão doce', emoji: '🥯', cat: 'Pães', qty: 22, unit: 'un', kg: 2.2, fab: iso(0), val: iso(2), storage: 'Temperatura ambiente', selected: true },
      { id: 's6', name: 'Baguete', emoji: '🥖', cat: 'Pães', qty: 6, unit: 'un', kg: 1.5, fab: iso(0), val: iso(1), storage: 'Temperatura ambiente', selected: false },
    ],
    /* Fluxo de demonstração (doação DOA-0147) */
    flow: {
      code: 'DOA-0147', step: 0, institutionId: null, carrierId: null, inTransit: false,
      items: [], kg: 0, times: {}, refusedInst: [], refusedCarrier: [], safetyChecked: false,
    },
    donationsHistory: [
      { code: 'DOA-0142', date: iso(-2), inst: 'Lar Esperança', carrier: 'EcoLog Transportes', kg: 14.5, items: 'Pães variados, bolos', status: 'Concluída' },
      { code: 'DOA-0139', date: iso(-5), inst: 'Banco de Alimentos Zona Sul', carrier: 'TransSolidária Logística', kg: 32.0, items: 'Pães, pão de forma, sonhos', status: 'Concluída' },
      { code: 'DOA-0136', date: iso(-8), inst: 'Casa de Acolhida São Francisco', carrier: 'RotaVerde Entregas', kg: 11.2, items: 'Pão francês, baguetes', status: 'Concluída' },
      { code: 'DOA-0133', date: iso(-11), inst: 'Lar Esperança', carrier: 'EcoLog Transportes', kg: 9.8, items: 'Croissants, pão doce', status: 'Concluída' },
      { code: 'DOA-0130', date: iso(-14), inst: 'Creche Comunitária Sementinha', carrier: '—', kg: 6.5, items: 'Bolos', status: 'Cancelada' },
      { code: 'DOA-0127', date: iso(-17), inst: 'Banco de Alimentos Zona Sul', carrier: 'EcoLog Transportes', kg: 21.4, items: 'Pães variados', status: 'Concluída' },
    ],
    /* Ambiente da instituição */
    needs: {
      types: ['Pães', 'Bolos e doces', 'Salgados'],
      qty: 60, storage: 120, refrigerated: true, frozen: false,
      days: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], from: '08:00', to: '18:00',
      restrictions: 'Não recebemos alimentos com validade inferior a 24 horas. Itens refrigerados devem chegar em caixa térmica. Recebimento pela entrada lateral (Rua Loefgren).',
      people: 85,
    },
    otherOffers: [
      { id: 'o1', bakery: 'Padaria Trigo de Ouro', items: 'Pão de forma tradicional', emoji: '🍞', qty: '16 pacotes', kg: 8, val: iso(2), storage: 'Temperatura ambiente', deadline: '3h 20min', distance: 3.1, status: 'pending' },
      { id: 'o2', bakery: 'Panificadora Bela Vista', items: 'Bolos variados (fubá, laranja)', emoji: '🍰', qty: '6 unidades', kg: 5, val: iso(1), storage: 'Refrigerado (2 °C a 8 °C)', deadline: '1h 40min', distance: 4.6, status: 'pending' },
    ],
    instHistory: [
      { date: iso(-2), bakery: 'Padaria Pão Dourado', items: 'Pães variados, bolos', kg: 14.5, carrier: 'EcoLog Transportes', status: 'Recebida' },
      { date: iso(-4), bakery: 'Padaria Trigo de Ouro', items: 'Pão de forma, bisnaguinhas', kg: 10.0, carrier: 'RotaVerde Entregas', status: 'Recebida' },
      { date: iso(-6), bakery: 'Panificadora Bela Vista', items: 'Sonhos, pão doce', kg: 6.4, carrier: 'EcoLog Transportes', status: 'Recebida' },
      { date: iso(-9), bakery: 'Padaria Pão Dourado', items: 'Croissants, pão doce', kg: 9.8, carrier: 'EcoLog Transportes', status: 'Recebida' },
      { date: iso(-12), bakery: 'Padaria Santa Clara', items: 'Pão francês', kg: 7.5, carrier: 'Moto Express Social', status: 'Recebida' },
      { date: iso(-15), bakery: 'Panificadora Bela Vista', items: 'Bolos', kg: 4.0, carrier: '—', status: 'Recusada' },
      { date: iso(-18), bakery: 'Padaria Trigo de Ouro', items: 'Pães variados', kg: 12.2, carrier: 'RotaVerde Entregas', status: 'Recebida' },
    ],
    /* Ambiente da transportadora */
    otherRequests: [
      { id: 't1', code: 'TR-0388', from: 'Padaria Trigo de Ouro', fromAddr: 'Rua Tutóia, 610 — Paraíso', to: 'Banco de Alimentos Zona Sul', toAddr: 'Av. Jabaquara, 2.010 — Saúde', food: 'Pães e bisnaguinhas', kg: 22, volume: '6 caixas (0,4 m³)', when: 'Amanhã, 09:00', temp: 'Ambiente', distance: 4.2, status: 'pending', value: 'Parceria social' },
      { id: 't2', code: 'TR-0391', from: 'Panificadora Bela Vista', fromAddr: 'Rua Afonso Celso, 212 — Vila Mariana', to: 'Casa de Acolhida São Francisco', toAddr: 'Rua Vergueiro, 3.880 — Vila Mariana', food: 'Bolos (refrigerados)', kg: 9, volume: '3 caixas térmicas (0,2 m³)', when: 'Hoje, 17:30', temp: 'Refrigerado 2–8 °C', distance: 2.8, status: 'pending', value: 'Parceria social' },
    ],
    activeDeliveries: [
      { code: 'TR-0384', from: 'Padaria Santa Clara', to: 'Banco de Alimentos Zona Sul', kg: 18, status: 'Em transporte', eta: '13:50' },
    ],
    transHistory: [
      { code: 'TR-0379', date: iso(-2), from: 'Padaria Pão Dourado', to: 'Lar Esperança', kg: 14.5, km: 4.6, status: 'Entregue' },
      { code: 'TR-0372', date: iso(-3), from: 'Padaria Santa Clara', to: 'Banco de Alimentos Zona Sul', kg: 26.0, km: 7.9, status: 'Entregue' },
      { code: 'TR-0368', date: iso(-6), from: 'Panificadora Bela Vista', to: 'Lar Esperança', kg: 6.4, km: 3.3, status: 'Entregue' },
      { code: 'TR-0361', date: iso(-9), from: 'Padaria Pão Dourado', to: 'Lar Esperança', kg: 9.8, km: 4.6, status: 'Entregue' },
      { code: 'TR-0355', date: iso(-12), from: 'Padaria Trigo de Ouro', to: 'Creche Comunitária Sementinha', kg: 8.0, km: 5.0, status: 'Recusada' },
      { code: 'TR-0349', date: iso(-17), from: 'Padaria Pão Dourado', to: 'Banco de Alimentos Zona Sul', kg: 21.4, km: 6.2, status: 'Entregue' },
      { code: 'TR-0342', date: iso(-20), from: 'Padaria Santa Clara', to: 'Casa de Acolhida São Francisco', kg: 11.0, km: 6.8, status: 'Entregue' },
    ],
    /* Indicadores (meses: 6 últimos, inclusive o atual) */
    monthly: {
      waste: [182, 164, 139, 118, 97, 61],
      avoided: [22, 41, 63, 84, 105, 72],
      donated: [18, 26, 34, 41, 48, 31],
      savings: [1240, 2180, 3050, 3920, 4710, 3380],
      donationsDone: [5, 7, 9, 10, 12, 8],
      donationsTotal: [6, 8, 10, 11, 13, 9],
    },
    notifs: {
      padaria: [
        { id: 1, icon: 'sparkles', color: 'violet', title: '5 novas recomendações da IA', text: 'A análise das 05:00 identificou riscos de excedente.', time: 'Hoje, 05:02', unread: true },
        { id: 2, icon: 'alert', color: 'orange', title: '3 itens vencem amanhã', text: 'Croissant, pão francês e sonho.', time: 'Hoje, 07:30', unread: true },
        { id: 3, icon: 'checkCircle', color: 'green', title: 'Doação DOA-0142 concluída', text: 'Lar Esperança confirmou o recebimento de 14,5 kg.', time: fmtShort(-2), unread: false },
      ],
      instituicao: [
        { id: 1, icon: 'inbox', color: 'teal', title: 'Nova oferta: Padaria Trigo de Ouro', text: '16 pacotes de pão de forma — responda em 3h.', time: 'Hoje, 10:40', unread: true },
        { id: 2, icon: 'inbox', color: 'teal', title: 'Nova oferta: Panificadora Bela Vista', text: '6 bolos variados — responda em 1h40.', time: 'Hoje, 11:55', unread: true },
      ],
      transportadora: [
        { id: 1, icon: 'truck', color: 'blue', title: 'Nova solicitação TR-0391', text: 'Panificadora Bela Vista → Casa de Acolhida.', time: 'Hoje, 11:58', unread: true },
      ],
    },
    demoOpen: true,
  };
}

const MONTHS = (() => {
  const arr = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
    arr.push(d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''));
  }
  return arr.map(m => m.charAt(0).toUpperCase() + m.slice(1));
})();

let STATE = loadState();
function loadState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignora */ }
  return initialState();
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); } catch (e) { /* ignora */ } }
function resetState() { STATE = initialState(); save(); }

function notify(profile, n) {
  const list = STATE.notifs[profile];
  list.unshift({ id: Date.now() + Math.random(), unread: true, time: `Hoje, ${nowTime()}`, ...n });
  save();
}

const instById = id => INSTITUTIONS.find(i => i.id === id);
const carrierById = id => CARRIERS.find(c => c.id === id);