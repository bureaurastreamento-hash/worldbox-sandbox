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
    WMan1/2, WGirl1/2, BMan1/2, BGirl1/2   (variantes pele/gênero, não usadas mais — ver §8 do DESIGN.md, código foi pra Assets-testes-para-o-claude-testar/)
  Assets-testes-para-o-claude-testar/
    poses por ação (Camponês) e ataque (Orc/Elfo/Cavaleiro), consumidas por render/agentRenderer.js
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
    decorations.js

  render/
    camera.js
    renderer.js
    tileRenderer.js
    villageRenderer.js
    decorationRenderer.js
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
      gatherWood.js
      mine.js
      build.js
      deliver.js
      fight.js
      flee.js
      raid.js

  village/
    village.js
    stock.js
    trade.js

  clan/
    clan.js
    diplomacy.js
    clanDecision.js

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
- **`core/gameLoop.js`** — laço `requestAnimationFrame`; a cada frame avança `time.js` em timestep fixo, chama `update(world, dt)` e depois `renderer.render(world)`. É o único lugar que decide a ordem update→render. `update`+`render` rodam dentro de um `try/catch` que loga e segue pro próximo frame — sem isso, uma exceção não tratada em qualquer canto (um agente, uma vila, um clã) travava o jogo inteiro pra sempre sem nenhum aviso, já que o próximo `requestAnimationFrame` nem chegava a ser agendado.

- **`world/world.js`** — o "banco de dados" central: tiles, agentes, vilas, clãs, tick atual. Outros módulos leem e escrevem aqui; a lógica de *como* o estado muda mora nos módulos donos de cada domínio, não em `world.js`.
- **`world/terrain.js`** — geração procedural do grid a partir de uma seed (usa `utils/rng.js`). Só gera dados. Tiles de montanha ganham `resource` (`resourceForMountain`, cumulativo sobre `MOUNTAIN_RESOURCE_WEIGHTS`) — função pura de coordenada+seed, mesmo padrão determinístico do resto do arquivo (não consome uma sequência de rng por tile).
- **`world/tile.js`** — tipos de tile, factory e `isWalkable` (água e montanha bloqueiam; é a única fonte de verdade sobre o que é andável — `pathfinding.js`, `perception.js` e a colocação inicial de vila/agente usam essa mesma função).
- **`world/pathfinding.js`** — A* no grid de tiles; `agent/movement.js` é o único consumidor. Sem isso, o deslocamento em linha reta cortava direto por água/montanha sempre que o alvo estava do outro lado de um obstáculo.
- **`world/spatialIndex.js`** — `buildSpatialIndex(agents)` (reconstruído em `main.js` a cada tick) + `queryNearby(index, pos, radius)`, buckets de grid do tamanho do raio de percepção. Substitui a varredura O(n) de `agent/perception.js` sobre `world.agents` — sem isso, achar "quem tá por perto" vira O(n²) no total e não escala (medido: 6.6x mais rápido que força bruta com 1500 agentes).
- **`world/decorations.js`** — `generateDecorations(world)`, chamado uma vez em `main.js` depois de terreno e vilas existirem (não em `createWorld`, que roda antes das vilas). Árvore/planta por chance em tile de floresta/grama, pulando o raio de "clareira" de qualquer vila; casas espalhadas dentro dessa clareira. Puramente visual — não afeta `isWalkable`, pathfinding, percepção nem nenhum outro sistema. Usa uma rng própria (`${seed}-decorations`) pra não desviar a sequência de `world.rng` (gameplay).

