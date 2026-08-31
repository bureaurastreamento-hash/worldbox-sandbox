# ARCHITECTURE.md — Worldbox Sandbox

Estrutura de pastas/arquivos e como os módulos conversam entre si. Arquivos ainda não implementados (fatia 8+) continuam como stub com um comentário de responsabilidade e um `TODO` marcando em qual fatia (ver `DESIGN.md`, seção 5) a lógica entra.

JavaScript vanilla, módulos ES nativos (`import`/`export`), sem bundler. `index.html` na raiz carrega `src/main.js` como `<script type="module">` — o navegador resolve os imports diretamente, então a árvore de pastas abaixo *é* a árvore de módulos real, não uma organização lógica que depois é achatada por um build.

## Árvore

```
index.html
css/
  style.css
assets/
  sprites/
    human.png   (provisório — ver memória do projeto: será substituído aos poucos)
src/
  main.js

  core/
    time.js
    gameLoop.js

  world/
    world.js
    terrain.js
    tile.js
    pathfinding.js
    spatialIndex.js

  render/
    camera.js
    renderer.js
    tileRenderer.js
    villageRenderer.js
    agentRenderer.js
    debugRenderer.js

  agent/
    agent.js
    needs.js
    perception.js
    memory.js
    decision.js
    movement.js
    actions/
      actionTypes.js
      wander.js
      eat.js
      sleep.js
      gather.js
      deliver.js
      fight.js
      flee.js

  village/
    village.js
    stock.js
    trade.js

  clan/
    clan.js
    diplomacy.js

  combat/
    combat.js

  lifecycle/
    lifecycle.js

  simulation/
    lod.js

  input/
    inputHandler.js

  ui/
    hud.js
    inspector.js

  utils/
    rng.js
    mathUtils.js
    constants.js
```

## Papel de cada módulo

- **`main.js`** — ponto de entrada. Instancia `World`, `Camera`, `Renderer`, `GameLoop`, conecta `InputHandler` e `Hud`. Não tem regra de jogo, só wiring.

- **`core/time.js`** — relógio da simulação: tick, pausado, multiplicador de velocidade. Puro estado, sem I/O.
- **`core/gameLoop.js`** — laço `requestAnimationFrame`; a cada frame avança `time.js` em timestep fixo, chama `update(world, dt)` e depois `renderer.render(world)`. É o único lugar que decide a ordem update→render.

- **`world/world.js`** — o "banco de dados" central: tiles, agentes, vilas, clãs, tick atual. Outros módulos leem e escrevem aqui; a lógica de *como* o estado muda mora nos módulos donos de cada domínio, não em `world.js`.
- **`world/terrain.js`** — geração procedural do grid a partir de uma seed (usa `utils/rng.js`). Só gera dados.
- **`world/tile.js`** — tipos de tile, factory e `isWalkable` (água e montanha bloqueiam; é a única fonte de verdade sobre o que é andável — `pathfinding.js`, `perception.js` e a colocação inicial de vila/agente usam essa mesma função).
- **`world/pathfinding.js`** — A* no grid de tiles; `agent/movement.js` é o único consumidor. Sem isso, o deslocamento em linha reta cortava direto por água/montanha sempre que o alvo estava do outro lado de um obstáculo.
- **`world/spatialIndex.js`** — índice espacial (buckets) para consultas de proximidade; consumido por `agent/perception.js` e, mais tarde, `simulation/lod.js`.

- **`render/camera.js`** — posição/zoom da câmera e transforms mundo↔tela. Consumido por todo o `render/` e por `input/inputHandler.js` (picking sob o cursor).
- **`render/renderer.js`** — orquestra o desenho por frame: limpa canvas, chama `tileRenderer`, `agentRenderer`, `debugRenderer` (se ativo), nessa ordem. Só lê `world` e `camera`, nunca muta estado de jogo.
- **`render/tileRenderer.js`**, **`villageRenderer.js`**, **`agentRenderer.js`**, **`debugRenderer.js`** — cada um desenha sua camada, com culling pelo viewport da câmera. `agentRenderer.js` desenha `assets/sprites/human.png` (com fallback pro círculo antigo enquanto a imagem carrega) e o anel de seleção do agente escolhido pelo jogador.

