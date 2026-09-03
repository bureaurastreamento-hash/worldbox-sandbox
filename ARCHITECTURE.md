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
    pasta canônica de arte em uso — todo `SPRITE_DIR`/`_FILES` em render/*.js aponta pra cá.
    Estado atual (quais arquivos existem de fato) muda com frequência — ver STATUS.md, não
    liste aqui; nunca ficar vazio quebra o jogo, isSpriteReady() por-sprite faz fallback
    geométrico individualmente.
  Assets-testes-para-o-claude-testar/
    matéria-prima (packs baixados inteiros, ignorada no git via .gitignore) — só o que é
    selecionado e recortado entra em assets/sprites/. Ver STATUS.md pro processo de seleção
    e o que já foi vasculhado.
src/
  main.js

dev-server.py   (servidor local com Cache-Control: no-store — usar em vez de `python -m
                 http.server`, ver seção "Como rodar")

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
    terrain/            (arte PROCEDURAL de terreno e decoração — não vem de pack)
      noise.js
      palette.js
      tileTextures.js
      edgeMasks.js
      oreTextures.js
      decorTextures.js
      terrainAtlas.js
    sprites/            (SpriteManager — em uso por predatorRenderer.js e agentRenderer.js)
      spriteSheet.js
      animationCatalog.js
      sheetFormats.js
      contentBounds.js
      spriteManager.js
      animator.js
      packManifest.js   (dado: lista de arquivos de assets/Pers-Sprites/)
      spriteLab.js      (só da página de teste sprite-lab.html)
    camera.js
    renderer.js
    tileRenderer.js
    villageRenderer.js
    decorationRenderer.js
    agentRenderer.js
    predatorRenderer.js
    particles.js
    lighting.js
    debugRenderer.js

  agent/
    agent.js
    needs.js
    perception.js
    memory.js
    decision.js
    movement.js
    separation.js
    actions/
      actionTypes.js
      wander.js
      eat.js
      sleep.js
      gather.js
      gatherWood.js
      fish.js
      mine.js
      build.js
      deliver.js
      fight.js
      flee.js
      raid.js
      fleePredator.js
      fightPredator.js

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
    predatorCombat.js

  predator/
    predator.js
    predatorAI.js

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
- **`core/gameLoop.js`** — laço `requestAnimationFrame`; a cada frame avança `time.js` em timestep fixo, chama `update(simDt)` e depois `render(realDt)` — dois valores diferentes de propósito: `update` recebe o dt **simulado** (pausa/velocidade já aplicados por `timeState`), `render` recebe o dt **real** (tempo de parede, sem pausa/velocidade), porque efeitos de apresentação (easing de câmera, tremor, partículas — todos em `render/`) devem continuar suaves mesmo com o jogo pausado ou em 4x, não travar/acelerar junto com a simulação. É o único lugar que decide a ordem update→render. `update`+`render` rodam dentro de um `try/catch` que loga e segue pro próximo frame — sem isso, uma exceção não tratada em qualquer canto (um agente, uma vila, um clã) travava o jogo inteiro pra sempre sem nenhum aviso, já que o próximo `requestAnimationFrame` nem chegava a ser agendado.

- **`world/world.js`** — o "banco de dados" central: tiles, agentes, vilas, clãs, tick atual. Outros módulos leem e escrevem aqui; a lógica de *como* o estado muda mora nos módulos donos de cada domínio, não em `world.js`.
- **`world/terrain.js`** — geração procedural do grid a partir de uma seed (usa `utils/rng.js`). Só gera dados. Tiles de montanha ganham `resource` (`resourceForMountain`, cumulativo sobre `MOUNTAIN_RESOURCE_WEIGHTS`) — função pura de coordenada+seed, mesmo padrão determinístico do resto do arquivo (não consome uma sequência de rng por tile).
- **`world/tile.js`** — tipos de tile, factory e `isWalkable` (água e montanha bloqueiam; é a única fonte de verdade sobre o que é andável — `pathfinding.js`, `perception.js` e a colocação inicial de vila/agente usam essa mesma função).
- **`world/pathfinding.js`** — A* no grid de tiles; `agent/movement.js` é o único consumidor. Sem isso, o deslocamento em linha reta cortava direto por água/montanha sempre que o alvo estava do outro lado de um obstáculo.
- **`world/spatialIndex.js`** — `buildSpatialIndex(agents)` (reconstruído em `main.js` a cada tick) + `queryNearby(index, pos, radius)`, buckets de grid do tamanho do raio de percepção. Substitui a varredura O(n) de `agent/perception.js` sobre `world.agents` — sem isso, achar "quem tá por perto" vira O(n²) no total e não escala (medido: 6.6x mais rápido que força bruta com 1500 agentes).
- **`world/decorations.js`** — `generateDecorations(world)`, chamado uma vez em `main.js` depois de terreno e vilas existirem (não em `createWorld`, que roda antes das vilas). Árvore/planta por chance em tile de floresta/grama, pulando o raio de "clareira" de qualquer vila; casas espalhadas dentro dessa clareira. Puramente visual — não afeta `isWalkable`, pathfinding, percepção nem nenhum outro sistema. Usa uma rng própria (`${seed}-decorations`) pra não desviar a sequência de `world.rng` (gameplay).

- **`render/terrain/`** — arte de terreno e decoração **gerada por código**, não vinda de pack. A busca por substituição foi feita e fechou negativa: o único tileset disponível (Kenney roguelike, 16x16) é chapado e saturado, exatamente o "muito cartoon" que se queria eliminar — adotá-lo teria trocado o problema por ele mesmo. Gerar dá controle total sobre paleta e direção de luz, custa zero bytes de repositório, e acabou saindo mais rápido que a versão anterior (ver custo abaixo).
  - **Três coisas fazem o mapa parar de parecer tabuleiro**, em ordem de impacto: (1) `edgeMasks.js` — transição irregular entre tipos, que dissolve a grade de quadrados perfeitos; enquanto cada tile é um quadrado de uma cor só, o mapa lê como tabuleiro por mais bonita que seja a textura dentro dele; (2) variação por posição (6 variantes por tipo, escolhidas por hash), que mata a repetição de papel de parede; (3) rampa de 5 tons com luz vinda sempre de cima-esquerda, porque o que separa "superfície" de "cor chapada" é variação de VALOR, não quantidade de detalhe.
  - **`noise.js`** — hash e ruído de valor determinísticos. Ruído de valor interpolado, não `random()` por pixel: a diferença entre textura e chuvisco de TV.
  - **`palette.js`** — as rampas por tipo e `TERRAIN_PRIORITY` (quem invade quem nas transições). É dado: mexer em cor é mexer só aqui.
  - **`tileTextures.js`** — os pintores por terreno. Autoria em **16x16 desenhado a 32**, deliberado: os personagens têm ~20px de arte a ART_SCALE 2.1, e autorar o chão a 32px nativo deixaria os pixels do terreno com metade do tamanho dos dos personagens — a mistura de densidades é o que faz um jogo parecer colado de fontes diferentes. A água usa ruído **alongado na horizontal e de amplitude curta**: com ruído isotrópico e a rampa inteira, a quantização criava manchas angulares que liam como detrito boiando.
  - **`oreTextures.js`** — minério como pedra incrustada na rocha, fora do centro. Antes era um ícone centralizado no tile: um objeto flutuando no meio do quadrado, que somado à cor lisa era metade do motivo de a montanha parecer tabuleiro.
  - **`decorTextures.js`** — árvore/planta/casa/baú. O tamanho na tela sai da altura da própria textura vezes `DECOR_ART_SCALE`, não de uma tabela paralela por tipo — mexer no tamanho de uma árvore é mexer na arte dela.
  - **`terrainAtlas.js`** — compõe (fundo + tipo mascarado + minério) com cache por combinação. O produto cartesiano completo seria grande, mas só as combinações presentes no mapa chegam a ser construídas.
  - **Custo**: `drawTiles` mede **4.65ms** em zoom 1 e **80ms** em zoom 0.25, contra os **6.8ms / 86-167ms** que o `STATUS.md` registrava pro terreno de cor lisa. Ficou mais barato porque `tileRenderer.js` resolve a arte de cada tile **uma vez e guarda no próprio tile** (`_art`): o terreno é estático, então refazer duas varreduras de vizinhos e montar uma string de chave por tile por frame era desperdício puro — com ~40 mil tiles visíveis em zoom baixo, dezenas de milhares de alocações por frame num laço que já era o gargalo do jogo.

- **`render/sprites/`** (SpriteManager unificado — **em uso por `predatorRenderer.js`**; `agentRenderer.js` também migrou. A página `sprite-lab.html` na raiz é o banco de provas). Reconhece dois formatos de spritesheet e os expõe por trás de uma interface só, pra quem consome não precisar saber de qual veio:
  - **`spriteSheet.js`** — carrega `Image` com cache por caminho e `encodeURI` (os caminhos do pack têm espaço e acento; sem isso a requisição sai malformada e o `onload` nunca dispara). `loadSheets` usa `allSettled`: uma folha faltando não derruba o carregamento das outras — mesma lição do `isSpriteReady()` por-sprite.
  - **`animationCatalog.js`** — palavra-chave no nome do arquivo → animação canônica (`walk`/`idle`/`attack`/`hurt`/`death`), com quadros/loop/fps. **A contagem de quadros declarada não é a fonte da verdade**: `resolveFrameCount` deriva a real da imagem (`largura/altura`, já que o quadro é quadrado) e usa a declarada só pra avisar no console quando divergem. Motivo medido: a tabela diz 8 quadros pra `attack`, mas Demon tem 7, Orc e Soldier têm 6, e `Soldier_Attack03` tem 9 — fixar 8 faria três dos quatro lerem além do fim da tira. `parseSheetName` lê da direita pra esquerda porque a variante é opcional no pack (`Blood Monster_A_Walk` tem, `Orc_Walk` não).
  - **`sheetFormats.js`** — as duas estratégias de recorte, cada uma respondendo só `detect`/`describe`/`frameRect`. **Formato 1** (tira horizontal, 1 ação por arquivo): `frameWidth = largura/quadros`, `srcY` sempre 0. **Formato 2** (grade RPG, blocos de 3 col × 4 lin): suporta `12x8` (8 personagens) e `3x4` (1 personagem) com a mesma fórmula, já que o bloco por personagem é idêntico. A detecção **não pode ser por divisibilidade** — 96x128 divide certo pelos dois (12x8 daria quadro 8x16; 3x4 daria 32x32); o desempate é escolher a hipótese cujo quadro fica mais perto de 1:1, que acerta os quatro arquivos reais. Detectar a tira **pelo token de ação no nome, não pela pasta**: a especificação supunha uma pasta por formato, mas no pack os dois convivem dentro de `Pers-Sprites/`.
  - **`contentBounds.js`** — recorte por canal alfa, mas a caixa é a **união de todos os quadros do ator**, não uma por quadro: recortar quadro a quadro faria o sprite pular de posição e mudar de escala a cada troca, porque um golpe de espada é mais largo que a pose parada. Calculado uma vez no carregamento, nunca no laço de render. Substituiu as cópias de `computeContentBounds` que `predatorRenderer.js` e `agentRenderer.js` tinham — a lógica agora existe num lugar só.
  - **`spriteManager.js`** — agrupa folhas em "atores" (tira: um ator por personagem, um clipe por arquivo; grade: um ator por personagem dentro da folha) e devolve retângulo de origem por clipe/quadro/direção.
  - **`animator.js`** — a FSM: estado da entidade (`idle`/`walking`/`attacking`/`hurt`/`dead`) → clipe, com **cascata de fallback** porque nem todo ator tem todo clipe (a grade RPG só tem idle/walk, então "atacando" cai em walk e depois em idle em vez de sumir da tela). `dead` segura o último quadro; `attacking`/`hurt` voltam sozinhos ao terminar. `setMovement(dx,dy)` deriva a direção pelo eixo dominante — sem isso um agente na diagonal trocaria de sprite a cada quadro. Só LÊ estado, nunca escreve: mesma fronteira de `render/particles.js`.

- **`render/camera.js`** — posição/zoom da câmera e transforms mundo↔tela. Consumido por todo o `render/` e por `input/inputHandler.js` (picking sob o cursor). Zoom mínimo por viewport é "contain" (`Math.min` das duas proporções largura/altura mapa×tela) — encolhe até a maior dimensão do mapa caber, com `clampToBounds` centralizando o espaço sobrando na outra dimensão. Era "cover" (`Math.max`) antes — nunca deixava vazio nas bordas, mas também nunca deixava ver o mapa inteiro de uma vez se a proporção da janela não batesse com a do mundo (quase nunca bate, mapa é quadrado); bug reportado jogando. `panToTarget(worldX, worldY)` + `tick(realDtSeconds, viewW, viewH)` fazem um easing suave até um alvo (`main.js` dispara ao trocar `uiState.selectedAgentId`/`selectedVillageId` — antes não existia recentro automático nenhum); `camera.pan` (arrastar na mão) cancela o easing em andamento. `triggerShake(intensity, durationSec)` soma um offset aleatório decaindo linearmente em `worldToScreen`, consumido só em morte por combate/predador (`lifecycle.js`, `combat/predatorCombat.js`), não a cada troca de dano. Easing e shake usam tempo **real** (`realDtSeconds`, não o simulado de `timeState`) — continuam suaves com o jogo pausado ou em 4x, são feedback de UI, não simulação.
- **`render/agentRenderer.js`** — desenha os agentes via SpriteManager, com **duas famílias de arte em dois formatos diferentes ao mesmo tempo**, o que é o caso de uso que justificou o gerenciador unificado existir:
  - **Civil** (a maioria): um dos 32 personagens de `Pers-Sprites/Humanos-separados/`, formato **grade RPG 3x4** — caminhada com 4 direções reais (`directionFromVector` escolhe a linha). Qual dos 32 sai por hash determinístico de `agent.id`, então cada morador tem um rosto fixo pra vida toda. Traz de volta a diversidade visual por agente que o DESIGN.md §8 tinha abandonado em troca de poses por ação — troca que deixou de valer, porque as poses de trabalho não existem em nenhuma arte disponível hoje.
  - **Guerreiro designado**: as tiras completas de `Soldado1/` e `Monstro3/`, formato **tira horizontal**, com idle/walk/attack/hurt/death. Sprite de perfil, então a direção sai de espelhamento no eixo X, não de linha de grade. O elfo cai no Soldier (guerreiro genérico) — segue sem arte própria, mas pelo menos deixou de cair no círculo geométrico, que era o que acontecia desde que a arte antiga foi apagada.
  - `viewFor` reconstrói a view quando o **ator muda no meio da vida** — `clanDecision.js` designa e desmobiliza guerreiros em tempo de execução, então o mesmo agente troca de família de arte.
  - `sweepViews` limpa periodicamente as entradas de agentes já removidos: ao contrário de predador, agente **é** podado de `world.agents` (`lifecycle.js:pruneDead`), então o Map cresceria pra sempre numa sessão longa. A versão anterior tinha esse mesmo vazamento no `lastPositions`, nunca notado por ser pequeno.
  - **Civil morto deita e desbota** (rotação de 90°, alfa 0.65): a grade RPG não tem clipe de morte, e a cascata do animator deixaria o cadáver de pé durante o `DEATH_LINGER_SECONDS`. Guerreiro tem `death` de verdade e toca normalmente.
  - Custo medido: 0.195ms/frame com 32 agentes, 1.56ms com 200, 4.87ms com 600 — desprezível ao lado dos 86-167ms de `drawTiles` que o `STATUS.md` registra como gargalo real.

- **`render/predatorRenderer.js`** — desenha os predadores com animação de verdade (`render/sprites/`), lendo as tiras completas do pack (`assets/Pers-Sprites/Monstro1` e `Monstro2`) em vez de um quadro estático por estado. Três decisões que não são óbvias:
  - **Usa dt SIMULADO, não real** — o oposto de `particles.js`/`camera.js`, que usam tempo real de propósito. Uma animação de personagem representa deslocamento no mundo (a perna se mexendo é chão sendo percorrido), então precisa congelar no pause e acelerar em 4x junto com o movimento. Derivado de `world.elapsedSeconds` dentro do próprio módulo, sem mudar a assinatura de `render()`.
  - **Escala única de arte** (`ART_SCALE`) em vez de altura fixa por espécie: como as duas vêm do mesmo pack na mesma escala, o demônio em pé (20px de arte) sair maior que o monstro rasteiro (15px) é consequência automática. Foi o que aposentou o `renderScale` por espécie que existia em `constants.js`.
  - **"Andou?" olha os dois eixos** (`hypot(dx, dy)`), mas só o X decide o espelhamento. A primeira versão usava só `dx`, e um predador subindo ou descendo em linha reta aparecia parado — bug encontrado medindo o índice de quadro ao vivo, invisível a olho.
  - Predador morto continua desenhado, tocando `death` e segurando o último quadro: `world.predators` nunca é podado (só marca `alive: false`), então isso não custou nenhuma mudança de simulação. Antes o corpo sumia no mesmo tick da morte, por falta de arte — não por decisão de design.

- **`render/renderer.js`** — orquestra o desenho por frame: limpa canvas, chama `tileRenderer`, `villageRenderer`, `decorationRenderer`, `predatorRenderer`, `agentRenderer`, `particles` (update+draw), `debugRenderer` (se ativo), `lighting` (overlay por cima de tudo), nessa ordem — decoração fica no chão, predadores e agentes desenham por cima, iluminação é a última camada. Recebe `realDt` (de `gameLoop.js`) só pra repassar pra `particles.updateParticles` — o resto só lê `world`/`camera`, nunca muta estado de jogo.
- **`render/particles.js`** — pool leve em memória de módulo (não em `world`: puramente visual, não precisa ser determinístico nem serializável), teto de 150 partículas vivas. `spawnDust`/`spawnSpark`/`spawnChip` chamadas com chance baixa por frame (não todo frame) por `agentRenderer.js`, que já sabe ação/movimento de cada agente — nenhuma ação de `agent/actions/*` importa isso, a spawnagem é inteiramente do lado do renderer.
- **`render/lighting.js`** — `drawLighting(ctx, world, viewW, viewH)`, overlay de cor semitransparente (um `fillRect` só) por cima de tudo, tom variando com `world.elapsedSeconds % DAY_LENGTH_SECONDS` (240s = um "dia"). Não é ciclo dia/noite de verdade — não afeta percepção, jogabilidade nem nada além do tom da tela.
- **`render/tileRenderer.js`**, **`villageRenderer.js`**, **`decorationRenderer.js`**, **`agentRenderer.js`**, **`debugRenderer.js`** — cada um desenha sua camada, com culling pelo viewport da câmera. `tileRenderer.js` preenche cada tile com a cor de `TILE_COLORS` e, por cima, sobrepõe arte real quando aplicável: tile de montanha com `resource` ganha o ícone do minério correspondente (`Pedra1`/`Carvao`/`Ferro`/`Ouro`) centralizado — antes era uma cor cinza lisa, sem nenhuma pista visual de qual dos 4 recursos tinha ali; água ganha um ícone (`Agua1`/`Agua2`/`Agua3`, recortado por alpha como qualquer outro sprite do jogo) que troca de frame devagar (`WATER_FRAME_MS`) pra uma ondulação sutil — a primeira tentativa esticou o sprite pra preencher o tile inteiro achando que era textura full-bleed, criou um grid preto feio nas bordas; os sprites de água têm padding como os outros, corrigido recortando por alpha. `decorationRenderer.js` desenha `world.decorations` (`world/decorations.js`, `{ type, x, y }`, tipos `tree`/`plant`/`house`) — árvore e planta com arte real (`assets/Assets-testes-para-o-claude-testar/`): variante de espécie (`ArvoreComum`/`Pinheiro`/`Palmeira` pra árvore, `Arbusto`/`ArbustoComida` pra planta) escolhida por um hash determinístico da posição, não guardada nos dados nem sorteada por rng — mesma decoração sempre cai na mesma variante entre frames. Casa continua no placeholder geométrico (retângulo com telhado) — a leva de arte não trouxe sprite de casa. Placeholder de árvore/planta (triângulo/círculo, o antigo geométrico) vira só o fallback enquanto os 5 sprites carregam. `agentRenderer.js` (arte de `assets/Assets-testes-para-o-claude-testar/`, ver DESIGN.md §8) escolhe a pose por AÇÃO corrente pra um civil (`agent.role === 'civilian'`, a maioria), não por facção/clã: fora de combate é "Camponês" — pose dedicada (parada/cortando árvore/minerando/construindo/levando tronco/pescando) quando a ação corrente tem uma óbvia, senão cai no ciclo padrão parado/andando (alternando por tempo, só enquanto o agente se move de verdade — detectado comparando posição entre frames, não pela ação); durante `fight`, vira o guerreiro sorteado no nascimento (`agent.warriorType` — orc/elfo/cavaleiro). Um guerreiro designado (`agent.role === 'warrior'`, ver `clan/clanDecision.js` abaixo) mostra o próprio `warriorType` parado/andando sempre nesse papel, não só durante `fight` — poses de trabalho específicas ainda têm prioridade quando aplicável. Agente morto (`!agent.alive`) sempre mostra `ComponesMorto`, independente de papel ou ação, durante o "linger" antes de `lifecycle.js:pruneDead` remover de vez (`DEATH_LINGER_SECONDS`) — sem isso o corpo simplesmente sumia no mesmo tick da morte. Fallback pro círculo antigo enquanto os sprites carregam; recorte do conteúdo real de cada um pelo canal alpha, mesmo padrão de antes. Substituiu de vez as 4 variantes de pele/gênero (`assets/sprites/`, `WMan`/`WGirl`/`BMan`/`BGirl`) — decisão do usuário, perde aquela diversidade em troca de refletir a ação. Também desenha o anel de seleção do agente escolhido pelo jogador. Vários agentes convergindo pro mesmo ponto (ex.: centro da vila) ficariam desenhados exatamente sobrepostos sem isso: cada um recebe um pequeno deslocamento determinístico (hash do próprio `agent.id`) aplicado só na posição de desenho, nunca em `agent.position` — puramente cosmético, mesmo padrão de hash-por-posição que `decorationRenderer.js` usa pra variante de espécie. `villageRenderer.js:drawVillages` desenha o mesmo tipo de anel de seleção (branco) ao redor do marcador da vila escolhida (`uiState.selectedVillageId`), além de um ícone de papel (🌾 agrícola / ⚔️ guerreira, por `village.specialization`), o estoque dos dois recursos (🌾 comida, 🪵 madeira) e um indicador de colapso interno (💥, `village.inChaos`) no label.

- **`agent/agent.js`** — dados e factory do agente (posição, id; needs/traits/perception/memory se anexam aqui nas fatias 2-3). `warriorType` (`'orc'` | `'elfo'` | `'cavaleiro'`, `utils/constants.js:WARRIOR_TYPES`) é sorteado uma vez na criação (fundadores em `main.js:spawnVillage`, filhos em `lifecycle.js:tryReproduce` — não herdado, sorteio independente em cada nascimento) e usado por `render/agentRenderer.js` pra escolher o sprite de combate durante `fight` **e** o sprite parado/andando sempre que `role === 'warrior'` (ver abaixo); puramente cosmético, não afeta gameplay. Substituiu `skinTone`/`gender` (removidos) quando a arte nova passou a ser usada por ação em vez de variante de pele/gênero — ver `agentRenderer.js` abaixo. `role` (`'civilian'` | `'warrior'`, evolução da civilização) fecha uma lacuna do modelo de dados original do DESIGN.md (`role: farmer | warrior | builder`, nunca implementado) — atribuído por `clan/clanDecision.js:updateWarriorRoles`, emergente pela demanda de defesa da vila, não fixo no nascimento. `deathLinger` — segundos desde `alive` virar `false`; `lifecycle.js:pruneDead` só remove de `world.agents` depois de `DEATH_LINGER_SECONDS`, pra dar tempo do sprite de morto (`ComponesMorto`) aparecer antes do agente sumir.
- **`agent/needs.js`** — decaimento de necessidades por tempo e aplicação de efeitos (comer reduz fome etc.).
- **`agent/perception.js`** — varre o raio de visão (tiles direto no grid; agentes via `world/spatialIndex.js:queryNearby`, que devolve um superconjunto por bounding box — ainda filtra por distância real depois); produz o que o agente vê *agora* — tiles (incluindo `resource`, quando o tile é montanha) e também outros agentes vivos por perto (`agent.perception.agents`, usado por `combat/combat.js`).
- **`agent/memory.js`** — locais/relações conhecidos, com confiança que decai. `perception` alimenta `memory`; `decision` só considera o que está em `memory` ou na percepção atual — nunca o estado real do `world` que o agente não viu. Essa é a fronteira mais importante da arquitetura: **decision.js nunca lê `world` diretamente para saber "o que existe", só para executar uma ação já escolhida sobre um alvo já conhecido.**
- **`agent/decision.js`** — o utility AI: gera candidatas a partir de `needs` + `perception`/`memory` + `village.demand` (via `village/stock.js`), pontua, escolhe, aplica o limiar de interrupção. Guarda o snapshot de scores em `agent.lastScores` a cada reconsideração, consumido só por `ui/inspector.js` (fatia 11).
- **`agent/movement.js`** — `moveToward(agent, world, dt, targetWorldPos)` compartilhado por toda ação que anda até um alvo: calcula o caminho uma vez (`world/pathfinding.js`) e segue os waypoints, devolvendo `'moving' | 'arrived' | 'unreachable'`. Nenhuma ação implementa movimento por conta própria. Posição avança continuamente por `AGENT_SPEED * dt` todo frame — nunca salta de tile em tile, já é interpolado por natureza (confirmado ao pedido de "movimento suave" de uma rodada de polimento visual; nenhuma mudança foi necessária).
- **`agent/separation.js`** — `applySeparation(activeAgents, dt)`, chamada uma vez por frame em `main.js` só sobre o conjunto `active` do LOD: empurrão leve de posição de verdade (não só do desenho, ao contrário do offset cosmético de `agentRenderer.js:stackOffset`) quando dois agentes ficam mais perto que `SEPARATION_RADIUS`. O(n²) sobre `active` — aceitável porque o LOD já mantém esse conjunto pequeno; medido num diagnóstico de FPS como custo desprezível (<1ms mesmo com 200 agentes ativos, não é gargalo).
- **`agent/actions/*`** — cada ação é um módulo com `score(agent, world)` e `step(agent, world, dt)`; `actionTypes.js` é o registro que `decision.js` consulta. `eat.js` marcha até o centro da vila (mesmo padrão de `deliver.js`/`build.js`) e consome `village.stock.food` (`EAT_FOOD_PER_SEC`/`EAT_RESTORE_PER_FOOD`, `utils/constants.js`) — sem estoque, `score` retorna 0 (nenhuma candidata viável, mesmo padrão de `gather.js`), então o agente passa fome de verdade se a vila não produz nem recebe comida; antes (fatia 2) comia direto de qualquer tile de grama por perto, sem relação com o estoque — ver DESIGN.md §6. `gather.js` pontua pela demanda de comida da vila (não pela necessidade do agente) e enche `agent.carrying`, mas só se `village.specialization === 'food'` — 0 caso contrário. `gatherWood.js` é o espelho pra madeira (tiles de floresta em vez de grama), só pontua se `village.specialization === 'wood'`. `fish.js` produz comida em tile de água — **sem** gate de especialização (universal, como `mine.js` abaixo, inclusive no padrão de mirar o tile andável adjacente já que água também não é andável); peso mais baixo que `gather.js` (`FISH_SCORE_WEIGHT`), pensado como complemento pra atenuar (não substituir) a dependência de comércio de uma vila madeireira, que não tem nenhuma outra forma de produzir comida própria. `mine.js` é o espelho pra minério (`MINING_RESOURCES`: stone/coal/iron/gold, tiles de montanha) — mas **sem** gate de especialização (universal, qualquer vila minera qualquer um dos quatro); um módulo só em vez de 4 quase-duplicados, escolhe o de maior demanda entre os que o agente já viu um depósito. Como montanha não é andável (`world/tile.js:isWalkable`), o alvo de movimento é o tile andável mais próximo adjacente ao depósito (`world/world.js:findWalkableNear`), não o próprio tile de montanha — sem isso o pathfinding nunca alcançaria o destino (bug real encontrado e corrigido: agentes tentavam minerar e caíam em "inalcançável" toda vez). Os três marcam `agent.carryingType` ao encher a carga; `deliver.js` é genérico — só vira candidata quando `agent.carrying > 0`, e descarrega em `village/stock.js` no recurso indicado por `agent.carryingType`, qualquer um dos 6. `build.js` (fatia de evolução) consome madeira+pedra do estoque comunitário no centro da vila (reconfere o estoque na chegada, pra não gastar duas vezes se outro agente já começou primeiro) e, ao completar `BUILD_WORK_SECONDS` de trabalho contínuo (`agent.buildProgress`), adiciona uma casa a `village.buildings` — pontua pela pressão populacional (`população / village/village.js:getPopulationCap`), não pela necessidade do agente. `fight.js`/`flee.js` usam `combat/combat.js:findNearestEnemy` — crianças e agentes com vida abaixo do limiar nunca lutam (score 0), só fogem (score alto); o resto prioriza lutar, mas foge se a vida cair demais em combate — reavaliado a cada reconsideração, não uma decisão travada. `fight.js` soma `WARRIOR_ROLE_SCORE_BONUS` ao score se `agent.role === 'warrior'` — prioridade extra pra quem já foi designado, não uma reescrita do equilíbrio (`flee.js` não ganha bônus, autopreservação não deveria ser sobreposta por papel). `raid.js` dá efeito prático à guerra dinâmica (`DESIGN.md` §7): quando `village.raidTargetVillageId` está setado (por `clan/clanDecision.js`), agentes elegíveis (mesmo gate de `fight.js` — sem crianças, sem vida baixa) marcham até o centro da vila inimiga e saqueiam o recurso com mais estoque de lá, direto em `village.stock` (`village/stock.js:addStock`, negativo); ao encher a carga, vira candidata de `deliver.js` normalmente pro transporte de volta — nenhuma lógica de combate própria, `fight.js`/`flee.js` (score mais alto) assumem sozinhos se um inimigo for percebido no caminho ou no destino. Score fixo (`RAID_SCORE`, também com o bônus de guerreiro) entre `FIGHT_SCORE`/`FLEE_SCORE` (combate reativo sempre pode interromper) e o teto de `gather.js`/`mine.js`/`build.js` (guerra puxa gente da economia enquanto durar).

- **`village/village.js`** — dados/factory da vila (estoque, população, território); `village.clanId` é atribuído por `clan/clan.js:addVillage`. `stock.food` nasce em `STARTING_FOOD_STOCK` (não zero, `utils/constants.js`) pra toda vila, inclusive guerreira — bootstrap seguro pra `agent/actions/eat.js` (fome ligada ao estoque): sem isso, os fundadores de qualquer vila que não produz comida morreriam de fome antes de qualquer comércio se estabelecer. `village.specialization` (`'food'` | `'wood'`) é passado na criação (`main.js`, balanceado entre todas as `VILLAGE_COUNT` vilas) — toda vila tem `stock`/`capacity`/`demand` de food/wood, especializada ou não, só a produção (via `gather.js`/`gatherWood.js`) é que é exclusiva. Minério (`MINING_RESOURCES`: stone/coal/iron/gold) também entra em `stock`/`capacity`/`demand` de toda vila, mas é universal — nenhuma vila é "especializada" nele (`agent/actions/mine.js` não tem gate de especialização) — e fica fora de `distress` (só `{ food, wood }`, ver `utils/constants.js:CRITICAL_RESOURCES`), então nunca alimenta guerra/colapso. `village.inChaos` — ver `stock.js` abaixo. `village.raidTargetVillageId` — vila alvo do saque institucional corrente (`null` = nenhum), setado/limpo por `clan/clanDecision.js` conforme a guerra escala/esfria, lido por `agent/actions/raid.js`; singular mesmo com N clãs no mundo (simplificação deliberada, ver comentário em `clanDecision.js`). `village.buildings` — populado por `agent/actions/build.js`; `getPopulationCap(village)` (nova função) deriva o teto de população efetivo a partir dele, consumida por `build.js` (pontuação) e `lifecycle.js` (gate de reprodução) — não duplica a fórmula.
- **`village/stock.js`** — estoque comunitário e cálculo de demanda, genérico por chave de recurso (`Object.keys(village.capacity)`, hoje 6: food/wood/stone/coal/iron/gold); é o valor que `gather.js`/`gatherWood.js`/`mine.js` leem para enviesar o score, igual para todos os moradores, e que `trade.js` lê pra achar sobra/déficit. `updateDistress(village, dt)` conta segundos consecutivos de demanda em déficit sustentado — só pra `CRITICAL_RESOURCES` (`food`/`wood`; minério nunca entra aqui, é universal e não faz parte do pilar de interdependência) — o sinal de "desespero" que `clan/clanDecision.js` consulta. `updateChaos(village)` deriva `village.inChaos` da distress (limiar bem mais alto, `DISTRESS_CHAOS_THRESHOLD_SECONDS`) — trava reprodução (`lifecycle.js`) e acelera decaimento de needs (`main.js`) enquanto durar.
- **`village/trade.js`** — `updateTrade(world, dt)`, chamado uma vez por tick (não por agente): pra cada par de vilas cujos clãs permitem comércio (`clan/diplomacy.js:canTrade`) e pra cada tipo de recurso, move recurso da vila com demanda baixa (sobra) pra vila com demanda alta (déficit), a uma taxa fixa. Já era genérico por recurso desde a fatia 8, então passou a mover comida e madeira nos dois sentidos sem nenhuma mudança quando a especialização de vila chegou. É comércio no nível da vila, não do agente — as vilas ficam bem além do raio de percepção/memória de qualquer morador, então a rota é "conhecimento institucional" da vila, não uma decisão de utilidade individual. É o que viabiliza o caso de design original: vila guerreira sem produção própria de comida sobrevivendo de uma vila agrícola aliada (que por sua vez importa a madeira que não produz).

- **`clan/clan.js`** — agrupa vilas (`addVillage` seta `village.clanId`); `stanceByClan` guarda a postura (`war`/`tense`/`neutral`/`allied`) com cada outro clã, simétrica via `setStance`/`getStance`. `clan.decisionTimer` — jitter pra `clanDecision.js` não reconsiderar todos os clãs no mesmo tick (mesmo padrão de `agent.decisionTimer`).
- **`clan/diplomacy.js`** — `proposeTreaty`/`signTreaty` criam e assinam tratados (aliança, não-agressão, comércio, defesa); assinar aplica a postura correspondente via `clan.js:setStance`. `hasTreaty(clanA, clanB, type)` checa um tipo específico vigente; `breakTreaty(treaty)` marca `status: 'broken'` (mantém o histórico, mesmo padrão de `agent.alive` em vez de apagar). `isHostileTerritory(world, agent, tx, ty)` é o efeito da fatia 7: `wander.js`, `gather.js` e `gatherWood.js` a consultam pra nunca escolher como alvo um tile dentro do território de um clã em guerra/tensão — mesmo com a necessidade crítica. (`eat.js` não consulta mais desde que passou a mirar o centro da própria vila em vez de um tile de grama qualquer — ver `agent/actions/*` abaixo.) `canTrade(clanA, clanB)` é o efeito da fatia 8, consumido por `village/trade.js`: mesma clã sempre comercia; clãs diferentes precisam ser aliados ou ter um tratado `trade` assinado — postura neutra sozinha não basta, é assim que o tratado passa a importar de verdade. `defense_pact` ganha consequência na fatia 9 (combate), que vai ler os tratados vigentes daqui.
- **`clan/clanDecision.js`** (diplomacia dinâmica, pós-fatia 11) — `updateClanDecision(clan, world, dt)`, chamado uma vez por clã por tick (não por agente, mesmo padrão de `village/trade.js`): reconsidera a relação com cada outro clã num intervalo de 20-30s simulados. Consulta `village.distress` (`stock.js`) pra escalar pra guerra (desespero sustentado + o outro clã tem o recurso — também seta `village.raidTargetVillageId`, ver `agent/actions/raid.js`), buscar paz (desespero já passou — também limpa o alvo de saque se era esse par), propor comércio (precisa de um recurso que o outro tem de sobra) ou trocar de parceiro comercial (existe um 3º clã mais desesperado pelo recurso que essa vila exporta). Propor comércio funciona com clã `neutral` **ou `tense`** — só `war`/`allied` pulam essa etapa (`allied` já comercia livremente via `canTrade`, sem precisar de tratado; `war` tem `raid.js` como via de recurso, não comércio). Achado ao vivo (jogando com fome ligada ao estoque, ver §6/§8 do DESIGN.md): antes, `tense` também pulava a proposta — uma vila podia nascer `tense` justo com o único outro clã que produzia o recurso que ela não produz (e `allied`/`neutral` com o resto, que não ajudava), ficando sem nenhum caminho institucional de alívio; corrigido permitindo a proposta também sob `tense`, já que `canTrade` nunca dependeu da postura ser branda. Assume 1 vila por clã — verdade em todo o world-gen atual (`main.js`). `updateWarriorRoles(village, world, atWar)` — chamado nas transições de postura (escalar pra guerra / voltar pra paz, via `isClanAtWar` checando se sobrou guerra com outro clã) e a cada reconsideração enquanto a guerra continua: atribui `agent.role = 'warrior'` a uma fração dos adultos elegíveis (`WARRIOR_ROLE_FRACTION`) sorteados via `world.rng.shuffle`, sem mexer em quem já é guerreiro (evita flicker); reverte todo mundo pra `'civilian'` quando a paz volta de vez. `agent/actions/fight.js`/`raid.js` leem `agent.role` pra somar `WARRIOR_ROLE_SCORE_BONUS`; `render/agentRenderer.js` usa pro sprite parado/andando permanente.

- **`combat/combat.js`** — `isEnemy(world, agentA, agentB)` (postura de clã = `'war'`); `findNearestEnemy(agent, world)` busca em `agent.perception.agents`, não no mundo inteiro — um agente só reage a inimigo que já percebeu; `resolveEngagement(agent, enemy, dt, world)` aplica dano mútuo por tick de combate corpo a corpo, marca `agent.lastDamageSource = 'clan'` nos dois (pra `lifecycle.js:checkDeath` escolher o texto certo do evento de morte — sem isso, um agente que sobrevive a um predador e morre depois em guerra ainda apareceria como "morto por" o predador antigo) e `hitFlashAt = world.elapsedSeconds` (flash de dano, `render/agentRenderer.js`). `fight.js`/`flee.js` são os únicos consumidores.

- **`predator/predator.js`** — modelo de dados de `Predator` (bem mais simples que `Agent`: sem needs/perception/memory/utility completo) e `spawnPredators(world)`, chamado uma vez em `main.js` depois de vilas e decorações existirem: 24 no mundo (`PREDATOR_COUNT_PER_SPECIES=6`, 4 espécies — bear/wolf/snake/beatle), longe de qualquer vila (`PREDATOR_MIN_DISTANCE_FROM_VILLAGE_TILES`), só em tile de grama/floresta. `SPECIES_LABEL` (rótulo em português) é exportado daqui e consumido por `predatorAI.js` e `lifecycle.js`.
- **`predator/predatorAI.js`** — `updatePredator(predator, world, dt)`, chamado por `main.js` pra cada predador todo frame: FSM própria (`patrolling → chasing → attacking → fleeing`) reconsiderada periodicamente (mesmo espírito do loop de reconsideração do agente, bem mais barato — sem perception/memory, varre `world.agents` direto). `chasing`/`attacking` têm um "leash": se o alvo perseguido se afasta mais que `PREDATOR_LEASH_RADIUS_TILES` do ponto de nascimento do predador (não da posição atual dele), desiste e volta a patrulhar. Movimento é linha reta até o alvo, sem pathfinding real — simplificação deliberada. O predador causa dano no agente sozinho aqui (independente do que o agente decide fazer); `combat/predatorCombat.js` cobre só o outro sentido.
- **`combat/predatorCombat.js`** — paralelo a `combat/combat.js`, não reaproveitado dali de propósito (predador não tem clã, dano não é simétrico por espécie). `findNearestPredator(agent, world, maxDistance)` varre `world.predators` direto (lista pequena, barato), mas **cortando por distância** — o padrão é o raio de percepção do agente. O limite é o ponto inteiro da função: sem ele, ela devolvia o predador mais próximo do mundo inteiro, e como `FLEE_PREDATOR_SCORE` é o score mais alto do jogo, todo civil entrava em fuga permanente enquanto existisse um predador vivo em qualquer canto do mapa — ninguém colhia, ninguém comia, e as 4 vilas morriam de fome sem um agente ter sido tocado. O mesmo descuido travava a regeneração de vida em `lifecycle.js:checkDeath`, que usa esta função pra saber se há ameaça por perto. `resolvePredatorEngagement(agent, predator, dt, world)` é o agente batendo de volta — só quando ele mesmo escolhe `fightPredator`; marca `hitFlashAt` no predador e, se ele morre, `world.pendingShake` (tremor de câmera, consumido em `main.js`).
- **`agent/actions/fleePredator.js`, `fightPredator.js`** — ações novas, separadas de `flee.js`/`fight.js` de propósito (predador não passa por `isEnemy`, dano assimétrico). Civil (`agent.role !== 'warrior'`) só tem `fleePredator` viável (sempre foge de um predador percebido); guerreiro designado (`agent.role === 'warrior'`) só tem `fightPredator` viável, a menos que a própria vida já esteja abaixo de `FLEE_HEALTH_THRESHOLD` (mesma constante que `fight.js` já usa contra outro clã) — aí foge também.

- **`lifecycle/lifecycle.js`** — `ageAgent`/`checkDeath` por agente (idade, saúde drenada por fome crítica ou combate, morte por saúde zerada ou idade máxima); `checkDeath` só regenera vida quando o agente não tem inimigo **nem predador** por perto (`combat/combat.js:findNearestEnemy` + `combat/predatorCombat.js:findNearestPredator`) — senão a regeneração desfaria o dano a cada tick, já que `checkDeath` roda antes de `fight.js`/`predatorAI.js` aplicarem dano de novo. Morte por combate dispara `world.pendingShake` (tremor de câmera) e, se a causa foi predador (`agent.lastDamageSource === 'predator'`), o evento do feed usa `predator/predator.js:SPECIES_LABEL` pra citar a espécie. `updateHungerWarning(village, world)`, chamada uma vez por vila por tick: avisa no feed quando a fome média dos moradores vivos cruza `VILLAGE_HUNGER_WARNING_THRESHOLD`, com histerese (só reavisa depois de recuperar acima de `VILLAGE_HUNGER_RECOVERY_THRESHOLD`) — sinal diferente de `village.distress` (que é sobre estoque/demanda institucional, os dois podem discordar). `updateVillageReproduction` por vila (cooldown + elegibilidade + `village.demand.food` decidem se tenta reproduzir; `village.inChaos` bloqueia completamente, ver `village/stock.js`; teto de população é `village/village.js:getPopulationCap`, não um número fixo — cresce por casa construída); `pruneDead(world, dt)` remove agentes mortos (fome, combate ou idade) de `world.agents` e de `village.population` — a vila em si nunca é removida, mesmo com população zerada. Não remove no mesmo tick da morte: acumula `agent.deathLinger` por `dt` enquanto `!agent.alive`, só remove ao passar de `DEATH_LINGER_SECONDS` — dá tempo de `render/agentRenderer.js` mostrar o sprite de morto antes do corpo sumir (agente morto-mas-ainda-presente fica fora da simulação de verdade: `simulation/lod.js:classifyAgents` já pula agentes mortos, e `checkDeath` não faz nada com `alive: false`).

- **`simulation/lod.js`** — `classifyAgents(world, camera, viewW, viewH)` separa agentes em `active` (posição cai dentro da viewport atual, com margem — checado via `camera.worldToScreen`, então escala com o zoom) e `background`; `main.js` roda o pipeline completo (percepção/memória/decisão/pathfinding) só para `active`. Antes usava um raio fixo em px de mundo a partir do centro da câmera (`LOD_ACTIVE_RADIUS`), que não escalava com zoom — em zoom baixo (mapa mais visível), a maioria dos agentes visíveis caía fora do raio fixo e congelava mesmo estando na tela; bug reportado jogando, corrigido trocando pra checagem de tela. `background` passa por `stepBackgroundAgent` (sem percepção nem decisão) + posição parada; idade e morte por idade continuam rodando pra ambos, direto em `main.js` — população longe da câmera não trava no tempo, só para de ser simulada em detalhe. Fome/sono de `background` decaem **igual** a um agente `active` (`updateNeeds` real) — antes eram restauradas até 100 artificialmente (achado numa sessão de diagnóstico: agente fora de tela era praticamente imortal à fome, e o estoque real podia secar sem refletir, dando um salto brusco quando a câmera voltava); `feedBackgroundVillage(village, backgroundResidents, dt)` e `produceBackgroundVillage(...)`, chamadas uma vez por vila por tick em `main.js`, cobrem os lados de "comer" e "trabalhar" de forma agregada — mesma taxa por pessoa que `agent/actions/eat.js` já usa, consumindo do estoque real, sem cada um andar até o centro. Classificação recalculada do zero a cada tick (sem estado de "quem tava em foco antes"), então não tem transição a tratar.

  **As duas metades do agregado têm que existir juntas.** Durante um tempo só o consumo era simulado, e o estoque de qualquer vila fora da câmera só sabia cair: cada morador precisa de 0.25 de comida por segundo pra empatar com o decaimento da fome, então 8 pessoas queimavam os 60 de estoque inicial em ~30s e a vila morria inteira. Com 4 vilas e uma câmera, três estavam sempre condenadas — era o mecanismo por trás de "rodei 45s em 4x e todas as vilas foram extintas". Dois princípios governam `produceBackgroundVillage`: (1) um fator de ciclo útil (`BACKGROUND_WORK_EFFICIENCY`) impede que estar fora de tela seja MAIS produtivo que estar em tela, senão o LOD deixaria de ser uma otimização e passaria a mudar o resultado do jogo; (2) o trabalho é dividido pela **demanda**, do mesmo jeito que a demanda enviesa o utility score de um agente `active` — sem isso a vila madeireira fora de tela produzia madeira e nenhuma comida, quando em tela ela sobrevive pescando (`fish.js` é universal). A pesca agregada leva `BACKGROUND_FISHING_PENALTY` por não ser a especialização: alívio, não independência, pra o pilar 4 do design não virar isenção fora de tela.

- **`input/inputHandler.js`** — pan/zoom de câmera (arrastar/scroll), pausar/mudar velocidade, `[D]` toggle de debug. Clique (sem arrastar, distingue por distância percorrida desde o mousedown) tenta selecionar o agente mais próximo do cursor primeiro (`uiState.selectedAgentId`); sem agente por perto, clicar dentro do círculo de território de uma vila seleciona a vila (`uiState.selectedVillageId`) — os dois são mutuamente exclusivos (selecionar um limpa o outro); clicar fora de qualquer agente/vila deseleciona os dois.
- **`ui/hud.js`** — controles de tempo, renderizado em `#hud` (DOM, fora do canvas). O painel de status mostra o agente selecionado (`uiState.selectedAgentId`, lido em `main.js`) em três estados: nada selecionado, vivo, ou morreu (`selectionState` só considera "vivo" um agente com `alive: true` — sem essa checagem, um corpo ainda em `world.agents` durante o `DEATH_LINGER_SECONDS` de `lifecycle.js:pruneDead` apareceria como vivo até sumir de vez). Linha de ação mostra "(guerreiro)" como sufixo quando `agent.role === 'warrior'`. Não reage a `selectedVillageId` — é um painel só de agente.
- **`ui/inspector.js`** (fatia 11) — painel mais completo (`#inspector`, topo direito). Com um agente vivo selecionado: score de cada ação candidata na última reconsideração (`agent.lastScores`, escrito por `agent/decision.js:reconsider` — snapshot só pra UI, não influencia a decisão), destacando a ação atual; mais estoque/demanda/população (com contagem de casas e teto efetivo via `village/village.js:getPopulationCap`)/especialização (`agrícola`/`guerreira`, texto no título da seção — junto com "EM COLAPSO INTERNO" se `village.inChaos`) da vila dele e postura/tratados do clã dele. Cada linha de estoque de minério (`stone`/`coal`/`iron`/`gold`) ganha um ícone (`Pedra1`/`Carvao`/`Ferro`/`Ouro`) antes do nome — antes era texto puro, sem nenhum paralelo visual com o 🌾/🪵 que o label da vila no mapa já tinha. Cada linha também mostra `distress` (segundos de desespero) quando > 0. A lista de estoque é genérica por `Object.keys(village.capacity)`, então mostra qualquer recurso sem mudança quando um novo é adicionado. Com uma vila selecionada diretamente (sem agente — `uiState.selectedVillageId`): mesmas seções de vila/clã, sem a seção de agente. Painel vazio quando nada está selecionado.

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
  ├─> Agent.separation (só sobre os agentes `active` do LOD)
  ├─> Predator.update, por predador (predator/predatorAI.js — FSM própria, não passa pelo LOD)
  └─> Renderer.render(world, camera, realDt)   [leitura + partículas/câmera/shake, ver render/*.js]
```

Regra de dependência: **dados fluem de baixo para cima na tabela do DESIGN.md** (World → Agent → Village → Clan), e cada camada só lê a de baixo, nunca pula duas camadas. `Render` e `UI` são sempre folhas — leem `world`/`camera`, nunca são lidos por ninguém.

## Como rodar

```bash
python3 dev-server.py
```

Abrir http://localhost:8000 — nenhum passo de build. **Não use `python -m http.server` puro** — ele não manda header de cache nenhum, e o navegador às vezes serve uma versão em cache de um módulo JS editado recentemente (já causou debug perdido em mais de uma sessão). `dev-server.py` é o mesmo servidor, só com `Cache-Control: no-store` em toda resposta.

---

Status: fatias 1-11 implementadas (ver `DESIGN.md`, seção 5), mais especialização de vila, diplomacia dinâmica entre clãs (guerra/paz/comércio/saque, `DESIGN.md` §7) e evolução da civilização — minério + construção + papéis visuais (`DESIGN.md` §6-8) — além do roteiro original, mais decoração do mapa com arte real, fome individual ligada ao estoque da vila, reorganização visual completa (terreno/personagens novos), fauna predadora (`predator/`, `DESIGN.md` §10) e uma leva de polimento visual (sombra/partículas/câmera suave/tremor/iluminação/HUD) em sessões posteriores. **Estado local diverge do último commit agora** — ver `STATUS.md` §0 antes de mexer em `assets/sprites/`.

Nota sobre a fatia 9 (desatualizada — corrigida numa sessão posterior): não existe mais um "spawn de guerra" separado — todas as vilas (exceto a 1ª, no centro) nascem à mesma distância padrão (`SECOND_VILLAGE_MIN/MAX_DIST`, 70-100 tiles) em ângulos radiais ao redor dela. A distância deixou de ser um problema pro combate acontecer quando `agent/actions/raid.js` chegou (evolução da civilização, `DESIGN.md` §7): agentes em guerra marcham deliberadamente até o centro da vila inimiga via pathfinding, não dependem mais de território cruzar por acaso vagando.
