# STATUS.md — Worldbox Sandbox

Snapshot do fim da sessão que implementou as fatias 1-10 (ver `DESIGN.md` seção 5) mais uma leva de correções, atualizado no início da sessão seguinte após consertar o sprite quebrado (§6 antigo, passo 1 — ver §7). Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`).

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
| Utility AI / Decision | ✅ Funcionando. 7 ações: `wander`, `eat`, `sleep`, `gather`, `deliver`, `fight`, `flee`. |
| Pathfinding | ✅ Funcionando (A*, testado contra obstáculos e em 60 pares aleatórios). |
| Village (estoque/demanda/população) | ✅ Funcionando. |
| Clan/Diplomacy | ✅ Funcionando (postura, tratados, efeito real). Sem UI pro jogador propor tratado manualmente — só acontece no setup inicial do mundo. |
| Trade/Economy | ⚠️ Funcionando mecanicamente, mas **inobservável na prática**: as duas vilas produzem o mesmo recurso do mesmo jeito, então nunca há déficit real de um lado. Falta especialização de vila (ver `DESIGN.md` §6, lacuna conhecida). |
| Combat | ✅ Funcionando (engajar/fugir, dano mútuo, morte). Só reativo — sem ataque ofensivo deliberado, só defesa quando os territórios se aproximam. |
| Life-cycle | ✅ Funcionando. |
| Simulation LOD | ✅ Funcionando, validado só via simulação sintética (a população real do jogo, cap 30/vila, não é grande o suficiente pro jogador notar diferença de performance sozinho). |
| UI/HUD | ⚠️ Parcial. Mostra ação/idade/fome/sono/vida do agente selecionado. Sem inspetor de vila/clã, sem scores de decisão visíveis — isso é a fatia 11, não iniciada. |
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

1. **Fatia 11 — UI de observação**: inspetor completo do agente/vila/clã selecionado (scores de cada ação candidata, estoque/demanda da vila, tratados do clã) — hoje só existe o HUD básico (ação/idade/fome/sono/vida). Ver `ARCHITECTURE.md` (`ui/inspector.js`, ainda stub).

2. **Trocar o placeholder geométrico da decoração pela arte real** quando ela existir — reaproveitar `world.decorations` (dados) e só reescrever `render/decorationRenderer.js` (ver §8), igual ao pipeline dos sprites de agente.

3. **Considerar depois** (não pedido ainda, mas decorre do que já existe): especialização de vila — é o que falta pro caso de design original ("guerreira depende de agrícola") ficar observável de verdade. Não é uma fatia própria no `DESIGN.md`; decidir com o usuário se/quando vira uma.

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
