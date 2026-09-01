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

export const PERCEPTION_RADIUS = 8; // tiles

export const AGENT_COUNT = 5;

export const CARRY_CAPACITY = 10; // unidades de recurso por viagem
const GATHER_SECONDS = 8; // tempo pra encher a carga colhendo
export const GATHER_RATE = CARRY_CAPACITY / GATHER_SECONDS;

export const VILLAGE_FOOD_CAPACITY = 100;
export const VILLAGE_WOOD_CAPACITY = 100;

// Abaixo de 1: sobrevivência pessoal deve normalmente vencer trabalho
// comunitário antes de virar crítica (ver agent/actions/gather.js).
export const GATHER_SCORE_WEIGHT = 0.55;

// Idades em segundos de tempo simulado (mesmo relógio dos needs), não anos —
// pra dar pra observar uma vida inteira numa sessão de teste.
export const CHILD_ADULT_AGE = 20;
export const ADULT_ELDER_AGE = 120;
export const MAX_AGE = 200;
export const FOUNDER_AGE = 25; // idade inicial dos agentes fundadores da vila

const STARVE_DEATH_SECONDS = 10; // tempo com fome zerada até morrer
export const STARVE_HEALTH_DRAIN_PER_SEC = 100 / STARVE_DEATH_SECONDS;
const HEALTH_REGEN_SECONDS = 20;
export const HEALTH_REGEN_PER_SEC = 100 / HEALTH_REGEN_SECONDS;

export const REPRO_COOLDOWN_MIN = 20;
export const REPRO_COOLDOWN_MAX = 40;
export const REPRO_MIN_ADULTS = 2;
export const REPRO_ELIGIBLE_HUNGER = 50; // não reproduz com fome abaixo disso
export const REPRO_FOOD_DEMAND_MAX = 0.7; // só reproduz se a vila não estiver faminta
export const VILLAGE_POP_CAP = 30;

export const TERRITORY_RADIUS = 10; // tiles

export const VILLAGE_COUNT = 4; // total de vilas/clãs no mundo (1 vila por clã)
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
export const INITIAL_STANCE_WEIGHTS = { war: 0.15, tense: 0.15, neutral: 0.5, allied: 0.2 };
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
// Só troca de parceiro de comércio por outro cuja demanda pelo recurso seja
// pelo menos isso mais alta que a do parceiro atual — evita ficar trocando
// de parceiro a cada reconsideração por uma diferença mínima.
export const PARTNER_SWITCH_MARGIN = 0.2;

export const COMBAT_DAMAGE_PER_SEC = 6; // dano mútuo por segundo em combate corpo a corpo
export const MELEE_RANGE = TILE_SIZE * 1.2; // px de mundo pra contar como "adjacente"
export const FIGHT_SCORE = 0.85;
export const FLEE_SCORE = 0.9; // foge tem prioridade um pouco maior que lutar
export const FLEE_HEALTH_THRESHOLD = 35; // abaixo disso (%), foge em vez de lutar

// Índice espacial: tamanho de célula igual ao raio de percepção garante que
// uma busca por vizinhos só precise olhar a célula do agente + as 8 ao redor.
export const SPATIAL_CELL_SIZE = PERCEPTION_RADIUS * TILE_SIZE;

// LOD: agentes fora da viewport (simulation/lod.js:classifyAgents, checa
// contra a tela via camera.worldToScreen) rodam em modo agregado (sem
// percepção/decisão/pathfinding — caro e inútil se ninguém tá vendo).
// Fora de foco, as necessidades não decaem normalmente — são empurradas de
// volta pra perto do topo (a vila "se vira sozinha" fora da tela), pra não
// morrer tudo de fome só por estar fora do foco.
export const BACKGROUND_NEEDS_RESTORE_PER_SEC = 100 / 15;

// Decoração do mapa: puramente visual, gerada uma vez na criação do mundo
// (determinística pela seed, como o terreno), sem lógica nem colisão.
export const DECORATION_TREE_CHANCE = 0.08; // por tile de floresta
export const DECORATION_PLANT_CHANCE = 0.04; // por tile de grama
export const DECORATION_HOUSES_PER_VILLAGE = 6;
// Nenhuma árvore/planta nasce mais perto da vila que isso, pra manter a área
// dela legível (onde as casas ficam); casas nascem dentro desse raio.
export const DECORATION_VILLAGE_CLEARING_RADIUS = TERRITORY_RADIUS;
