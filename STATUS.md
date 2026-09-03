# STATUS.md — Worldbox Sandbox

Snapshot do estado atual. Sessão iniciada depois da pausa registrada em `1561b59`. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). Commits desta sessão: `1561b59`..`597cf3e` (5 commits, todos pushados) — **mais uma leva de deleções locais não commitadas, ver §0 abaixo, é o item mais urgente**. Contexto de antes desta sessão (reorganização visual completa, especialização de vila, diplomacia dinâmica, minério/construção) não é repetido em detalhe — ver `DESIGN.md` e o histórico de commits até `1561b59`.

## 0.🚨 Estado local diverge do último commit — leia antes de qualquer coisa

O usuário apagou 30 arquivos de `assets/sprites/` manualmente por qualidade abaixo da régua atual. **A parte de predador dessa pendência está resolvida e commitada** (ver §1a); o que continua em aberto são **~24 deleções não commitadas** de terreno/decoração/civil/minério.

Estado de cada metade:
- ✅ **Predador** — resolvido. As 4 espécies viraram 2 (demônio + monstro de sangue, `Tiny RPG Character Asset Pack 02`), arte recortada e commitada, deleções de Urso/Lobo/Cobra/Besouro commitadas junto. Testado ao vivo.
- 🔴 **Terreno / decoração / minério / personagem civil** — continua em fallback geométrico (círculo amarelo, triângulo verde, cor lisa; zero erro fatal, o `isSpriteReady()` por-sprite segura bem). Levantamento exaustivo dos 5 packs baixados **está fechado e confirmado: nenhum serve** (ver §7). O usuário vai providenciar um pack novo antes da próxima rodada dessas categorias — **não tente resolver com o que já existe.**

**Continua valendo: não rode `git add`/commit nessas ~24 deleções restantes de `assets/sprites/`.** O remoto ainda tem esses arquivos, então o GitHub Pages segue visualmente correto — commitar as deleções agora é o que quebraria o jogo publicado.

## 1a. Sessão seguinte — fauna reduzida a 2 espécies + inventário de assets fechado

1. **Inventário exaustivo de `assets/Assets-testes-para-o-claude-testar/`** (287 arquivos, 241 PNG, 5 packs) — desta vez abrindo e analisando as imagens de verdade, não só lendo nomes de arquivo. Dois packs não tinham aparecido em levantamentos anteriores: **Pixel Champions v3** (8 heróis, overworld 24x24 4-direções + battlers 32x32 com set completo de animação incluindo morte) e **SuperRetroWorld** (32 personagens humanos, 16x20, ciclo de caminhada 4-direções, também fornecidos já separados um por pasta). Conclusão revista mas **mantida**: nenhum serve pra terreno/decoração/civil — e o motivo real **não é resolução** (o Cavaleiro tem só 17x21px de conteúdo dentro do quadro de 100x100, mesma ordem de grandeza que os candidatos). É **estilo**: os dois packs novos são pixel art de contorno preto duro e cor chapada saturada (SNES/JRPG), enquanto a régua atual (Tiny RPG / craftpix) é sombreado suave sem contorno. Colocar os dois lado a lado briga.
2. **Fauna predadora reduzida de 4 pra 2 espécies** (decisão do usuário): `bear`/`wolf`/`snake`/`beatle` → `demon`/`blood`, com arte do `Tiny RPG Character Asset Pack 02` (Demon_A e Blood Monster_A, mesma família do Cavaleiro/Orc). Os stats foram **redistribuídos, não inventados**: `demon` herdou o perfil do urso (60 vida, 15 dano, tanque) e `blood` o do lobo (35 vida, 10 dano, detecção 7). Cobra e besouro saíram inteiros — com o besouro foi embora o único ataque à distância do jogo (`attackRange` 150), perda aceita explicitamente pelo usuário por falta de substituto à altura.
3. **Velocidade virou stat por espécie** (`PREDATOR_SPECIES_STATS.speed`, 40 pro demônio / 62 pro monstro) em vez do `PREDATOR_SPEED=50` único — sem isso "tanque lento vs. rápido e frágil" ficaria só na descrição, já que a diferença não apareceria em nada observável. `PREDATOR_SPEED` continua como referência/fallback.
4. **`renderScale` por espécie** (`render/predatorRenderer.js`): o recorte por alpha sozinho normaliza todo predador pra mesma altura na tela, o que faria o monstro de sangue (bicho rasteiro, 15px de conteúdo) aparecer do tamanho do demônio em pé (20px). `renderScale` preserva a proporção da arte de origem.
5. **`PREDATOR_COUNT_PER_SPECIES` 6 → 12** — decisão minha dentro do escopo: com 2 espécies em vez de 4, manter 6 por espécie derrubaria a população de predadores de 24 pra 12, cortando pela metade uma densidade que foi calibrada jogando. A decisão do usuário foi reduzir a **variedade**, não a ameaça.
6. **Duas imprecisões corrigidas no `ROADMAP.md`**: o feed de eventos e os animais no mapa estavam listados na Parte 2 (planejado/bloqueado) quando já estavam implementados há sessões. Ambos movidos pra Parte 1, como o próprio arquivo instrui (feed em §1.10, fauna numa §1.13 nova).

