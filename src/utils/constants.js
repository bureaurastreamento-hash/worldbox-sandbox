export const TILE_SIZE = 32;

export const WORLD_WIDTH = 220;
export const WORLD_HEIGHT = 220;

// Piso absoluto de zoom — baixo o bastante pra "contain" (camera.js) deixar
// caber o mapa inteiro (220 tiles) em telas comuns; render/camera.js aplica
// o zoom mínimo real por viewport em cima disso (pode ficar mais alto que
// isso se a janela for maior que o mundo, nunca mais baixo).
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 4;

export const TIME_SPEEDS = [1, 2, 4];

export const AGENT_SPEED = 60; // px de mundo por segundo

// Separação leve entre agentes (agent/separation.js) — só pros `active` do
// LOD. Raio pequeno (~1/3 de TILE_SIZE=32): só desfaz aglomerações de
// verdade, não interfere em agentes só andando perto um do outro.
export const SEPARATION_RADIUS = 10; // px de mundo
export const SEPARATION_STRENGTH = 30; // px/s de empurrão no pico de sobreposição

// Subido de 8 pra 12: mineração/construção nunca decolavam numa sessão de
// ~1h (STATUS.md) porque agent/actions/mine.js só considera um depósito de
// montanha depois que o agente já viu o tile com a própria percepção — e
// wander.js só escolhe entre tiles já visíveis agora, então achar montanha
// por acaso era um passeio aleatório lento demais. Raio maior não muda a
// lógica de ninguém, só aumenta a chance de topar com montanha (ou qualquer
// outro recurso) explorando.
export const PERCEPTION_RADIUS = 12; // tiles

// Intervalo de tempo SIMULADO entre reconsiderações de um agente. Antes vivia
// privado em agent/decision.js; virou constante compartilhada quando o
// escalonamento de cognição (simulation/scheduler.js) passou a ser quem
// decide quando o ciclo caro roda.
export const RECONSIDER_INTERVAL = 0.5;

// Teto de agentes que podem fazer o ciclo caro (percepção + memória +
// pontuar as ações) no MESMO frame, como fração do total. Válvula de
// segurança contra picos, não o mecanismo principal: `decisionTimer` já nasce
// com jitter e espalha as fases sozinho. Ver simulation/scheduler.js.
export const MAX_COGNITION_FRACTION = 0.15;

// 5 (original) provou ser pouca gente pra cobrir sobrevivência + economia +
// reprodução ao mesmo tempo, especialmente com minério universal e
// diplomacia dinâmica competindo por atenção — testado e confirmado
// contribuindo pra extinção total em simulações longas mesmo depois de
// outros ajustes de balanceamento. Mais gente por vila dá resiliência
// direta sem mexer na lógica de decisão em si.
export const AGENT_COUNT = 8;

// Sorteado por agente (fundador ou nascido), fixo pra vida toda — só decide
// qual sprite de guerreiro (render/agentRenderer.js) aparece durante `fight`;
// não afeta gameplay, é puramente visual/cosmético.
export const WARRIOR_TYPES = ['orc', 'elfo', 'cavaleiro'];

export const CARRY_CAPACITY = 10; // unidades de recurso por viagem
// NÃO BAIXE ISTO ACHANDO QUE DÁ FOLGA À ECONOMIA. Foi testado (8 -> 6, +33%
// de produção) e o resultado foi PIOR: a população caiu e mais vilas se
// extinguiram.
//
// O motivo é que a economia é homeostática, não linear. `gather.js` pontua
// por `village.demand.food`, que cai quando o estoque sobe — então produzir
// mais comida ABAIXA o score de colher e libera mais gente pra atividades que
// não são comida (explorar, minerar, construir, patrulhar). O excedente é
// convertido em outra coisa antes de virar margem, e a vila volta pro mesmo
// fio de navalha, só que com mais gente pra alimentar.
//
// Consequência prática: o jeito de sustentar mais atividade não-alimentar
// NÃO é aumentar a produção, é mexer no que compete pelo tempo do agente
// (pesos de score e DEVELOPMENT_MIN_FOOD_FRACTION).
const GATHER_SECONDS = 8; // tempo pra encher a carga colhendo
export const GATHER_RATE = CARRY_CAPACITY / GATHER_SECONDS;

export const VILLAGE_FOOD_CAPACITY = 100;
export const VILLAGE_WOOD_CAPACITY = 100;

// Toda vila nasce com isso em estoque de comida, mesmo a especializada em
// madeira (que nunca produz comida própria, ver village/village.js). Sem
// isso, agent/actions/eat.js (fome ligada ao estoque) mataria de fome os
// fundadores de toda vila guerreira antes de qualquer comércio ter chance de
// se estabelecer — bootstrap seguro, não um recurso renovável (uma vez
// gasto, só volta via colheita ou comércio, igual o resto do estoque).
// Subido de 40 pra 60 como margem extra junto com FOUNDER_HUNGER_MIN/MAX
// abaixo — mesmo com a fome inicial dessincronizada, ainda dá pra vários
// fundadores convergirem pra comer perto um do outro por coincidência.
export const STARTING_FOOD_STOCK = 60;

