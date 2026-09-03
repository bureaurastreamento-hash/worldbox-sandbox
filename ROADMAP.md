# ROADMAP.md — Worldbox Sandbox

Lista completa e detalhada de tudo que já foi implementado e tudo que está planejado, levantada analisando `DESIGN.md`, `ARCHITECTURE.md`, `STATUS.md`, o código-fonte e o histórico completo de commits. Serve de referência única pra decidir prioridade de desenvolvimento — não substitui os outros três arquivos (que continuam sendo a fonte detalhada de design/arquitetura/estado de sessão), só consolida a visão de conjunto.

---

## Parte 1 — O que já foi feito

### 1.1 Fundação: mundo, câmera, tempo (fatia 1)
- Geração procedural de terreno por ruído de valor em camadas (`world/terrain.js`), determinística pela seed — 5 tipos de tile: água, areia, grama, floresta, montanha.
- Falloff radial de borda — o mundo é sempre uma ilha cercada de oceano.
- Tile de montanha ganha um recurso mineral (`stone`/`coal`/`iron`/`gold`) na geração, proporção configurável (`MOUNTAIN_RESOURCE_WEIGHTS`).
- Índice espacial (`world/spatialIndex.js`) — buckets de grid pro tamanho do raio de percepção, evita busca O(n²) por vizinhos (6.6x mais rápido medido com 1500 agentes).
- Pathfinding A* (`world/pathfinding.js`) considerando obstáculo de terreno (água/montanha não andáveis).
- Câmera com pan (arrastar) e zoom; zoom mínimo "contain" (mapa inteiro cabe na tela, `render/camera.js`).
- Loop de tempo com pausa e 3 velocidades (1x/2x/4x), timestep fixo pra determinismo (`core/time.js`, `core/gameLoop.js`).
- Game loop com try/catch — uma exceção num agente/vila não trava o jogo inteiro.

### 1.2 IA de utilidade e necessidades (fatia 2)
- Sistema de utilidade: ações candidatas pontuadas a cada reconsideração (intervalo de 0.5s + jitter por agente), troca de ação só se a diferença passar um limiar de interrupção (evita flip-flop).
- Necessidades com decaimento por tempo real decorrido (não por número de reconsiderações): **fome** e **sono** implementados. Curva de urgência não-linear (necessidade baixa quase não pontua, crítica domina o score).
- ⚠️ Segurança, social e pertencimento — previstos no pitch original, **nunca implementados** como necessidades numéricas (ver Parte 2).

### 1.3 Percepção e memória (fatia 3)
- Cada agente varre um raio de visão (`PERCEPTION_RADIUS`, hoje 12 tiles) a cada tick ativo — só sabe o que já viu ou lembra, nunca lê o `world` direto pra decidir.
- Memória com confiança decrescente (esquece um local não revisto em ~2min); reforçada quando revisto.
- Fronteira arquitetural respeitada: `decision.js` nunca consulta o mundo real pra saber "o que existe", só executa ações sobre alvos já conhecidos.

### 1.4 Múltiplos agentes, vila mínima e economia (fatia 4, evoluída depois)
- Estoque comunitário por vila, 6 recursos: `food`, `wood`, `stone`, `coal`, `iron`, `gold`.
- Demanda calculada por tick (`1 - stock/capacity`) — puxa o score de ações que suprem o recurso, pra todo mundo, sem decisão central.
- **Especialização de vila** (`'food'` | `'wood'`, sempre balanceada entre as `VILLAGE_COUNT` vilas): só vila agrícola colhe comida (`gather.js`), só madeireira colhe madeira (`gatherWood.js`). Resolve o pilar 4 do design (vila guerreira depende de comércio).
- **Fome ligada ao estoque real** (`eat.js`): agente marcha até o centro da vila e come do estoque comunitário — sem estoque, não come, fome de verdade. `STARTING_FOOD_STOCK` (60) evita morte instantânea dos fundadores antes do comércio se estabelecer.
- **Minério universal** (`mine.js`): qualquer vila minera qualquer um dos 4 tipos, sem gate de especialização — é material de construção, não parte do pilar de interdependência.
- **Pesca universal** (`fish.js`, sessão mais recente): qualquer vila pesca em água, produz `food`; peso deliberadamente abaixo de `gather.js` — atenua, não substitui, a dependência de comércio de uma vila madeireira.
- **Construção** (`build.js`): casa consome madeira+pedra do estoque comunitário, aumenta o teto de população (`getPopulationCap`).