**Testado ao vivo:** jogo carrega sem nenhum erro de console; `spawnPredators` produz 24 predadores, 12 de cada espécie, com os stats certos; os 4 sprites novos carregam e desenham com o recorte e a proporção relativa corretos; monstros de sangue confirmados renderizando no mapa com sombra. **Não** foi observado um ciclo de combate completo com as espécies novas numa sessão orgânica — o código de combate não mudou (só os números por espécie), mas a confirmação ao vivo continua pendente.

## 1. O que foi implementado ou alterado na sessão anterior

1. **`dev-server.py`** (novo, raiz do projeto) — mesmo servidor de sempre, mas manda `Cache-Control: no-store` em toda resposta. Motivo: `python -m http.server` puro não manda header de cache nenhum, e o navegador às vezes serve uma versão em cache de um módulo JS editado recentemente — isso já causou debug perdido em mais de uma sessão (mais recentemente, atrapalhou a verificação ao vivo da Frente 2 desta sessão). **`README.md` e `CLAUDE.md` já apontam pra ele — use `python3 dev-server.py`, não mais `python -m http.server`.**
2. **Throughput de coleta corrigido**: `gather.js`/`gatherWood.js`/`mine.js`/`fish.js`/`deliver.js` só soltavam a ação quando `carrying` passava de zero (não de `CARRY_CAPACITY` cheio) — o agente entregava ~5-10% da carga por viagem em vez de uma viagem cheia. Corrigido pra `carrying >= CARRY_CAPACITY`.
3. **`decision.js`**: a margem de interrupção (`INTERRUPT_MARGIN`) checava a ação **candidata** em vez da ação **atual** — o oposto do que o comentário do arquivo sempre descreveu, risco real de oscilação. Corrigido.
4. **`EAT_URGENCY_WEIGHT=1.8`** em `eat.js` — agente interrompe trabalho e vai comer com mais folga (antes só acontecia com a fome já bem baixa).
5. **Evento de fome crítica**: `lifecycle.js:updateHungerWarning`, dispara no feed quando a fome média de uma vila cruza 30, com histerese (só reavisa depois de recuperar acima de 45).
6. **`agent/separation.js`** (novo) — separação leve tipo "boids" entre agentes `active` do LOD: empurrão real de posição (não só visual) quando ficam muito próximos.
7. **LOD corrigido**: `simulation/lod.js:stepBackgroundAgent` **restaurava** fome/sono até 100 pra quem tava fora de tela (agente fora de foco era praticamente imortal à fome, e podia dar um salto brusco quando a câmera voltava). Agora decai igual a um agente `active`; nova `feedBackgroundVillage(village, residentes, dt)` alimenta em agregado a partir do estoque real da vila, sem cada um andar até o centro — sem estoque, ninguém come, fome de quem tá fora de foco agora pode cair a zero de verdade.
8. **Fauna predadora** (sistema novo completo) — `predator/predator.js` (modelo de dados + `spawnPredators`, 24 no mundo, 6 por espécie — bear/wolf/snake/beatle —, min. 15 tiles de qualquer vila), `predator/predatorAI.js` (FSM própria: patrolling/chasing/attacking/fleeing, com leash a partir do ponto de nascimento), `combat/predatorCombat.js` (combate agente-vs-predador, paralelo a `combat.js`), `agent/actions/fleePredator.js`/`fightPredator.js` (civil sempre foge; guerreiro designado enfrenta, a menos que a própria vida esteja crítica), `render/predatorRenderer.js`. Testado ao vivo: urso perseguindo/atacando um civil que foge de verdade; lobo enfrentado por um guerreiro (dano mútuo, lobo foge com vida baixa, morre); evento "X perdeu um morador, morto por Y" aparece certo no feed; e um agente real foi flagrado fugindo de um predador organicamente numa sessão limpa (sem forçar nada).
9. **Polimento visual ("juice")**: sombra elipse sob agente/predador/árvore/casa; `render/particles.js` (novo, pool com teto de 150 — poeira ao andar, faísca ao minerar, lasca ao cortar árvore); brilho pulsante na fogueira; flash vermelho no agente/predador que sofre dano (`hitFlashAt`, comparado contra `world.elapsedSeconds`); `render/camera.js` ganhou `panToTarget`/`tick` (easing suave ao trocar seleção) e `triggerShake` (tremor sutil só em morte por combate, não a cada golpe); `render/lighting.js` (novo, overlay de tom por hora do dia, um `fillRect`); `core/gameLoop.js` passa a mandar o dt real (não só o simulado) pro `render()`, pra esses efeitos continuarem suaves com o jogo pausado/acelerado. HUD/inspetor/feed com paleta "madeira e latão" + tipografia pixel (Press Start 2P/VT323, Google Fonts) em vez do cinza genérico; `ui/eventFeed.js` reescrito pra animar só a linha nova (antes reconstruía o DOM inteiro a cada evento).
10. **Diagnóstico de FPS** (medido, não implementado — ver §5): `drawTiles` escala linearmente com tiles visíveis (167ms no zoom mínimo, dominante) e `scanPerception`/`checkDeath`/`updateDecision` rodam todo frame em vez de só na reconsideração. `separation.js` **não** é o gargalo (hipótese do usuário refutada por medição: <1ms mesmo em 200 agentes ativos).
11. **Levantamento de assets pendentes** (Frente 2 de uma rodada anterior) — nenhum pack baixado tem pose de trabalho (cortar árvore/minerar/construir/pescar) pra personagem humano. Nenhum pack tem terreno/tile melhor que o Kenney já em uso.
12. **Design de casas em tiers + rank de vila** (aprovado, não implementado — ver §5) — 3 níveis de casa (upgrade, não casa nova extra), rank derivado Acampamento→Vila→Cidade.
13. **5 regras de disciplina de trabalho** combinadas com o usuário e salvas em memória permanente (fora do repo, `~/.claude/.../memory/work_discipline_worldbox.md`) — ver §4.