// Fome inicial de cada fundador sorteada nesse intervalo (main.js), em vez
// de sempre 100 fixo. Sem isso, os AGENT_COUNT fundadores de uma vila
// decaem em sincronia perfeita desde o nascimento (mesmo hunger, decisionTimer
// só varia 0-0.5s) e cruzam o limiar de "comer" praticamente no mesmo
// instante — todos convergindo pro centro da vila ao mesmo tempo e
// consumindo o estoque comunitário numa rajada só (8 agentes x
// EAT_FOOD_PER_SEC = 8/s contra um estoque pequeno, esvaziado em segundos).
// Depois disso ninguém mais tem candidata de comer viável (eat.js:score
// retorna 0 sem estoque) e a vila inteira morre de fome junto, ~70-80s de
// tempo simulado após nascer — bug real observado jogando: as 4 vilas de um
// mundo novo se extinguiam assim, quase ao mesmo tempo, bem antes de
// qualquer economia ter chance de decolar. Espalhar a fome inicial faz os
// fundadores cruzarem o limiar de comer em momentos diferentes, evitando a
// rajada simultânea.
export const FOUNDER_HUNGER_MIN = 50;
export const FOUNDER_HUNGER_MAX = 100;

// agent/actions/eat.js: unidades de estoque de comida consumidas por segundo
// comendo, e quanto cada unidade restaura de fome. 15 unidades pra reencher
// 0->100 (mesma duração de antes, quando comer não consumia nada do
// estoque) — cerca de 1.5 viagem de gather.js (CARRY_CAPACITY=10) por
// reabastecimento completo de um agente; valor inicial, calibrar depois de
// observar jogando (ver STATUS.md).
export const EAT_FOOD_PER_SEC = 1;
export const EAT_RESTORE_PER_FOOD = 100 / 15 / EAT_FOOD_PER_SEC;

// Multiplica a urgência de fome em eat.js:score — sem isso, comer só supera
// o trabalho corrente (INTERRUPT_MARGIN, decision.js) com a fome já baixa
// o bastante pra não sobrar folga de viagem até a vila. Valor inicial pra
// calibrar jogando (achado numa sessão de diagnóstico ao vivo, ver STATUS.md).
export const EAT_URGENCY_WEIGHT = 1.8;

// Abaixo de 1: sobrevivência pessoal deve normalmente vencer trabalho
// comunitário antes de virar crítica (ver agent/actions/gather.js).
export const GATHER_SCORE_WEIGHT = 0.55;

// Pesca (agent/actions/fish.js): universal, como mineração — qualquer vila
// pesca em água, sem gate de especialização. Pedido do usuário: atenuar
// (não substituir) a dependência de comércio de uma vila madeireira, que
// hoje não produz comida própria de nenhuma outra forma. Peso menor que
// GATHER_SCORE_WEIGHT de propósito — pra uma vila agrícola, colher grama
// (produção "de verdade" da especialização) ainda deve vencer pescar na
// maioria das situações; pesca fica como complemento/fallback, não
// substitui `village/trade.js` como via principal de alívio pra quem não
// produz comida.
export const FISH_SCORE_WEIGHT = 0.4;

// Minérios: universais (qualquer vila colhe, sem gate de especialização como
// food/wood) — material de construção, não recurso de sobrevivência. Por
// isso ficam fora de CRITICAL_RESOURCES (utils/constants.js): não alimentam
// distress/guerra/colapso da diplomacia dinâmica (clan/clanDecision.js,
// village/stock.js), só o comércio genérico e a construção (fatia seguinte).
export const MINING_RESOURCES = ['stone', 'coal', 'iron', 'gold'];
export const VILLAGE_MINERAL_CAPACITY = 50;
// Mais baixo que GATHER_SCORE_WEIGHT de propósito: minério compete pelo
// mesmo tempo de trabalho que food/wood, mas é universal (qualquer vila
// pontua pra qualquer um dos 4) enquanto gather/gatherWood são exclusivos
// de metade das vilas cada — sem um peso menor, minério ganhava competição
// demais por agente-hora, testado e confirmado atrasando o bootstrap de
// food/wood o bastante pra causar extinção por velhice sem reprodução.
export const MINE_SCORE_WEIGHT = 0.35;
// Distância máxima que um morador anda atrás de um depósito indicado pelo
// QUADRO da vila (village/knowledge.js). A memória própria do agente não
// passa por aqui: o que ele viu com os próprios olhos já está, por
// construção, dentro do raio de percepção.
//
// Sem este limite, o quadro mandava gente atravessar o mapa por 10 de pedra —
// medido como o principal desestabilizador da economia (ver o comentário em
// agent/actions/mine.js:findDeposit). Minério nem é recurso crítico.
export const MINE_MAX_TRAVEL_TILES = 25;
// Fração mínima do celeiro pra a vila gastar mão de obra em DESENVOLVIMENTO
// (explorar, minerar, construir) em vez de em comida. Trava de sobrevivência,
// não de calibragem — ver village/stock.js:hasFoodSurplus, onde a regra é
// declarada uma vez e consultada pelas três ações.
// 0.6, não 0.3. O primeiro valor era reativo demais e por pouco não derrubou
// a simulação inteira: com o celeiro em 140, 30% são 42 unidades, e as vilas
// passavam a maior parte do tempo acima disso — ou seja, o desenvolvimento
// ficava LIBERADO justamente no pico populacional, que é quando a comida é
// mais necessária. Medido em 600s: a população subia a 64, três ações de
// desenvolvimento (explorar/patrulhar/construir) consumiam 1780 agente-ticks
// contra 2406 de colheita, a comida despencava, a fome bloqueava a
// reprodução (REPRO_FOOD_DEMAND_MAX) e as vilas iam à extinção — 24 mortes de
// fome contra 8 nascimentos em 420s.
//
// A economia desta simulação NÃO TEM FOLGA: a população de equilíbrio é
// fixada pelas taxas de nascimento e morte, e qualquer mão de obra desviada
// sai direto da margem de sobrevivência. Desenvolvimento só com excedente de
// verdade.
export const DEVELOPMENT_MIN_FOOD_FRACTION = 0.3;

