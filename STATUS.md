# STATUS.md — Worldbox Sandbox

Snapshot do fim da sessão que implementou as fatias 1-10 (ver `DESIGN.md` seção 5) mais uma leva de correções, atualizado na sessão seguinte após consertar o sprite quebrado (§7), adicionar decoração do mapa (§8), completar a fatia 11 — UI de observação (§9) e resolver a lacuna de especialização de vila (§10). Fatias 1-11 completas, mais especialização de vila implementada além do roteiro original. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`).

## 1. O que foi feito nesta sessão

Nesta ordem:

1. `DESIGN.md` e `ARCHITECTURE.md` escritos do zero (design + estrutura de pastas com stubs).
2. **Fatia 1**: mundo em grid procedural, câmera pan/zoom, loop de tempo (pausa/velocidade), 1 agente andando aleatório.
3. **Fatia 2**: necessidades (fome, sono), utility AI básico (`wander`/`eat`/`sleep`).
4. **Fatia 3**: percepção (raio de visão) + memória (com decaimento) — agente só age sobre o que já viu.
5. **Fatia 4**: múltiplos agentes + vila com estoque comunitário (`gather`/`deliver`), demanda influencia o score de todos.
6. **Fatia 5**: ciclo de vida (idade, morte por fome/idade, reprodução). Achado e corrigido um desbalanceamento real em teste: o score de `gather` competia demais com `eat`, e a população inteira morria de fome antes de reproduzir uma vez — reduzido o peso do score de colher/entregar.
7. **Fatia 6**: segunda vila + território, relação neutro/hostil (depois superada pela fatia 7).
8. **Fatia 7**: clãs + diplomacia (`war`/`tense`/`neutral`/`allied`, tratados) — efeito real: `wander`/`gather`/`eat` evitam território de clã em guerra/tensão.
9. **Fatia 8**: comércio entre vilas (`village/trade.js`, no nível da vila, não do agente) — só flui entre clãs aliados ou com tratado `trade` assinado.
10. **Correções fora da ordem das fatias** (reportadas pelo usuário jogando): pathfinding real A* (`world/pathfinding.js` + `agent/movement.js`) substituindo movimento em linha reta — agentes cortavam por cima de água/montanha; montanha passou a bloquear (`isWalkable`); seleção de agente por clique (`uiState.selectedAgentId`) — antes o HUD sempre mostrava `world.agents[0]`, que trocava de identidade sem aviso quando esse agente morria; sprite (`human.png`, depois substituído) no lugar do círculo.
11. **Ajustes de mapa/câmera** (pedido do usuário): mundo 120→220 tiles, geração com falloff de borda (água garantida nas bordas — sempre uma ilha cercada de oceano), tile de praia novo, câmera travada nos limites do mapa (pan e zoom-out não passam da borda).
12. **Fatia 9**: combate (`fight`/`flee` como ações de utility AI), percepção de outros agentes (`agent.perception.agents`), vilas em guerra nascem mais perto (senão nunca se encontrariam). Achado e corrigido: a regeneração de vida por fome ok desfazia o dano de combate todo tick — agora só regenera sem inimigo por perto.
13. Animação de andar (2 quadros, alterna só quando o agente se move de verdade) + recorte de sprite por canal alpha calculado em runtime (não hardcoded), pra sobreviver a trocas de arte futuras.
14. **Fatia 10**: índice espacial (`world/spatialIndex.js`, buckets de grid) + LOD (`simulation/lod.js`, agentes longe da câmera rodam em modo agregado). `VILLAGE_POP_CAP` subiu de 12 para 30.
15. `COMO-RODAR-WINDOWS.md` removido (pedido do usuário — sem uso com o link do GitHub Pages).
16. 8 sprites novos de variação adicionados em `assets/sprites/` (pele clara/escura × homem/mulher) — **só os arquivos, ainda sem integração no código** (ver §6, próximo passo #1).

## 2. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain | ✅ Funcionando. 5 tipos de tile, borda de oceano garantida. |
| Time loop | ✅ Funcionando. |
| Camera/Render | ✅ Funcionando, travada nos limites do mapa. |
| Perception | ✅ Funcionando (tiles + agentes, via índice espacial). |
| Memory | ✅ Funcionando. |
| Needs | ⚠️ Parcial. Só fome e sono das 5 necessidades originais do pitch (segurança/social/pertencimento nunca entraram — não são fatia de ninguém no `DESIGN.md` atual). |
| Utility AI / Decision | ✅ Funcionando. 8 ações: `wander`, `eat`, `sleep`, `gather`, `gatherWood`, `deliver`, `fight`, `flee`. |
| Pathfinding | ✅ Funcionando (A*, testado contra obstáculos e em 60 pares aleatórios). |
| Village (estoque/demanda/população) | ✅ Funcionando. |
| Clan/Diplomacy | ✅ Funcionando (postura, tratados, efeito real). Sem UI pro jogador propor tratado manualmente — só acontece no setup inicial do mundo. |
| Trade/Economy | ✅ Observável agora — especialização de vila (ver §10) faz a demanda divergir de verdade entre as duas vilas, então o comércio de comida/madeira flui nos dois sentidos quando a diplomacia permite. |
| Combat | ✅ Funcionando (engajar/fugir, dano mútuo, morte). Só reativo — sem ataque ofensivo deliberado, só defesa quando os territórios se aproximam. |
| Life-cycle | ✅ Funcionando. |
| Simulation LOD | ✅ Funcionando, validado só via simulação sintética (a população real do jogo, cap 30/vila, não é grande o suficiente pro jogador notar diferença de performance sozinho). |
| UI/HUD | ✅ HUD básico (ação/idade/fome/sono/vida) + inspetor (fatia 11, ver §9): scores de decisão, estoque/demanda/população da vila, postura/tratados do clã. |
| Sprites de agente | ✅ Consertado — 4 variantes (pele clara/escura × homem/mulher), ver §7. |
| Decoração do mapa (árvores/plantas/casas) | ✅ Placeholder geométrico, ver §8. Arte real ainda não existe. |
| Animais no mapa | ❌ Não iniciado — decisão já tomada (decorativo simples primeiro; "vagando sem IA" fica pra outra leva quando tiver arte pronta). |

## 3. Bugs / comportamentos estranhos não corrigidos

1. Não testei a animação de andar nem o LOD visualmente ao vivo de forma confiável — o Chrome automatizado usado nos testes throttla o `requestAnimationFrame` de abas em segundo plano. Validei ambos via simulação direta (chamando as funções fora do loop do navegador) em vez de observar o jogo rodando. Vale conferir manualmente numa aba em primeiro plano. (A integração dos 8 sprites, §7, foi testada numa aba em primeiro plano e confirmou que a animação de andar continua funcionando visualmente.)
2. Combate é só reativo — vilas em guerra só se encontram organicamente perto da fronteira (por isso nascem mais perto). Não tem "invadir a vila inimiga" nem qualquer comportamento ofensivo deliberado.

## 4. Decisões técnicas e o motivo

- **Combate e fuga são ações de utility AI** (`agent/actions/fight.js`, `flee.js`), não um sistema à parte — consistente com o resto (`gather`, `eat` etc. já seguiam esse padrão).
- **Comércio é decisão da vila, não do agente** (`village/trade.js`, chamado uma vez por tick). As vilas ficam bem além do raio de percepção/memória de qualquer agente (70-100 tiles, ou 25-45 se em guerra), então tratar como "conhecimento institucional" da vila evita violar a regra de que agentes só agem sobre o que perceberam.
- **Pathfinding real (A*) foi adicionado fora da ordem das fatias**, como correção de bug crítico que o usuário reportou jogando (agentes atravessando água/montanha em linha reta). O `DESIGN.md` já listava Pathfinding como sistema necessário desde o primeiro rascunho — eu tinha simplesmente deixado passar em todas as fatias 1-8. Registrei essa lição numa memória do projeto (`design_doc_gaps.md`).
- **Vilas destinadas à guerra nascem mais perto** (`WAR_VILLAGE_MIN/MAX_DIST` = 25-45 tiles) do que vilas neutras/aliadas (`SECOND_VILLAGE_MIN/MAX_DIST` = 70-100 tiles) — decisão minha, não pedida explicitamente, mas necessária: sem isso, dado o raio de percepção dos agentes (8 tiles), duas vilas em guerra nunca se encontrariam fisicamente e o sistema de combate inteiro seria inobservável.
- **LOD classifica agentes só pela distância à câmera, recalculado do zero a cada tick** (sem lembrar "quem tava em foco antes") — mais simples, sem transição de estado a tratar entre ativo/background.
- **Agentes em "background" (fora do foco de LOD) têm as necessidades empurradas de volta pra perto do topo, em vez de decair normalmente** — decisão minha pra evitar que a vila inteira morra de fome só por estar fora da tela; abstrai como "eles se viram sozinhos" sem simular como.
- **Sprites recortados por canal alpha em runtime, não coordenadas fixas no código** (`agentRenderer.js:computeContentBounds`). Decisão deliberada: o usuário já trocou o(s) arquivo(s) de sprite do agente 3 vezes nesta sessão (`humano.png` → `human.png` → `Human1/2.png` → os 8 arquivos de variação atuais), e cada arte nova vem com espaço vazio/proporção diferentes ao redor do personagem. Coordenadas fixas quebrariam a cada troca; o recorte automático sobrevive.
- **`VILLAGE_POP_CAP` 12→30** junto com a fatia de LOD — sem espaço de população pra crescer, o ganho de performance do LOD não teria como importar numa sessão de jogo longa.
- **Escala de distância entre vilas dobrou** (~35-77 → 70-100 tiles pra neutro/aliado) quando o mapa cresceu de 120→220 tiles, mantendo a proporção original.

## 5. Coisas pedidas pra lembrar que ainda não são código

- **Animais no mapa**: decoração parada por enquanto (mesmo tratamento de árvore/planta/casa); "vagando sem IA de utilidade" fica pra uma leva futura, só quando a arte estiver pronta. Não implementar comportamento de bicho ainda.
- Visuais em geral são provisórios — o amigo do usuário vai substituindo a arte aos poucos, um pedaço de cada vez, direto no disco (não via git). Isso já está registrado em `memory/art_pipeline.md` (memória do projeto, fora do repositório) — não precisa reler o repo pra saber disso, mas vale saber que a memória existe.

## 6. Próximos passos concretos, em ordem

Todas as 11 fatias do `DESIGN.md` (seção 5) estão implementadas agora. O que resta é lacuna/polish, não fatia pendente:

1. **Trocar o placeholder geométrico da decoração pela arte real** quando ela existir — reaproveitar `world.decorations` (dados) e só reescrever `render/decorationRenderer.js` (ver §8), igual ao pipeline dos sprites de agente.

2. **Diplomacia dinâmica entre vilas/clãs** (pedido explícito do usuário, ver §10) — hoje postura de clã e tratados são decididos uma vez no world-gen e nunca reavaliados. O usuário quer que vilas reajam de verdade à sua situação econômica ao longo do tempo: uma vila desfavorecida (sem parceiro de comércio, ou parceiro que a abandonou por um acordo melhor) poderia entrar em colapso interno, romper um tratado, propor um novo a outro clã, ou escalar pra guerra e tentar roubar o suprimento que falta. É essencialmente um novo sistema — uma camada de utility AI institucional (vila/clã), paralela à do agente — não um ajuste pontual. Precisa de sessão de design própria antes de codar: que sinais disparam uma reavaliação, o que "caos interno" significa mecanicamente, se village/clan.js ganha um "reconsider" análogo ao `agent/decision.js`, se 2 vilas bastam pra ficar interessante ou se pede uma 3ª pra dar opção real de troca de parceiro.

3. **Ligar a fome individual do agente ao estoque da vila** (ver `DESIGN.md` §6, limite conhecido) — hoje `eat.js` sempre come direto do ambiente, então uma vila guerreira sem comida nunca faz seus agentes passarem fome de verdade a nível individual, só a nível institucional (reprodução travada). Mudança maior, mexe no loop de sobrevivência de todo agente; avaliar junto com o item 2 (uma vila em colapso econômico dinâmico é o cenário onde essa fome individual realmente importaria).

## 7. Sprites de variação integrados (feito nesta sessão)

Consertado o bug crítico do fim da sessão anterior (`Human1.png`/`Human2.png` deletados sem substituição no código):

- `agent/agent.js`: `createAgent` ganhou `skinTone` (`'light'` | `'dark'`, default `'light'`) e `gender` (`'man'` | `'woman'`, default `'man'`).
- `main.js:spawnVillage`: cada fundador sorteia os dois 50/50 via `world.rng.next()`.
- `lifecycle.js:tryReproduce`: filho herda `skinTone` de um dos dois pais (50/50, não sempre o mesmo) e `gender` 50/50 independente.
- `render/agentRenderer.js`: `VARIANT_FILE_PREFIX` mapeia as 4 combinações (`light-man`→`WMan`, `light-woman`→`WGirl`, `dark-man`→`BMan`, `dark-woman`→`BGirl`) para pares de frames `[parado, andando]`; `computeContentBounds` (recorte por alpha) reaproveitado sem mudança para as 8 imagens; `drawAgents` escolhe o par por `${agent.skinTone}-${agent.gender}`.
- Testado: as 8 imagens carregam com HTTP 200 (sem 404), sem erros de console; visual ao vivo numa aba em primeiro plano confirmou recorte consistente e animação de andar funcionando; sorteio 50/50 e herança confirmados rodando o código diretamente (200 amostras cada, distribuição ~50/50 nas duas pontas).
- Commitado e enviado pro `main` (site ao vivo já atualizado).

## 8. Decoração do mapa com placeholder geométrico (feito nesta sessão)

Sem arte ainda (usuário optou por placeholder pra não esperar):

- `world/decorations.js`: `generateDecorations(world)` gera a lista de decorações uma vez, depois de o terreno e as duas vilas existirem (chamado em `main.js` logo antes de criar a câmera) — árvore em tile de floresta (`DECORATION_TREE_CHANCE` = 8%) e planta em tile de grama (`DECORATION_PLANT_CHANCE` = 4%), pulando qualquer tile dentro do raio de "clareira" de alguma vila (`DECORATION_VILLAGE_CLEARING_RADIUS` = mesmo raio do território, `utils/constants.js`); casas (`DECORATION_HOUSES_PER_VILLAGE` = 6 por vila) espalhadas dentro dessa clareira. Usa uma rng própria (`createRng('${seed}-decorations')`) pra ser determinística pela seed sem consumir a sequência da rng de gameplay do mundo (`world.rng`).
- `world/world.js`: `world.decorations` inicializado vazio em `createWorld`, populado depois em `main.js`.
- `render/decorationRenderer.js` (novo): desenha formas geométricas simples — triângulo verde pra árvore, círculo pequeno pra planta, retângulo com telhado triangular pra casa — com culling por viewport igual ao `tileRenderer.js`. Comentário no topo do arquivo já marca que é o único arquivo a reescrever quando a arte real chegar (dado de `world.decorations` não muda).
- `render/renderer.js`: `drawDecorations` entra na ordem de desenho entre `drawVillages` e `drawAgents` — decoração fica no chão, agentes desenham por cima.
- Testado ao vivo numa aba em primeiro plano: árvores nas florestas, plantas espalhadas na grama, casas dentro do território da vila, sem sobrepor agentes de forma confusa, sem erros de console.

## 9. Fatia 11 — UI de observação (feito nesta sessão)

Painel novo, `#inspector` (topo direito, ao lado do HUD básico já existente no topo esquerdo). Não introduz seleção própria — reaproveita `uiState.selectedAgentId` (o mesmo clique que já move o `hud.js`), então só funciona com um agente selecionado, não com clique direto em vila/clã (ver §6, considerar depois).