## 2. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain, Time loop, Camera/Render, Pathfinding | ✅ Funcionando |
| Camera easing/shake, partículas, sombra, iluminação | ✅ Funcionando, testado ao vivo |
| Perception, Memory, Utility AI/Decision | ✅ Funcionando — mas rodando mais caro que precisa (§5) |
| Village/Clan/Diplomacy/Trade | ✅ Funcionando |
| Combat (agente-vs-agente) | ✅ Funcionando |
| **Combat (agente-vs-predador)** | ✅ Funcionando, testado ao vivo (chase/attack/flee/death confirmados) |
| Life-cycle, reprodução | ✅ Funcionando |
| Simulation LOD | ✅ Funcionando, fome/sono fora de tela agora realistas (item 7) |
| UI/HUD/Inspetor/Feed | ✅ Funcionando, com polimento visual novo |
| **Sprites de terreno/decoração/minério/civil** | 🔴 **Quebrado localmente** — ~24 arquivos apagados, sem substituto em pack já baixado; aguarda pack novo do usuário (§0) |
| Sprites de predador | ✅ Resolvido — 2 espécies com arte do Tiny RPG 02, recortada e testada ao vivo (§1a) |
| Necessidades sociais/segurança/pertencimento | ❌ Não iniciado (só fome/sono existem) |
| `agent.traits` | ❌ Não iniciado |
| `defense_pact` (efeito real) | ❌ Não iniciado |
| Casas em tiers / rank de vila | ❌ Não iniciado (design aprovado, ver §5) |
| Otimização de FPS (drawTiles/perception) | ❌ Não iniciado (diagnóstico pronto, ver §5) |

## 3. Bugs / comportamentos estranhos não corrigidos