### 1.5 Ciclo de vida (fatia 5)
- Envelhecimento por tick (idade em segundos simulados); estágios criança/adulto/idoso.
- Morte por fome crítica sustentada, combate, ou idade máxima (`MAX_AGE`).
- Regeneração de vida quando não há inimigo por perto.
- Reprodução por vila: cooldown + elegibilidade (fome > limiar) + demanda de comida não crítica + teto de população — não trava por combate ou colapso indevidamente.
- **Animação de morte** (sessão mais recente): corpo fica visível (`ComponesMorto`) por `DEATH_LINGER_SECONDS` (3s simulados) antes de sumir de vez, em vez de desaparecer no mesmo tick.

### 1.6 Múltiplas vilas, clãs e diplomacia (fatias 6-7, evoluída depois)
- N vilas/clãs no mundo (`VILLAGE_COUNT=4`), espalhadas em ângulos ao redor da primeira.
- Postura entre clãs: guerra / tensão / neutro / aliado; tratados com tipo e status (proposto/assinado/rompido).
- **Diplomacia dinâmica** (pós-fatia 11): cada clã reavalia periodicamente a relação com cada outro, reagindo a `village.distress` (desespero sustentado por um recurso crítico):
  - Escala pra guerra quando desespero sustentado + o outro clã tem sobra do recurso.
  - Busca paz quando o desespero que motivou a guerra já passou.
  - Propõe comércio quando precisa de um recurso que o outro tem de sobra (inclusive sob postura `tense`, não só `neutral` — corrigido depois de um achado real de vila presa sem alívio).
  - Troca de parceiro comercial quando existe um terceiro clã mais desesperado pelo recurso exportado.
- **Colapso interno** (`village.inChaos`): nenhum recurso crítico aliviado por muito tempo apesar de guerra/comércio já terem tido chance — trava reprodução, acelera decaimento de necessidades.
- **Vila extinta não participa mais da diplomacia/comércio** — não declara/sofre guerra, não propõe/recebe comércio, mas continua existindo como entidade saqueável (label `💀 extinta` no mapa).
- **Papel de guerreiro permanente** (sessão mais recente, fecha lacuna do modelo de dados original `role: farmer/warrior/builder`): fração dos adultos elegíveis vira guerreiro quando o clã entra em guerra, desmobiliza quando a paz volta de vez; visual permanente (não só durante a luta) e pequeno bônus de prioridade pra lutar/saquear.

### 1.7 Comércio (fatia 8)
- Rotas entre vilas cujos clãs permitem (`canTrade` — mesma clã sempre; clãs diferentes precisam ser aliados ou ter tratado de comércio assinado), movendo excedente pra quem tem déficit, taxa fixa por segundo.
- Genérico por tipo de recurso desde o início — passou a mover minério, comida e madeira sem nenhuma mudança de código quando cada um desses sistemas chegou.

### 1.8 Combate e guerra (fatia 9, evoluída depois)
- Engajar/fugir por utility AI: crianças e feridos graves só fogem, o resto prioriza lutar mas foge se a vida cair demais — reavaliado a cada reconsideração.
- Dano mútuo corpo a corpo por tick de combate.
- **Ataque ofensivo/saque** (`raid.js`): guerra declarada por desespero tem efeito prático — agentes elegíveis marcham até a vila inimiga e saqueiam o recurso com mais estoque de lá.
- Papéis visuais de combate: sprite de guerreiro (orc/elfo/cavaleiro, sorteado no nascimento, fixo pra vida toda) durante a luta — e agora, com o papel permanente, também fora dela. Elfo ainda sem arte própria (ver §2.4), cai no guerreiro genérico enquanto isso.

