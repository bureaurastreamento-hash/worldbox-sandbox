# STATUS.md — Worldbox Sandbox

Snapshot do estado atual. Sessão iniciada depois da pausa registrada em `034a2dc`. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). Commits desta sessão: `76503cf`..HEAD (16 commits, todos pushados). Contexto de antes desta sessão (fatias 1-11 do roteiro, especialização de vila, diplomacia dinâmica, minério/construção, papéis visuais, decoração com arte real, fome ligada ao estoque) não é repetido em detalhe aqui — ver `DESIGN.md` e o histórico de commits até `034a2dc`.

## 1. O que foi implementado ou alterado nesta sessão

Nesta ordem:

1. **Extinção quase-instantânea das 4 vilas — achado real jogando, e corrigido**: todo fundador nascia com `needs.hunger=100` fixo, cruzavam o limiar de "comer" praticamente juntos, drenavam `STARTING_FOOD_STOCK` numa rajada só e a vila inteira morria de fome em ~70-80s simulados. Corrigido dessincronizando a fome inicial (`FOUNDER_HUNGER_MIN=50`..`MAX=100`) e subindo o estoque inicial (40→60). Ver `DESIGN.md` §6.
2. **Ritmo de mineração/construção**: `PERCEPTION_RADIUS` 8→12, `HOUSE_WOOD_COST`/`HOUSE_STONE_COST` 30/20→20/12. Confirmado ao vivo funcionando de ponta a ponta.
3. **Offset anti-empilhamento de agentes** — vários agentes convergindo pro mesmo ponto não ficam mais desenhados exatamente sobrepostos.
4. **Correção de inconsistências nos `.md`** deixadas por edições incrementais anteriores.
5. **Sessão de jogo real do usuário (20 min, 4x)**: confirmou a correção do item 1 numa sessão de verdade, mas sem "evolução" visível — motivou o questionário de features (item 6) e, depois, a virada de prioridade pro visual (item 12).
6. **Questionário de features + pesca/guerreiro/morte/ícones** (implementado, mais tarde parcialmente substituído pela reorganização visual dos itens 12+): `agent/actions/fish.js` (pesca universal, atenua dependência de comércio sem substituir `gather.js`); `agent.role` (`'civilian'`/`'warrior'`, emergente pela demanda de defesa da vila, fecha lacuna do modelo de dados original); animação de morte (`DEATH_LINGER_SECONDS`); feed de eventos (`world/eventLog.js` + `ui/eventFeed.js`, painel inferior esquerdo, guerra/paz/comércio/morte/nascimento/casa completada). Achados/correções de bug nessa leva: `main.js` calculava "agente vivo" só checando presença em `world.agents` sem checar `alive` (corpo lingerindo enganava o HUD); `eventFeed.js` comparava `null`/`undefined` de um jeito que nunca batia, reconstruindo o DOM à toa todo frame.
7. **Verificação de plugins**: 8 plugins habilitados no projeto (`.claude/settings.json`), 3 quebrados por dependência de sistema ausente (`typescript-lsp`/`pyright-lsp` sem `node`/`npm`; `serena` sem `uvx`) — nenhum crítico pro projeto.
8. **`ROADMAP.md` criado**: lista consolidada de tudo implementado + planejado, analisando `DESIGN.md`/`ARCHITECTURE.md`/`STATUS.md`/código/histórico de commits. Achados novos ao analisar: `agent.traits` (previsto no modelo de dados original, nunca implementado) e `Treaty.type: 'defense_pact'` (pode ser assinado, mas nenhum código lê esse tratado pra ter efeito real).
9. **Brainstorm de evolução** (16 ideias, categoria A "reaproveita sistema existente" vs B "sistema novo") — nada implementado ainda, ordem de prioridade aprovada, ver `ROADMAP.md` §2.3.
10. **Virada de prioridade — só visual, features novas pausadas**: usuário decidiu que o jogo está "funcionalmente rico mas visualmente pobre" e isso importa mais agora. Brainstorm de features fica parado até o visual estar redondo.
11. **Achado grande: toda a arte antiga sumiu do disco** — não só sprites que tinham acabado de ser movidos pra `assets/sprites/`, mas literalmente toda a leva de arte anterior (Camponês, Orc/Elfo/Cavaleiro antigos, água, minério, árvore/planta), tanto de `assets/sprites/` quanto de `assets/Assets-testes-para-o-claude-testar/`. O usuário baixou vários packs novos (craftpix.net + Kenney) na mesma pasta de teste, pra recomeçar a seleção do zero.
12. **Reorganização visual completa** (implementado, testado ao vivo em cada rodada):
    - `assets/sprites/` vira a pasta canônica de arte em uso; `assets/Assets-testes-para-o-claude-testar/` vira matéria-prima **ignorada no git** (`.gitignore`) — só o que é selecionado e recortado entra no repositório, packs brutos (~51MB, 2091 arquivos, incluindo PSD/ASEPRITE/`__MACOSX`) ficam de fora.
    - **Guerreiros**: Cavaleiro = `Swordsman_lvl3` (craftpix), Orc = `Orc_Warrior` (craftpix). Checagem de consistência visual feita antes de aprovar mais nada: risco real concentrado no Orc (sprite de perfil, resto do jogo é visto de cima/frente) — aceito por enquanto, pouco tempo de tela (só aparece em guerra).
    - **Terreno/decoração**: água (2 quadros animados), grama, areia, 3 variantes de árvore, 2 de planta, casa (telhado+parede empilhados, o pack só tem casa em peças) — todos do `kenney_roguelike-rpg-pack`, mesmo traço visual entre si.
    - **Personagem base** (substitui Camponês): `Swordsman_lvl1` (mesma família do Cavaleiro, nível mais fraco/menos blindado pra diferenciar civil de guerreiro) — parado, andando, civil-em-combate (ataque/defesa alternando, sem virar guerreiro de fantasia), fuga, morto.
    - **Elfo**: sem arte, decisão aceita — cai no guerreiro genérico (mesmo comportamento de antes de qualquer arte de guerreiro existir), pendência bloqueada por falta de asset, mesmo padrão que já valia pra casa.
    - Bug real corrigido durante o processo: o gate de "sprites carregados" em `agentRenderer.js`/`decorationRenderer.js`/`tileRenderer.js` era global — um único sprite nunca carregando travava **todos** os agentes/decorações no fallback geométrico pra sempre, mesmo os com arte nova pronta. Trocado por checagem individual (`isSpriteReady`). Depois, achado um segundo bug relacionado: `sprite ?? fallback` nunca funcionava pra pose sem arte nesta rodada (cortando árvore, minerando, pescando, construindo, levando tronco), porque toda entrada de `sprites` já é um objeto `Image` (nunca `null`/`undefined`) — corrigido com `orFallback()` baseado em `isSpriteReady()` de verdade.
    - **Apanhado geral contra a lista original de 8 categorias** (terreno, recurso/minério, personagem base, guerreiros, civil em combate, fuga, morto, decoração de mapa) entregue ao usuário: sobrava floresta (nunca proposta), montanha e ícone de minério (adiados por decisão explícita) e elfo (idem). Usuário decidiu fechar floresta/montanha/minério agora (item 13) e manter só elfo como pendência aceita.
