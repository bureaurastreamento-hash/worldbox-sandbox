export const TILE_SIZE = 32;

export const WORLD_WIDTH = 120;
export const WORLD_HEIGHT = 120;

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
export const VILLAGE_POP_CAP = 12;

export const TERRITORY_RADIUS = 10; // tiles

export const SECOND_VILLAGE_MIN_DIST = 40; // tiles, distância da primeira vila
export const SECOND_VILLAGE_MAX_DIST = 55;

// Peso de sorteio da postura inicial entre os dois clãs fundadores.
export const INITIAL_STANCE_WEIGHTS = { war: 0.15, tense: 0.15, neutral: 0.5, allied: 0.2 };
