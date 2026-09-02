# STATUS.md — Worldbox Sandbox

Snapshot do estado atual. Sessão iniciada depois da pausa registrada em `1561b59`. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). Commits desta sessão: `1561b59`..`597cf3e` (5 commits, todos pushados) — **mais uma leva de deleções locais não commitadas, ver §0 abaixo, é o item mais urgente**. Contexto de antes desta sessão (reorganização visual completa, especialização de vila, diplomacia dinâmica, minério/construção) não é repetido em detalhe — ver `DESIGN.md` e o histórico de commits até `1561b59`.

## 0.🚨 Estado local diverge do último commit — leia antes de qualquer coisa

O usuário apagou **30 arquivos de `assets/sprites/`** manualmente (fora do git, deleção ainda não commitada — `git status` mostra 30 linhas `D`). O commit `597cf3e` (HEAD) e o remoto ainda têm esses arquivos; só a working tree local está sem eles agora. **Rodando o jogo agora, ele carrega mas com terreno/decoração/civil/minério/predadores (menos Besouro/Fogueira/Cavaleiro/Orc) todos em fallback geométrico** (círculo amarelo, triângulo verde, cor lisa) — confirmado ao vivo, 38 requisições 404 no console, zero erro fatal (o `isSpriteReady()` por-sprite segura bem).

Motivo da deleção (usuário): qualidade abaixo da régua atual (Cavaleiro/Orc/Besouro, craftpix + Tiny RPG). Levantamento completo já feito nesta sessão (ver §7) — **nada foi movido ainda**, aguardando decisão do usuário sobre pack novo pra terreno/decoração/civil (só predador tem substituto pronto, `Tiny RPG Character Asset Pack 02`).

**Não rode `git add`/commit em `assets/sprites/` até essa decisão sair** — commitar agora envia o repo pro estado quebrado.

## 1. O que foi implementado ou alterado nesta sessão

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
| **Sprites de agente/terreno/decoração/minério** | 🔴 **Quebrado localmente** — 30 arquivos apagados, nada substituído ainda (§0) |
| Sprites de predador | 🟡 Substituto identificado (Tiny RPG 02), não recortado/movido ainda |
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

1. **Resolver os sprites apagados (§0) — bloqueia visual, não bloqueia lógica.** Levantamento já feito, decisão do usuário pendente:
   - **Predador**: recortar de `Tiny RPG Character Asset Pack 02` (`Demon_A`/`Blood Monster_A` — mesma família de craftpix do Cavaleiro/Orc, tem Idle/Walk/Attack01/Attack02/Hurt/Death). Decidir: manter 4 espécies de predador com só 2 sprites (repetidos, stats diferentes) ou reduzir pra 2 espécies. Decidir também se troca o Besouro (sobreviveu, mas é da mesma qualidade grosseira dos apagados).
   - **Terreno/decoração/minério/civil**: nenhum pack baixado serve (Kenney é a única fonte de tile e é baixa resolução demais pra render ao lado do Cavaleiro; os 3 packs de personagem humano não têm pose de trabalho nem estilo compatível). Precisa de pack novo — usuário decide se busca ou aceita provisório.
2. **Otimização de FPS** (diagnóstico pronto, ver item 10 de §1): pré-renderizar a camada de terreno estática num canvas offscreen (`drawTiles` some do custo por-frame, vira 1 `drawImage`); mover `scanPerception` pro ritmo de reconsideração (~0.5s) em vez de todo frame; parar de recalcular "ameaça mais próxima" em paralelo em `checkDeath` + 4 ações de combate.
3. **Casas em tiers + rank de vila** — design já aprovado (ver `DESIGN.md` se foi anotado, senão está só nesta sessão do histórico de conversa): 3 níveis por upgrade (tier2 = +ferro, tier3 = +ouro), rank derivado Acampamento/Vila/Cidade. Precisa reconfirmar candidato de arte por tier depois do item 1.
4. **Sessão de jogo real do usuário** (pendente de sessões anteriores, ainda não aconteceu) — só depois dos sprites resolvidos, senão a avaliação visual fica invalidada pelo fallback geométrico.
5. **Retomar brainstorm de features** (mais construções além de casa, histerese guerra↔paz) — só depois do visual estar redondo de novo.

## 6. Coisas pedidas pra lembrar que ainda não são código

- **Casas em tiers**: tier 2 = 30 madeira + 20 pedra + 10 ferro → +8 população líquida (era +5); tier 3 = 50 madeira + 35 pedra + 20 ferro + 10 ouro → +12 população líquida. Upgrade de casa existente, não casa nova. `HOUSE_WOOD_COST`/`HOUSE_STONE_COST` viram tabela por nível; `getPopulationCap` soma por nível de cada `building`; `build.js` ganha regra de nova-vs-upgrade (prioriza nova enquanto população pressiona o teto).
- **Rank de vila**: Acampamento → Vila → Cidade, **derivado** (população ≥20 E pelo menos 1 casa tier 2+), não um recurso separado — só muda o label exibido + 1 evento no feed na transição.
- **Otimização de FPS**: números exatos de referência pra comparar depois de qualquer mudança — zoom=1/50 ativos: drawTiles 6.8ms, percepção 16.7ms; zoom=0.25/200 ativos: drawTiles 86-167ms, percepção 90.9ms. `separation.js` sempre <1ms, não mexer nisso achando que é o problema.
- **Regras de disciplina de trabalho** (§4) — já salvas em memória permanente, mas reforçando aqui: uma frente por vez em sistemas acoplados, sequencial até testado ao vivo, antes de abrir a próxima.