- `agent/decision.js:reconsider`: passou a gravar `agent.lastScores = scores` (snapshot dos scores de todas as ações candidatas na última reconsideração) — só pra leitura da UI, não influencia a decisão em si. Campo `lastScores: null` adicionado ao factory em `agent/agent.js`.
- `ui/inspector.js` (era stub, agora implementado): `createInspector(container)` retorna `{ update(agent, selectionState, world) }`, chamado em `main.js` junto com `hud.updateAgentStatus`. Mostra, quando um agente vivo está selecionado:
  - **Agente**: lista de scores de decisão ordenada do maior pro menor, ação atual destacada em verde.
  - **Vila**: nome, população/cap (`VILLAGE_POP_CAP`), estoque/capacidade/demanda de cada recurso.
  - **Clã**: nome, postura (`clan/clan.js:getStance`) com cada outro clã do mundo, lista de tratados assinados (tipo + com qual clã).
  - Espelha os três estados do `hud.js` (nada selecionado / vivo / morreu).
- `index.html`/`css/style.css`: div `#inspector` nova, painel fixo topo-direito, mesmo estilo visual do HUD (fundo escuro translúcido, borda cinza).
- Testado ao vivo numa aba em primeiro plano: selecionado um agente colhendo recurso — painel mostrou `colhendo` no topo com 0.55, as outras 6 ações com score correto (a maioria 0.00), vila com `5/30` população e `food 0/100 · demanda 100%`, clã mostrando postura `guerra` com o clã vizinho e "nenhum tratado assinado". Deseleção (clique em área vazia) volta ao estado neutro corretamente. Sem erros de console.
- **Seleção direta de vila** (adicionado na sequência, mesma sessão): clicar dentro do círculo de território de uma vila sem acertar um agente seleciona a vila (`uiState.selectedVillageId`), mostrando só as seções de vila/clã no inspetor (sem seção de agente); selecionar um agente depois limpa a seleção de vila e vice-versa (mutuamente exclusivos, `input/inputHandler.js:selectAt`). Anel de seleção branco no marcador da vila (`villageRenderer.js`), igual ao do agente. Testado ao vivo: clique num ponto vazio do território mostrou vila+clã sem seção de agente; clicar depois num agente trocou pra seleção de agente (com fallback "sem dados ainda" observado num agente sem `lastScores` ainda); clique fora de tudo deselecionou os dois. Sem erros de console em nenhum dos três casos.
- Commitado e enviado pro `main` (site ao vivo já atualizado) — ver commits desta sessão.