- **`agent/agent.js`** — dados e factory do agente (posição, id; needs/traits/perception/memory se anexam aqui nas fatias 2-3).
- **`agent/needs.js`** — decaimento de necessidades por tempo e aplicação de efeitos (comer reduz fome etc.).
- **`agent/perception.js`** — varre o raio de visão via `spatialIndex`; produz o que o agente vê *agora* — tiles e também outros agentes vivos por perto (`agent.perception.agents`, usado por `combat/combat.js`).
- **`agent/memory.js`** — locais/relações conhecidos, com confiança que decai. `perception` alimenta `memory`; `decision` só considera o que está em `memory` ou na percepção atual — nunca o estado real do `world` que o agente não viu. Essa é a fronteira mais importante da arquitetura: **decision.js nunca lê `world` diretamente para saber "o que existe", só para executar uma ação já escolhida sobre um alvo já conhecido.**
- **`agent/decision.js`** — o utility AI: gera candidatas a partir de `needs` + `perception`/`memory` + `village.demand` (via `village/stock.js`), pontua, escolhe, aplica o limiar de interrupção.
- **`agent/movement.js`** — `moveToward(agent, world, dt, targetWorldPos)` compartilhado por toda ação que anda até um alvo: calcula o caminho uma vez (`world/pathfinding.js`) e segue os waypoints, devolvendo `'moving' | 'arrived' | 'unreachable'`. Nenhuma ação implementa movimento por conta própria.
- **`agent/actions/*`** — cada ação é um módulo com `score(agent, world)` e `step(agent, world, dt)`; `actionTypes.js` é o registro que `decision.js` consulta. `gather.js` pontua pela demanda da vila (não pela necessidade do agente) e enche `agent.carrying`; `deliver.js` só vira candidata quando `agent.carrying > 0` e descarrega no `village/stock.js` ao chegar. `fight.js`/`flee.js` usam `combat/combat.js:findNearestEnemy` — crianças e agentes com vida abaixo do limiar nunca lutam (score 0), só fogem (score alto); o resto prioriza lutar, mas foge se a vida cair demais em combate — reavaliado a cada reconsideração, não uma decisão travada.

- **`village/village.js`** — dados/factory da vila (estoque, população, território); `village.clanId` é atribuído por `clan/clan.js:addVillage`.
- **`village/stock.js`** — estoque comunitário e cálculo de demanda; é o valor que `gather.js` lê para enviesar o score, igual para todos os moradores, e que `trade.js` lê pra achar sobra/déficit.
- **`village/trade.js`** — `updateTrade(world, dt)`, chamado uma vez por tick (não por agente): pra cada par de vilas cujos clãs permitem comércio (`clan/diplomacy.js:canTrade`), move recurso da vila com demanda baixa (sobra) pra vila com demanda alta (déficit), a uma taxa fixa. É comércio no nível da vila, não do agente — as vilas ficam bem além do raio de percepção/memória de qualquer morador, então a rota é "conhecimento institucional" da vila, não uma decisão de utilidade individual. É o que viabiliza o caso de design original (vila guerreira sem produção própria sobrevivendo de uma vila agrícola aliada) quando a especialização de vila existir.

- **`clan/clan.js`** — agrupa vilas (`addVillage` seta `village.clanId`); `stanceByClan` guarda a postura (`war`/`tense`/`neutral`/`allied`) com cada outro clã, simétrica via `setStance`/`getStance`.
- **`clan/diplomacy.js`** — `proposeTreaty`/`signTreaty` criam e assinam tratados (aliança, não-agressão, comércio, defesa); assinar aplica a postura correspondente via `clan.js:setStance`. `isHostileTerritory(world, agent, tx, ty)` é o efeito da fatia 7: `wander.js`, `gather.js` e `eat.js` a consultam pra nunca escolher como alvo um tile dentro do território de um clã em guerra/tensão — mesmo com a necessidade crítica. `canTrade(clanA, clanB)` é o efeito da fatia 8, consumido por `village/trade.js`: mesma clã sempre comercia; clãs diferentes precisam ser aliados ou ter um tratado `trade` assinado — postura neutra sozinha não basta, é assim que o tratado passa a importar de verdade. `defense_pact` ganha consequência na fatia 9 (combate), que vai ler os tratados vigentes daqui.

