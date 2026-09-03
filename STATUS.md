# STATUS.md — Worldbox Sandbox

Snapshot do estado atual. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). `git log` é a fonte de verdade pro histórico detalhado; este arquivo é o resumo do estado final.

## 0. O tema desta sessão

O usuário reportou jogando: **"os NPCs não exploram o mapa, ficam limitados a fazer coisas da vila, não vejo soldados, não vejo grupos de exploração"**. Investigar isso acabou desenterrando uma cadeia de causas que também explicava duas pendências antigas do próprio STATUS.md — e revelou que uma delas estava apontando pro lugar errado há sessões.

Ordem de trabalho da sessão: as pendências antigas primeiro (contagem no inspetor, construção travada), depois o pedido novo.

## 1. O que foi implementado nesta sessão

### 1.1 Contagem de casas no inspetor (`8f54dee`)
Bug §3.1 da versão anterior deste arquivo. `village.buildings` passou a conter todos os tipos quando os prédios viraram entidades, mas a linha de população continuou usando `.length`. Filtrado por `type === 'house'`.

### 1.2 A* com heap binário + `wander` com rumo persistente (`d804d75`)
**`world/pathfinding.js` tinha um gargalo escondido há muito tempo:** o conjunto aberto era um array reordenado por completo (`open.sort`) **a cada iteração** do A*. Enquanto quase todo alvo era vizinho (o `wander` antigo sorteava um tile do próprio raio de percepção), a lista ficava curta e o custo passava despercebido. Assim que alvos distantes viraram comuns, uma busca que estoura o orçamento de 3000 nós passou a ordenar milhares de elementos milhares de vezes. **Medido: 33x o tempo total de simulação (540ms → 17693ms por 5s simulados); com min-heap, de volta a 530ms.** O contador de orçamento também subia em entradas obsoletas descartadas, então o orçamento real era menor e variável — agora conta expansões.

**`wander.js`** sorteava alvo de forma isotrópica dentro da percepção: passeio aleatório puro (deslocamento ~√N), ainda resetado ao centro da vila toda vez que a fome puxava o agente de volta. Agora o agente mantém um rumo (`agent.wanderHeading`) que persiste entre alvos; contra obstáculo, adota a direção do que sobrou (contorna a costa em vez de insistir).

### 1.3 Exploração: ação `explore`, expedições em grupo, quadro de descobertas (`c188913`)
A cadeia completa que impedia os moradores de sair de um disco de ~11 tiles num mapa de 220 tinha **quatro elos**:

1. `wander` só escolhia alvo dentro da percepção (resolvido em 1.2 — necessário, insuficiente sozinho);
2. o agente nunca tinha **motivo** de ir longe nem alvo além do que enxerga;
3. memória individual decai em ~2min, então uma descoberta era esquecida antes de virar ação, e morria com o descobridor;
4. membro de expedição sairia da tela e o LOD o rebaixaria a `background`, que **não anda** — toda expedição congelaria na borda da viewport.

- **`agent/actions/explore.js`** — alvo a 45 tiles do centro, pontuado por carência institucional (a vila tem demanda por um minério e não conhece nenhum depósito dele). Pilar 3 do design aplicado a território.
- **`village/expedition.js`** — 1 a 3 moradores saem juntos. Coordenação mínima: dividem um **alvo**, não ordens; cada um anda por conta própria até um ponto do anel em volta dele. Sem líder, e nenhum agente lê o estado de outro. Sair do grupo também é emergente — quem deixa de escolher `explore` é só removido por `prune`.
- **`village/knowledge.js`** — quadro de descobertas. Um local só entra quando quem o viu chega **fisicamente** ao centro da vila (decisão do usuário, perguntada antes: "só o que foi entregue pessoalmente"). Conhecimento continua viajando no corpo de alguém; o que muda é durar mais que a memória individual e poder ser contado.
- **`simulation/lod.js`** — membro de expedição roda full-fidelity mesmo fora da tela.
- **`world/world.js`** — `expeditionRng` própria (padrão de `decorations`/`predators`).

### 1.4 Construção destravada (`68dc783`)
Item 2 da lista de pendências antiga. **Eram quatro problemas independentes, e nenhum era o custo da pedra** (ver §2 abaixo, é o achado mais importante da sessão).

### 1.5 Guarnição permanente + patrulha (`920d713`)
`updateWarriorRoles` revertia todo mundo pra `'civilian'` ao voltar à paz e só era chamada nas transições de postura. Como o mundo passa a maior parte do tempo em paz, o efetivo militar era **zero quase sempre** — daí "não vejo soldados". E, mais grave: **ninguém nunca enfrentava predador**, porque `fightPredator.js` exige `role === 'warrior'`.