// Fração máxima da vila que pode estar em atividade de DESENVOLVIMENTO
// (explorar/minerar/construir/patrulhar) ao mesmo tempo — com piso de 1, pra
// nenhuma vila ficar permanentemente incapaz de evoluir.
//
// Esta é a trava que faltava, e a lição central desta sessão: o limite tem
// que ser sobre QUANTIDADE DE GENTE, não sobre estoque. Limiares de estoque
// oscilam — assim que o celeiro sobe um pouco, a vila inteira fica liberada
// de uma vez, justamente no pico populacional, e desaba. Ver
// village/stock.js:canDevelop pro raciocínio completo, incluindo por que
// aumentar a produção de comida piorou em vez de ajudar.
export const DEVELOPMENT_LABOR_FRACTION = 0.1;
// Proporção de cada minério nos tiles de montanha (world/terrain.js) —
// cumulativo: stone até 0.6, coal até 0.8, iron até 0.95, gold o resto.
export const MOUNTAIN_RESOURCE_WEIGHTS = { stone: 0.6, coal: 0.2, iron: 0.15, gold: 0.05 };

// Exploração (agent/actions/explore.js) e expedições (village/expedition.js).
//
// Por que existe: `wander.js` só escolhe alvo dentro do raio de percepção, e
// a fome puxa o agente de volta à vila a cada ciclo — medido, os moradores
// viviam num disco de ~11 tiles em volta da vila num mapa de 220. Como
// montanha é gerada como faixa de elevação (cordilheira, não pedrinha
// espalhada), uma vila que não nasce colada numa cordilheira NUNCA achava
// minério: não era "devagar", era probabilidade ~zero. Isso é a causa raiz do
// gargalo de construção que o STATUS.md registrava como "calibrar custo de
// pedra" — o custo nunca foi o problema, a descoberta era.
//
// Piso de score: acima de wander (0.05), abaixo de qualquer trabalho real —
// alguém sempre explora quando não há nada melhor a fazer, sem competir com
// a economia.
export const EXPLORE_BASE_SCORE = 0.12;
// Peso da parte movida por CARÊNCIA: sobe quando a vila tem demanda por um
// minério e o quadro de descobertas (village/knowledge.js) não conhece
// nenhum depósito dele. É a exploração deixar de ser passeio e virar
// resposta a uma necessidade real da vila — mesmo mecanismo de pressão
// econômica do pilar 3 do design, aplicado a território em vez de recurso.
// Teto deliberadamente ABAIXO de GATHER_SCORE_WEIGHT (0.55): exploração é
// por minério, e minério não é recurso crítico (ver CRITICAL_RESOURCES) —
// não pode ganhar de produzir comida. Com 0.5 aqui, as duas vilas
// madeireiras de um teste morreram de fome inteiras: elas não produzem
// comida própria, dependem de pescar (FISH_SCORE_WEIGHT 0.4), e explorar
// vencia a pesca. Regressão medida e corrigida, não teoria.
export const EXPLORE_SCORE_WEIGHT = 0.33;
// Score de quem JÁ está numa expedição em andamento. Acima do teto de
// gather/mine/build, abaixo de fugir/lutar/comer crítico: uma vez que a
// expedição partiu, o agente não a abandona porque passou perto de uma
// árvore — mas fome, predador e guerra ainda o tiram dela (e a expedição o
// remove da lista sozinha quando isso acontece).
export const EXPEDITION_COMMITTED_SCORE = 0.58;
// Uma expedição é atividade de EXCEDENTE, e o tamanho é o que mais decide se
// ela custa caro: uma viagem de ida e volta tira o membro da economia por
// ~1min simulado. Com 3 membros fixos, uma vila de 9 pessoas mandava um
// TERÇO da mão de obra pro mapa — medido, isso derrubou duas vilas de 9 para
// 1 morador no mesmo seed em que, sem exploração, elas terminavam com 9.
// Agora o teto sai da população: uma vila só manda mais gente quando de fato
// tem gente sobrando.
export const EXPEDITION_MAX_SIZE = 3; // teto absoluto, mesmo numa vila grande
export const EXPEDITION_MIN_POPULATION = 7; // abaixo disso ninguém sai
export const EXPEDITION_POPULATION_PER_MEMBER = 9; // +1 vaga a cada N moradores

