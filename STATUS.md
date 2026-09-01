# STATUS.md — Worldbox Sandbox

Snapshot do fim da sessão que implementou as fatias 1-10 (ver `DESIGN.md` seção 5) mais uma leva de correções. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`).

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
| Sprites de agente | ⚠️ **Quebrado no momento** — ver §3, bug #1. |
| Decoração do mapa (árvores/plantas/casas) | ❌ Não iniciado. |
| Animais no mapa | ❌ Não iniciado — decisão já tomada (decorativo simples primeiro; "vagando sem IA" fica pra outra leva quando tiver arte pronta). |

## 3. Bugs / comportamentos estranhos não corrigidos

1. **[Crítico] Sprite do agente quebrado no jogo ao vivo agora.** `src/render/agentRenderer.js` referencia `assets/sprites/Human1.png` e `Human2.png`, que foram deletados nesta sessão (substituídos pelos 8 arquivos de variação). O jogo cai no fallback (círculo amarelo) até a integração ser feita — é o próximo passo #1 abaixo.
2. Não testei a animação de andar nem o LOD visualmente ao vivo de forma confiável — o Chrome automatizado usado nos testes throttla o `requestAnimationFrame` de abas em segundo plano. Validei ambos via simulação direta (chamando as funções fora do loop do navegador) em vez de observar o jogo rodando. Vale conferir manualmente numa aba em primeiro plano.
3. Combate é só reativo — vilas em guerra só se encontram organicamente perto da fronteira (por isso nascem mais perto). Não tem "invadir a vila inimiga" nem qualquer comportamento ofensivo deliberado.

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

1. **Consertar o sprite quebrado (urgente) — integrar os 8 arquivos de variação.**
   - `assets/sprites/`: `BMan1.png`/`BMan2.png` (pele escura, homem), `BGirl1.png`/`BGirl2.png` (pele escura, mulher), `WMan1.png`/`WMan2.png` (pele clara, homem), `WGirl1.png`/`WGirl2.png` (pele clara, mulher). `1` = parado, `2` = passo de andar (mesmo padrão já usado pro `Human1`/`Human2` anterior).
   - Adicionar em `agent/agent.js`: campos `skinTone` (`'dark'` | `'light'`) e `gender` (`'man'` | `'woman'`), passados no `createAgent({...})` com default sensato.
   - Fundadores (`main.js:spawnVillage`): sortear os dois 50/50 via `world.rng`.
   - Filhos (`lifecycle.js:tryReproduce`): herdar `skinTone` de um dos dois pais (aleatório, não sempre o mesmo), `gender` 50/50 independente.
   - `render/agentRenderer.js`: trocar o par único de sprites por um mapa de 4 variantes (`dark-man`, `dark-woman`, `light-man`, `light-woman`), cada uma com seus dois quadros; reaproveitar `computeContentBounds` (já existe, não reescrever) pras 8 imagens. Escolher a variante por `${agent.skinTone}-${agent.gender}`.
   - Testar como nas fatias anteriores: carregar as 8 imagens sem erro 404, conferir que o recorte de conteúdo bate pra cada uma, visual ao vivo com pelo menos uma combinação de cada variante em tela.
   - Commitar (`assets/sprites/*` já commitado; falta só o código) e dar push.

2. **Decoração do mapa**: árvores, plantas, casas como sprites decorativos parados — mesmo tratamento visual dos personagens (`new Image()`, recorte por alpha, fallback enquanto carrega), sem lógica nem movimento. Prováveis pontos de entrada: um `render/decorationRenderer.js` novo, e decidir se a posição de cada decoração é determinística por seed (nasce sempre no mesmo lugar pra uma dada seed, tipo o terreno) ou aleatória a cada carregamento. **Sem arte ainda** — perguntar ao usuário se já tem os arquivos antes de começar, ou usar formas geométricas simples como placeholder só se ele pedir pra não esperar.

3. **Fatia 11 — UI de observação**: inspetor completo do agente/vila/clã selecionado (scores de cada ação candidata, estoque/demanda da vila, tratados do clã) — hoje só existe o HUD básico (ação/idade/fome/sono/vida). Ver `ARCHITECTURE.md` (`ui/inspector.js`, ainda stub).

4. **Considerar depois** (não pedido ainda, mas decorre do que já existe): especialização de vila — é o que falta pro caso de design original ("guerreira depende de agrícola") ficar observável de verdade. Não é uma fatia própria no `DESIGN.md`; decidir com o usuário se/quando vira uma.