1. **Sprites quebrados localmente** (§0) — prioridade máxima antes de qualquer outra coisa.
2. **Elfo sem arte própria** — cai no guerreiro genérico, decisão aceita há sessões.
3. **Orc destoa visualmente** (perfil vs. resto de cima/frente) — aceito, pouco tempo de tela.
4. **FPS cai perceptivelmente com pouco zoom** — diagnosticado (§5), não corrigido.
5. Confirmações mecânicas que nunca foram vistas numa sessão real longa do usuário (só em teste automatizado curto ou forçado): papel de guerreiro numa guerra orgânica, animação de morte numa morte orgânica, pesca enchendo estoque por entrega completa, casa completando `village.buildings` numa sessão real, indicador `💀 extinta`, correção da espiral de extinção por reprodução numa sessão longa.
6. **Postura de guerra/paz pode alternar com frequência que parece volátil** numa sessão de observação longa — não recalibrado.
7. Testes automatizados de sessão longa esbarram em throttling de `requestAnimationFrame` (a aba de automação fica com `document.visibilityState: "hidden"`) — limitação de ambiente confirmada de novo nesta sessão, contornada avançando o `world` manualmente por dt fixo quando precisou de confirmação ao vivo determinística (predadores).

## 4. Decisões técnicas e o motivo

- **`dev-server.py` em vez de `python -m http.server`** — resolve cache de módulo instável que já atrapalhou mais de uma sessão. Confirmado que resolve (erro de import refletiu na hora numa mudança real). Um obstáculo diferente (RAF throttlado em aba "hidden" pra automação) continua existindo, é ambiente, não cache.
- **`separation.js` não é o gargalo de FPS** — hipótese do usuário testada e refutada por medição direta (custo real <1ms mesmo em 200 agentes ativos). O gargalo real é `drawTiles` (escala com tiles visíveis) e `scanPerception`/decisão rodando todo frame em vez de só na reconsideração.
- **Screen shake só em morte por combate**, não a cada troca de dano — pedido era "golpe forte", sacudir a tela numa luta inteira seria o oposto de sutil.
- **Fauna predadora: civil sempre foge, guerreiro designado sempre enfrenta** (a menos que a vida já esteja crítica) — decisão de design de uma rodada anterior, implementada e confirmada ao vivo nesta.
- **Casas em tiers via upgrade de casa existente, não casa nova extra** — design aprovado pelo usuário: tier 2 usa ferro, tier 3 usa ouro, dando uso real a minérios hoje subaproveitados. Kenney já é modular (peças de parede/telhado), não precisa de pack novo pra isso — mas isso caiu junto na deleção de sprites do usuário, então o candidato de arte específico precisa ser re-escolhido quando a Frente de assets for retomada.
- **5 regras de disciplina de trabalho** (ver memória `work_discipline_worldbox`): uma frente por vez em sistemas acoplados (render/decisão/estado de mundo), sequencial até testado ao vivo; subagentes só pra trabalho mecânico genuinamente independente; critério de parada verificável antes de trabalho maior, com teto de tentativas se for loop; crítica visual com referência concreta, no máximo 2-3 rodadas por item. Vale pro resto do projeto, não só pra esta sessão.

## 5. Próximos passos concretos, em ordem

1. **Terreno/decoração/minério/civil (§0) — bloqueia visual, não bloqueia lógica.** Levantamento fechado: nenhum dos 5 packs baixados serve (ver §1a item 1 pro motivo — é estilo, não resolução). **Aguardando o usuário providenciar um pack novo**; quando chegar, repetir o mesmo processo de levantamento + proposta por categoria antes de mover qualquer arquivo. A parte de predador já saiu (§1a).
2. **Otimização de FPS** (diagnóstico pronto, ver item 10 de §1): pré-renderizar a camada de terreno estática num canvas offscreen (`drawTiles` some do custo por-frame, vira 1 `drawImage`); mover `scanPerception` pro ritmo de reconsideração (~0.5s) em vez de todo frame; parar de recalcular "ameaça mais próxima" em paralelo em `checkDeath` + 4 ações de combate.
3. **Casas em tiers + rank de vila** — design já aprovado (ver `DESIGN.md` se foi anotado, senão está só nesta sessão do histórico de conversa): 3 níveis por upgrade (tier2 = +ferro, tier3 = +ouro), rank derivado Acampamento/Vila/Cidade. Precisa reconfirmar candidato de arte por tier depois do item 1.
4. **Sessão de jogo real do usuário** (pendente de sessões anteriores, ainda não aconteceu) — só depois dos sprites resolvidos, senão a avaliação visual fica invalidada pelo fallback geométrico.
5. **Retomar brainstorm de features** (mais construções além de casa, histerese guerra↔paz) — só depois do visual estar redondo de novo.