### 1.9 Escala — Simulation LOD (fatia 10)
- Agentes fora da viewport atual (checado em espaço de tela, escala com zoom) rodam em modo agregado: sem percepção/decisão/pathfinding, necessidades empurradas de volta pra perto do topo (a vila "se vira sozinha" fora de vista). Idade e morte por idade continuam normais pra todos.

### 1.10 UI de observação (fatia 11, evoluída depois)
- HUD: controles de tempo, status do agente selecionado (ação, idade, fome, sono, vida).
- Inspetor: score de cada ação candidata na última reconsideração (por que a IA escolheu o que escolheu), estoque/demanda/desespero da vila, população/casas/especialização, postura e tratados do clã.
- Seleção direta de vila (sem precisar de um agente) pra inspecionar estoque/clã.
- Raio de percepção visualizável (`[D]`).
- **Feed de eventos** (`ui/eventFeed.js`): log de texto na tela narrando o que já acontecia por trás dos panos — guerra declarada, tratado rompido, casa construída, morador morto (de fome, em guerra ou por um predador, com a espécie citada), vila extinta, aviso de fome crítica da vila (`lifecycle.js:updateHungerWarning`, com histerese). Era a "recomendação de maior impacto" da Parte 2 e foi implementada; numa passada de polimento visual posterior, o módulo foi reescrito pra animar só a linha nova em vez de reconstruir o DOM inteiro a cada evento.

### 1.11 Decoração e arte visual
- Decoração do mapa (árvore/planta/casa) gerada uma vez, puramente visual, sem afetar pathfinding/percepção.
- Papéis visuais por AÇÃO corrente do agente (não por facção): Camponês com pose dedicada (cortando árvore, minerando, construindo, levando tronco, pescando) quando a ação tem uma óbvia; guerreiro durante a luta e, agora, também como papel permanente.
- **Offset anti-empilhamento**: agentes convergindo pro mesmo ponto não ficam mais desenhados exatamente sobrepostos (dava impressão de terem sumido).
- **Reorganização visual completa** (sessão posterior, substitui a leva de arte anterior de ponta a ponta — ver `STATUS.md` e `DESIGN.md` §8/§9 pro histórico do que a leva anterior ensinou): `assets/sprites/` é a pasta canônica; matéria-prima bruta (packs craftpix.net + `kenney_roguelike-rpg-pack`, ~51MB/2091 arquivos) fica em `assets/Assets-testes-para-o-claude-testar/`, ignorada no git — só o recortado/aprovado entra no repositório.
  - **Terreno**: água (2 quadros animados), grama, areia, floresta, montanha — textura de tile inteiro, sem recorte por alpha (`render/tileRenderer.js`). Floresta usa um padrão com textura cinza sobre o verde, deliberadamente diferente de grama (uma opção de verde só ligeiramente mais escuro foi descartada por ficar sutil demais de relance).
  - **Ícones de recurso mineral** (`stone`/`coal`/`iron`/`gold`): pedra cinza, carvão com brasa, pedrinhas prateadas e pepitas de ouro, sobrepostos no tile de montanha — mesmo pack, mesmo padrão de recorte-por-alpha de antes.
  - **Decoração**: 3 espécies de árvore, 2 de planta, casa (telhado+parede empilhados — o pack não tem casa de peça única).
  - **Personagem base** (substitui Camponês): parado/andando/civil-em-combate (ataque/defesa alternando)/fuga/morto, todos do craftpix `Swordsman_lvl1`.
  - **Guerreiros**: Cavaleiro (craftpix `Swordsman_lvl3`) e Orc (craftpix `Orc_Warrior`) com arte própria parado/andando/atacando. Orc é sprite de perfil (resto do jogo é visto de cima/frente) — destoa um pouco, aceito por enquanto por ter pouco tempo de tela (só guerra). Elfo segue **sem arte própria** (ver §2.4), cai no guerreiro genérico.
  - Bugs de infraestrutura de renderização corrigidos durante o processo: gate global de "sprites carregados" (um sprite faltando travava todos os outros no fallback geométrico) trocado por checagem individual por sprite; `sprite ?? fallback` nunca disparava o fallback de verdade (todo `Image` é um objeto truthy mesmo sem carregar) — trocado por `orFallback()` baseado em `isSpriteReady()`.