// A vila também precisa estar alimentada pra bancar a viagem. `distress` não
// basta como trava: ele só acumula DEPOIS do déficit se firmar, e a essa
// altura a expedição já partiu. Isto é a condição de partida; a distress
// continua sendo o que CHAMA DE VOLTA quem já saiu.
export const EXPLORE_MIN_FOOD_FRACTION = 0.35; // do teto de comida da vila
// Distância do alvo da expedição, a partir do centro da vila. Bem além do
// raio de percepção (12) de propósito: o ponto é sair do que já se conhece.
export const EXPLORE_DISTANCE_TILES = 45;
// Em quantos setores a vila divide o horizonte pra escolher pra onde ainda
// não mandou ninguém (village/expedition.js:pickTarget). Com ângulo puramente
// sorteado, medido, a exploração achava cordilheira em só ~40% dos mundos —
// três expedições podiam ir praticamente pro mesmo lado enquanto metade do
// mapa nunca era olhada.
export const EXPLORE_SECTORS = 8;
// Quanto a distância cresce a cada visita já feita ao mesmo setor: se a vila
// já bateu naquele rumo e não achou nada, a próxima vai mais longe em vez de
// repetir o passeio. É o que faz a exploração varrer o mapa em vez de
// circular sempre no mesmo anel.
// ZERO de propósito — a expedição vai sempre a EXPLORE_DISTANCE_TILES, e o
// que varia é só a DIREÇÃO (rotação de setores acima). A ida e volta é o
// custo econômico real da exploração: a 60px/s, 45 tiles já são ~48s de tempo
// simulado com o membro fora da economia; a 70 tiles são ~75s e a 95 são
// ~100s. Testado com 0.45/95 e com 0.25/70, e nos dois a população de 600s
// caiu de forma consistente — o alcance extra nunca pagou o tempo.
//
// Fica como constante (e não removido) porque o mecanismo é o certo pra o dia
// em que a economia tiver folga pra bancar expedição longa; ver a nota de
// BUILD_NEED_THRESHOLD sobre limitar quanta gente pode estar em atividade
// não-alimentar ao mesmo tempo.
export const EXPLORE_DISTANCE_GROWTH = 0;
export const EXPLORE_MAX_DISTANCE_TILES = 70; // teto; o mapa tem 220 de lado
// Um agente só entra numa expedição já formada se ainda está perto da vila —
// senão alguém do outro lado do mapa "teleportaria" para o grupo.
export const EXPEDITION_JOIN_RADIUS_TILES = 15;
// Teto de duração (ida + volta). Sem isso, uma expedição cujo alvo virou
// inalcançável (ilha, cordilheira fechando o caminho) prenderia os membros
// fora da economia para sempre.
export const EXPEDITION_TIMEOUT_SECONDS = 240;
// Raio do anel em que os membros caminham em volta do alvo comum, pra o
// grupo viajar junto sem empilhar no mesmo pixel — mesmo padrão de
// village/buildings.js:approachPoint.
export const EXPEDITION_FORMATION_RADIUS = 40; // px de mundo

// Únicos recursos que contam pra desespero/guerra/colapso institucional
// (clan/clanDecision.js, village/stock.js) — é sobre sobrevivência (pilar 4
// do design), não sobre minério de construção.
export const CRITICAL_RESOURCES = ['food', 'wood'];

// Segundos de tempo simulado que um agente morto continua em `world.agents`
// (mas fora da simulação — checkDeath já não faz nada com `alive: false`)
// antes de `lifecycle.js:pruneDead` remover de vez. Sem isso, o agente
// sumia da tela no mesmo tick da morte — não dava tempo nenhum de mostrar
// o sprite de morto (render/agentRenderer.js).
export const DEATH_LINGER_SECONDS = 3;

// Construção (agent/actions/build.js): casa consome madeira+pedra do
// estoque comunitário e aumenta o teto de população da vila que a construiu
// (village/village.js:getPopulationCap) — efeito real, não decoração (isso
// já existe em render/decorationRenderer.js, sem lógica nenhuma).
// Reduzido de 30/20 — mesmo com o raio de percepção maior (ver
// PERCEPTION_RADIUS acima) ajudando a achar montanha mais rápido, pedra
// ainda depende de descoberta por acaso e some rápido no primeiro consumo;
// custo menor dá mais chance real de uma casa completar numa sessão comum,
// sem zerar o gate de recurso (ainda exige acumular estoque de verdade).
// (HOUSE_WOOD_COST / HOUSE_STONE_COST / HOUSE_POP_BONUS viviam aqui e eram
// CÓDIGO MORTO — quando os prédios viraram entidades com tipo próprio, os
// custos passaram a morar na tabela BUILDING de village/buildings.js e nada
// mais importava estas. O STATUS.md chegou a listar "baixar HOUSE_STONE_COST"
// como próximo passo pra destravar a construção: mexer nelas não teria efeito
// nenhum. Removidas pra não voltarem a enganar; o custo de cada prédio é a
// tabela BUILDING, e só ela.)
export const BUILD_WORK_SECONDS = 15; // trabalho contínuo no centro da vila até completar
// Como GATHER_SCORE_WEIGHT: sobrevivência pessoal ainda deve vencer antes
// de virar crítica.
// Acima de GATHER_SCORE_WEIGHT (0.55) no topo da faixa, de propósito: um
// gargalo real de construção DEVE conseguir puxar gente da colheita, senão a
// vila fica presa no teto pra sempre. Como `nextBuildingType` só aponta um
// prédio quando a carência já passou de BUILD_NEED_THRESHOLD, o score real
// fica entre 0.45 (carência de 75%) e 0.6 (no teto) — vence colher só quando
// o aperto é de verdade.
export const BUILD_SCORE_WEIGHT = 0.6;

// Quão cheio um limite precisa estar pra a vila querer construir. Abaixo
// disso `nextBuildingType` devolve null e construir nem entra na lista de
// candidatas.
//
// PENDÊNCIA CONHECIDA, medida e deliberadamente deixada como está: com 0.75 e
// VILLAGE_POP_CAP não-bindante (30), a lotação real de uma vila (~12-13 de 30,
// ou seja ~0.42) nunca cruza o limiar, e portanto CONSTRUÇÃO QUASE NUNCA
// ACONTECE. Isso é o comportamento de antes desta sessão, e é o único que
// mediu estável em 600s simulados.
//
// As duas formas de destravar foram testadas e AS DUAS levaram as quatro
// vilas à extinção total por volta dos 300-450s:
//   - baixar o teto de população pra 18, pra a lotação subir (ver
//     VILLAGE_POP_CAP);
//   - baixar este limiar pra 0.4, pra casar com a lotação real.
// A causa não é o custo nem o vazamento de recurso (os dois já corrigidos em
// agent/actions/build.js): é a MÃO DE OBRA. Medido em 600s, com construção
// ligada as ações de desenvolvimento consumiam 1780 agente-ticks contra 2406
// de colheita, a comida despencava, a fome bloqueava a reprodução
// (REPRO_FOOD_DEMAND_MAX) e a espiral fechava — 24 mortes de fome contra 8
// nascimentos.
//
// Destravar construção de verdade exige limitar quanta gente da vila pode
// estar em atividade não-alimentar ao mesmo tempo (como village/expedition.js
// já faz com expeditionCapacity), não mexer neste número. Ver STATUS.md.
export const BUILD_NEED_THRESHOLD = 0.75;