## 6. Coisas pedidas pra lembrar que ainda não são código

- **Casas em tiers**: tier 2 = 30 madeira + 20 pedra + 10 ferro → +8 população líquida (era +5); tier 3 = 50 madeira + 35 pedra + 20 ferro + 10 ouro → +12 população líquida. Upgrade de casa existente, não casa nova. `HOUSE_WOOD_COST`/`HOUSE_STONE_COST` viram tabela por nível; `getPopulationCap` soma por nível de cada `building`; `build.js` ganha regra de nova-vs-upgrade (prioriza nova enquanto população pressiona o teto).
- **Rank de vila**: Acampamento → Vila → Cidade, **derivado** (população ≥20 E pelo menos 1 casa tier 2+), não um recurso separado — só muda o label exibido + 1 evento no feed na transição.
- **Otimização de FPS**: números exatos de referência pra comparar depois de qualquer mudança — zoom=1/50 ativos: drawTiles 6.8ms, percepção 16.7ms; zoom=0.25/200 ativos: drawTiles 86-167ms, percepção 90.9ms. `separation.js` sempre <1ms, não mexer nisso achando que é o problema.
- **Regras de disciplina de trabalho** (§4) — já salvas em memória permanente, mas reforçando aqui: uma frente por vez em sistemas acoplados, sequencial até testado ao vivo, antes de abrir a próxima.

## 1b. Sessão seguinte — SpriteManager unificado (módulo isolado, não ligado no jogo)

O pack novo chegou em `assets/Pers-Sprites/` (99 PNGs). Escrito um gerenciador
de sprites/animação que lê os dois formatos do pack, **testado isoladamente
via `sprite-lab.html` — nenhum renderer do jogo foi tocado.**

Três divergências entre a especificação e os arquivos reais, todas achadas
antes de escrever código (por isso o levantamento vem primeiro):

1. **`Characters-Sheets/` não existe.** O conteúdo do Formato 2 está em
   `Pers-Sprites/Humanos-separados/`, e são os arquivos **já separados um
   personagem por pasta** (48x80 e 96x128 = grade **3x4**), não a folha 12x8
   com 8 personagens que a especificação descreve. As folhas 12x8 de verdade
   só existem na pasta de matéria-prima ignorada no git. Resolvido suportando
   **os dois layouts com detecção automática** (decisão do usuário) — a
   fórmula de recorte é a mesma, só muda quantos blocos cabem.
2. **A tabela de quadros de `attack` está errada pra 3 dos 4 atores.** Diz 8;
   Blood Monster tem 8, mas Demon tem 7, Orc e Soldier têm 6, e
   `Soldier_Attack03` tem 9. Resolvido derivando a contagem da imagem
   (`largura/altura`) e usando a tabela só como validação com aviso no
   console. Walk (8), Idle (6), Hurt (4) e Death (4) batem em 100% dos
   arquivos.
3. **A variante no nome é opcional** (`Blood Monster_A_Walk` tem `_A`,
   `Orc_Walk` e `Soldier_Walk` não). Parser lê da direita pra esquerda.

**Armadilha que custou uma rodada:** a primeira versão detectava o Formato 1
pela pasta (`path.includes('Pers-Sprites/')`), seguindo a especificação. Mas
no pack os **dois formatos moram dentro de `Pers-Sprites/`** — as 32 grades
foram classificadas como tira e desenhadas inteiras. O sinal confiável é o
token de ação no fim do nome, não a pasta.

**Testado ao vivo:** 57 folhas, 36 atores, 0 falhas; os 7 avisos de contagem
de quadros aparecem exatamente onde previsto e em nenhum outro lugar;
animação, troca de direção (as 4), ataque e morte-que-segura-o-último-quadro
confirmados a olho; detecção de layout confirmada nos 4 arquivos reais
(192x160 e 288x192 → 12x8; 96x128 e 48x80 → 3x4), incluindo os dois casos
ambíguos por divisibilidade; recorte 12x8 confirmado produzindo 8 personagens
distintos × 4 direções. Jogo principal recarregado depois: sem erro novo.

**Próximo passo natural:** ligar no `predatorRenderer.js` primeiro (sistema
mais isolado, e as duas espécies já usam exatamente Demon_A/Blood Monster_A),
depois nos agentes. Nada disso foi feito ainda — a escolha do usuário nesta
rodada foi entregar só o módulo.