### 1.12 Correções de bugs relevantes já resolvidas
- **Extinção por reprodução/velhice**: população inteira morrendo de velhice antes da reprodução repor os fundadores — corrigido subindo `MAX_AGE` e `AGENT_COUNT` (5→8), entre outros ajustes de balanceamento.
- **Vila presa em fome sem caminho de comércio**: postura `tense` bloqueava indevidamente a proposta de comércio — corrigido.
- **Extinção quase-instantânea sincronizada**: todos os fundadores nasciam com fome=100 fixo, cruzavam o limiar de "comer" juntos, drenavam o estoque numa rajada e a vila inteira morria de fome em ~70-80s — corrigido dessincronizando a fome inicial dos fundadores + aumentando o estoque inicial.
- **Ritmo de mineração/construção travado**: descoberta de montanha por acaso era lenta demais (raio de percepção pequeno, `wander.js` sem viés de busca) — corrigido subindo o raio e reduzindo o custo de casa; confirmado ao vivo funcionando de ponta a ponta.

### 1.13 Fauna predadora (`predator/`, `DESIGN.md` §10)
Fecha o item "animais no mapa", que a Parte 2 listava como bloqueado por arte — e foi bem além do "decorativo simples primeiro" que a decisão original previa: os bichos nasceram já como ameaça de verdade, não como decoração parada.
- `Predator` é uma entidade separada de `Agent`, deliberadamente mais simples: sem needs/perception/memory/utility completo. FSM própria (`patrolling → chasing → attacking → fleeing`) com histerese na fuga e **leash** a partir do ponto de nascimento (senão um predador viraria perseguidor permanente até dentro da vila).
- Reação do agente por papel: civil sempre foge (`fleePredator.js`), guerreiro designado enfrenta (`fightPredator.js`) a menos que a própria vida já esteja crítica. Ações novas de propósito, não reaproveitadas de `flee.js`/`fight.js` — predador não tem clã e o dano não é simétrico.
- Efeito real na vila: morador pode morrer de verdade, com evento no feed citando a espécie. `village.distress` **não** reage — é especificamente sobre déficit de recurso, misturar fauna ali confundiria o sinal que a diplomacia usa.
- **Redução de 4 pra 2 espécies** (sessão posterior): a arte do pack de vida selvagem (urso/lobo/cobra/besouro) ficou abaixo da régua de qualidade do resto do jogo e foi descartada. Sobraram duas, com arte do Tiny RPG Character Asset Pack 02 (mesma família do Cavaleiro/Orc): **demônio** herdou o perfil do urso (tanque, lento, dano alto) e **monstro de sangue** o do lobo (frágil, rápido, faro melhor) — os stats foram redistribuídos, não inventados. Com o besouro foi embora o único ataque à distância do jogo, perda aceita explicitamente por falta de substituto à altura. Densidade preservada (~24 no mapa: 12 por espécie em vez de 6).

### 1.14 SpriteManager unificado e migração dos renderers
- **`src/render/sprites/`** — gerenciador que lê dois formatos de spritesheet por trás de uma interface só: **tira horizontal** (uma ação por arquivo, Idle/Walk/Attack/Hurt/Death) e **grade RPG** de blocos 3 col x 4 lin (suporta tanto `12x8` com 8 personagens quanto `3x4` com um só, detectados automaticamente). Contagem de quadros é derivada da imagem, não da tabela declarada — a tabela virou validação com aviso, depois de se descobrir que ela errava o número de quadros de `attack` em 3 dos 4 atores.
- **Página de provas** `sprite-lab.html` na raiz: carrega o pack inteiro, lista os atores com seus clipes e permite trocar estado e direção a olho.
- **Predadores migrados**: animação de verdade por estado, espelhamento conforme a direção do movimento, e corpo que fica no chão tocando a animação de morte (antes sumia no tick da morte, por falta de arte).
- **Agentes migrados**: civil vira um dos 32 personagens da grade RPG (rosto fixo por agente, caminhada com 4 direções reais); guerreiro designado usa as tiras completas de Soldier/Orc com idle/walk/attack/hurt/death. Custo medido de 0.195ms/frame com 32 agentes e 1.56ms com 200 — desprezível ao lado do gargalo real (`drawTiles`).
- **Animação usa tempo SIMULADO**, não real — ao contrário de partículas/câmera/tremor. Uma animação de personagem representa deslocamento no mundo, então congela no pause e acelera em 4x junto com o movimento.