Agora existe guarnição de paz (15% dos adultos, piso de 1 por vila; 30% em guerra), reavaliada a cada reconsideração do clã. Mais `agent/actions/patrol.js` — o guerreiro ronda o perímetro do território em vez de vagar, que é o que faz ele **perceber** o que se aproxima.

## 2. O achado mais importante: por que nada era construído

O STATUS.md anterior listava como próximo passo *"decidir entre baixar `HOUSE_STONE_COST` ou aumentar a disponibilidade de pedra"*. Medindo, um mundo com **64 de pedra em estoque terminava com zero prédios construídos** — pedra nunca foi o gargalo. E `HOUSE_STONE_COST` era **código morto** desde que os prédios ganharam tipo próprio (os custos moram na tabela `BUILDING`): mexer nela não teria efeito nenhum. Removida.

Os quatro problemas reais, todos achados instrumentando a decisão em vez de lendo o código:

1. **Vazamento de recurso em `build.js` (o decisivo).** O custo era debitado **na chegada** ao canteiro, mas a obra exige 15s de trabalho **contínuo**. Toda interrupção (fome, predador) fazia `decision.js` zerar `agent.target`; o `step` seguinte escolhia outro canteiro, resetava `buildProgress` e **debitava de novo**. Cada tentativa abortada queimava o custo inteiro sem deixar nada — medido: 17-29 de madeira contra custo 25, 175 agente-ticks escolhendo construir, zero prédios em 5 mundos. Agora debita **ao concluir**.
2. **Score pela pressão populacional sobre um teto inalcançável.** Vila de 19 pontuava 0.32 contra os 0.55 de `gather`. Agora pontua pela carência **do prédio escolhido** (`buildings.js:buildingNeed`), e `nextBuildingType` devolve `null` quando nada está apertado — antes o fallback era `'house'`, contradizendo o "carência real" do próprio comentário do módulo.
3. **`VILLAGE_POP_CAP` 30** contra 8 fundadores e população que estabiliza em 15-19: o teto nunca era encostado. Baixado pra **18**. (14 foi testado e era um teto **sem escada** — população média caiu pra 43.)
4. **Casa custava pedra**, e pedra depende de achar cordilheira — a exploração achou uma em só 2 de 5 mundos. Casa passa a custar **só madeira**; pedra continua sendo o gargalo do celeiro e do depósito, os prédios que ampliam estoque.

## 3. A regra que este projeto aprendeu três vezes

`village/stock.js:hasFoodSurplus`, agora declarada num lugar só:

> Toda ação de **desenvolvimento** (explorar, minerar, construir, patrulhar) que ganha peso alto o bastante pra vencer `gather`/`fish` acaba matando de fome as vilas **madeireiras**, que não produzem comida própria.

Aconteceu com quatro ações diferentes nesta sessão, cada uma medida como extinção de vila antes de ser corrigida. A condição é sobre **estoque**, não sobre `distress`: a versão com `distress` desligava o desenvolvimento **permanentemente**, porque as quatro vilas vivem em déficit leve e crônico ao mesmo tempo (distress de 8 a 125s medido simultaneamente).

## 4. Metodologia de medição (vale reusar)

- **`?seed=x` na URL fixa o mundo** (`main.js`). Antes o seed era `Date.now()` e cada reload gerava um mapa diferente — qualquer A/B comparava duas coisas que não são a mesma.
- **`window.__wb`** expõe `world`/`camera`/`loop`/`update` só pra diagnóstico. O rAF é throttlado em aba de automação, então confirmar comportamento ao vivo exige pausar o loop e avançar `update(dt)` na mão.
- **Comparação de seed único não vale pra balanceamento.** Qualquer mudança de comportamento desvia a sequência de rng e diverge a trajetória inteira; duas partidas com a mesma seed deixam de ser comparáveis. O jeito honesto é **distribuição sobre vários seeds** (usei 5-6 × 180s), rodando cada mundo num `<iframe>` oculto pra não precisar recarregar a aba.
- Cada rodada de 180s leva ~30s de tempo real; um lote de 5 seeds não cabe num único `Runtime.evaluate` (timeout de 45s) — rodar em background acumulando em `window.__res` e consultar depois.