**Não coberto ainda:** `Pers-Sprites/Animais/` (reprovado por qualidade,
e as tiras têm layout diferente — 4 colunas × N linhas) e a folha de tiles
Kenney em `Vários tipos de chão-.../` (16x16 com 1px de margem), que seria um
terceiro formato.

## 1c. Sessão seguinte — SpriteManager ligado nos predadores

Primeiro consumidor real do módulo da §1b. `render/predatorRenderer.js`
reescrito: em vez de um quadro estático por estado, toca as tiras completas
do pack (Idle/Walk/Attack/Hurt/Death) para as duas espécies.

O que ganhou:
- **Animação de verdade** — patrulhar/perseguir/fugir viram `walking` ou
  `idle` conforme o bicho tenha se deslocado no quadro; `attacking` toca o
  golpe e reinicia enquanto o predador continuar atacando.
- **Espelhamento por direção** — a arte olha pra direita; agora vira pra
  esquerda quando anda pra esquerda, em vez de todo predador ficar virado
  pro mesmo lado.
- **Corpo que fica** — predador morto toca `death` e segura o último quadro.
  Custo zero de simulação: `world.predators` nunca foi podado (só marca
  `alive: false`), então o corpo já estava lá, só não havia arte pra mostrar.

Três decisões técnicas que não são óbvias:
1. **dt SIMULADO, não real** — o oposto de `particles.js`/`camera.js`. Uma
   animação de personagem representa deslocamento no mundo, então tem que
   congelar no pause e acelerar em 4x junto com o movimento. Derivado de
   `world.elapsedSeconds` dentro do próprio módulo, sem mudar a assinatura de
   `render()`.
2. **Escala única de arte** (`ART_SCALE = 1.4`) em vez de altura fixa por
   espécie. Como as duas vêm do mesmo pack na mesma escala, o demônio sair
   maior que o monstro rasteiro é automático. **Isso aposentou o
   `renderScale` por espécie** que tinha sido criado na §1a — ele só existia
   porque o recorte por alfa de um quadro estático normalizava as duas pra
   mesma altura.
3. Os 4 recortes estáticos (`Demonio.png`, `MonstroSangue.png` e os dois
   "Atacando") foram removidos de `assets/sprites/` — eram um quadro
   escolhido a dedo de cada tira, e agora a tira inteira é usada.

**Bug encontrado e corrigido durante o teste:** a detecção de "andou?" usava
só `dx`, então um predador subindo ou descendo **em linha reta** contava como
parado e mostrava a pose de repouso enquanto se deslocava. Invisível a olho —
apareceu ao medir o índice de quadro ao vivo. Corrigido pra `hypot(dx, dy)`,
mantendo só o X pra decidir o espelhamento.

**Testado ao vivo:** sem erro de console (só os 2 avisos esperados de
contagem de quadros do Demon); 24 views criadas, `world.elapsedSeconds`
avançando 1.000s/s em 1x; ciclo de caminhada percorrendo os 8 quadros e
repetindo (`3,4,5,6,7,0,1,2...`); `facing` alternando conforme a direção;
demônio e monstro de sangue confirmados na tela com sombra e proporção certa.
O ciclo `walking→idle→walking` a cada ~1s **não é bug** — é a patrulha real
(chega ao alvo, espera a próxima reconsideração, escolhe outro).

**Não confirmado ainda:** o clipe de ataque e o de morte numa perseguição
orgânica de verdade — o caminho de código é o mesmo já validado no
`sprite-lab.html`, mas nenhum combate contra predador aconteceu na janela de
teste.

**Próximo passo:** migrar `agentRenderer.js` pro SpriteManager. É bem mais
envolvido que o predador — ele escolhe pose por AÇÃO corrente (cortando
árvore, minerando, construindo, levando tronco, pescando), por papel
(civil/guerreiro) e por estado de vida, e as poses de trabalho não existem
nas tiras do pack novo. Precisa de decisão de design antes, não é uma
tradução mecânica.

## 1d. Sessão seguinte — agentRenderer migrado pro SpriteManager

Segundo (e maior) consumidor do módulo. É o caso que justifica o gerenciador
ter sido feito unificado: **as duas famílias de arte do agente usam formatos
diferentes ao mesmo tempo**, e o renderer não precisa saber disso.