## 10. Especialização de vila (feito nesta sessão)

Resolve a lacuna do `DESIGN.md` §6 (pilar 4: "vila guerreira que não produz comida depende de vila agrícola"). Perguntei ao usuário antes de codar (madeira como segundo recurso, sorteio de especialização, profundidade da mudança, indicadores visuais) — as respostas e a decisão tomada em cada uma estão documentadas abaixo.

- **Segundo recurso: madeira** (`wood`), colhida em tiles de floresta — reaproveita o modelo de dados conceitual original do `DESIGN.md` (`food/wood/stone`) e o tema das árvores de decoração (§8).
- **Especialização sempre complementar**: o usuário pediu sorteio 50/50 independente pras duas vilas, mas um 50/50 puro arriscava 50% dos mundos saírem com as duas iguais (nenhuma produzindo o outro recurso, apagando a interdependência que é o objetivo). Ajustei pra sortear qual das duas fica com qual papel, garantindo sempre uma de cada (`main.js`: `[homeSpecialization, rivalSpecialization] = rng.next() < 0.5 ? ['food','wood'] : ['wood','food']`) — decisão minha, não pedida literalmente, mas necessária pro pilar funcionar de verdade.
- **Profundidade: nível vila** (o usuário não escolheu entre as duas opções que propus, mas descreveu uma visão bem mais ambiciosa de diplomacia dinâmica — ver §6 item 2 e a nota abaixo). Implementei a fundação de nível vila agora: estoque/demanda/reprodução/comércio reagem de verdade à especialização; fome individual do agente continua vindo do ambiente, sem mudança (ver `DESIGN.md` §6, limite conhecido).
- **Visual: sim** — label da vila no mapa (`villageRenderer.js`) ganhou ícone de papel (🌾 agrícola / ⚔️ guerreira) e estoque de madeira (🪵) ao lado do de comida; inspetor (`ui/inspector.js`) ganhou o papel por extenso no título da seção de vila (`Vila — Nome (agrícola/guerreira)`) — a lista de estoque em si já era genérica (`Object.keys(village.capacity)`), então mostrou madeira automaticamente, sem mudança.
- **Implementação**: `village/village.js` — `createVillage` ganhou `specialization` (default `'food'`); toda vila tem `stock`/`capacity`/`demand` dos dois recursos, especializada ou não (senão `village/trade.js`, que já era genérico por recurso desde a fatia 8, nunca teria o recurso "de fora" pra receber). `agent/agent.js` — `carryingType` novo (`'food'`/`'wood'`), diz onde `deliver.js` (agora genérico) descarrega a carga. `agent/actions/gather.js` — só pontua se `village.specialization === 'food'`. `agent/actions/gatherWood.js` (novo, espelha `gather.js` mas em tiles de floresta) — só pontua se `village.specialization === 'wood'`. Registrado em `actionTypes.js`; rótulo novo em `hud.js`/`ui/inspector.js` (`gatherWood` → "colhendo madeira").
- **Testado ao vivo, numa aba em primeiro plano, rodando em velocidade 4x por ~30s de tempo real (~2min de tempo simulado)**: confirmado sem erros de console; vila food-especializada acumulou comida (`4/100`) e nunca madeira; vila wood-especializada acumulou madeira (`3/100`, crescendo) e nunca comida — demanda de comida travada em ~100% pra ela, exatamente o comportamento esperado. Achado no processo (não é bug): nos primeiros ~30-60s de mundo novo, os agentes recém-criados ainda não tinham colhido nada porque fome/sono (que decaem de 100 a 0 em 60-90s) dominam o utility score nesse período — é o mesmo comportamento documentado na fatia 5 (`GATHER_SCORE_WEIGHT` < 1, sobrevivência pessoal vence trabalho comunitário), só precisei esperar mais tempo de simulação pra observar o gather de madeira vencer.
- Commitado e enviado pro `main` (site ao vivo já atualizado) — ver commits desta sessão.

**Nota sobre o pedido de diplomacia dinâmica**: ao responder a pergunta sobre profundidade, o usuário descreveu um sistema bem maior — vilas trocando de parceiro comercial por um acordo melhor, colapso interno de uma vila desfavorecida, decisão de atacar pra roubar suprimento, "incluir bastante opções pra IA emergente escolher". Isso é um sistema novo (diplomacia/economia reavaliada ao longo do tempo, não só no world-gen), não um ajuste da especialização de vila — registrado como próximo passo #2 em vez de implementado nesta rodada, porque merece sua própria conversa de design (mecanismos de "caos interno", com que frequência uma vila reconsidera, se 2 vilas bastam pra ficar interessante).