// Idades em segundos de tempo simulado (mesmo relógio dos needs), não anos —
// pra dar pra observar uma vida inteira numa sessão de teste.
export const CHILD_ADULT_AGE = 20;
export const ADULT_ELDER_AGE = 120;
// 200 (175s de vida útil desde FOUNDER_AGE) foi testado e confirmado curto
// demais: numa simulação longa, os 20 fundadores morriam de velhice pura
// (idade exata 200, zero fome/combate envolvido) mais rápido do que a
// reprodução conseguia repor, mesmo com o resto da economia saudável —
// população zerava por completo. Subido pra dar mais fôlego real à
// reprodução antes do primeiro founder morrer.
export const MAX_AGE = 300;
export const FOUNDER_AGE = 25; // idade inicial dos agentes fundadores da vila

const STARVE_DEATH_SECONDS = 10; // tempo com fome zerada até morrer
export const STARVE_HEALTH_DRAIN_PER_SEC = 100 / STARVE_DEATH_SECONDS;
const HEALTH_REGEN_SECONDS = 20;
export const HEALTH_REGEN_PER_SEC = 100 / HEALTH_REGEN_SECONDS;

// Reduzido de 20-40 pra ciclar mais rápido — dá mais tentativas de
// reprodução dentro da janela de vida de um fundador (ver MAX_AGE acima).
export const REPRO_COOLDOWN_MIN = 12;
export const REPRO_COOLDOWN_MAX = 25;
export const REPRO_MIN_ADULTS = 2;
export const REPRO_ELIGIBLE_HUNGER = 50; // não reproduz com fome abaixo disso
// Só reproduz se a demanda de comida da vila não estiver alta demais. 0.7
// era severo demais depois da especialização de vila: uma vila madeireira
// nunca produz comida própria, então sua demanda institucional fica perto
// de 100% o tempo todo, MESMO que os moradores comam bem (fome individual
// vem direto do ambiente, agent/actions/eat.js — desacoplada do estoque da
// vila). Bloquear reprodução nesse limiar testava a saúde do estoque
// comunitário, não a fome de verdade dos moradores — testado e confirmado
// como o maior bloqueador de reprodução (quase metade das tentativas),
// contribuindo pra população inteira morrer de velhice sem repor.
export const REPRO_FOOD_DEMAND_MAX = 0.9;
// Teto de população de uma vila SEM nenhuma casa construída. Era 30, contra
// AGENT_COUNT=8 fundadores e uma população observada que estabiliza em 15-19
// — ou seja, o teto nunca era alcançado, a pressão populacional em
// `build.js` ficava em 0.3-0.6, e construir casa nunca vencia colher. Pior,
// era circular: a casa AUMENTA o teto, então cada casa construída derrubaria
// a pressão ainda mais.
//
// Com 18, o teto fica logo acima da população que uma vila alcança sozinha,
// então ela SENTE o aperto e construir vira o que DESIGN.md §8 descreve: o
// que destrava o crescimento, em vez de bônus para um limite inalcançável.
// Crescer passa a depender de construir, que é a progressão pretendida.
//
// 14 foi testado antes e era apertado demais: virava um teto sem escada nas
// vilas que não conseguiam madeira a tempo, e a população média caiu de 57.6
// pra 43. O valor certo é o que a vila encosta, não o que a prende.
// NÃO BAIXAR sem rodar 600s simulados. Este número é um gate rígido de
// reprodução (lifecycle.js:updateVillageReproduction), e a população de
// equilíbrio de uma vila (~12-13, medido) é fixada pelas taxas de nascimento
// e morte, não por ele — sem folga nenhuma. Baixar pra 18 (tentativa desta
// sessão, pra `build.js` enxergar carência de moradia) levou as quatro vilas
// à EXTINÇÃO TOTAL por volta dos 400s; um teto suave em vez do rígido também
// não salvou. Nada disso aparece numa janela de 180s, onde a população ainda
// está subindo pro pico.
//
// O teto fica alto de propósito, ou seja NÃO-BINDANTE: casa continua tendo
// função real (é onde se dorme, e espalha a vila), e a carência de construção
// é medida por BUILD_NEED_THRESHOLD, não por encostar aqui.
export const VILLAGE_POP_CAP = 30;

export const TERRITORY_RADIUS = 10; // tiles

// Fase A (escala): 4 -> 20. Com a população de equilíbrio medida em ~12-13
// por vila, 20 vilas dão ~250 agentes.
//
// 36 (~450 agentes) foi testado e a SIMULAÇÃO aguenta (13.3ms/frame contra um
// orçamento de 16.7ms), mas aí não sobra nada pra renderização — ao vivo a
// aba fica sem resposta. Subir daqui depende do LOD de RENDERIZAÇÃO por zoom,
// que ainda não existe: hoje o jogo desenha todo agente com sprite completo
// em qualquer zoom. Esse é o próximo passo da Fase A, e é o que destrava o
// alvo de 500.
//
// Não dá pra chegar lá engordando a vila em vez de multiplicá-la: o equilíbrio
// por vila é fixado pelas taxas de nascimento/morte e pela economia, não pelo
// teto (ver VILLAGE_POP_CAP). Mais vilas também é o que torna território,
// migração e diplomacia interessantes — com 4 clãs o mapa é um tabuleiro
// pequeno demais pra qualquer geopolítica.
//
// A colocação passou de anel pra grade com jitter (main.js) — o anel só sabia
// posicionar poucas vilas em volta da primeira.
export const VILLAGE_COUNT = 20; // total de vilas/clãs no mundo (1 vila por clã)
// Distância de cada vila (exceto a primeira, que nasce perto do centro do
// mapa) até o centro — espalhadas em ângulos uniformes ao redor da 1ª,
// com jitter. Não existe mais distância especial pra pares destinados à
// guerra: o ataque ofensivo (agent/actions/raid.js) marcha até o alvo via
// pathfinding, então proximidade física não é mais pré-requisito pra
// guerra ficar observável.
export const SECOND_VILLAGE_MIN_DIST = 70; // tiles
export const SECOND_VILLAGE_MAX_DIST = 100;

