import { getVillage, getClan } from '../world/world.js';
import { getStance } from '../clan/clan.js';
import { distance, clamp } from '../utils/mathUtils.js';
import { COMBAT_DAMAGE_PER_SEC } from '../utils/constants.js';

export function isEnemy(world, agentA, agentB) {
  const villageA = getVillage(world, agentA.villageId);
  const villageB = getVillage(world, agentB.villageId);
  if (!villageA || !villageB) return false;

  const clanA = getClan(world, villageA.clanId);
  const clanB = getClan(world, villageB.clanId);
  if (!clanA || !clanB) return false;

  return getStance(clanA, clanB) === 'war';
}

// Mais próximo entre os agentes já percebidos (agent.perception.agents) que
// pertence a um clã em guerra com o do agente. null se nenhum.
export function findNearestEnemy(agent, world) {
  let nearest = null;
  let nearestDist = Infinity;

  for (const other of agent.perception.agents) {
    if (!other.alive || !isEnemy(world, agent, other)) continue;
    const d = distance(agent.position, other.position);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = other;
    }
  }

  return nearest;
}

// Dano mútuo de um tick de combate corpo a corpo.
export function resolveEngagement(agent, enemy, dt) {
  const damage = COMBAT_DAMAGE_PER_SEC * dt;
  agent.health = clamp(agent.health - damage, 0, 100);
  enemy.health = clamp(enemy.health - damage, 0, 100);
}