- **Civil** → um dos 32 personagens de `Pers-Sprites/Humanos-separados/`
  (grade RPG 3x4), escolhido por hash de `agent.id` e fixo pra vida toda.
  Caminhada com **4 direções reais**. Estavam como círculo amarelo desde que
  a arte antiga foi apagada.
- **Guerreiro designado** → tiras completas de `Soldado1/` (Cavaleiro) e
  `Monstro3/` (Orc), com idle/walk/attack/hurt/death. **O elfo deixou de ser
  um círculo**: cai no Soldier como guerreiro genérico (segue sem arte
  própria, decisão antiga, mas agora ao menos aparece animado).

### ⚠️ Decisão que precisa da confirmação do usuário

Os 32 civis são o **SuperRetroWorld**, o mesmo pack que numa rodada anterior
foi reprovado por estilo (contorno preto duro e cor chapada, contra o
sombreado suave do Soldier/Orc/Demon), com a instrução explícita de "não
tente resolver o personagem civil com o que já existe". Usei assim mesmo
porque o usuário **entregou esses arquivos dentro de `Pers-Sprites/`**, a
pasta curada do pack novo — o que li como decisão revista. **Se não for,
reverter é uma linha**: apagar `CIVILIAN_ACTORS` de `agentRenderer.js` faz o
civil voltar ao fallback geométrico sem tocar em mais nada.

### Decisões técnicas

1. **Perda assumida: as poses de trabalho.** Cortar árvore, minerar,
   construir, pescar, levar tronco — nenhuma existe na arte disponível. As
   partículas de trabalho (faísca, lasca) continuam, então "está trabalhando
   ali" ainda se lê, só não pela pose do corpo. `DESIGN.md` §8 foi atualizado:
   o projeto voltou ao eixo "diversidade visual por indivíduo" que aquela
   seção dizia ter abandonado, porque a alternativa era manter o círculo.
2. **Civil morto deita e desbota** (rotação 90°, alfa 0.65) — a grade RPG não
   tem clipe de morte e a cascata do animator deixaria o cadáver **de pé**
   durante o `DEATH_LINGER_SECONDS`. Guerreiro tem `death` e toca normal.
3. **`sweepViews`** — agente É podado de `world.agents` (ao contrário de
   predador), então o Map de estado visual cresceria pra sempre numa sessão
   longa. Varredura a cada ~10s. **A versão anterior tinha esse mesmo
   vazamento no `lastPositions` e ninguém tinha notado.**
4. **View reconstruída quando o ator muda** — `clanDecision.js` designa e
   desmobiliza guerreiro em tempo de execução, então o agente troca de
   família de arte no meio da vida.

**Testado ao vivo:** console limpo (só os 7 avisos esperados de contagem de
quadros); vila de 8 civis com rostos distintos e direções corretas na tela;
os 10 casos do renderer exercitados chamando `drawAgents` de verdade com
agentes sintéticos (civil parado/andando/morto, cavaleiro/orc parado e
atacando, elfo, elfo morto, criança) — todos corretos.

**Custo medido** (200 iterações, síncrono): 0.195ms/frame com 32 agentes,
1.56ms com 200, 4.87ms com 600. Contra os 86-167ms de `drawTiles` em zoom
baixo (§6), é ruído.

**Não confirmado:** ataque e morte de guerreiro numa guerra orgânica — só no
harness sintético, que exercita o mesmo caminho de código.

**Próximo passo natural:** o terceiro formato de spritesheet (folha de tiles
Kenney 16x16 com 1px de margem, em `Pers-Sprites/Vários tipos de chão-...`),
que devolveria terreno e decoração — as últimas categorias em fallback
geométrico. A arquitetura já prevê: é um objeto novo em `sheetFormats.js`.

## 1e. 🚨 Correção — extinção total das 4 vilas (reportada jogando 45s em 4x)

O usuário rodou 45s em 4x (≈180s simulados) e **todas as vilas foram
extintas**. Reproduzido de forma determinística e corrigido. **Nenhum dos
três bugs veio das mudanças de render desta sessão** — os três nasceram no
commit `b57ab3d` (fauna predadora + LOD), sessões atrás; só não tinham
aparecido porque nunca houve uma sessão real longa.

### Bug 1 — `findNearestPredator` sem limite de distância (o pior)