export const CLAN_COLORS = ['#4a7fd9', '#c9432b', '#3a9d5f', '#c9a227', '#a24fc9', '#3ac9c0'];

// Peso de sorteio da postura inicial entre cada par de clãs fundadores.
// war=0.15 foi calibrado quando só existia 1 par possível (2 clãs) — com
// VILLAGE_COUNT vilas existem N*(N-1)/2 pares, cada um sorteado
// independente, e a chance de existir PELO MENOS uma guerra no mundo
// composta rápido (6 pares com N=4 já dava ~62%, contra ~15% original).
// Testado: isso causava extinção total da população em algumas centenas de
// segundos simulados, cedo demais pra qualquer economia (comércio,
// mineração, construção) se estabelecer. Reduzido pra manter a chance de
// pelo menos uma guerra existir no mundo numa faixa parecida com a intenção
// original, mesmo com mais pares.
export const INITIAL_STANCE_WEIGHTS = { war: 0.06, tense: 0.15, neutral: 0.59, allied: 0.2 };
// Se a postura sorteada for 'neutral', chance de também nascerem com um
// tratado de comércio (vínculo econômico sem ser aliança completa).
export const NEUTRAL_TRADE_TREATY_CHANCE = 0.4;

// Comércio entre vilas: abaixo desse nível de demanda a vila tem sobra pra
// exportar; acima do outro limite, ela tem déficit e precisa importar.
export const TRADE_SURPLUS_DEMAND_MAX = 0.45;
export const TRADE_DEFICIT_DEMAND_MIN = 0.6;
export const TRADE_RATE_PER_SEC = 4; // unidades de recurso por segundo numa rota ativa

// Diplomacia dinâmica (clan/clanDecision.js): cada clã reavalia sua relação
// com os outros num intervalo bem mais longo que o do agente (0.5s) — é uma
// decisão institucional, não individual, e não precisa reagir tick a tick.
export const CLAN_RECONSIDER_INTERVAL_MIN = 20; // segundos simulados
export const CLAN_RECONSIDER_INTERVAL_MAX = 30;
// Segundos consecutivos de demanda alta (>= TRADE_DEFICIT_DEMAND_MIN) por um
// recurso até o clã considerar guerra pra tomá-lo à força de quem tem sobra.
// Alto o bastante pra dar chance real da economia de comércio se estabelecer
// primeiro (produção própria + rota de comércio têm um atraso natural
// somado) — medido em teste: valores baixos aqui travavam reprodução (ver
// DISTRESS_CHAOS_THRESHOLD_SECONDS) cedo demais e a população inteira
// morria de velhice sem repor, mesmo com produção acontecendo.
export const DISTRESS_WAR_THRESHOLD_SECONDS = 60;
// Mais tempo ainda sem alívio (guerra, comércio, nada resolveu) — a vila
// entra em colapso interno (ver village/stock.js:updateChaos). Precisa ser
// bem maior que o limiar de guerra, pra ser um desfecho raro/extremo, não o
// estado padrão de toda vila especializada enquanto o comércio bootstrapa.
export const DISTRESS_CHAOS_THRESHOLD_SECONDS = 240;
export const CHAOS_NEEDS_DECAY_MULTIPLIER = 1.6; // fome/sono decaem mais rápido em colapso

// Aviso visível de fome crítica no feed (lifecycle.js:updateHungerWarning),
// antes de alguém efetivamente morrer — não é o mesmo sinal de `distress`
// (que é sobre estoque/demanda institucional); esse é sobre a fome média dos
// moradores de verdade. Histerese (limiar de disparo mais baixo que o de
// reset) evita reavisar a cada tick enquanto a vila segue em crise.
export const VILLAGE_HUNGER_WARNING_THRESHOLD = 30; // fome média < isso dispara o aviso
export const VILLAGE_HUNGER_RECOVERY_THRESHOLD = 45; // fome média > isso permite avisar de novo
// Só troca de parceiro de comércio por outro cuja demanda pelo recurso seja
// pelo menos isso mais alta que a do parceiro atual — evita ficar trocando
// de parceiro a cada reconsideração por uma diferença mínima.
export const PARTNER_SWITCH_MARGIN = 0.2;

// Papel de guerreiro (agent.role — fecha uma lacuna do modelo de dados
// original do DESIGN.md, que já previa `role: farmer | warrior | builder`
// nunca implementado). Emergente pela demanda de defesa da vila, mesmo
// espírito de especialização de vila: quando o clã entra em guerra
// (clan/clanDecision.js), uma fração dos adultos elegíveis vira guerreiro —
// visualmente permanente (render/agentRenderer.js mostra o sprite parado/
// andando do warriorType sorteado no nascimento, não só durante `fight`) e
// com um pequeno bônus de prioridade pra combate/saque (ver
// WARRIOR_ROLE_SCORE_BONUS). Reverte pra civil quando a paz volta.
export const WARRIOR_ROLE_FRACTION = 0.3;

