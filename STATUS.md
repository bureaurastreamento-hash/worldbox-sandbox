# STATUS.md — Worldbox Sandbox

Snapshot do estado atual. Sessão longa, muitas rodadas — este arquivo foi reescrito do zero pra consolidar tudo num snapshot único, em vez de manter o histórico fragmentado por sub-sessão (§1a-§1h de versões anteriores). Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). Todos os commits desta sessão estão pushados — `git log` é a fonte de verdade pra histórico detalhado, este arquivo é o resumo do estado final.

## 1. O que foi implementado ou alterado nesta sessão

Em ordem cronológica real:

1. **Inventário exaustivo do pack de assets antigo** (287 arquivos, 5 packs, imagens abertas e analisadas pixel a pixel, não só nomes de arquivo) — conclusão: nenhum serve pra terreno/decoração/civil. O motivo real não é resolução (o Cavaleiro tem só 17×21px de conteúdo, mesma ordem de grandeza dos candidatos) — é **estilo**: os packs candidatos são pixel art de contorno duro e cor chapada saturada, a régua do jogo (Tiny RPG/craftpix) é sombreado suave sem contorno.
2. **Fauna predadora reduzida de 4 pra 2 espécies** (`demon`/`blood`, decisão do usuário) com arte do Tiny RPG Character Asset Pack 02. Stats **redistribuídos, não inventados**: `demon` herdou o perfil do urso, `blood` o do lobo. `PREDATOR_COUNT_PER_SPECIES` subiu de 6 pra 12 pra manter a densidade total (24 no mapa).
3. **`src/render/sprites/` — SpriteManager unificado**, criado do zero. Lê dois formatos de spritesheet (tira horizontal por ação; grade RPG 3×4 ou 12×8) por trás de uma interface única. Contagem de quadros é **derivada da imagem**, não de tabela declarada (achado real: a tabela errava a contagem de `attack` em 3 dos 4 atores). `sprite-lab.html` na raiz é o banco de provas isolado.
4. **`predatorRenderer.js` migrado pro SpriteManager** — animação de verdade (idle/walk/attack/hurt/death), espelhamento por direção, corpo que fica no chão tocando a animação de morte. `renderScale` por espécie (criado no item 2) ficou obsoleto e foi removido — substituído por uma escala única de arte, já que as duas espécies vêm do mesmo pack na mesma escala.
5. **`agentRenderer.js` migrado pro SpriteManager** — civil vira um dos 32 personagens de `Pers-Sprites/Humanos-separados/` (grade RPG, 4 direções reais, rosto fixo por hash de `agent.id`); guerreiro designado usa as tiras completas de Soldier/Orc (idle/walk/attack/hurt/death). **Perda assumida**: nenhuma pose de trabalho (cortar árvore, minerar, construir, pescar) existe na arte disponível — as partículas de trabalho continuam, a pose do corpo não reflete mais a ação. Civil morto deita e desbota (a grade não tem clipe de morte); guerreiro tem `death` de verdade.
   - **Confirmado pelo usuário**: os civis usam o pack SuperRetroWorld, que numa rodada anterior tinha sido reprovado por estilo pra essa mesma categoria. Usei porque o usuário entregou esses arquivos dentro de `Pers-Sprites/`; ele viu o resultado ao vivo e aprovou ("os civis ficaram bons") — não é mais uma pendência.
6. **Correção de extinção total das vilas** (reportado jogando 45s em 4x) — três bugs independentes, nenhum das mudanças de render desta sessão:
   - `findNearestPredator` sem limite de distância: todo civil entrava em fuga permanente enquanto existisse um predador vivo em qualquer canto do mapa. Corrigido com `maxDistance = PERCEPTION_RADIUS * TILE_SIZE`.
   - `feedBackgroundVillage` tratava `hunger < 100` como faminto: agente fora de tela comia na taxa cheia continuamente. Corrigido com `BACKGROUND_EAT_HUNGER_THRESHOLD = 55`.
   - O LOD simulava consumo de quem está fora de tela mas nunca produção — `produceBackgroundVillage` (novo) fecha a simetria, com fator de ciclo útil e divisão do trabalho pela demanda (pra vila madeireira fora de tela não morrer de fome, igual em tela ela sobrevive pescando).
