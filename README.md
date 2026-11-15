# ReAlimenta — Plataforma Inteligente contra o Desperdício de Alimentos

Protótipo acadêmico navegável (front-end puro) que simula uma plataforma para
reduzir o desperdício em padarias. A IA (simulada) prevê a demanda, recomenda
ajustes de produção e sugere doações do excedente a instituições, com coleta e
entrega rastreadas por uma transportadora. Todos os dados são fictícios.

## Tecnologias
- HTML5 + CSS3 + JavaScript puro (sem frameworks, build ou servidor)
- Scripts clássicos (não-módulos) que compartilham o escopo global
- Gráficos em SVG gerados por código (sem bibliotecas)
- Fonte Inter via Google Fonts (única dependência externa)
- Persistência em `localStorage`

## Como executar
Abra o `index.html` no navegador (Chrome, Edge ou Firefox).

## Estrutura de pastas
```
index.html
css/styles.css
js/icons.js          ícones SVG
js/data.js           dados fictícios + estado + persistência
js/charts.js         gráficos SVG
js/core.js           núcleo: App, layout, modais, Flow, Demo
js/landing.js        apresentação + login
js/padaria.js        módulo Padaria
js/instituicao.js    módulo Instituição
js/transportadora.js módulo Transportadora
```
A ordem de carregamento no `index.html` importa:
icons → data → charts → core → landing → padaria → instituicao → transportadora.

## Arquitetura
- **SPA com roteamento por hash:** `#/` (apresentação), `#/login`,
  `#/<perfil>/<pagina>` (ex.: `#/padaria/estoque`).
- **Renderização por template strings:** cada página é uma função que retorna
  HTML. `App.render()` monta o layout (`shell`) e injeta o conteúdo em `#app`.
- **Módulos por perfil:** `MODULES[perfil] = { envLabel, org, nav, pages, after }`.
  - `nav`: itens do menu lateral (com `ai: true` para itens exclusivos do gerente)
  - `pages`: funções que retornam o HTML de cada página
  - `after`: ações executadas depois de renderizar a página
- **Estado global `STATE`:** objeto único salvo no `localStorage`
  (chave `realimenta_state_v1`). A sessão do usuário fica em `realimenta_session_v1`.
- **Eventos:** os botões usam `onclick="Objeto.metodo()"` no HTML. Depois de
  alterar o estado, chama-se `save()` e `App.refresh()`.

## Perfis e permissões
| Usuário | Perfil | Acesso |
|---|---|---|
| Mariana (gerente) | padaria | Completo, incluindo IA, previsão, recomendações, doações e relatórios |
| Carlos (funcionário) | padaria | Operacional (estoque e produção). Telas de IA mostram "Acesso restrito" |
| Ana Paula | instituição | Necessidades, ofertas, recebimentos e histórico |
| Ricardo | transportadora | Solicitações, entregas e histórico |

## Fluxo da doação (DOA-0147)
`STATE.flow.step` guarda quantas etapas foram concluídas:
1. Doação aprovada pela padaria
2. Instituição notificada
3. Instituição aceitou
4. Transporte solicitado
5. Transportadora aceitou
6. Alimentos coletados
7. Alimentos entregues
8. Recebimento confirmado (atualiza os indicadores)

## Descrição dos arquivos e objetos

### `icons.js`
- `ICONS`: dicionário de ícones SVG (estilo Lucide).
- `icon(nome, tamanho)`: devolve o `<svg>` do ícone.

### `data.js` — dados e estado
- **Utilitários de data:** `TODAY`, `addDays`, `iso`, `fmtDate`, `fmtShort`,
  `weekday`, `daysBetween`, `nowTime`, `stamp`.
- **Formatadores:** `BRL` (moeda) e `NUM` (número em pt-BR).
- `seeded(seed)`: gerador pseudoaleatório determinístico.
- **Dados fixos:** `BAKERY`, `USERS`, `INSTITUTIONS`, `CARRIERS`, `PRODUCTS`.
- `buildSeries()` / `SERIES`: histórico de 14 dias e previsão de 7 dias por produto.
- `initialState()`: estado inicial. Contém estoque, produção, plano, recomendações,
  excedentes, fluxo, históricos, necessidades, ofertas, solicitações, indicadores
  mensais e notificações.
- `STATE`, `loadState()`, `save()`, `resetState()`: persistência no `localStorage`.
  O estado salvo só é reaproveitado no mesmo dia.
- `notify(perfil, notificacao)`: adiciona uma notificação a um perfil.
- `instById`, `carrierById`: buscas por id.