### 1.15 Terreno e decoração procedurais
- Terreno (água/areia/grama/floresta/montanha), minério e decoração (árvore/planta/casa/baú) **gerados por código** em `src/render/terrain/`, depois de a busca por substituição em todos os packs baixados fechar negativa — o único tileset disponível é flat e saturado, o estilo que se queria eliminar.
- Transição irregular entre tipos de terreno (máscara de 4 bits por vizinhança), que dissolve a grade de quadrados; 6 variantes por tipo escolhidas por hash da posição; rampa de 5 tons com direção de luz única (cima-esquerda) em toda a arte.
- Minério deixou de ser ícone centralizado e virou pedra incrustada na rocha, fora do centro.
- Círculo de território da vila virou gradiente de borda em vez de disco chapado, que passou a lavar o terreno texturizado.
- **Ficou mais barato que o terreno de cor lisa** (4.65ms contra 6.8ms em zoom 1): a arte de cada tile é resolvida uma vez e guardada no tile, eliminando trabalho por-frame num laço que já era o gargalo de FPS.

### 1.16 Exploração, expedições e defesa permanente (`DESIGN.md` §11)
- **`wander` com rumo persistente** — antes era passeio aleatório isotrópico dentro do raio de percepção, resetado ao centro da vila toda vez que a fome puxava o agente de volta; medido, os moradores viviam num disco de ~11 tiles num mapa de 220.
- **Ação `explore`** — alvo a 45 tiles do centro, muito além da percepção, pontuado por carência institucional (a vila precisa de um minério e não conhece nenhum depósito dele). Pilar 3 do design aplicado a território.
- **Expedições em grupo** (`village/expedition.js`) — 1 a 3 moradores saem juntos, com o mínimo de estado compartilhado possível: dividem um alvo, não ordens. Sem líder; o grupo é consequência de todos partirem do mesmo lugar pro mesmo lugar, e sair dele é emergente (quem deixa de escolher `explore` é só removido).
- **Quadro de descobertas da vila** (`village/knowledge.js`) — depósito visto por um morador fica registrado quando ele **volta e conta**, preservando o pilar 2 (nada entra por percepção).
- **Guarnição permanente + patrulha** — corrige o efetivo militar ser zero em tempo de paz, o que também deixava os 24 predadores do mapa literalmente incontestados.
- **Construção destravada** — quatro problemas independentes, nenhum deles o custo da pedra que o `STATUS.md` vinha apontando; o decisivo era um vazamento de recurso em `build.js` (débito na chegada, obra reiniciada a cada interrupção). Casa passou a custar só madeira.
- **A\* com heap binário** — o conjunto aberto era um array reordenado por completo a cada iteração; com alvos distantes/inalcançáveis virando comuns, custava **33x** o tempo de simulação.
- **`?seed=x` na URL** fixa o mundo, pra medir A/B de verdade.
- **Correção de uma extinção total** que o próprio trabalho desta sessão introduziu, invisível na janela de 180s em que tudo vinha sendo medido — ver `STATUS.md` §5b. Junto veio a trava estrutural que faltava: `village/stock.js:canDevelop`, um teto de **cabeças** (não de estoque) pra quanta gente da vila pode estar em atividade não-alimentar ao mesmo tempo.

---

## Parte 2 — O que está planejado / pendente

