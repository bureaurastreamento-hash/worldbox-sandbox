# ARCHITECTURE.md — Worldbox Sandbox

Estrutura de pastas/arquivos e como os módulos conversam entre si. Sem lógica de jogo ainda — todos os arquivos em `src/` são stubs com um comentário de responsabilidade e um `TODO` marcando em qual fatia (ver `DESIGN.md`, seção 5) a lógica entra.

JavaScript vanilla, módulos ES nativos (`import`/`export`), sem bundler. `index.html` na raiz carrega `src/main.js` como `<script type="module">` — o navegador resolve os imports diretamente, então a árvore de pastas abaixo *é* a árvore de módulos real, não uma organização lógica que depois é achatada por um build.

## Árvore

```
index.html
css/
  style.css
src/
  main.js

  core/
    time.js
    gameLoop.js

  world/
    world.js
    terrain.js
    tile.js
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
    actions/
      actionTypes.js
      wander.js
      eat.js
      sleep.js
      gather.js
      deliver.js

  village/
    village.js
    stock.js

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
- **`world/tile.js`** — tipos de tile e factory.
- **`world/spatialIndex.js`** — índice espacial (buckets) para consultas de proximidade; consumido por `agent/perception.js` e, mais tarde, `simulation/lod.js`.

- **`render/camera.js`** — posição/zoom da câmera e transforms mundo↔tela. Consumido por todo o `render/` e por `input/inputHandler.js` (picking sob o cursor).
- **`render/renderer.js`** — orquestra o desenho por frame: limpa canvas, chama `tileRenderer`, `agentRenderer`, `debugRenderer` (se ativo), nessa ordem. Só lê `world` e `camera`, nunca muta estado de jogo.
- **`render/tileRenderer.js`**, **`villageRenderer.js`**, **`agentRenderer.js`**, **`debugRenderer.js`** — cada um desenha sua camada, com culling pelo viewport da câmera.

- **`agent/agent.js`** — dados e factory do agente (posição, id; needs/traits/perception/memory se anexam aqui nas fatias 2-3).
- **`agent/needs.js`** — decaimento de necessidades por tempo e aplicação de efeitos (comer reduz fome etc.).
- **`agent/perception.js`** — varre o raio de visão via `spatialIndex`; produz o que o agente vê *agora*.
- **`agent/memory.js`** — locais/relações conhecidos, com confiança que decai. `perception` alimenta `memory`; `decision` só considera o que está em `memory` ou na percepção atual — nunca o estado real do `world` que o agente não viu. Essa é a fronteira mais importante da arquitetura: **decision.js nunca lê `world` diretamente para saber "o que existe", só para executar uma ação já escolhida sobre um alvo já conhecido.**
- **`agent/decision.js`** — o utility AI: gera candidatas a partir de `needs` + `perception`/`memory` + `village.demand` (via `village/stock.js`), pontua, escolhe, aplica o limiar de interrupção.
- **`agent/actions/*`** — cada ação é um módulo com `score(agent, world)` e `step(agent, world, dt)`; `actionTypes.js` é o registro que `decision.js` consulta. `gather.js` pontua pela demanda da vila (não pela necessidade do agente) e enche `agent.carrying`; `deliver.js` só vira candidata quando `agent.carrying > 0` e descarrega no `village/stock.js` ao chegar.

- **`village/village.js`** — dados/factory da vila (estoque, população, território).
- **`village/stock.js`** — estoque comunitário e cálculo de demanda; é o valor que `gather.js` lê para enviesar o score, igual para todos os moradores.

- **`clan/clan.js`** — agrupa vilas, mantém postura com outros clãs.
- **`clan/diplomacy.js`** — propõe/assina tratados; expõe os termos vigentes para `village/stock.js` (comércio) e `combat/combat.js` (guerra declarada).

- **`combat/combat.js`** — resolve engajamentos unidade a unidade; combate entra em `decision.js` como mais um tipo de ação candidata (engajar/fugir), e este módulo resolve o resultado.

- **`lifecycle/lifecycle.js`** — `ageAgent`/`checkDeath` por agente (idade, saúde drenada por fome crítica, morte por saúde zerada ou idade máxima); `updateVillageReproduction` por vila (cooldown + elegibilidade + `village.demand.food` decidem se tenta reproduzir); `pruneDead` remove agentes mortos de `world.agents` e de `village.population`.

- **`simulation/lod.js`** — classifica agentes/vilas em ativos (full-fidelity: needs+decision+perception todo tick) vs. simulados de forma agregada (fora da área relevante). Camada transversal que `gameLoop.js` consulta antes de decidir quais agentes atualizar em detalhe num dado tick.

- **`input/inputHandler.js`** — pan/zoom de câmera, pausar/mudar velocidade; depois seleção de entidade para o inspector.
- **`ui/hud.js`** — controles de tempo, renderizado em `#hud` (DOM, fora do canvas).
- **`ui/inspector.js`** — painel de inspeção da entidade selecionada (needs, ação atual e scores, estoque/demanda, tratados).

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

Próximo passo: implementar a fatia 1 (mundo + render + loop de tempo + 1 agente andando aleatório) preenchendo os arquivos marcados `TODO (fatia 1)`.