- **`combat/combat.js`** — `isEnemy(world, agentA, agentB)` (postura de clã = `'war'`); `findNearestEnemy(agent, world)` busca em `agent.perception.agents`, não no mundo inteiro — um agente só reage a inimigo que já percebeu; `resolveEngagement(agent, enemy, dt)` aplica dano mútuo por tick de combate corpo a corpo. `fight.js`/`flee.js` são os únicos consumidores.

- **`lifecycle/lifecycle.js`** — `ageAgent`/`checkDeath` por agente (idade, saúde drenada por fome crítica ou combate, morte por saúde zerada ou idade máxima); `checkDeath` só regenera vida quando o agente não tem inimigo por perto (`combat/combat.js:findNearestEnemy`) — senão a regeneração desfaria o dano de combate a cada tick, já que `checkDeath` roda antes de `fight.js`. `updateVillageReproduction` por vila (cooldown + elegibilidade + `village.demand.food` decidem se tenta reproduzir); `pruneDead` remove agentes mortos (fome, combate ou idade) de `world.agents` e de `village.population`.

- **`simulation/lod.js`** — classifica agentes/vilas em ativos (full-fidelity: needs+decision+perception todo tick) vs. simulados de forma agregada (fora da área relevante). Camada transversal que `gameLoop.js` consulta antes de decidir quais agentes atualizar em detalhe num dado tick.

- **`input/inputHandler.js`** — pan/zoom de câmera (arrastar/scroll), pausar/mudar velocidade, `[D]` toggle de debug. Clique (sem arrastar, distingue por distância percorrida desde o mousedown) seleciona o agente mais próximo do cursor em `uiState.selectedAgentId`; clicar fora de qualquer agente deseleciona.
- **`ui/hud.js`** — controles de tempo, renderizado em `#hud` (DOM, fora do canvas). O painel de status mostra o agente selecionado (`uiState.selectedAgentId`, lido em `main.js`) em três estados: nada selecionado, vivo, ou morreu (evita o problema de antes: com painel sempre em `world.agents[0]`, a identidade mudava sozinha quando esse agente morria e era removido do array).
- **`ui/inspector.js`** — painel de inspeção mais completo da entidade selecionada (scores das candidatas, estoque/demanda, tratados) — o essencial de "ver o que o agente selecionado está fazendo" já existe no `hud.js`; isto fica pra fatia 11.

- **`utils/rng.js`**, **`mathUtils.js`**, **`constants.js`** — sem estado de jogo; helpers puros usados por qualquer módulo acima.

## Fluxo de dados por tick

```
InputHandler ──> Camera / TimeState
                                │
GameLoop.tick()                │
  ├─> TimeState.advance()      │
  ├─> Simulation.update(world, dt)   [para cada agente ativo, na ordem:]
  │     Perception.scan ─> Memory.update ─> Needs.update ─> Decision.choose ─> Action.step
  │     (village/stock, clan/diplomacy e combat são lidos/escritos a partir daqui
  │      quando a ação escolhida os envolve)
  │     Lifecycle.check (morte/envelhecimento/reprodução)
  │     Simulation.lod classifica quem roda full-fidelity vs. agregado
  └─> Renderer.render(world, camera)   [somente leitura]
```

Regra de dependência: **dados fluem de baixo para cima na tabela do DESIGN.md** (World → Agent → Village → Clan), e cada camada só lê a de baixo, nunca pula duas camadas. `Render` e `UI` são sempre folhas — leem `world`/`camera`, nunca são lidos por ninguém.

## Como rodar

```bash
python -m http.server 8000
```

Abrir http://localhost:8000 — nenhum passo de build.

---

Status: fatias 1-9 implementadas (ver `DESIGN.md`, seção 5). Próximo passo: fatia 10 (escala/LOD) ou fatia 11 (UI de observação).

Nota sobre a fatia 9: vilas destinadas à guerra nascem mais perto (`WAR_VILLAGE_MIN/MAX_DIST` em `utils/constants.js`) — sem isso, a distância padrão entre vilas (70-100 tiles) é maior que qualquer coisa que um agente perceba ou percorra vagando, e elas nunca se encontrariam pra lutar.