### 2.1 Confirmações pendentes (já implementado, ainda não visto ao vivo numa sessão real)
- **Sessão de jogo real mais longa que 180s** — é a confirmação que falta pra quase tudo de §1.16. Especificamente: a população ultrapassa o baseline quando as casas se acumulam (a expectativa, não verificada)? Dá pra ver uma expedição saindo e voltando? O soldado patrulhando lê bem?
- **Celeiro e depósito nunca foram construídos** em nenhum teste — só casas. Os dois dependem de pedra, e a exploração acha cordilheira em ~40% dos mundos.
- **Papel de guerreiro permanente** — nenhuma guerra ocorreu ainda numa sessão de teste; visual e bônus de score não confirmados. (A guarnição de **paz** já foi confirmada: 7 guerreiros/mundo, soldado visto ao vivo.)
- **Animação de morte** — nenhuma morte ocorreu ainda numa sessão de teste.
- **Pesca** — confirmada por score/seleção de ação, não pela entrega completa (estoque de comida subindo especificamente por pesca).
- ~~**Construção completa de ponta a ponta**~~ — **resolvido em §1.16**: 2.4 casas por mundo em 180s, contra zero em todo teste anterior.
- **Ataque ofensivo/saque** — só evidência indireta (desespero resetando sem comércio ativo); nunca confirmado lendo `agent.currentAction === 'raid'` direto num agente selecionado.
- **Indicador visual `💀 extinta`** — implementado e conferido por leitura de código, nunca visto aparecer ao vivo.
- **Correção da espiral de extinção por reprodução** (sessão bem anterior) — nunca confirmada numa sessão de jogo real longa, só em simulação em lote.

### 2.2 Lacunas do design original nunca implementadas
- **Necessidades de segurança, social e pertencimento** — o pitch original previa 5 necessidades (`fome, sono, segurança, social, pertencimento`); só fome e sono existem hoje. Social/pertencimento abririam comportamento emergente de verdade (agentes buscando companhia uns dos outros); segurança já tem uma aproximação comportamental (fuga de ameaça via `flee.js`), mas não como um valor numérico que decai e pontua ações.
- **`agent.traits`** (`aggressiveness`, `sociability`, ...) — o modelo de dados conceitual do DESIGN.md previa traços leves que enviesam o score de utilidade (ex.: agente sociável pontua mais alto ações sociais). Nunca implementado — não existe `traits` em nenhum agente hoje.
- **`Treaty.type: 'defense_pact'`** — existe no modelo de dados, pode ser proposto/assinado (`clan/diplomacy.js`), tem label na UI, mas **nenhum código lê esse tipo de tratado pra ter efeito real**. O comentário original dizia "ganha efeito na fatia 9 (combate)" — fatia 9 está pronta há tempos e o efeito nunca foi conectado. Seria: um aliado com pacto de defesa entra automaticamente na guerra quando o parceiro é atacado, abrindo guerras multi-clã.
- **`village.founded`** (tick de fundação) — está no modelo de dados conceitual, nunca setado nem lido em lugar nenhum. Baixa prioridade (não bloqueia nada), mas seria fácil de preencher se algum dia for útil pra UI (ex.: "vila fundada há X tempo").

### 2.3 Sugestões de evolução levantadas nesta sessão (nada implementado ainda)
- **LOD de renderização por zoom** (ideia registrada, não implementada) — distinto do LOD de *simulação* que já existe (`simulation/lod.js`, §1.9: decide quem roda percepção/decisão completos). Este seria sobre o que é *desenhado*: em zoom bem aberto (mapa grande visível), reduzir o detalhe visual em degraus — tile vira cor sólida sem textura, agente/construção vira um bloco ou ponto sem sprite/animação, só o suficiente pra ler "aqui tem floresta", "aqui tem vila". Conforme aproxima o zoom, o detalhe sobe em degraus até o nível atual (sprite completo, animação, partícula). Ataca dois problemas ao mesmo tempo: o gargalo de FPS que `drawTiles` tinha antes de `render/terrain/terrainChunks.js` (custo escalava com tiles visíveis, que cresce com zoom out) e permite aumentar o tamanho do mapa sem piorar performance, porque o custo passa a escalar com "tiles × nível de detalhe exigido naquele zoom", não só "quantos tiles estão na tela". **Implementação real (quantos degraus, o que cada um desenha) fica pra quando performance/escala de mapa for prioridade** — não é urgente hoje porque `terrainChunks.js` já resolveu o gargalo medido de terreno; o ganho aqui seria principalmente pra mapas maiores que os atuais 220×220, ou pra aliviar `agentRenderer.js`/`predatorRenderer.js` em telas com centenas de agentes visíveis ao mesmo tempo.
- **Repensar o orçamento de tempo de agente** — **é o próximo passo mais valioso da lista**, e o pré-requisito de quase todo o resto. A economia não tem folga: todo o tempo dos moradores já está comprometido com comida/comer/dormir, e qualquer atividade nova sai da margem de sobrevivência (ver `DESIGN.md` §11.6). Enquanto isso não for resolvido, construção continua rara, mineração custa população, e as necessidades sociais vão bater no mesmo muro.
- ~~**Viés de direção na exploração**~~ — **feito** (§1.16): a expedição escolhe o setor menos visitado. A distância continua fixa de propósito; aumentá-la foi testado duas vezes e a ida e volta nunca pagou o tempo.
- **Mais tipos de construção além de casa** — armazém (mais capacidade de estoque), torre (bônus pra guerreiros por perto), poço/fazenda (acelera produção de comida/madeira). Dá uma escada de progressão visível pra vila.
- **Histerese na troca guerra↔paz** — já sinalizado como podendo parecer volátil numa sessão de observação longa; ajuste de sensação de jogo, não sistema novo.
- **Conectar `defense_pact`** (ver 2.2) — mencionado aqui de novo porque é tanto uma lacuna quanto uma sugestão de evolução natural pro sistema de diplomacia já existente.