`combat/predatorCombat.js:findNearestPredator` varria `world.predators`
inteiro e devolvia o mais próximo **do mundo todo**, a 200 tiles se fosse o
caso. Como `FLEE_PREDATOR_SCORE` (0.9) é o score mais alto do jogo, **todo
civil entrava em fuga permanente** enquanto existisse um único predador vivo
em qualquer canto do mapa. Ninguém colhia, ninguém entregava, ninguém comia.
O mesmo descuido travava a regeneração de vida em `lifecycle.js:checkDeath`,
que usa essa função pra decidir se há ameaça por perto.

O comentário da função sempre disse "predadores **percebidos**" — a intenção
estava certa, o raio nunca foi implementado. Corrigido com um parâmetro
`maxDistance` que já entra valendo `PERCEPTION_RADIUS * TILE_SIZE`, então os
três consumidores (`fleePredator`, `fightPredator`, `checkDeath`) ficam
corretos sem mudar nenhuma chamada. Confirmado: `fleePredator` sumiu da
distribuição de ações.

### Bug 2 — `feedBackgroundVillage` drenando o estoque

O filtro de "quem come" era `hunger < 100`: um morador com fome 99 contava
como faminto e comia na **taxa cheia, continuamente**, só pra ficar coberto.
Oito moradores assim consomem 8 de comida por segundo pra sempre. Um agente
`active` não come assim — só come quando `eat` vence o utility score (fome
≈55), em rajadas. Corrigido com `BACKGROUND_EAT_HUNGER_THRESHOLD = 55`.

### Bug 3 — o LOD tinha consumo mas **nenhuma produção** (o estrutural)

`stepBackgroundAgent` só decaía necessidades e `feedBackgroundVillage` só
consumia: **o trabalho de quem está fora de tela nunca foi simulado**. O
estoque de uma vila fora da câmera só sabia cair. A conta fecha: fome decai
100/60 por segundo, cada comida restaura 100/15, então **cada morador precisa
de 0.25 de comida por segundo só pra empatar** — 8 pessoas queimam os 60 de
estoque inicial em ~30s. Com 4 vilas e uma câmera, três estavam sempre
condenadas. Era esse o mecanismo por trás do relato.

Corrigido com `produceBackgroundVillage`, contrapartida simétrica de
`feedBackgroundVillage`:
- produz o recurso da especialização, com um fator de ciclo útil
  (`BACKGROUND_WORK_EFFICIENCY = 0.3`) pra estar fora de tela **não** ficar
  mais produtivo que estar em tela — senão o LOD passaria a mudar o resultado
  do jogo em vez de só baratear a simulação;
- **divide o trabalho pela demanda**, igual a demanda enviesa o utility score
  de um agente `active` (pilar 3): quanto mais falta comida, mais gente larga
  a especialização e vai pescar. Sem essa parte (primeira tentativa da
  correção), as duas vilas **madeireiras** morriam enquanto as agrícolas
  ficavam com o estoque no teto — em tela elas sobrevivem porque `fish.js` é
  universal, e era esse caminho que faltava no agregado;
- a pesca leva `BACKGROUND_FISHING_PENALTY = 0.7` por não ser a
  especialização: a madeireira fica pouco acima do empate, sobrevive sozinha
  mas só prospera com comércio — o pilar 4 não vira isenção fora de tela.

### Resultado (mundo novo, loop pausado, avanço manual determinístico)

| | antes | depois |
|---|---|---|
| t=180 | 4 vilas extintas | 70 vivos, 4 vilas |
| t=531 | — | 67 vivos, 4 vilas (15-18 cada) |
| mortes por inanição | 100% | 7 de 85 (8%) |
| idade média de morte | ~100 | 297 |

Equilíbrio estável por 4 minutos simulados contínuos: agrícolas com estoque
perto do teto, madeireiras estáveis em ~40 de comida (o ponto de equilíbrio
pesca+comércio), e a esmagadora maioria das mortes por velhice.

### Técnica de diagnóstico (vale reusar)

Automação não sustenta sessão longa (rAF é throttlado na aba). O que
funcionou: expor `window.__world` e a função `update` temporariamente,
**clicar em pause** pra o rAF parar de interferir, e chamar `update(1/60)`
num laço — 500s simulados em segundos, determinístico e repetível. Sondas
removidas depois; re-adicionar leva 30 segundos e é o caminho mais rápido
pra qualquer bug de balanceamento futuro. Cuidado: passos demais numa só
avaliação estouram o timeout do CDP — quebrar em blocos de ~120s.