- **`render/camera.js`** — posição/zoom da câmera e transforms mundo↔tela. Consumido por todo o `render/` e por `input/inputHandler.js` (picking sob o cursor). Zoom mínimo por viewport é "contain" (`Math.min` das duas proporções largura/altura mapa×tela) — encolhe até a maior dimensão do mapa caber, com `clampToBounds` centralizando o espaço sobrando na outra dimensão. Era "cover" (`Math.max`) antes — nunca deixava vazio nas bordas, mas também nunca deixava ver o mapa inteiro de uma vez se a proporção da janela não batesse com a do mundo (quase nunca bate, mapa é quadrado); bug reportado jogando.
- **`render/renderer.js`** — orquestra o desenho por frame: limpa canvas, chama `tileRenderer`, `villageRenderer`, `decorationRenderer`, `agentRenderer`, `debugRenderer` (se ativo), nessa ordem — decoração fica no chão, agentes desenham por cima. Só lê `world` e `camera`, nunca muta estado de jogo.
- **`render/tileRenderer.js`**, **`villageRenderer.js`**, **`decorationRenderer.js`**, **`agentRenderer.js`**, **`debugRenderer.js`** — cada um desenha sua camada, com culling pelo viewport da câmera. `decorationRenderer.js` desenha `world.decorations` (`world/decorations.js`, `{ type, x, y }`, tipos `tree`/`plant`/`house`) — árvore e planta com arte real (`assets/Assets-testes-para-o-claude-testar/`): variante de espécie (`ArvoreComum`/`Pinheiro`/`Palmeira` pra árvore, `Arbusto`/`ArbustoComida` pra planta) escolhida por um hash determinístico da posição, não guardada nos dados nem sorteada por rng — mesma decoração sempre cai na mesma variante entre frames. Casa continua no placeholder geométrico (retângulo com telhado) — a leva de arte não trouxe sprite de casa. Placeholder de árvore/planta (triângulo/círculo, o antigo geométrico) vira só o fallback enquanto os 5 sprites carregam. `agentRenderer.js` (arte de `assets/Assets-testes-para-o-claude-testar/`, ver DESIGN.md §8) escolhe a pose por AÇÃO corrente, não por facção/clã: fora de combate todo agente é "Camponês" — pose dedicada (parada/cortando árvore/minerando/construindo/levando tronco) quando a ação corrente tem uma óbvia, senão cai no ciclo padrão parado/andando (alternando por tempo, só enquanto o agente se move de verdade — detectado comparando posição entre frames, não pela ação); durante `fight`, vira o guerreiro sorteado no nascimento (`agent.warriorType` — orc/elfo/cavaleiro). Fallback pro círculo antigo enquanto os 9 sprites carregam; recorte do conteúdo real de cada um pelo canal alpha, mesmo padrão de antes. Substituiu de vez as 4 variantes de pele/gênero (`assets/sprites/`, `WMan`/`WGirl`/`BMan`/`BGirl`) — decisão do usuário, perde aquela diversidade em troca de refletir a ação. Também desenha o anel de seleção do agente escolhido pelo jogador. `villageRenderer.js:drawVillages` desenha o mesmo tipo de anel de seleção (branco) ao redor do marcador da vila escolhida (`uiState.selectedVillageId`), além de um ícone de papel (🌾 agrícola / ⚔️ guerreira, por `village.specialization`), o estoque dos dois recursos (🌾 comida, 🪵 madeira) e um indicador de colapso interno (💥, `village.inChaos`) no label.

