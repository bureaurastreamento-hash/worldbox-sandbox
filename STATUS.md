# STATUS.md — Worldbox Sandbox

Snapshot do estado atual. Sessão iniciada depois da pausa registrada em `034a2dc`. Link ao vivo: https://bureaurastreamento-hash.github.io/worldbox-sandbox/ (GitHub Pages, atualiza a cada push em `main`). Commits desta sessão: `76503cf`..`205077b` (14 commits) — commitados, push ainda pendente desta última leva. Contexto de antes desta sessão (fatias 1-11 do roteiro, especialização de vila, diplomacia dinâmica, minério/construção, papéis visuais, decoração com arte real, fome ligada ao estoque) não é repetido em detalhe aqui — ver `DESIGN.md` e o histórico de commits até `034a2dc`.

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
    - **Apanhado geral contra a lista original de 8 categorias** (terreno, recurso/minério, personagem base, guerreiros, civil em combate, fuga, morto, decoração de mapa): a reorganização **não está 100% completa** — ver §3 item 1 pra a lista exata do que sobrou.

## 2. Estado atual por sistema

| Sistema | Estado |
|---|---|
| World/Terrain | ✅ Funcionando. Água/grama/areia com textura real; floresta/montanha ainda cor lisa. |
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
| Sprites de agente | ✅ Reorganização visual completa (item 12): personagem base + guerreiro Cavaleiro/Orc novos, offset anti-empilhamento, morto, papel permanente. Elfo pendente (sem arte, aceito). |
| Decoração do mapa | ✅ Árvore (3)/planta (2)/casa, arte nova (`kenney_roguelike-rpg-pack`). |
| Água | ✅ Textura de tile animada (2 quadros), arte nova. |
| Especialização de vila | ✅ Funcionando. |
| Minério (evolução) | ✅ Mecânica funcionando; ícone visual **pendente** (sem arte nesta reorganização, decisão explícita de adiar). |
| Construção (evolução) | ✅ Mecânica funcionando, custo reduzido; casa agora com arte real. Ainda sem confirmação de uma casa completando de ponta a ponta numa sessão real. |
| Pesca | ✅ Funcionando — score/seleção de ação confirmados ao vivo; entrega completa não observada diretamente. |
| Papel de guerreiro | ⚠️ Implementado, não confirmado numa guerra real ao vivo. |
| Animação de morte | ⚠️ Implementado, não confirmado numa morte real ao vivo. |
| Ataque ofensivo/saque | ✅ Funcionando (evidência indireta); falta confirmação direta. |
| Fome ligada ao estoque | ✅ Funcionando, sem risco de rajada simultânea no nascimento. |
| Animais no mapa | ❌ Não iniciado — decorativo simples, só quando tiver arte. |

## 3. Bugs / comportamentos estranhos não corrigidos

1. **Reorganização visual incompleta contra a lista original de 8 categorias** — sobrou: **floresta** (tile de terreno — nunca chegou a ser proposto, diferente de montanha/minério que foram adiados por decisão explícita); **montanha** (tile de terreno, decisão explícita de adiar); **minério** (ícone de recurso, decisão explícita de adiar); **elfo** (guerreiro, decisão explícita de adiar, pendência aceita). Ver `ROADMAP.md` §2.4 pro detalhe.
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

## 5. Próximos passos concretos, em ordem

1. **Fechar o que sobrou da reorganização visual, se o usuário quiser continuar**: floresta, montanha, minério, elfo (ver §3 item 1) — nenhum tem candidato aprovado ainda.
2. **Retomar o brainstorm de features** (`ROADMAP.md` §2.3) quando o visual estiver considerado redondo o suficiente.
3. **Jogar uma sessão real de 15-30+ minutos** — confirmar papel de guerreiro numa guerra real, corpo numa morte real, pesca enchendo o estoque, uma casa completando, e agora também avaliar o visual novo por inteiro (inclusive se o Orc incomoda).
4. **Recalibrar a frequência/amortecimento de troca guerra↔paz** se uma sessão real mostrar isso como problema de sensação de jogo.
5. **Confirmar visualmente saque e o indicador `💀 extinta`** numa sessão real.

## 6. Coisas pedidas pra lembrar que ainda não são código

- **Animais no mapa**: decorativo simples, sem IA, só quando tiver arte — nenhum pack baixado até agora tem animal de ambiente adequado (o pack de caça baixado tem bichos com animação de fuga/morte, mais complexo que o "decorativo parado" pretendido).
- **Reorganização visual usa packs comerciais gratuitos (craftpix.net, Kenney)** — licenças ficam junto de cada pack em `assets/Assets-testes-para-o-claude-testar/` (fora do git); vale conferir os termos de cada um antes de publicar/distribuir o jogo, não só usar localmente.