### `charts.js` — objeto `Charts`
- `line`: linhas e áreas, com divisão histórico/previsão e faixa de confiança.
- `bars`: barras agrupadas ou empilhadas.
- `donut`: gráfico de rosca.
- `sparkline`: mini gráfico de linha.
- `gauge`: medidor semicircular.
- Os tooltips usam o atributo `data-tip` (tratado em `core.js`).

### `core.js` — núcleo
- **`App`**: sessão (`login`, `logout`, `isManager`), roteamento (`parse`, `go`) e
  renderização (`render`, `refresh`). Redireciona o usuário sem permissão e mostra
  a tela de bloqueio para funcionários nas áreas de IA.
- **`MODULES`**: registro dos módulos de cada perfil.
- **Layout e componentes:** `shell` (sidebar + topbar), `pageHead`, `kpi`, `badge`,
  `aiBadge`, `validityBadge`, `lockedScreen`.
- **Menus e overlays:** `toggleNotifs`, `markAllRead`, `toggleUserMenu`,
  `switchUser`, `modal`, `closeModal`, `toast`, tooltips dos gráficos.
- **`FLOW_STEPS` e `Flow`**: máquina de estados da doação. Métodos: `approve`,
  `instAccept`, `instRefuse`, `requestTransport`, `carrierAccept`, `carrierRefuse`,
  `collect`, `transit`, `deliver`, `confirm`. Cada método atualiza o estado, gera
  notificações e, no `confirm`, atualiza indicadores, históricos e estoque.
- **Auxiliares do fluxo:** `flowStepper`, `transportStatus`, `routeMap` (mapa ilustrativo).
- **`Demo`**: painel de roteiro guiado com 13 etapas. Métodos: `steps`, `render`,
  `goto`, `open`, `close`, `reset`, `doReset`.

### `landing.js` — objeto `Landing`
- `render()`: página de apresentação (hero, problema, perfis, fluxo).
- `profileCard()`: card de cada perfil.
- `login()`: tela de acesso com seleção de perfil e subperfil (gerente/funcionário).
- `pick()`: troca o perfil selecionado.

### `padaria.js` — `MODULES.padaria` e `Padaria`
Páginas: dashboard (gerente e funcionário), estoque, produção, previsão, recomendações,
doações, transporte, acompanhamento e relatórios.
- **Estoque:** `stockModal`, `saveStock`, `delStock`, `doDelStock`, `filterStock`
  (CRUD com filtros por categoria, vencimento e nível baixo).
- **Produção:** `prodModal`, `saveProd`, `editSold`, `saveSold`, `prodTab`, `calcRest`.
- **Previsão (IA):** `fcast` (troca o produto) e `regenerate` (recálculo simulado).
- **Recomendações (IA):** `recoApprove`, `recoReject`, `doReject`, `recoDetail`.
  Aprovar a redução de produção altera `STATE.plan`.
- **Doações:** `toggleSurplus`, `toggleSafety`, `pickInst`, `sendOffer`, `doSend`.
- **Transporte:** `pickCarrier`, `requestCarrier`, `doRequest`.
- **Relatórios:** `exportReport` (simulado). A tela mostra KPIs, evolução mensal,
  meta de redução e impactos ambiental, social e econômico.

### `instituicao.js` — `MODULES.instituicao` e `Inst`
Páginas: dashboard, necessidades, ofertas, recebimentos e histórico.
- `instOffers()` junta as ofertas fictícias com a oferta real do fluxo.
- Métodos de `Inst`: `saveNeeds`, `acceptOffer`, `doAccept`, `refuseOffer`,
  `doRefuse`, `confirmReceipt`, `doConfirm`.

### `transportadora.js` — `MODULES.transportadora` e `Trans`
Páginas: dashboard, solicitações, entregas e histórico.
- `transRequests()` e `activeJobs()` combinam dados fictícios com o fluxo real.
- Métodos de `Trans`: `accept`, `doAccept`, `refuse`, `doRefuse`, `advance`
  (avança o status: Aguardando coleta → Coleta realizada → Em transporte → Entregue).

## Observações
- A IA é simulada: previsões, recomendações e compatibilidades vêm de dados
  pré-definidos e de regras simples.
- O sistema não certifica a segurança dos alimentos. A padaria faz uma declaração
  de conformidade antes de doar.
- O botão "Reiniciar" do roteiro da demonstração restaura os dados iniciais.

---

## 👨‍💻 Autor

**Geovane**  
UC Inovação Sustentabilidade e Competitividade Empreserial - USJT Mooca