- **`agent/agent.js`** — dados e factory do agente (posição, id; needs/traits/perception/memory se anexam aqui nas fatias 2-3). `warriorType` (`'orc'` | `'elfo'` | `'cavaleiro'`, `utils/constants.js:WARRIOR_TYPES`) é sorteado uma vez na criação (fundadores em `main.js:spawnVillage`, filhos em `lifecycle.js:tryReproduce` — não herdado, sorteio independente em cada nascimento) e só usado por `render/agentRenderer.js` pra escolher o sprite de combate durante `fight`; puramente cosmético, não afeta gameplay. Substituiu `skinTone`/`gender` (removidos) quando a arte nova passou a ser usada por ação em vez de variante de pele/gênero — ver `agentRenderer.js` abaixo.
- **`agent/needs.js`** — decaimento de necessidades por tempo e aplicação de efeitos (comer reduz fome etc.).
- **`agent/perception.js`** — varre o raio de visão (tiles direto no grid; agentes via `world/spatialIndex.js:queryNearby`, que devolve um superconjunto por bounding box — ainda filtra por distância real depois); produz o que o agente vê *agora* — tiles (incluindo `resource`, quando o tile é montanha) e também outros agentes vivos por perto (`agent.perception.agents`, usado por `combat/combat.js`).
- **`agent/memory.js`** — locais/relações conhecidos, com confiança que decai. `perception` alimenta `memory`; `decision` só considera o que está em `memory` ou na percepção atual — nunca o estado real do `world` que o agente não viu. Essa é a fronteira mais importante da arquitetura: **decision.js nunca lê `world` diretamente para saber "o que existe", só para executar uma ação já escolhida sobre um alvo já conhecido.**
- **`agent/decision.js`** — o utility AI: gera candidatas a partir de `needs` + `perception`/`memory` + `village.demand` (via `village/stock.js`), pontua, escolhe, aplica o limiar de interrupção. Guarda o snapshot de scores em `agent.lastScores` a cada reconsideração, consumido só por `ui/inspector.js` (fatia 11).
- **`agent/movement.js`** — `moveToward(agent, world, dt, targetWorldPos)` compartilhado por toda ação que anda até um alvo: calcula o caminho uma vez (`world/pathfinding.js`) e segue os waypoints, devolvendo `'moving' | 'arrived' | 'unreachable'`. Nenhuma ação implementa movimento por conta própria.
- **`agent/actions/*`** — cada ação é um módulo com `score(agent, world)` e `step(agent, world, dt)`; `actionTypes.js` é o registro que `decision.js` consulta. `eat.js` marcha até o centro da vila (mesmo padrão de `deliver.js`/`build.js`) e consome `village.stock.food` (`EAT_FOOD_PER_SEC`/`EAT_RESTORE_PER_FOOD`, `utils/constants.js`) — sem estoque, `score` retorna 0 (nenhuma candidata viável, mesmo padrão de `gather.js`), então o agente passa fome de verdade se a vila não produz nem recebe comida; antes (fatia 2) comia direto de qualquer tile de grama por perto, sem relação com o estoque — ver DESIGN.md §6. `gather.js` pontua pela demanda de comida da vila (não pela necessidade do agente) e enche `agent.carrying`, mas só se `village.specialization === 'food'` — 0 caso contrário. `gatherWood.js` é o espelho pra madeira (tiles de floresta em vez de grama), só pontua se `village.specialization === 'wood'`. `mine.js` é o espelho pra minério (`MINING_RESOURCES`: stone/coal/iron/gold, tiles de montanha) — mas **sem** gate de especialização (universal, qualquer vila minera qualquer um dos quatro); um módulo só em vez de 4 quase-duplicados, escolhe o de maior demanda entre os que o agente já viu um depósito. Como montanha não é andável (`world/tile.js:isWalkable`), o alvo de movimento é o tile andável mais próximo adjacente ao depósito (`world/world.js:findWalkableNear`), não o próprio tile de montanha — sem isso o pathfinding nunca alcançaria o destino (bug real encontrado e corrigido: agentes tentavam minerar e caíam em "inalcançável" toda vez). Os três marcam `agent.carryingType` ao encher a carga; `deliver.js` é genérico — só vira candidata quando `agent.carrying > 0`, e descarrega em `village/stock.js` no recurso indicado por `agent.carryingType`, qualquer um dos 6. `build.js` (fatia de evolução) consome madeira+pedra do estoque comunitário no centro da vila (reconfere o estoque na chegada, pra não gastar duas vezes se outro agente já começou primeiro) e, ao completar `BUILD_WORK_SECONDS` de trabalho contínuo (`agent.buildProgress`), adiciona uma casa a `village.buildings` — pontua pela pressão populacional (`população / village/village.js:getPopulationCap`), não pela necessidade do agente. `fight.js`/`flee.js` usam `combat/combat.js:findNearestEnemy` — crianças e agentes com vida abaixo do limiar nunca lutam (score 0), só fogem (score alto); o resto prioriza lutar, mas foge se a vida cair demais em combate — reavaliado a cada reconsideração, não uma decisão travada. `raid.js` dá efeito prático à guerra dinâmica (`DESIGN.md` §7): quando `village.raidTargetVillageId` está setado (por `clan/clanDecision.js`), agentes elegíveis (mesmo gate de `fight.js` — sem crianças, sem vida baixa) marcham até o centro da vila inimiga e saqueiam o recurso com mais estoque de lá, direto em `village.stock` (`village/stock.js:addStock`, negativo); ao encher a carga, vira candidata de `deliver.js` normalmente pro transporte de volta — nenhuma lógica de combate própria, `fight.js`/`flee.js` (score mais alto) assumem sozinhos se um inimigo for percebido no caminho ou no destino. Score fixo (`RAID_SCORE`) entre `FIGHT_SCORE`/`FLEE_SCORE` (combate reativo sempre pode interromper) e o teto de `gather.js`/`mine.js`/`build.js` (guerra puxa gente da economia enquanto durar).

