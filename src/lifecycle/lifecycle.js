import { clamp } from '../utils/mathUtils.js';
import { createAgent } from '../agent/agent.js';
import { addResident, getPopulationCap } from '../village/village.js';
import { findNearestEnemy } from '../combat/combat.js';
import { findNearestPredator } from '../combat/predatorCombat.js';
import { SPECIES_LABEL } from '../predator/predator.js';
import { pushEvent } from '../world/eventLog.js';
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
  VILLAGE_HUNGER_WARNING_THRESHOLD,
  VILLAGE_HUNGER_RECOVERY_THRESHOLD,
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
  } else if (!findNearestEnemy(agent, world) && !findNearestPredator(agent, world)) {
    // sem isso, a regeneração desfaria o dano de combate (ou de predador)
    // no próximo tick (checkDeath roda antes de fight.js/predatorAI.js
    // aplicarem dano de novo)
    agent.health = clamp(agent.health + HEALTH_REGEN_PER_SEC * dt, 0, 100);
  }

  if (agent.health <= 0 || agent.age >= MAX_AGE) {
    agent.alive = false;

    // village.population só é filtrado em pruneDead (bem depois, dado o
    // "linger" da animação de morte) — nesse instante ainda inclui quem tá
    // morrendo agora, então length === 1 significa "esse era o último".
    const village = world.villages.find((v) => v.id === agent.villageId);
    if (village) {
      const cause = agent.age >= MAX_AGE ? 'velhice' : agent.needs.hunger <= 0 ? 'fome' : 'combate';
      const byPredator = cause === 'combate' && agent.lastDamageSource === 'predator';
      if (byPredator) {
        // Agentes não têm nome individual no jogo (só id interno) — segue o
        // mesmo padrão dos outros eventos de morte, que também só citam a
        // vila, não a pessoa.
        const species = SPECIES_LABEL[agent.lastDamagePredatorSpecies] ?? 'um predador';
        pushEvent(world, `${village.name} perdeu um morador, morto por ${species}`);
      } else {
        pushEvent(world, `${village.name} perdeu um morador de ${cause}`);
      }
      if (village.population.length === 1) pushEvent(world, `${village.name} foi extinta`);

      // Tremor de câmera num golpe forte (render/camera.js:triggerShake,
      // consumido em main.js) — só na morte por combate, não em toda troca
      // de dano, e não em morte por fome/velhice (não é um "golpe").
      if (cause === 'combate') world.pendingShake = { intensity: 8, duration: 0.3 };
    }
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
  pushEvent(world, `${village.name} teve um nascimento`);
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

// Chamado uma vez por vila por tick: avisa no feed quando a fome média dos
// moradores vivos cruza um limiar crítico, antes de alguém efetivamente
// morrer (village.distress é sobre estoque/demanda institucional, não sobre
// a fome individual de verdade — os dois podem discordar, ex.: estoque preso
// em trânsito de comércio enquanto quem já está na vila passa fome). Usa
// histerese (village.hungerWarningActive) pra disparar só na transição, não
// a cada tick enquanto a vila segue abaixo do limiar.
export function updateHungerWarning(village, world) {
  const residents = village.population.map((id) => world.agents.find((a) => a.id === id)).filter((a) => a?.alive);
  if (residents.length === 0) return;

  const avgHunger = residents.reduce((sum, a) => sum + a.needs.hunger, 0) / residents.length;

  if (!village.hungerWarningActive && avgHunger < VILLAGE_HUNGER_WARNING_THRESHOLD) {
    village.hungerWarningActive = true;
    pushEvent(world, `${village.name} está com fome crítica`);
  } else if (village.hungerWarningActive && avgHunger > VILLAGE_HUNGER_RECOVERY_THRESHOLD) {
    village.hungerWarningActive = false;
  }
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