7. **Terreno e decoração refeitos do zero, 100% procedural** (`src/render/terrain/`, 7 módulos) — busca de substituição em todos os packs fechou negativa (o único tileset disponível, Kenney, é o estilo que se queria eliminar). Ruído de valor, paleta com rampa de 5 tons e luz fixa de cima-esquerda, transição irregular entre tipos de terreno (o que mais tira o aspecto "tabuleiro"), minério como pedra incrustada em vez de ícone centralizado, árvore/planta/casa/baú com arte no mesmo estilo.
8. **Otimização de FPS do terreno** (`terrainChunks.js`) — terreno assado em blocos offscreen de 32×32 tiles. `drawTiles` caiu de 80ms pra 0.06ms em zoom 0.25. Era o gargalo de FPS mais antigo do projeto.
9. **Prédios de vila viraram entidades reais** (`village/buildings.js`) — antes, `village.buildings` era um contador sem posição, e as casas no mapa eram decoração visual sem vínculo nenhum. Isso fazia `eat`, `deliver` e `build` mirarem todos `village.center`. Agora: Prefeitura (marco, nasce com a vila), Casa (+pop, onde se dorme), Celeiro (+comida, onde se come/entrega comida), Depósito (+madeira/minério, onde se entrega o resto). `build.js` escolhe o tipo pela carência real da vila. `sleep.js` fechou um TODO aberto desde a fatia 2 (dormir em casa). Cada agente para num ponto do anel ao redor do prédio, não no centro exato.
10. **Reserva de tile de recurso** (`world/claims.js`) — antes, 42% das observações tinham alvo de colheita compartilhado entre agentes (medido), com grupos de até 5 na mesma árvore. Agora reserva ao escolher, libera ao trocar de alvo/encher carga/morrer, com fallback obrigatório (se todos os tiles conhecidos estão reservados, ignora a reserva) pra vila pequena não travar.
11. **Timer de travamento** (`agent/stuck.js`) — `noProgressFor` acumula quando posição, carga, obra, fome e sono não mudam; ao passar de 6s, cancela o alvo e bloqueia o tile por 30s na memória do agente. Preventivo: a incidência medida de travamento real era ~zero antes da correção.
12. **Dois consertos em `eat.js`** — estoque zerado agora limpa o movimento (antes deixava o agente plantado no celeiro); agente com fome 100 não debita mais comida da vila.
13. **Limpeza final de `assets/sprites/`** — os 24 arquivos apagados pelo usuário em sessões anteriores foram confirmados órfãos (nenhum carregado por código, terreno/decoração/civil já são procedurais/SpriteManager) e commitados como deleção.
14. **Bug corrigido no `ui/inspector.js`** — os ícones de minério apontavam pra `assets/Assets-testes-para-o-claude-testar/Pedra1.png` (pasta ignorada no git, arquivo nunca existiu ali) — estavam quebrados desde sempre. Trocado por `render/terrain/oreTextures.js`, convertido em data URL uma vez no carregamento.
15. **`ROADMAP.md`** ganhou duas seções novas: sistemas grandes sem prioridade (evolução genética, tecnologia emergente por necessidade, sucessão de liderança, construção adaptada ao bioma — registrados, não desenhados) e LOD de renderização por zoom (ideia registrada, não implementada — ver §5 abaixo).