- **`village/village.js`** — dados/factory da vila (estoque, população, território); `village.clanId` é atribuído por `clan/clan.js:addVillage`. `stock.food` nasce em `STARTING_FOOD_STOCK` (não zero, `utils/constants.js`) pra toda vila, inclusive guerreira — bootstrap seguro pra `agent/actions/eat.js` (fome ligada ao estoque): sem isso, os fundadores de qualquer vila que não produz comida morreriam de fome antes de qualquer comércio se estabelecer. `village.specialization` (`'food'` | `'wood'`) é passado na criação (`main.js`, balanceado entre todas as `VILLAGE_COUNT` vilas) — toda vila tem `stock`/`capacity`/`demand` de food/wood, especializada ou não, só a produção (via `gather.js`/`gatherWood.js`) é que é exclusiva. Minério (`MINING_RESOURCES`: stone/coal/iron/gold) também entra em `stock`/`capacity`/`demand` de toda vila, mas é universal — nenhuma vila é "especializada" nele (`agent/actions/mine.js` não tem gate de especialização) — e fica fora de `distress` (só `{ food, wood }`, ver `utils/constants.js:CRITICAL_RESOURCES`), então nunca alimenta guerra/colapso. `village.inChaos` — ver `stock.js` abaixo. `village.raidTargetVillageId` — vila alvo do saque institucional corrente (`null` = nenhum), setado/limpo por `clan/clanDecision.js` conforme a guerra escala/esfria, lido por `agent/actions/raid.js`; singular mesmo com N clãs no mundo (simplificação deliberada, ver comentário em `clanDecision.js`). `village.buildings` — populado por `agent/actions/build.js`; `getPopulationCap(village)` (nova função) deriva o teto de população efetivo a partir dele, consumida por `build.js` (pontuação) e `lifecycle.js` (gate de reprodução) — não duplica a fórmula.
- **`village/stock.js`** — estoque comunitário e cálculo de demanda, genérico por chave de recurso (`Object.keys(village.capacity)`, hoje 6: food/wood/stone/coal/iron/gold); é o valor que `gather.js`/`gatherWood.js`/`mine.js` leem para enviesar o score, igual para todos os moradores, e que `trade.js` lê pra achar sobra/déficit. `updateDistress(village, dt)` conta segundos consecutivos de demanda em déficit sustentado — só pra `CRITICAL_RESOURCES` (`food`/`wood`; minério nunca entra aqui, é universal e não faz parte do pilar de interdependência) — o sinal de "desespero" que `clan/clanDecision.js` consulta. `updateChaos(village)` deriva `village.inChaos` da distress (limiar bem mais alto, `DISTRESS_CHAOS_THRESHOLD_SECONDS`) — trava reprodução (`lifecycle.js`) e acelera decaimento de needs (`main.js`) enquanto durar.
- **`village/trade.js`** — `updateTrade(world, dt)`, chamado uma vez por tick (não por agente): pra cada par de vilas cujos clãs permitem comércio (`clan/diplomacy.js:canTrade`) e pra cada tipo de recurso, move recurso da vila com demanda baixa (sobra) pra vila com demanda alta (déficit), a uma taxa fixa. Já era genérico por recurso desde a fatia 8, então passou a mover comida e madeira nos dois sentidos sem nenhuma mudança quando a especialização de vila chegou. É comércio no nível da vila, não do agente — as vilas ficam bem além do raio de percepção/memória de qualquer morador, então a rota é "conhecimento institucional" da vila, não uma decisão de utilidade individual. É o que viabiliza o caso de design original: vila guerreira sem produção própria de comida sobrevivendo de uma vila agrícola aliada (que por sua vez importa a madeira que não produz).