13. **Floresta, montanha e ícones de minério fechados** (implementado, testado ao vivo): mesmo `kenney_roguelike-rpg-pack` dos itens anteriores.
    - **Floresta** (`Floresta.png`): padrão de quadrados cinza sobre verde — escolhido em vez de uma opção de verde só ligeiramente mais escuro que a grama, que ficava sutil demais pra diferenciar de relance (confirmado por comparação de RGB médio antes de perguntar ao usuário).
    - **Montanha** (`Montanha.png`): cinza-azulado claro com textura sutil, mesma linha do spritesheet que grama/areia.
    - **Ícones de minério** (`Pedra1`/`Carvao`/`Ferro`/`Ouro.png`): pedra cinza, rocha escura com brasa, pedrinhas prateadas, pepitas de ouro (escolhidas em vez de uma gema facetada, pra manter o estilo "minério bruto" consistente com os outros 3) — sobrepostos no tile de montanha, mesmo padrão de recorte-por-alpha já usado.
    - `render/tileRenderer.js`: `TERRAIN_TILE_FILES` ganha `forest`/`mountain`; `RESOURCE_ICON_FILES` já apontava pros nomes de arquivo certos (preparado numa rodada anterior), só faltavam os arquivos.
    - **Reorganização visual encerrada por ora** (decisão do usuário) — só elfo (guerreiro) segue como pendência de arte aceita, ver `ROADMAP.md` §2.4.

