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

### 1.11 Decoração e arte visual
- Decoração do mapa (árvore/planta/casa) gerada uma vez, puramente visual, sem afetar pathfinding/percepção.
- Papéis visuais por AÇÃO corrente do agente (não por facção): Camponês com pose dedicada (cortando árvore, minerando, construindo, levando tronco, pescando) quando a ação tem uma óbvia; guerreiro durante a luta e, agora, também como papel permanente.
- **Offset anti-empilhamento**: agentes convergindo pro mesmo ponto não ficam mais desenhados exatamente sobrepostos (dava impressão de terem sumido).
- **Reorganização visual completa** (sessão posterior, substitui a leva de arte anterior de ponta a ponta — ver `STATUS.md` e `DESIGN.md` §8/§9 pro histórico do que a leva anterior ensinou): `assets/sprites/` é a pasta canônica; matéria-prima bruta (packs craftpix.net + `kenney_roguelike-rpg-pack`, ~51MB/2091 arquivos) fica em `assets/Assets-testes-para-o-claude-testar/`, ignorada no git — só o recortado/aprovado entra no repositório.
  - **Terreno**: água (2 quadros animados), grama, areia — textura de tile inteiro, sem recorte por alpha (`render/tileRenderer.js`). Floresta e montanha ainda em cor lisa (ver §2.4).
  - **Decoração**: 3 espécies de árvore, 2 de planta, casa (telhado+parede empilhados — o pack não tem casa de peça única).
  - **Personagem base** (substitui Camponês): parado/andando/civil-em-combate (ataque/defesa alternando)/fuga/morto, todos do craftpix `Swordsman_lvl1`.
  - **Guerreiros**: Cavaleiro (craftpix `Swordsman_lvl3`) e Orc (craftpix `Orc_Warrior`) com arte própria parado/andando/atacando. Orc é sprite de perfil (resto do jogo é visto de cima/frente) — destoa um pouco, aceito por enquanto por ter pouco tempo de tela (só guerra). Elfo segue **sem arte própria** (ver §2.4), cai no guerreiro genérico.
  - Bugs de infraestrutura de renderização corrigidos durante o processo: gate global de "sprites carregados" (um sprite faltando travava todos os outros no fallback geométrico) trocado por checagem individual por sprite; `sprite ?? fallback` nunca disparava o fallback de verdade (todo `Image` é um objeto truthy mesmo sem carregar) — trocado por `orFallback()` baseado em `isSpriteReady()`.

### 1.12 Correções de bugs relevantes já resolvidas
- **Extinção por reprodução/velhice**: população inteira morrendo de velhice antes da reprodução repor os fundadores — corrigido subindo `MAX_AGE` e `AGENT_COUNT` (5→8), entre outros ajustes de balanceamento.
- **Vila presa em fome sem caminho de comércio**: postura `tense` bloqueava indevidamente a proposta de comércio — corrigido.
- **Extinção quase-instantânea sincronizada**: todos os fundadores nasciam com fome=100 fixo, cruzavam o limiar de "comer" juntos, drenavam o estoque numa rajada e a vila inteira morria de fome em ~70-80s — corrigido dessincronizando a fome inicial dos fundadores + aumentando o estoque inicial.
- **Ritmo de mineração/construção travado**: descoberta de montanha por acaso era lenta demais (raio de percepção pequeno, `wander.js` sem viés de busca) — corrigido subindo o raio e reduzindo o custo de casa; confirmado ao vivo funcionando de ponta a ponta.

---

## Parte 2 — O que está planejado / pendente

### 2.1 Confirmações pendentes (já implementado, ainda não visto ao vivo numa sessão real)
- **Papel de guerreiro permanente** — nenhuma guerra ocorreu ainda numa sessão de teste; visual e bônus de score não confirmados.
- **Animação de morte** — nenhuma morte ocorreu ainda numa sessão de teste.
- **Pesca** — confirmada por score/seleção de ação, não pela entrega completa (estoque de comida subindo especificamente por pesca).
- **Construção completa de ponta a ponta** — mecânica testada isoladamente, custo já reduzido, mas nenhuma casa foi vista sendo adicionada a `village.buildings` numa sessão real.
- **Ataque ofensivo/saque** — só evidência indireta (desespero resetando sem comércio ativo); nunca confirmado lendo `agent.currentAction === 'raid'` direto num agente selecionado.
- **Indicador visual `💀 extinta`** — implementado e conferido por leitura de código, nunca visto aparecer ao vivo.
- **Correção da espiral de extinção por reprodução** (sessão bem anterior) — nunca confirmada numa sessão de jogo real longa, só em simulação em lote.

