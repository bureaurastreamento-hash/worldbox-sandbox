import { clamp } from '../utils/mathUtils.js';
import { createAgent } from '../agent/agent.js';
import { addResident, getPopulationCap } from '../village/village.js';
import { findNearestEnemy } from '../combat/combat.js';
import {
  CHILD_ADULT_AGE,
  ADULT_ELDER_AGE,
  MAX_AGE,
  STARVE_HEALTH_DRAIN_PER_SEC,
  HEALTH_REGEN_PER_SEC,
  REPRO_COOLDOWN_MIN,
  REPRO_COOLDOWN_MAX,
  REPRO_MIN_ADULTS,
  REPRO_ELIGIBLE_HUNGER,
  REPRO_FOOD_DEMAND_MAX,
  DEATH_LINGER_SECONDS,
} from '../utils/constants.js';

export function ageAgent(agent, dt) {
  agent.age += dt;
  if (agent.age < CHILD_ADULT_AGE) agent.lifeStage = 'child';
  else if (agent.age < ADULT_ELDER_AGE) agent.lifeStage = 'adult';
  else agent.lifeStage = 'elder';
}

export function checkDeath(agent, world, dt) {
  if (!agent.alive) return;

  if (agent.needs.hunger <= 0) {
    agent.health = clamp(agent.health - STARVE_HEALTH_DRAIN_PER_SEC * dt, 0, 100);
  } else if (!findNearestEnemy(agent, world)) {
    // sem isso, a regeneração desfaria o dano de combate no próximo tick
    // (checkDeath roda antes de fight.js aplicar dano de novo)
    agent.health = clamp(agent.health + HEALTH_REGEN_PER_SEC * dt, 0, 100);
  }

  if (agent.health <= 0 || agent.age >= MAX_AGE) {
    agent.alive = false;
  }
}

export function canReproduce(agent) {
  return agent.alive && agent.lifeStage === 'adult' && agent.needs.hunger > REPRO_ELIGIBLE_HUNGER;
}

export function tryReproduce(agentA, agentB, world, village) {
  if (agentA === agentB || !canReproduce(agentA) || !canReproduce(agentB)) return null;

  const child = createAgent({
    id: `agent-${world.rng.int(100000, 999999)}`,
    position: { x: village.center.x, y: village.center.y },
    villageId: village.id,
    decisionTimer: world.rng.range(0, 0.5),
    age: 0,
    rng: world.rng,
  });

  world.agents.push(child);
  addResident(village, child.id);
  return child;
}

// Chamado uma vez por vila por tick: decide se é hora de tentar reproduzir,
// dado o cooldown, o tamanho da população e a saúde econômica da vila.
export function updateVillageReproduction(village, world, dt) {
  village.reproCooldown -= dt;
  if (village.reproCooldown > 0) return;
  village.reproCooldown = world.rng.range(REPRO_COOLDOWN_MIN, REPRO_COOLDOWN_MAX);

  if (village.population.length >= getPopulationCap(village)) return;
  if (village.inChaos) return; // colapso interno (village/stock.js:updateChaos) trava reprodução
  if ((village.demand.food ?? 0) > REPRO_FOOD_DEMAND_MAX) return;

  const eligible = village.population
    .map((id) => world.agents.find((a) => a.id === id))
    .filter((a) => a && canReproduce(a));

  if (eligible.length < REPRO_MIN_ADULTS) return;

  const a = eligible[world.rng.int(0, eligible.length - 1)];
  let b = a;
  for (let attempt = 0; attempt < 5 && b === a; attempt++) {
    b = eligible[world.rng.int(0, eligible.length - 1)];
  }
  if (b === a) return;

  tryReproduce(a, b, world, village);
}

// Remove agentes mortos de world.agents e da população de sua vila — não no
// mesmo tick da morte, só depois de DEATH_LINGER_SECONDS (tempo simulado)
// pra dar chance de render/agentRenderer.js mostrar o sprite de morto antes
// do corpo sumir. Nesse meio-tempo o agente continua em `world.agents`, mas
// fora da simulação de verdade — checkDeath já não faz nada com
// `alive: false`, e simulation/lod.js:classifyAgents pula agentes mortos.
export function pruneDead(world, dt) {
  const toRemove = [];
  for (const agent of world.agents) {
    if (agent.alive) continue;
    agent.deathLinger += dt;
    if (agent.deathLinger >= DEATH_LINGER_SECONDS) toRemove.push(agent);
  }
  if (toRemove.length === 0) return;

  const removeIds = new Set(toRemove.map((a) => a.id));
  world.agents = world.agents.filter((a) => !removeIds.has(a.id));
  for (const agent of toRemove) {
    const village = world.villages.find((v) => v.id === agent.villageId);
    if (village) village.population = village.population.filter((id) => id !== agent.id);
  }
}