## 2. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain | ✅ Funcionando. Água/grama/areia/floresta/montanha, todos com textura real. |
| Time loop | ✅ Funcionando. |
| Camera/Render | ✅ Funcionando. Zoom mínimo "contain". |
| Perception | ✅ Funcionando (raio 12 tiles). |
| Memory | ✅ Funcionando. |
| Needs | ⚠️ Parcial. Só fome e sono das 5 originais do pitch. |
| Utility AI / Decision | ✅ Funcionando. 12 ações: `wander`, `eat`, `sleep`, `gather`, `gatherWood`, `fish`, `mine`, `build`, `deliver`, `fight`, `flee`, `raid`. |
| Pathfinding | ✅ Funcionando (A*). |
| Village (estoque/demanda/população) | ✅ Funcionando. 6 recursos. |
| Clan/Diplomacy | ✅ Funcionando e dinâmico, designa/desmobiliza guerreiros nas transições de guerra/paz. |
| Trade/Economy | ✅ Observável. Vila madeireira tem pesca como 2ª via de comida, além de comércio. |
| Combat | ✅ Engajar/fugir/dano/morte reativos + ataque ofensivo deliberado. Guerreiro designado tem prioridade extra. |
| Life-cycle | ✅ Funcionando. Morte tem instante de corpo visível antes de sumir. |
| Simulation LOD | ✅ Funcionando, escala com zoom. |
| UI/HUD | ✅ HUD + inspetor + feed de eventos (guerra/paz/comércio/morte/nascimento/casa). Ícone de minério na lista de estoque; sufixo "(guerreiro)" na ação. |
| Sprites de agente | ✅ Reorganização visual completa (itens 12-13): personagem base + guerreiro Cavaleiro/Orc novos, offset anti-empilhamento, morto, papel permanente. Elfo pendente (sem arte, aceito, única pendência de arte restante). |
| Decoração do mapa | ✅ Árvore (3)/planta (2)/casa, arte nova (`kenney_roguelike-rpg-pack`). |
| Água | ✅ Textura de tile animada (2 quadros), arte nova. |
| Especialização de vila | ✅ Funcionando. |
| Minério (evolução) | ✅ Mecânica funcionando; ícone visual também pronto (item 13). |
| Construção (evolução) | ✅ Mecânica funcionando, custo reduzido; casa agora com arte real. Ainda sem confirmação de uma casa completando de ponta a ponta numa sessão real. |
| Pesca | ✅ Funcionando — score/seleção de ação confirmados ao vivo; entrega completa não observada diretamente. |
| Papel de guerreiro | ⚠️ Implementado, não confirmado numa guerra real ao vivo. |
| Animação de morte | ⚠️ Implementado, não confirmado numa morte real ao vivo. |
| Ataque ofensivo/saque | ✅ Funcionando (evidência indireta); falta confirmação direta. |
| Fome ligada ao estoque | ✅ Funcionando, sem risco de rajada simultânea no nascimento. |
| Animais no mapa | ❌ Não iniciado — decorativo simples, só quando tiver arte. |

## 3. Bugs / comportamentos estranhos não corrigidos

1. **Elfo sem arte própria** — cai no guerreiro genérico, decisão explícita aceita (mesmo padrão que a casa já teve enquanto não tinha sprite). Única categoria visual da lista original de 8 que ainda não tem arte nova — ver `ROADMAP.md` §2.4.
2. **Orc destoa visualmente do resto do jogo** (sprite de perfil, resto é visto de cima/frente) — aceito por enquanto, guerra tem pouco tempo de tela; considerar trocar se incomodar numa sessão real.
3. **Papel de guerreiro e animação de morte não foram confirmados numa guerra/morte real ao vivo** — nenhum dos dois eventos ocorreu nas janelas de teste automatizado disponíveis.
4. **Pesca confirmada só por score/seleção de ação, não pela entrega completa**.
5. **Postura de guerra/paz pode alternar com frequência que parece volátil** numa sessão de observação longa.
6. **A correção da espiral de extinção populacional por reprodução** (sessão bem anterior) nunca foi confirmada numa sessão real longa.
7. **Ataque ofensivo/saque nunca foi confirmado por leitura direta de um agente**.
8. **Indicador visual `💀 extinta`** nunca foi visto aparecer ao vivo.
9. **Testes automatizados de sessão longa esbarram em throttling de `requestAnimationFrame`** mesmo na aba tecnicamente ativa — limitação de tooling confirmada, não bug do jogo.
10. **Crescimento populacional inicial rápido** (achado em sessão anterior) — não confirmado se estabiliza numa sessão muito mais longa.
11. **Nenhuma casa foi vista completando de ponta a ponta** numa sessão real.

## 4. Decisões técnicas e o motivo