- **`clan/clan.js`** — agrupa vilas (`addVillage` seta `village.clanId`); `stanceByClan` guarda a postura (`war`/`tense`/`neutral`/`allied`) com cada outro clã, simétrica via `setStance`/`getStance`. `clan.decisionTimer` — jitter pra `clanDecision.js` não reconsiderar todos os clãs no mesmo tick (mesmo padrão de `agent.decisionTimer`).
- **`clan/diplomacy.js`** — `proposeTreaty`/`signTreaty` criam e assinam tratados (aliança, não-agressão, comércio, defesa); assinar aplica a postura correspondente via `clan.js:setStance`. `hasTreaty(clanA, clanB, type)` checa um tipo específico vigente; `breakTreaty(treaty)` marca `status: 'broken'` (mantém o histórico, mesmo padrão de `agent.alive` em vez de apagar). `isHostileTerritory(world, agent, tx, ty)` é o efeito da fatia 7: `wander.js`, `gather.js` e `gatherWood.js` a consultam pra nunca escolher como alvo um tile dentro do território de um clã em guerra/tensão — mesmo com a necessidade crítica. (`eat.js` não consulta mais desde que passou a mirar o centro da própria vila em vez de um tile de grama qualquer — ver `agent/actions/*` abaixo.) `canTrade(clanA, clanB)` é o efeito da fatia 8, consumido por `village/trade.js`: mesma clã sempre comercia; clãs diferentes precisam ser aliados ou ter um tratado `trade` assinado — postura neutra sozinha não basta, é assim que o tratado passa a importar de verdade. `defense_pact` ganha consequência na fatia 9 (combate), que vai ler os tratados vigentes daqui.
- **`clan/clanDecision.js`** (diplomacia dinâmica, pós-fatia 11) — `updateClanDecision(clan, world, dt)`, chamado uma vez por clã por tick (não por agente, mesmo padrão de `village/trade.js`): reconsidera a relação com cada outro clã num intervalo de 20-30s simulados. Consulta `village.distress` (`stock.js`) pra escalar pra guerra (desespero sustentado + o outro clã tem o recurso — também seta `village.raidTargetVillageId`, ver `agent/actions/raid.js`), buscar paz (desespero já passou — também limpa o alvo de saque se era esse par), propor comércio (precisa de um recurso que o outro tem de sobra) ou trocar de parceiro comercial (existe um 3º clã mais desesperado pelo recurso que essa vila exporta). Propor comércio funciona com clã `neutral` **ou `tense`** — só `war`/`allied` pulam essa etapa (`allied` já comercia livremente via `canTrade`, sem precisar de tratado; `war` tem `raid.js` como via de recurso, não comércio). Achado ao vivo (jogando com fome ligada ao estoque, ver §6/§8 do DESIGN.md): antes, `tense` também pulava a proposta — uma vila podia nascer `tense` justo com o único outro clã que produzia o recurso que ela não produz (e `allied`/`neutral` com o resto, que não ajudava), ficando sem nenhum caminho institucional de alívio; corrigido permitindo a proposta também sob `tense`, já que `canTrade` nunca dependeu da postura ser branda. Assume 1 vila por clã — verdade em todo o world-gen atual (`main.js`).

- **`combat/combat.js`** — `isEnemy(world, agentA, agentB)` (postura de clã = `'war'`); `findNearestEnemy(agent, world)` busca em `agent.perception.agents`, não no mundo inteiro — um agente só reage a inimigo que já percebeu; `resolveEngagement(agent, enemy, dt)` aplica dano mútuo por tick de combate corpo a corpo. `fight.js`/`flee.js` são os únicos consumidores.

- **`lifecycle/lifecycle.js`** — `ageAgent`/`checkDeath` por agente (idade, saúde drenada por fome crítica ou combate, morte por saúde zerada ou idade máxima); `checkDeath` só regenera vida quando o agente não tem inimigo por perto (`combat/combat.js:findNearestEnemy`) — senão a regeneração desfaria o dano de combate a cada tick, já que `checkDeath` roda antes de `fight.js`. `updateVillageReproduction` por vila (cooldown + elegibilidade + `village.demand.food` decidem se tenta reproduzir; `village.inChaos` bloqueia completamente, ver `village/stock.js`; teto de população é `village/village.js:getPopulationCap`, não um número fixo — cresce por casa construída); `pruneDead` remove agentes mortos (fome, combate ou idade) de `world.agents` e de `village.population` — a vila em si nunca é removida, mesmo com população zerada.