## 2. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain, Time loop, Camera/Render, Pathfinding | ✅ Funcionando |
| **Terreno e decoração** | ✅ Procedural, testado ao vivo, mais barato que a versão anterior |
| **Prédios de vila** (Prefeitura/Casa/Celeiro/Depósito) | ✅ Funcionando — posição, efeito e destino de ação corretos |
| Perception, Memory, Utility AI/Decision | ✅ Funcionando |
| **Reserva de tile / timer de travamento** | ✅ Funcionando, verificado ao vivo (0% de alvo compartilhado, medido) |
| Village/Clan/Diplomacy/Trade | ✅ Funcionando |
| Combat (agente-vs-agente) | ✅ Funcionando |
| Combat (agente-vs-predador) | 🟡 Funcionando (código não mudou nesta sessão) — mas a animação de ataque/morte nova (predador e guerreiro) nunca foi vista numa guerra/caçada orgânica real, só em harness sintético |
| Life-cycle, reprodução | ✅ Funcionando, testado com avanço determinístico de centenas de segundos simulados |
| Simulation LOD (agregado fora de tela) | ✅ Funcionando — agora com produção **e** consumo simétricos |
| **SpriteManager** (`render/sprites/`) | ✅ Em uso por predador e agente; `sprite-lab.html` é o banco de provas |
| UI/HUD/Inspetor/Feed | 🟡 Funcionando, com um bug de contagem conhecido (ver §3) |
| Necessidades sociais/segurança/pertencimento | ❌ Não iniciado (só fome/sono existem) |
| `agent.traits` | ❌ Não iniciado |
| `defense_pact` (efeito real) | ❌ Não iniciado |
| LOD de renderização por zoom | ❌ Não iniciado — ideia registrada em `ROADMAP.md` §2.3 |

## 3. Bugs / comportamentos estranhos não corrigidos

1. **`ui/inspector.js` mostra contagem de prédio errada.** A linha de população mostra `(${village.buildings.length} casa/casas)`, mas `buildings.length` agora conta **todos** os tipos (prefeitura + celeiro + depósito + casa), não só casas — uma vila recém-fundada (prefeitura + celeiro, zero casas de verdade) aparece como "(2 casas)". Introduzido na rodada de prédios (`6f72d87`), não pego antes por estar fora do que foi testado ali. Conserto é filtrar por `type === 'house'` nessa linha.
2. **Construção depende de pedra, que depende de mineração lenta.** Numa sessão curta a vila fica só com Prefeitura + Celeiro (os dois fundacionais); Casa e Depósito, que são o que mais ajuda a espalhar a população, demoram a aparecer. Sinalizado, não corrigido — precisa de decisão sobre calibrar custo ou disponibilidade de pedra.
3. **Ataque e morte de predador/guerreiro, com a arte animada nova, nunca confirmados numa guerra ou caçada orgânica real.** Só testado em harness sintético (agentes/predadores forjados chamando `step`/`drawX` diretamente) — o caminho de código é o mesmo, mas não houve confirmação visual ao vivo de uma luta de verdade acontecendo.
4. **Elfo sem arte própria** — cai no guerreiro genérico (Soldier). Decisão aceita há várias sessões, sem substituto disponível.
5. **Orc de perfil destoa visualmente** do resto (visto de cima/frente) — aceito, pouco tempo de tela.
6. **Postura de guerra/paz pode alternar com frequência que parece volátil** numa sessão de observação longa — não recalibrado.
7. **rAF é throttlado numa aba de automação** (`document.visibilityState: "hidden"`) — limitação de ambiente confirmada de novo. Contornado nesta sessão pausando o loop e avançando `update(dt)` manualmente quando precisou de confirmação ao vivo determinística; a técnica está documentada no histórico de commits pra reuso.
8. **Confirmações mecânicas nunca vistas numa sessão real longa do usuário** (herdado de sessões anteriores, ainda relevante): reprodução/extinção em sessão de horas, oscilação de postura diplomática ao longo do tempo.

## 4. Decisões técnicas e o motivo