### 2.4 Bloqueado externamente (depende de arte que ainda não existe)
- **Elfo** — segue sem arte própria em nenhum pack baixado; decisão explícita aceita, cai no guerreiro genérico (hoje o `Soldier` do pack novo, com animação completa). Deixou de ser urgente: enquanto a arte antiga estava apagada, o elfo caía no círculo geométrico; agora ele ao menos aparece como guerreiro animado. Trocar continua trivial em `render/agentRenderer.js:WARRIOR_ACTOR` assim que houver candidato.
- **Folha de tiles Kenney não usada** — `Pers-Sprites/Vários tipos de chão-.../roguelikeSheet_transparent.png` (16x16 com 1px de margem) seria um terceiro formato de spritesheet pro `SpriteManager`. Ficou sem uso porque terreno e decoração foram resolvidos por arte procedural (§1.15) — o estilo do Kenney era justamente o problema. Só vale implementar se aparecer outro tileset que se queira usar.

### 2.5 Sistemas grandes, sem prioridade definida ainda

Pesquisados pelo usuário e considerados genuinamente interessantes pro jogo,
mas **explicitamente fora da causa** do comportamento "travado/burro" que
motivou o diagnóstico de percepção/alvo. Registrados aqui só pra não se
perderem — **sem design proposto e sem estimativa**; qualquer um deles exige
uma conversa de design própria antes de virar tarefa.

- **Evolução genética e especiação de criaturas** — traços herdáveis que
  divergem ao longo das gerações até formarem populações distintas.
- **Tecnologia emergente por necessidade da vila** — desbloqueada quando a
  vila precisa resolver um problema real que está enfrentando, **não** por
  "turno" nem por árvore de pesquisa com custo fixo.
- **Sucessão de liderança quando uma linhagem acaba** — o que acontece com a
  vila/clã quando quem liderava morre sem continuidade.
- **Construção que se adapta ao bioma** — casa de bioma frio diferente de casa
  de bioma quente, e assim por diante.

### 2.5 Item aberto do usuário
- A sessão anterior perguntou se havia "funções" que o usuário queria adicionar além do que os assets sobrando sugeriam — ainda sem resposta. Vale revisitar se surgir algo que não é sobre sprite nenhum.

---

## Como usar esta lista

A Parte 1 é o registro histórico completo — não deveria precisar mudar, só crescer conforme novas fatias forem fechadas (mova o item daqui pra Parte 1 quando implementado e testado). A Parte 2 é o backlog vivo — prioridades devem ser decididas em conversa, não assumidas por ordem de aparição aqui. Este arquivo não substitui `STATUS.md` (snapshot da sessão mais recente, com bugs/decisões técnicas específicas) nem `DESIGN.md` (design vivo, com o raciocínio por trás de cada decisão) — é só o mapa de tudo junto, pra não perder o fio de nada.
