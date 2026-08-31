export const TILE_SIZE = 32;

export const WORLD_WIDTH = 220;
export const WORLD_HEIGHT = 220;

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 4;

export const TIME_SPEEDS = [1, 2, 4];

export const AGENT_SPEED = 60; // px de mundo por segundo

export const PERCEPTION_RADIUS = 8; // tiles

export const AGENT_COUNT = 5;

export const CARRY_CAPACITY = 10; // unidades de recurso por viagem
const GATHER_SECONDS = 8; // tempo pra encher a carga colhendo
export const GATHER_RATE = CARRY_CAPACITY / GATHER_SECONDS;

export const VILLAGE_FOOD_CAPACITY = 100;

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

export const SECOND_VILLAGE_MIN_DIST = 70; // tiles, distância da primeira vila
export const SECOND_VILLAGE_MAX_DIST = 100;
// Vilas destinadas à guerra nascem mais perto — territórios/rondas têm
// chance real de se cruzar na fronteira; sem isso, o combate nunca
// aconteceria organicamente (as vilas nunca se encontrariam).
export const WAR_VILLAGE_MIN_DIST = 25;
export const WAR_VILLAGE_MAX_DIST = 45;

// Peso de sorteio da postura inicial entre os dois clãs fundadores.
export const INITIAL_STANCE_WEIGHTS = { war: 0.15, tense: 0.15, neutral: 0.5, allied: 0.2 };
// Se a postura sorteada for 'neutral', chance de também nascerem com um
// tratado de comércio (vínculo econômico sem ser aliança completa).
export const NEUTRAL_TRADE_TREATY_CHANCE = 0.4;

// Comércio entre vilas: abaixo desse nível de demanda a vila tem sobra pra
// exportar; acima do outro limite, ela tem déficit e precisa importar.
export const TRADE_SURPLUS_DEMAND_MAX = 0.3;
export const TRADE_DEFICIT_DEMAND_MIN = 0.6;
export const TRADE_RATE_PER_SEC = 2; // unidades de recurso por segundo numa rota ativa

export const COMBAT_DAMAGE_PER_SEC = 6; // dano mútuo por segundo em combate corpo a corpo
export const MELEE_RANGE = TILE_SIZE * 1.2; // px de mundo pra contar como "adjacente"
export const FIGHT_SCORE = 0.85;
export const FLEE_SCORE = 0.9; // foge tem prioridade um pouco maior que lutar
export const FLEE_HEALTH_THRESHOLD = 35; // abaixo disso (%), foge em vez de lutar

// Índice espacial: tamanho de célula igual ao raio de percepção garante que
// uma busca por vizinhos só precise olhar a célula do agente + as 8 ao redor.
export const SPATIAL_CELL_SIZE = PERCEPTION_RADIUS * TILE_SIZE;

// LOD: agentes fora desse raio da câmera rodam em modo agregado (sem
// percepção/decisão/pathfinding — caro e inútil se ninguém tá vendo).
export const LOD_ACTIVE_RADIUS = 40 * TILE_SIZE;
// Fora de foco, as necessidades não decaem normalmente — são empurradas de
// volta pra perto do topo (a vila "se vira sozinha" fora da tela), pra não
// morrer tudo de fome só por estar fora do foco.
export const BACKGROUND_NEEDS_RESTORE_PER_SEC = 100 / 15;