- **Terreno/decoração/prédios são 100% procedurais, não arte de pack.** A busca por substituição foi feita de verdade (inventário completo, imagens abertas) e fechou negativa duas vezes (fauna e depois terreno) — o único tileset achado sempre trazia o estilo chapado que se queria eliminar. Gerar deu controle total sobre paleta e luz, e por acaso saiu mais barato em FPS que a alternativa de cor lisa.
- **Usuário escolheu, via pergunta explícita**: 4 tipos de prédio (Prefeitura/Casa/Celeiro/Depósito, não só Prefeitura+Casa); vila nasce com Prefeitura+Celeiro e constrói o resto; dormir vai até uma casa real (não só marca lotação por casa, versão mais simples escolhida).
- **`renderScale` por espécie (predador) foi criado e depois removido na mesma sessão** — existiu só enquanto o recorte era de um quadro estático; virou redundante quando a animação completa (escala única de arte) chegou. Registrado porque é um caso real de decisão técnica revertida pela evolução do próprio trabalho, não por erro.
- **Reserva de tile sem expiração por tempo** — a reserva é presa ao agente e ele sempre libera nos três pontos de saída (troca de alvo, carga cheia, morte). Um timeout criaria uma segunda fonte de verdade pra sincronizar sem necessidade.
- **Timer de travamento com limiar de 6s, contando fome e sono como progresso** — colher uma carga cheia leva ~8s parado, mas isso não conta como travamento porque `carrying` sobe todo tick; sem incluir fome/sono no critério de progresso, o timer dispararia falso positivo em quem está comendo ou dormindo direito.
- **As 24 deleções de `assets/sprites/` só foram commitadas nesta sessão, no fim** — ficaram de fora de todos os commits anteriores porque o remoto (GitHub Pages) ainda dependia delas até terreno/decoração/civil virarem procedurais/SpriteManager. Confirmado arquivo por arquivo antes de commitar, e o jogo publicado testado ao vivo depois (141 requisições, 0 falhas).

## 5. Próximos passos concretos, em ordem

1. **Corrigir a contagem de prédios no inspetor** (`ui/inspector.js`, bug §3.1) — trocar `village.buildings.length` por uma contagem filtrada em `type === 'house'` na linha de população. Pequeno, isolado, sem risco.
2. **Calibrar construção de Casa/Depósito** — decidir entre baixar `HOUSE_STONE_COST`/`DEPOT_STONE_COST` ou aumentar a taxa de descoberta de pedra (`PERCEPTION_RADIUS` já foi subido uma vez por um motivo parecido). Sem isso, o espalhamento de população que a rodada de prédios trouxe fica limitado a vilas que já mineraram bastante.
3. **Sessão de jogo real do usuário, mais longa que os testes automatizados** — confirmar visualmente: prédios se populando com o tempo, guerra/caçada de predador acontecendo organicamente com a animação nova, e ausência de amontoamento numa vila grande e madura (15+ moradores, múltiplos prédios).
4. **Se algo ainda incomodar visualmente**, as paletas de terreno estão isoladas em `render/terrain/palette.js` e cada terreno tem um pintor próprio em `tileTextures.js` — mudança pontual sem mexer em lógica.
5. **LOD de renderização por zoom** (`ROADMAP.md` §2.3) — só quando performance ou tamanho de mapa virar prioridade de novo; não é urgente hoje porque o gargalo medido de terreno já foi resolvido pelos chunks.

## 6. Coisas pedidas pra lembrar que ainda não são código

- Nenhuma pendência aberta desta categoria no momento — os itens de design combinados nesta sessão (tipos de prédio, prefeitura+celeiro fundacionais, dormir em casa, reserva com fallback obrigatório, timer de 6s) foram todos implementados e verificados ao vivo.
- Os quatro sistemas grandes que o usuário pesquisou (evolução genética/especiação, tecnologia emergente por necessidade da vila, sucessão de liderança, construção adaptada ao bioma) estão registrados em `ROADMAP.md` §2.5, explicitamente sem prioridade e sem design — não é pra puxar nenhum deles sem uma conversa de design própria antes.