### 2.2 Lacunas do design original nunca implementadas
- **Necessidades de segurança, social e pertencimento** — o pitch original previa 5 necessidades (`fome, sono, segurança, social, pertencimento`); só fome e sono existem hoje. Social/pertencimento abririam comportamento emergente de verdade (agentes buscando companhia uns dos outros); segurança já tem uma aproximação comportamental (fuga de ameaça via `flee.js`), mas não como um valor numérico que decai e pontua ações.
- **`agent.traits`** (`aggressiveness`, `sociability`, ...) — o modelo de dados conceitual do DESIGN.md previa traços leves que enviesam o score de utilidade (ex.: agente sociável pontua mais alto ações sociais). Nunca implementado — não existe `traits` em nenhum agente hoje.
- **`Treaty.type: 'defense_pact'`** — existe no modelo de dados, pode ser proposto/assinado (`clan/diplomacy.js`), tem label na UI, mas **nenhum código lê esse tipo de tratado pra ter efeito real**. O comentário original dizia "ganha efeito na fatia 9 (combate)" — fatia 9 está pronta há tempos e o efeito nunca foi conectado. Seria: um aliado com pacto de defesa entra automaticamente na guerra quando o parceiro é atacado, abrindo guerras multi-clã.
- **`village.founded`** (tick de fundação) — está no modelo de dados conceitual, nunca setado nem lido em lugar nenhum. Baixa prioridade (não bloqueia nada), mas seria fácil de preencher se algum dia for útil pra UI (ex.: "vila fundada há X tempo").

### 2.3 Sugestões de evolução levantadas nesta sessão (nada implementado ainda)
- **Feed de eventos** (recomendação de maior impacto): pequeno log de texto na tela narrando o que já acontece por trás dos panos — guerra declarada, casa construída, morador morto de fome, tratado rompido, vila extinta. Ataca diretamente o "não tem nada demais pra se fazer" sem abrir sistema novo nenhum — só torna visível o que já roda. Os pontos de decisão institucional (`clanDecision.js`, `lifecycle.js`, `build.js`) já sabem exatamente quando cada evento acontece.
- **Mais tipos de construção além de casa** — armazém (mais capacidade de estoque), torre (bônus pra guerreiros por perto), poço/fazenda (acelera produção de comida/madeira). Dá uma escada de progressão visível pra vila.
- **Histerese na troca guerra↔paz** — já sinalizado como podendo parecer volátil numa sessão de observação longa; ajuste de sensação de jogo, não sistema novo.
- **Conectar `defense_pact`** (ver 2.2) — mencionado aqui de novo porque é tanto uma lacuna quanto uma sugestão de evolução natural pro sistema de diplomacia já existente.

### 2.4 Bloqueado externamente (depende de arte que ainda não existe)
- **Terreno de floresta** — nunca chegou a ser proposto em nenhuma rodada de seleção da reorganização visual (diferente de montanha/minério abaixo, que foram considerados e adiados por decisão explícita); ainda em cor lisa. Achado ao fazer o apanhado geral pós-reorganização, não uma escolha deliberada — vale revisitar se o usuário quiser fechar essa categoria.
- **Terreno de montanha** — considerado e adiado por decisão explícita durante a reorganização visual; ainda em cor lisa (`render/tileRenderer.js:TILE_COLORS`).
- **Ícone de recurso mineral** (`stone`/`coal`/`iron`/`gold`) — a leva de arte anterior tinha um ícone pra isso, mas foi substituída; a reorganização visual atual não trouxe um novo (decisão explícita de adiar). `render/tileRenderer.js:RESOURCE_ICON_FILES` já referencia os nomes de arquivo esperados (`Pedra1`/`Carvao`/`Ferro`/`Ouro`) — os arquivos simplesmente não existem em `assets/sprites/` ainda; `isSpriteReady()` trata isso graciosamente (cai sem ícone, sem quebrar nada).
- **Elfo** — sem arte própria em nenhum pack baixado até agora; decisão explícita aceita, cai no guerreiro genérico (mesmo padrão que a casa já teve enquanto não tinha sprite). Trocar é trivial em `render/agentRenderer.js:WARRIOR_*_SPRITE_KEY` assim que houver um candidato.
- **Animais no mapa** — decisão já tomada: decorativo simples primeiro (mesmo tratamento visual de árvore/planta/casa, sem IA), comportamento "vagando sem IA de utilidade" (tipo `wander.js`, mas sem fome/vila/decisão) só numa leva futura, quando a arte estiver pronta. Não é um NPC de verdade, é ambiente.

### 2.5 Item aberto do usuário
- A sessão anterior perguntou se havia "funções" que o usuário queria adicionar além do que os assets sobrando sugeriam — ainda sem resposta. Vale revisitar se surgir algo que não é sobre sprite nenhum.

---

## Como usar esta lista

A Parte 1 é o registro histórico completo — não deveria precisar mudar, só crescer conforme novas fatias forem fechadas (mova o item daqui pra Parte 1 quando implementado e testado). A Parte 2 é o backlog vivo — prioridades devem ser decididas em conversa, não assumidas por ordem de aparição aqui. Este arquivo não substitui `STATUS.md` (snapshot da sessão mais recente, com bugs/decisões técnicas específicas) nem `DESIGN.md` (design vivo, com o raciocínio por trás de cada decisão) — é só o mapa de tudo junto, pra não perder o fio de nada.