## 5. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain, Time loop, Camera/Render | ✅ Funcionando |
| **Pathfinding** | ✅ Funcionando — A* com heap binário, 33x mais rápido no pior caso |
| Terreno e decoração (procedural) | ✅ Funcionando |
| Prédios de vila | ✅ Funcionando — **e agora efetivamente construídos** (2.4 casas/mundo em 180s; antes: sempre zero) |
| Perception, Memory, Utility AI/Decision | ✅ Funcionando |
| **Exploração / expedições** | ✅ Funcionando — 1-3 membros, quadro de descobertas populado em 4 de 6 mundos |
| **Guarnição / patrulha** | ✅ Funcionando — 7 guerreiros/mundo em paz (antes: zero) |
| Reserva de tile / timer de travamento | ✅ Funcionando |
| Village/Clan/Diplomacy/Trade | ✅ Funcionando |
| Combat (agente-vs-agente) | ✅ Funcionando |
| **Combat (agente-vs-predador)** | ✅ Agora acontece em tempo de paz — antes os 24 predadores eram incontestados |
| Life-cycle, reprodução | ✅ Funcionando |
| Simulation LOD | ✅ Funcionando — com exceção para membros de expedição |
| SpriteManager | ✅ Em uso por predador e agente |
| UI/HUD/Inspetor/Feed | ✅ Funcionando |
| Necessidades sociais/segurança/pertencimento | ❌ Não iniciado (só fome/sono existem) |
| `agent.traits` | ❌ Não iniciado |
| `defense_pact` (efeito real) | ❌ Não iniciado |
| LOD de renderização por zoom | ❌ Não iniciado — `ROADMAP.md` §2.3 |

## 6. Bugs / limitações conhecidas

1. **População média caiu de 57.6 pra ~50** (5 seeds × 180s) desde o início da sessão. É uma troca deliberada — parte da mão de obra passou a ir pra construção, exploração e patrulha, que antes não existiam. Como casa aumenta o teto de população, a **expectativa** é a população ultrapassar o baseline em partidas mais longas que 180s. **Não verificado** — é o próximo teste natural.
2. **Celeiro e depósito nunca foram construídos** em nenhum teste (só casas). Os dois dependem de pedra, e a exploração acha cordilheira em ~40% dos mundos. Não é bug, mas a progressão de infraestrutura ainda é rara.
3. **Exploração não acha montanha em ~60% dos mundos.** O alvo é um ângulo sorteado a 45 tiles; nada garante que aponte pra uma cordilheira. Um viés de direção (ex.: preferir onde ainda não se foi) resolveria melhor.
4. **`granary` é prédio fundacional e conta no `nextBuildingType`** — a métrica de "celeiros construídos" precisa descontar os 4 iniciais.
5. Elfo sem arte própria (cai no Soldier genérico) — aceito há várias sessões.
6. Orc de perfil destoa visualmente — aceito, pouco tempo de tela.
7. Postura de guerra/paz ainda pode alternar com frequência que parece volátil numa sessão longa — não recalibrado.
8. rAF é throttlado em aba de automação — limitação de ambiente, ver §4.

## 7. Próximos passos concretos, em ordem

1. **Sessão de jogo real do usuário, mais longa que 180s** — é a confirmação que falta pra quase tudo desta sessão. Especificamente: a população ultrapassa o baseline quando as casas se acumulam? Dá pra ver uma expedição saindo e voltando? O soldado patrulhando lê bem?
2. **Viés de direção na exploração** (§6.3) — fazer a expedição preferir setores ainda não visitados em vez de ângulo puramente sorteado. É o que faria pedra (e portanto celeiro/depósito) deixar de ser sorte.
3. **Confirmar guerra/caçada orgânica ao vivo** com a animação nova de ataque/morte — herdado da sessão passada, ainda não visto numa luta real.
4. Se algo incomodar visualmente, as paletas de terreno estão isoladas em `render/terrain/palette.js`.
5. **LOD de renderização por zoom** (`ROADMAP.md` §2.3) — sem urgência.

## 8. Coisas pedidas pra lembrar que ainda não são código

- Os quatro sistemas grandes registrados em `ROADMAP.md` §2.5 (evolução genética, tecnologia emergente, sucessão de liderança, construção adaptada ao bioma) continuam **sem prioridade e sem design** — não puxar nenhum sem uma conversa de design própria antes.
- Decisões do usuário nesta sessão, perguntadas antes de implementar: quadro de descobertas **só com o que foi entregue pessoalmente** (não registro ao ver); guarnição fixa **com** patrulha; grupos de exploração **junto** com a ação de explorar, não numa rodada depois.
