# STATUS.md — Worldbox Sandbox

Snapshot do fim da sessão que implementou as fatias 1-10 (ver `DESIGN.md` seção 5) mais uma leva de correções, atualizado na sessão seguinte após consertar o sprite quebrado (§7), adicionar decoração do mapa (§8), completar a fatia 11 — UI de observação (§9), resolver a lacuna de especialização de vila (§10), implementar diplomacia dinâmica entre clãs (§11), corrigir bugs reportados jogando — LOD/câmera/robustez do loop (§12) e começar a evolução da civilização — minério universal (§13). Fatias 1-11 completas, mais especialização de vila, diplomacia dinâmica e evolução da civilização (em andamento) implementadas além do roteiro original. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`).

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
| Utility AI / Decision | ✅ Funcionando. 9 ações: `wander`, `eat`, `sleep`, `gather`, `gatherWood`, `mine`, `deliver`, `fight`, `flee`. |
| Pathfinding | ✅ Funcionando (A*, testado contra obstáculos e em 60 pares aleatórios). |
| Village (estoque/demanda/população) | ✅ Funcionando. |
| Clan/Diplomacy | ✅ Funcionando, agora **dinâmico** (ver §11): clãs reavaliam guerra/paz/comércio/troca de parceiro periodicamente, reagindo à economia real, não só postura fixada no world-gen. Mundo agora com N vilas/clãs (`VILLAGE_COUNT=4`, ver §11), não mais só 2. |
| Trade/Economy | ✅ Observável — especialização de vila (ver §10) faz a demanda divergir de verdade entre as vilas; comércio flui nos dois sentidos quando a diplomacia permite, e agora é a própria diplomacia dinâmica (§11) que propõe/rompe tratados de comércio, não só o setup inicial. |
| Combat | ✅ Funcionando (engajar/fugir, dano mútuo, morte). Só reativo — sem ataque ofensivo deliberado; guerra agora pode ser declarada dinamicamente por desespero econômico (§11), mas sem efeito de saque — ver §6 próximos passos. |
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

Todas as 11 fatias do `DESIGN.md` (seção 5) estão implementadas agora. Evolução da civilização (§8, `DESIGN.md`) está em andamento — minério feito, construção e papéis visuais são os próximos:

1. **Construção de verdade** (evolução, em andamento — ver §13) — `village.buildings` (campo já reservado, `village.js`) fica vazio até agora. Precisa de uma ação nova (`agent/actions/build.js`, mesmo padrão de `gather`/`mine`): consome madeira+pedra do estoque da vila, progresso acumulado por tempo trabalhado, e ao completar adiciona uma construção com efeito mecânico real — proposta: cada casa aumenta o teto de população daquela vila especificamente (hoje `VILLAGE_POP_CAP` é um número global fixo, `lifecycle.js`).

2. **Papéis visuais** (evolução, próximo — ver §13) — usuário confirmou: sprites de trabalhador/guerreiro por AÇÃO corrente (minerando, construindo, lutando, etc.), não por clã/facção — qualquer vila tem os dois papéis. Tem uma leva de arte nova ainda não integrada em `assets/Assets-testes-para-o-claude-testar/` (Orc/Elfo/Cavaleiro/Componês com poses de ação) — perguntar ao usuário antes de usar, já que é conteúdo novo do amigo dele.

3. **Ataque ofensivo/saque** (pedido explícito do usuário, parte da diplomacia dinâmica — ver §11) — guerra hoje pode ser declarada dinamicamente por desespero econômico, mas combate continua só reativo (defesa quando territórios se cruzam). Falta a ação de saque de verdade: agentes marcham deliberadamente até a vila inimiga (`village.raidTargetVillageId`, campo já reservado em `village.js`) e saqueiam estoque, reaproveitando `deliver.js` (genérico por `carryingType`) pro transporte de volta. Combate em rota emergiria sozinho do sistema de `fight`/`flee` já existente, sem plumbing extra.

4. **Trocar o placeholder geométrico da decoração pela arte real** quando ela existir — reaproveitar `world.decorations` (dados) e só reescrever `render/decorationRenderer.js` (ver §8), igual ao pipeline dos sprites de agente. A leva de arte nova (item 2) inclui sprites de decoração (água, arbustos, palmeira, pinheiro) — pode ser a mesma conversa.

5. **Ligar a fome individual do agente ao estoque da vila** (ver `DESIGN.md` §6, limite conhecido) — hoje `eat.js` sempre come direto do ambiente, então uma vila guerreira sem comida nunca faz seus agentes passarem fome de verdade a nível individual, só a nível institucional (reprodução travada, needs decaindo mais rápido em colapso — ver §11). Mudança maior, mexe no loop de sobrevivência de todo agente; o cenário de colapso dinâmico (§11) é onde essa fome individual realmente importaria.

6. **Considerar depois**: vilas com população zerada (extintas por guerra/colapso) continuam participando normalmente da diplomacia dinâmica como se tivessem gente (ver `DESIGN.md` §7, não implementado ainda) — não é crítico, mas é uma inconsistência observável numa sessão longa.

7. **Considerar depois**: recalibrar a frequência de troca guerra/paz da diplomacia dinâmica (§11) — funciona e não crasha, mas numa sessão de observação longa a postura entre alguns pares de clã pode alternar com uma cadência que parece volátil. Depende de sensação de jogo, não só de número — vale revisitar depois de assistir de verdade, não só simular.

8. **Considerar depois**: velocidade de descoberta de depósitos de minério — `agent/actions/mine.js` só considera um recurso depois de o agente literalmente avistar um tile de montanha daquele tipo por acaso (vagando). Funciona (testado, população estável), mas pode ser lento demais pra ser satisfatório numa sessão de jogo real — vale observar jogando antes de decidir se precisa de algum empurrão (ex.: percepção maior, ou vilas nascerem mais perto de montanha).

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

**Nota histórica**: ao responder a pergunta sobre profundidade da especialização de vila, o usuário descreveu um sistema bem maior — vilas trocando de parceiro comercial por um acordo melhor, colapso interno de uma vila desfavorecida, decisão de atacar pra roubar suprimento, "incluir bastante opções pra IA emergente escolher". Isso virou seu próprio pedido (diplomacia dinâmica), implementado na sequência desta mesma sessão — ver §11.

## 11. Diplomacia dinâmica entre clãs (feito nesta sessão)

Pedido explícito do usuário (ver nota acima). Perguntei antes de codar (escala do mundo, ataque ofensivo nesta leva ou não, definição mecânica de "caos interno") — respostas: expandir pra N vilas/clãs agora, construir ataque ofensivo já nesta leva, e "reprodução trava + needs decaem mais rápido" pro caos. Implementado em 3 sub-estágios, cada um testado antes do próximo; o 4º (ataque ofensivo) ficou pra próxima sessão — ver §6, item 1.

### Estágio A — mundo com N vilas/clãs

- `utils/constants.js`: `VILLAGE_COUNT = 4` (era sempre 2); `CLAN_COLORS` (paleta de 6, cicla por índice); removidas `WAR_VILLAGE_MIN/MAX_DIST` — o ataque ofensivo futuro marcha até o alvo via pathfinding, então proximidade física deixou de ser pré-requisito pra guerra ficar observável.
- `utils/rng.js`: `shuffle(array)` novo (Fisher-Yates determinístico), usado pra embaralhar a especialização balanceada (metade comida, metade madeira) entre as `VILLAGE_COUNT` vilas.
- `main.js`: loop de spawn generalizado (1ª vila perto do centro do mapa, as demais em ângulos uniformes ao redor dela com jitter, mesmo range de distância `SECOND_VILLAGE_MIN/MAX_DIST` de antes); postura inicial sorteada independentemente pra cada par de clãs (`for i, for j=i+1`), não mais um único par.
- **Nenhuma mudança necessária** em `village/trade.js`, `combat/combat.js`, `render/villageRenderer.js` ou `ui/inspector.js` — todos já eram genéricos sobre `world.villages`/`world.clans` (loops, sem índices fixos), confirmado por grep antes de mexer.
- Testado ao vivo (mundo com `window.__debugWorld` exposto temporariamente): 4 vilas/clãs gerados, especialização sempre 2/2, postura independente sorteada em todos os 6 pares (guerra/tensão/neutro/aliado), sem erros de console.

### Estágio B — IA de decisão institucional (`clan/clanDecision.js`, novo)

- `village.distress` (`{ food, wood }`, segundos) — `village/stock.js:updateDistress(village, dt)`: soma enquanto a demanda desse recurso está em déficit (`TRADE_DEFICIT_DEMAND_MIN`), reseta a zero assim que alivia. Chamado a cada tick em `main.js`, junto com `computeDemand`.
- `clan/diplomacy.js`: `hasTreaty(clanA, clanB, type)` extraído de dentro de `canTrade` (reuso); `breakTreaty(treaty)` novo (marca `status: 'broken'`, mantém histórico — mesmo padrão de `agent.alive`).
- `clan/clan.js`: `clan.decisionTimer` novo (jitter, mesmo padrão de `agent.decisionTimer`).
- `clan/clanDecision.js` (novo): `updateClanDecision(clan, world, dt)`, chamado por clã a cada tick em `main.js`, reconsidera a cada 20-30s simulados (`CLAN_RECONSIDER_INTERVAL_MIN/MAX`). Pra cada outro clã, nessa ordem: escalar pra guerra (distress ≥ `DISTRESS_WAR_THRESHOLD_SECONDS` por um recurso que o outro tem de sobra) → buscar paz (guerra sem desespero que a sustente) → propor comércio (precisa de um recurso que o outro tem de sobra, ainda não comercia) → trocar de parceiro comercial (existe um 3º clã bem mais desesperado pelo recurso que essa vila exporta pro parceiro atual — `PARTNER_SWITCH_MARGIN` evita trocar por diferença mínima).
- Assume 1 vila por clã (comentário no topo do arquivo) — verdade em todo o world-gen atual.

### Estágio C — colapso interno

- `village/stock.js:updateChaos(village)` — deriva `village.inChaos` de qualquer distress ≥ `DISTRESS_CHAOS_THRESHOLD_SECONDS` (bem maior que o limiar de guerra — precisa ser um desfecho raro, não o padrão de toda vila especializada enquanto o comércio bootstrapa).
- `lifecycle.js:updateVillageReproduction` — `if (village.inChaos) return;` novo, antes do gate de `demand.food` que já existia (esse continua valendo pra fora do caos).
- `main.js` — `updateNeeds(agent.needs, village?.inChaos ? dt * CHAOS_NEEDS_DECAY_MULTIPLIER : dt)`: fome/sono decaem 1.6x mais rápido pra moradores de vila em colapso, sem mudar `needs.js` (só escala o `dt` recebido).
- `render/villageRenderer.js` e `ui/inspector.js`: indicador de colapso no label do mapa (💥) e no título da seção de vila do inspetor ("EM COLAPSO INTERNO"); inspetor também mostra segundos de desespero por recurso quando > 0.

### Bug crítico encontrado e corrigido durante o teste: espiral de extinção

Testado via simulação direta (chamando as mesmas funções do loop, sem depender de `requestAnimationFrame` — a aba em segundo plano throttla igual ao já documentado pra LOD/animação): com os limiares originais (guerra 45s, caos 90s), a população inteira morria de velhice sem repor NENHUMA vez, mesmo com produção acontecendo. Causa raiz: `REPRO_FOOD_DEMAND_MAX` (0.7, pré-existente) bloqueia reprodução enquanto a demanda de comida estiver alta — pra uma vila madeireira, comida só vem de comércio, e o comércio (via `TRADE_RATE_PER_SEC`/`TRADE_SURPLUS_DEMAND_MAX` de antes) levava tempo demais pra sequer começar a fluir; com os 20 fundadores todos na mesma idade inicial (`FOUNDER_AGE`), todos batiam `MAX_AGE` dentro da mesma janela de ~175s sem nenhuma reprodução ter acontecido ainda — extinção total, não um efeito do caos em si (o caos nem sempre tinha disparado ainda quando a população zerava).

Corrigido ajustando 4 constantes (`utils/constants.js`), não a lógica: `TRADE_SURPLUS_DEMAND_MAX` 0.3→0.45 (exportar começa mais cedo), `TRADE_RATE_PER_SEC` 2→4 (flui mais rápido uma vez começando), `DISTRESS_WAR_THRESHOLD_SECONDS` 45→60 e `DISTRESS_CHAOS_THRESHOLD_SECONDS` 90→240 (dão mais tempo pro comércio se estabelecer antes de guerra/colapso). Testado de novo: população cresce e se estabiliza (16-19 de 20 vilas·agentes iniciais, num teste de ~4h simuladas) em vez de zerar — algumas vilas ainda podem ser extintas por guerra/colapso ao longo de uma sessão longa (2 de 4 no teste), o que é uma consequência plausível de guerra ter consequências reais, não um bug.

**Limite conhecido, não corrigido**: postura de guerra/paz entre alguns pares de clã alternou com uma frequência que pareceu volátil numa simulação de ~4h — funciona corretamente (sem crash, reage à economia real), mas pode precisar de mais amortecimento (histerese) se parecer caótico demais numa sessão de observação de verdade. Registrado em §6.

- Testado ao vivo (visual, não só simulação direta): label da vila mostrando papel + estoque + postura + colapso simultaneamente sem erro de render; inspetor mostrando "VILA — VILA 1 (GUERREIRA) — EM COLAPSO INTERNO", distress por recurso, tratados de comércio corretos. Sem erros de console em nenhuma etapa.
- Commitado e enviado pro `main` (site ao vivo já atualizado) — ver commits desta sessão.

## 12. Bugs reportados jogando: LOD, câmera e robustez do loop (feito nesta sessão)

Usuário reportou, jogando de verdade: (1) NPCs só se mexem quando dá zoom neles — ficam parados, e às vezes "voltam bugados" e se aglomeram uns em cima dos outros; (2) o mapa não cabe na tela nem no menor zoom, e dar scroll pra fora faz a tela/mapa "subir" de forma estranha; (3) em algum momento todos os NPCs desapareceram. Investigado cada um antes de mexer.

- **Causa raiz do NPC congelado/aglomerado**: `simulation/lod.js:classifyAgents` usava um raio FIXO em px de mundo (`LOD_ACTIVE_RADIUS`, 1280px) a partir do centro exato da câmera pra decidir quem simula em detalhe (`active`) vs. quem só tem needs empurradas pra cima sem se mover (`background`) — e esse raio nunca escalava com o zoom. Em zoom baixo (mapa mais visível na tela), a maioria dos agentes visíveis ficava fora desse raio fixo e congelava mesmo estando literalmente na tela; ao dar zoom numa área específica, os agentes dali entravam no raio de repente e "acordavam" de uma vez, muitas vezes convergindo pro mesmo ponto (ex.: centro da vila, alvo de `deliver.js`) e aparentando ter "bugado" — mas era só vários agentes reais indo pro mesmo lugar sem colisão entre si (não há sistema de colisão agente-agente no jogo, então overlap visual é esperado quando vários convergem pro mesmo alvo).
- **Corrigido**: `classifyAgents(world, camera, viewW, viewH)` agora checa se a posição do agente cai dentro da viewport atual (via `camera.worldToScreen`, com margem de 200px) — escala com o zoom automaticamente, sem precisar de raio nenhum. `LOD_ACTIVE_RADIUS` removida de `utils/constants.js` (morta). `main.js` passa `canvas.width`/`canvas.height` pra `classifyAgents`.
- **Causa raiz do mapa não caber**: `render/camera.js:minZoomForViewport` calculava o zoom mínimo permitido como o **maior** entre `viewW/mundoW` e `viewH/mundoH` ("cover" — nunca deixa vazio nas bordas, mas força a tela sempre cheia de mapa). Como o mundo é quadrado (220×220 tiles) e a janela do navegador quase nunca é quadrada, isso sempre impedia ver o mapa inteiro de uma vez: dava pra ver a largura toda OU a altura toda, nunca as duas ao mesmo tempo sem cortar.
- **Corrigido**: trocado pro **menor** entre as duas proporções ("contain" — encolhe até a maior dimensão do mapa caber, sobra espaço/letterbox na outra, que `clampToBounds` já centralizava corretamente, só nunca tinha chance de entrar em ação). `MIN_ZOOM` (piso absoluto) baixado de 0.2 pra 0.05 — 0.2 era mais alto que o zoom "contain" necessário pra esse mundo em janelas comuns, então continuava cortando o mapa mesmo com a fórmula corrigida.
- Testado ao vivo (zoom via `WheelEvent` sintético, já que o simulador de scroll do Chrome automatizado não dispara o evento nativo — mesma limitação já documentada): mapa inteiro (4 vilas) visível de uma vez com barras pretas nas laterais (proporção da janela não bate com a do mundo, esperado); zoom de volta pra dentro funciona suave, ancorado no cursor, sem pulos. Sem erros de console.
- **"NPCs sumiram"**: não achei um bug de remoção indevida (busquei por qualquer código que limpe/reatribua `world.agents` fora de `lifecycle.js:pruneDead`, que só remove por `!agent.alive` — não achei outro). O suspeito mais forte é a mesma classe de espiral de extinção encontrada e mitigada na diplomacia dinâmica (§11: reprodução travada demais, população inteira morrendo de velhice de uma vez). Reforçado com uma segunda camada de proteção: fundadores agora nascem com **idade levemente aleatória** (`FOUNDER_AGE + rng.range(0, 60)`, `main.js`) em vez de todos exatamente na mesma idade — evita que uma vila inteira bata `MAX_AGE` no mesmo instante caso a reprodução tenha ficado bloqueada por um tempo.
- **Robustez adicionada, independente da causa específica**: `core/gameLoop.js` agora envolve `update()`+`render()` num `try/catch` que loga o erro e segue tentando o próximo frame, em vez de travar o jogo inteiro pra sempre e sem aviso nenhum se qualquer coisa lançar uma exceção não tratada — antes disso, um bug isolado em qualquer agente/vila/clã poderia congelar a simulação inteira silenciosamente, o que bate com o sintoma relatado.
- **Limite da investigação**: não consegui reproduzir de forma controlada e 100% isolada o "sumiço total" numa sessão de teste curta (a aba automatizada sofre o mesmo throttling de `requestAnimationFrame` já documentado, o que limita testes de tempo real longos) — o que ficou registrado acima é a causa mais provável com as evidências disponíveis, não uma reprodução direta e confirmada do exato relato. Se acontecer de novo, o `try/catch` novo no game loop vai pelo menos deixar o erro visível no console em vez de travar tudo em silêncio.
- Commitado e enviado pro `main` (site ao vivo já atualizado) — ver commit desta sessão.

## 13. Evolução da civilização — minério universal (feito nesta sessão, em andamento)

Pedido do usuário, no espírito WorldBox mas mantendo o pilar de jogador-observador (ver `DESIGN.md` §8): perguntei antes de codar (autônomo vs. player-triggered, o que Orc/Elfo/Cavaleiro representam, todos os recursos de uma vez ou por partes) — respostas: autônomo/emergente, papéis dentro de qualquer vila (não facção), todos os 4 minérios de uma vez.

Durante a investigação, encontrada uma pasta nova de arte não commitada em `assets/Assets-testes-para-o-claude-testar/` (~30 sprites: água/carvão/ouro/ferro/pedra/arbustos/árvores + Orc/Elfo/Cavaleiro/Componês com poses de ação como minerar/construir/cortar árvore/pescar/atacar/morrer) — não integrada ainda, registrada em `memory/art_pipeline.md` e no próximo passo #2 (§6).

- **`world/terrain.js`**: tiles de montanha ganham `resource` (`'stone'`/`'coal'`/`'iron'`/`'gold'`) via `resourceForMountain(tx, ty, seed)` — função pura de coordenada, cumulativo sobre `MOUNTAIN_RESOURCE_WEIGHTS` (60/20/15/5%), mesmo padrão determinístico do resto do gerador (não consome uma sequência de rng por tile).
- **`agent/perception.js`**: tiles percebidos agora incluem `resource` (só populado em montanha) — flui pra `agent.memory` automaticamente (`remember` já é genérico).
- **`village/village.js`**: `capacity`/`stock`/`demand` ganham as 4 chaves de minério pra toda vila (`VILLAGE_MINERAL_CAPACITY` = 50 cada) — mas **não** entram em `distress` (só `{ food, wood }`). `village.buildings: []` novo (reservado pra próxima fatia).
- **`utils/constants.js`**: `MINING_RESOURCES`, `MOUNTAIN_RESOURCE_WEIGHTS`, `VILLAGE_MINERAL_CAPACITY`, e `CRITICAL_RESOURCES = ['food', 'wood']` — os únicos que `village/stock.js:updateDistress`/`updateChaos` e a lógica de guerra de `clan/clanDecision.js` consideram. Decisão deliberada: minério é universal (qualquer vila colhe todos os 4, sem gate de especialização como food/wood) e é material de construção, não parte do pilar de interdependência econômica — misturar os dois arriscaria reabrir a instabilidade que já foi corrigida na diplomacia dinâmica (§11).
- **`agent/actions/mine.js`** (novo): um módulo só cobre os 4 minérios (evita 4 arquivos quase-duplicados) — escolhe o de maior demanda entre os que o agente já tem um depósito conhecido, marca `agent.miningResource` (novo campo, persiste a escolha entre reconsiderações) e `agent.carryingType` ao encher a carga. `deliver.js` não precisou de nenhuma mudança (já genérico).
- **Bug real encontrado e corrigido durante o teste**: tiles de montanha não são andáveis (`isWalkable` exclui — é barreira de terreno, não "colhível em cima"), e o pathfinding exige que o tile de destino seja andável. Sem correção, toda tentativa de minerar caía em "inalcançável" instantaneamente — testei e confirmei 0 minério colhido em qualquer vila depois de 2000s simulados, apesar da ação estar sendo escolhida. Corrigido mirando o tile andável mais próximo adjacente ao depósito (`world/world.js:findWalkableNear`, raio 5) em vez do próprio tile de montanha — minerar "da beirada".
- Registrado em `clan/clanDecision.js`, `hud.js`, `ui/inspector.js`: rótulo `mine` → "minerando"; inspetor mostra os 6 recursos automaticamente (já era genérico por `Object.keys(village.capacity)`, sem nenhuma mudança lá).
- **Testado via simulação direta** (2000s simulados, população de 20 fundadores): sem o conserto do pathfinding, minério ficava travado em 0 em todas as vilas; com o conserto, minério começou a acumular (ainda devagar — depende de descoberta por acaso, ver próximo passo #8) e população se manteve saudável e estável (19-20 vivos, 3 de 4 vilas sobreviventes), sem colapso. Testado ao vivo também: inspetor mostrando os 6 recursos corretamente pra uma vila selecionada, sem erros de console.
- Commitado e enviado pro `main` (site ao vivo já atualizado) — ver commit desta sessão.