// Fração de adultos que permanece guerreiro EM TEMPO DE PAZ (com piso de 1
// por vila). Antes era zero implícito: a paz revertia todo mundo pra
// 'civilian', e o mundo passava a maior parte do tempo sem nenhum guerreiro
// — o jogador nunca via um soldado, e, pior, nenhum predador era enfrentado
// por ninguém (fightPredator.js exige role === 'warrior'; civil só foge).
// Ver o comentário longo em clan/clanDecision.js:updateWarriorRoles.
export const WARRIOR_GARRISON_FRACTION = 0.15;

// Patrulha (agent/actions/patrol.js). A primeira versão ficava logo acima de
// wander (0.05), na ideia de que patrulhar substituiria o ÓCIO do guerreiro
// sem custar economia. Medido: nunca rodou uma única vez — os agentes nunca
// ficam ociosos (numa amostragem de 180s, `wander` não aparece nenhuma vez;
// sempre há colher, comer, dormir ou entregar pontuando mais). Pontuar acima
// do ócio, num mundo sem ócio, é pontuar zero.
//
// Com 0.45 fica ABAIXO de gather quando a vila precisa mesmo de comida
// (0.55 x demanda alta) e ACIMA dele quando a demanda está moderada. O
// comportamento que emerge disso é o certo: a guarnição vai pra roça quando
// aperta e volta a rondar o perímetro quando a vila está confortável.
export const PATROL_SCORE = 0.45;
// Quão longe do centro o guerreiro ronda, como fração de TERRITORY_RADIUS.
// Perto do limite do território de propósito: o ponto é cruzar com quem se
// aproxima antes de chegar nas casas.
export const PATROL_RADIUS_FRACTION = 0.8;
// Somado a FIGHT_SCORE/RAID_SCORE só pra quem tem role 'warrior' — pequeno
// de propósito, é prioridade extra pra quem já foi designado, não uma
// reescrita do equilíbrio entre economia e combate (RAID_SCORE já fica
// deliberadamente entre FIGHT_SCORE/FLEE_SCORE e o teto de gather/mine/
// build, ver comentário ali). flee.js não ganha bônus — já é score 0 pra
// qualquer adulto saudável, papel nenhum deveria sobrepor autopreservação.
export const WARRIOR_ROLE_SCORE_BONUS = 0.1;

export const COMBAT_DAMAGE_PER_SEC = 6; // dano mútuo por segundo em combate corpo a corpo
export const MELEE_RANGE = TILE_SIZE * 1.2; // px de mundo pra contar como "adjacente"
export const FIGHT_SCORE = 0.85;
export const FLEE_SCORE = 0.9; // foge tem prioridade um pouco maior que lutar
export const FLEE_HEALTH_THRESHOLD = 35; // abaixo disso (%), foge em vez de lutar

// Ordem institucional de saque (village.raidTargetVillageId, ver
// clan/clanDecision.js e agent/actions/raid.js) — abaixo de FIGHT_SCORE/
// FLEE_SCORE de propósito, pra combate reativo real sempre poder interromper
// a marcha; acima de gather/mine/build (mesmo no pico de demanda), pra
// guerra puxar gente de verdade da economia enquanto durar.
export const RAID_SCORE = 0.65;

// Índice espacial: tamanho de célula igual ao raio de percepção garante que
// uma busca por vizinhos só precise olhar a célula do agente + as 8 ao redor.
export const SPATIAL_CELL_SIZE = PERCEPTION_RADIUS * TILE_SIZE;

// LOD: agentes fora da viewport (simulation/lod.js:classifyAgents, checa
// contra a tela via camera.worldToScreen) rodam em modo agregado (sem
// percepção/decisão/pathfinding — caro e inútil se ninguém tá vendo).
// Fome/sono decaem igual a um agente `active` (simulation/lod.js:
// stepBackgroundAgent); feedBackgroundVillage (mesmo arquivo) cobre o
// "comer" de forma agregada por vila, sem cada um andar até o centro.

// Decoração do mapa: puramente visual, gerada uma vez na criação do mundo
// (determinística pela seed, como o terreno), sem lógica nem colisão.
export const DECORATION_TREE_CHANCE = 0.08; // por tile de floresta
export const DECORATION_PLANT_CHANCE = 0.04; // por tile de grama
// Nenhuma árvore/planta nasce mais perto da vila que isso, pra manter a área
// dela legível (onde as casas ficam); casas nascem dentro desse raio.
export const DECORATION_VILLAGE_CLEARING_RADIUS = TERRITORY_RADIUS;

// Baú: raro, tesouro escondido sem mecânica de loot associada.
export const DECORATION_CHEST_CHANCE = 0.0006;
// Fogueira: 1 por vila.
export const DECORATION_CAMPFIRES_PER_VILLAGE = 1;

// Fauna predadora (predator/): entidade separada de Agent, bem mais simples
// (sem needs/perception/memory/utility completo) — FSM reconsiderada
// periodicamente (predator/predatorAI.js). Raro de propósito: ~24 no mapa
// inteiro (220x220), ~12 por espécie — pra ser um encontro perigoso pontual,
// não uma ameaça constante. Eram 6 por espécie quando existiam 4 espécies;
// ao cair pra 2 (ver PREDATOR_SPECIES_STATS), o número por espécie dobrou pra
// manter a mesma densidade de ~24 predadores no mapa, que é o que foi
// calibrado jogando — a decisão foi reduzir a variedade, não a ameaça.
// LOD: fome abaixo da qual um agente `background` come do estoque agregado
// (simulation/lod.js:feedBackgroundVillage). Aproxima o ponto em que `eat`
// passa a vencer o utility score de um agente `active` (~55, ver DESIGN.md
// §6) — o agregado precisa imitar "come em rajadas quando fica com fome", e
// não "todo mundo bebericando o tempo todo", senão a vila fora de tela gasta
// muito mais comida do que a mesma vila em tela.
export const BACKGROUND_EAT_HUNGER_THRESHOLD = 55;