- **`simulation/lod.js`** — `classifyAgents(world, camera, viewW, viewH)` separa agentes em `active` (posição cai dentro da viewport atual, com margem — checado via `camera.worldToScreen`, então escala com o zoom) e `background`; `main.js` roda o pipeline completo (percepção/memória/decisão/pathfinding) só para `active`. Antes usava um raio fixo em px de mundo a partir do centro da câmera (`LOD_ACTIVE_RADIUS`), que não escalava com zoom — em zoom baixo (mapa mais visível), a maioria dos agentes visíveis caía fora do raio fixo e congelava mesmo estando na tela; bug reportado jogando, corrigido trocando pra checagem de tela. `background` passa por `stepBackgroundAgent`: sem percepção nem decisão, as necessidades não decaem — são empurradas de volta pra perto do topo (a vila "se vira sozinha" fora de vista), e posição fica parada. Idade e morte por idade continuam rodando pra ambos, direto em `main.js` — população longe da câmera não trava no tempo, só para de ser simulada em detalhe. Classificação recalculada do zero a cada tick (sem estado de "quem tava em foco antes"), então não tem transição a tratar.

- **`input/inputHandler.js`** — pan/zoom de câmera (arrastar/scroll), pausar/mudar velocidade, `[D]` toggle de debug. Clique (sem arrastar, distingue por distância percorrida desde o mousedown) tenta selecionar o agente mais próximo do cursor primeiro (`uiState.selectedAgentId`); sem agente por perto, clicar dentro do círculo de território de uma vila seleciona a vila (`uiState.selectedVillageId`) — os dois são mutuamente exclusivos (selecionar um limpa o outro); clicar fora de qualquer agente/vila deseleciona os dois.
- **`ui/hud.js`** — controles de tempo, renderizado em `#hud` (DOM, fora do canvas). O painel de status mostra o agente selecionado (`uiState.selectedAgentId`, lido em `main.js`) em três estados: nada selecionado, vivo, ou morreu (evita o problema de antes: com painel sempre em `world.agents[0]`, a identidade mudava sozinha quando esse agente morria e era removido do array). Não reage a `selectedVillageId` — é um painel só de agente.
- **`ui/inspector.js`** (fatia 11) — painel mais completo (`#inspector`, topo direito). Com um agente vivo selecionado: score de cada ação candidata na última reconsideração (`agent.lastScores`, escrito por `agent/decision.js:reconsider` — snapshot só pra UI, não influencia a decisão), destacando a ação atual; mais estoque/demanda/população (com contagem de casas e teto efetivo via `village/village.js:getPopulationCap`)/especialização (`agrícola`/`guerreira`, texto no título da seção — junto com "EM COLAPSO INTERNO" se `village.inChaos`) da vila dele e postura/tratados do clã dele. Cada linha de estoque também mostra `distress` (segundos de desespero) quando > 0. A lista de estoque é genérica por `Object.keys(village.capacity)`, então mostra qualquer recurso (comida, madeira) sem mudança quando um novo é adicionado. Com uma vila selecionada diretamente (sem agente — `uiState.selectedVillageId`): mesmas seções de vila/clã, sem a seção de agente. Painel vazio quando nada está selecionado.

- **`utils/rng.js`**, **`mathUtils.js`**, **`constants.js`** — sem estado de jogo; helpers puros usados por qualquer módulo acima.

## Fluxo de dados por tick

```
InputHandler ──> Camera / TimeState
                                │
GameLoop.tick()                │
  ├─> TimeState.advance()      │
  ├─> village/stock: computeDemand ─> updateDistress ─> updateChaos, por vila
  ├─> clan/clanDecision.update, por clã (guerra/paz/comércio, ver DESIGN.md §7)
  ├─> village/trade.updateTrade (lê distress/demand indiretamente via canTrade)
  ├─> Simulation.update(world, dt)   [para cada agente ativo, na ordem:]
  │     Perception.scan ─> Memory.update ─> Needs.update (2x mais rápido se village.inChaos) ─> Decision.choose ─> Action.step
  │     (village/stock, clan/diplomacy e combat são lidos/escritos a partir daqui
  │      quando a ação escolhida os envolve)
  │     Lifecycle.check (morte/envelhecimento/reprodução — travada se village.inChaos)
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

Status: fatias 1-11 implementadas (ver `DESIGN.md`, seção 5), mais especialização de vila, diplomacia dinâmica entre clãs e evolução da civilização — minério + construção (`DESIGN.md` §6-8) — além do roteiro original. Ver `STATUS.md` pra próximos passos concretos.

Nota sobre a fatia 9: vilas destinadas à guerra nascem mais perto (`WAR_VILLAGE_MIN/MAX_DIST` em `utils/constants.js`) — sem isso, a distância padrão entre vilas (70-100 tiles) é maior que qualquer coisa que um agente perceba ou percorra vagando, e elas nunca se encontrariam pra lutar.