- **Priorizar visual sobre features novas** — decisão do usuário: o jogo já é funcionalmente rico, visualmente pobre é o que mais precisa resolver agora. Brainstorm de features (`ROADMAP.md` §2.3) fica parado até o visual estar redondo.
- **`assets/sprites/` como pasta canônica, matéria-prima ignorada no git** — decisão do usuário, evita 51MB de packs brutos (PSD/ASEPRITE/`__MACOSX`) no repositório; só o recortado e aprovado entra.
- **Cavaleiro/Orc do craftpix, terreno/decoração/personagem-base do Kenney + Swordsman** — escolhidos depois de levantamento completo dos packs baixados, com aprovação categoria por categoria via prévia visual antes de mover qualquer arquivo.
- **Aceitar o Orc destoando visualmente** — usuário decidiu depois da checagem de consistência pedida explicitamente antes de aprovar mais nada nesse padrão; pouco tempo de tela (só guerra) não justifica travar o resto da reorganização.
- **Elfo sem arte, mesmo tratamento que casa já tinha** (pendência bloqueada por asset, não decisão de design) — usuário aceitou explicitamente, cai no guerreiro genérico.
- **`Swordsman_lvl1` pro personagem base (civil), `lvl3` reservado pro Cavaleiro** — decisão do usuário: mesma família de personagem, mas nível de equipamento diferencia civil de guerreiro sem trocar de pack.
- **`orFallback()` com `isSpriteReady()` em vez de `??`** — decisão do Claude dentro do escopo aprovado, necessária pra "sem pose específica cai no ciclo parado/andando" funcionar de verdade (sem isso, mostrava o círculo de fallback).
- **Floresta com padrão de textura em vez de verde escuro sutil** — usuário escolheu entre as duas opções apresentadas depois que o Claude sinalizou o risco (RGB médio só ~12% mais escuro que a grama) de a opção "mais fiel ao conceito" ficar imperceptível de relance.
- **Ícone de ouro como pepitas em vez de gema facetada** — usuário escolheu a opção recomendada pelo Claude, por manter o estilo "minério bruto" consistente com stone/coal/iron (todos formato pedra/nugget, não joia).

## 5. Próximos passos concretos, em ordem

1. **Sessão de jogo real do usuário, 15-30+ minutos, 4 vilas visíveis** — próximo passo imediato, ver checklist dedicado abaixo (item 1.1). Cobre tanto as confirmações mecânicas pendentes (guerreiro/morte/pesca/casa) quanto uma avaliação honesta do visual novo por inteiro, incluindo o Orc destoando.
2. **Retomar o brainstorm de features** (`ROADMAP.md` §2.3) só depois dessa sessão — combinado com o usuário, pausado até lá.
3. **Recalibrar a frequência/amortecimento de troca guerra↔paz** se a sessão real mostrar isso como problema de sensação de jogo.
4. **Elfo** — só retomar a busca de arte se o usuário pedir; por ora é pendência aceita.

### 5.1 Checklist pra sessão de observação do usuário

Confirmações mecânicas pendentes (implementadas, nunca vistas ao vivo numa sessão longa de verdade):
- **Guerra real**: um clã escala pra guerra de verdade; guerreiros designados aparecem com o sprite de guerreiro (Cavaleiro/Orc) mesmo fora do combate; o Orc aparecendo lá — ele destoa visualmente na prática (perfil vs. resto de cima/frente) tanto quanto pareceu na prévia estática, ou é menos perceptível em movimento?
- **Morte**: um agente morre e o corpo (`ComponesMorto`) fica visível por ~3s antes de sumir, em vez de desaparecer instantaneamente.
- **Pesca**: o estoque de comida (`food`) de uma vila madeireira sobe especificamente por pesca (não só por comércio).
- **Construção**: uma casa completa de ponta a ponta (`village.buildings` ganha uma entrada), teto de população sobe.
- **Saque**: um agente em `raid` sendo visto direto no inspetor, estoque da vila saqueada caindo.
- **Indicador `💀 extinta`**: aparece no mapa se alguma vila for a zero de população.

Avaliação honesta do visual novo por inteiro (primeira vez sendo visto numa sessão de jogo de verdade, não só em prévia estática):
- Terreno (água/grama/areia/floresta/montanha) lido com clareza à distância, em zoom normal de jogo — floresta se distingue de grama sem precisar aproximar?
- Ícones de minério (stone/coal/iron/gold) legíveis no tile de montanha durante o jogo real.
- Cavaleiro/Orc/personagem-base coerentes entre si andando pelo mapa — e o Orc especificamente: incomoda na prática ou passa despercebido?
- Decoração (árvore/planta/casa) e o conjunto todo junto, impressão geral: "visualmente pobre" (como estava antes desta rodada) ainda se aplica, ou já resolveu o suficiente?

## 6. Coisas pedidas pra lembrar que ainda não são código

- **Animais no mapa**: decorativo simples, sem IA, só quando tiver arte — nenhum pack baixado até agora tem animal de ambiente adequado (o pack de caça baixado tem bichos com animação de fuga/morte, mais complexo que o "decorativo parado" pretendido).
- **Reorganização visual usa packs comerciais gratuitos (craftpix.net, Kenney)** — licenças ficam junto de cada pack em `assets/Assets-testes-para-o-claude-testar/` (fora do git); vale conferir os termos de cada um antes de publicar/distribuir o jogo, não só usar localmente.