// Ciclo útil de trabalho de um morador `background`, como fração de
// GATHER_RATE (simulation/lod.js:produceBackgroundVillage). Um agente
// `active` não colhe 100% do tempo — caminha até o recurso, volta pra
// entregar, come, dorme. Esse fator é o que impede o LOD de tornar estar
// fora de tela MAIS produtivo que estar em tela, o que faria a otimização
// mudar o resultado do jogo em vez de só baratear a simulação.
// Referência pra calibrar: cada morador consome 0.25 de comida por segundo
// pra empatar com o decaimento da fome, e GATHER_RATE é 1.25/s.
export const BACKGROUND_WORK_EFFICIENCY = 0.3;

// Penalidade da produção de comida numa vila que NÃO é agrícola — o
// equivalente agregado de agent/actions/fish.js, que é universal mas pontua
// abaixo de gather.js de propósito. Mantém a madeireira fora de tela pouco
// acima do ponto de empate (0.2625 contra 0.25 de consumo por pessoa):
// sobrevive sozinha, mas só prospera com comércio — que é o pilar 4 do
// design, e ele não pode virar isenção só porque a vila saiu da tela.
export const BACKGROUND_FISHING_PENALTY = 0.7;

export const PREDATOR_COUNT_PER_SPECIES = 12;
// Não nasce mais perto de nenhuma vila que isso — fora do alcance
// imediato, ainda dentro do raio que um agente explorando pode topar.
export const PREDATOR_MIN_DISTANCE_FROM_VILLAGE_TILES = 15;
// Raio de patrulha ao redor do ponto de nascimento (spawnAnchor) enquanto
// não há alvo — mesmo espírito de wander.js, só que sem perception real.
export const PREDATOR_PATROL_RADIUS_TILES = 3;
// Leash: se o alvo perseguido se afasta mais que isso do spawnAnchor do
// predador, ele desiste e volta a patrulhar — evita um urso virar
// perseguidor permanente até dentro da vila.
export const PREDATOR_LEASH_RADIUS_TILES = 10;
// Velocidade agora é por espécie (PREDATOR_SPECIES_STATS.speed), não mais um
// valor único — é o que dá corpo ao contraste "tanque lento" vs. "rápido e
// frágil" das duas espécies. Este continua sendo a referência/média: quem não
// declarar `speed` cai aqui.
export const PREDATOR_SPEED = 50; // px/mundo por segundo
export const PREDATOR_RECONSIDER_INTERVAL = 0.4; // segundos, com jitter por predador (mesmo padrão do agente)
// Abaixo dessa fração da vida máxima, foge em vez de atacar/perseguir;
// só volta a patrulhar depois de recuperar até essa outra fração (evita
// flip-flop fugindo/atacando bem na borda do limiar).
export const PREDATOR_FLEE_HEALTH_FRACTION = 0.25;
export const PREDATOR_FLEE_RECOVER_FRACTION = 0.6;
export const PREDATOR_HEALTH_REGEN_PER_SEC = 100 / 30; // só enquanto foge, sem ameaça por perto

// Stats por espécie — valores iniciais, calibrar depois de observar
// jogando (mesmo espírito dos outros pesos deste arquivo).
//
// Eram 4 espécies (urso/lobo/cobra/besouro, pack "Retro RPG Series - Animal
// Wildlife"); caiu pra 2 por decisão do usuário — a arte daquele pack estava
// abaixo da régua de qualidade do resto do jogo. Os dois perfis que sobraram
// herdam os stats que já existiam, não são números novos:
//   demon  = o antigo perfil do urso  (tanque, lento, dano alto)
//   blood  = o antigo perfil do lobo  (frágil, rápido, faro melhor)
// Cobra e besouro saíram inteiros. Com o besouro foi embora o único ataque à
// distância do jogo (attackRange 150, o cuspe do pack de origem) — perda
// aceita explicitamente, sem substituto de qualidade disponível; hoje as duas
// espécies são corpo a corpo.
//
// Houve aqui um `renderScale` por espécie, removido quando a animação chegou:
// ele corrigia à mão o fato de o recorte por alfa de um quadro estático
// normalizar as duas espécies pra mesma altura na tela. Com
// render/predatorRenderer.js desenhando numa escala única de arte
// (`ART_SCALE`), a diferença de tamanho entre o demônio em pé e o monstro
// rasteiro sai sozinha da própria arte, que foi desenhada na mesma escala.
export const PREDATOR_SPECIES_STATS = {
  demon: { health: 60, attackDamage: 15, detectionRadiusTiles: 6, attackRange: 40, speed: 40 },
  blood: { health: 35, attackDamage: 10, detectionRadiusTiles: 7, attackRange: 40, speed: 62 },
};

// agent/actions/fleePredator.js e fightPredator.js: mesma faixa de score
// de flee.js/fight.js (FLEE_SCORE=0.9/FIGHT_SCORE=0.85), mas a decisão de
// qual delas um agente sequer considera depende do papel — civil só tem
// fleePredator viável, guerreiro designado só tem fightPredator viável
// (a menos que a própria vida já esteja crítica, FLEE_HEALTH_THRESHOLD).
export const FLEE_PREDATOR_SCORE = 0.9;
export const FIGHT_PREDATOR_SCORE = 0.85;
