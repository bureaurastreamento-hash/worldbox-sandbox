// Minerar pra vila — mesma estrutura de gather.js/gatherWood.js, mas
// universal: qualquer vila minera qualquer um dos MINING_RESOURCES, sem gate
// de especialização (stone/coal/iron/gold são material de construção, não
// parte do pilar de interdependência food/wood). Um módulo só em vez de 4
// quase-duplicados, já que a única diferença entre eles é qual recurso/tile
// de montanha, não a lógica.

import { TILE_TYPES } from '../../world/tile.js';
import { TILE_SIZE, CARRY_CAPACITY, GATHER_RATE, GATHER_SCORE_WEIGHT, MINING_RESOURCES } from '../../utils/constants.js';
import { recallNearest } from '../memory.js';
import { getVillage, findWalkableNear } from '../../world/world.js';
import { isHostileTerritory } from '../../clan/diplomacy.js';
import { moveToward, clearMovement } from '../movement.js';

function isSafeDeposit(world, agent, resource) {
  return (e) => e.type === TILE_TYPES.MOUNTAIN && e.resource === resource && !isHostileTerritory(world, agent, e.tx, e.ty);
}

// Melhor minério pra essa vila agora: o de maior demanda entre os que o
// agente já viu um depósito conhecido — não é sobre desespero (distress),
// minério nunca alimenta isso, só a demanda comum (village/stock.js).
function bestChoice(agent, world, village) {
  let best = null;
  let bestScore = 0;
  for (const resource of MINING_RESOURCES) {
    if (!recallNearest(agent.memory, agent.position, isSafeDeposit(world, agent, resource))) continue;
    const score = (village.demand[resource] ?? 0) * GATHER_SCORE_WEIGHT;
    if (score > bestScore) {
      bestScore = score;
      best = resource;
    }
  }
  return best ? { resource: best, score: bestScore } : null;
}

export function score(agent, world) {
  if (agent.carrying > 0) return 0; // já tem carga; ver deliver.js
  const village = getVillage(world, agent.villageId);
  if (!village) return 0;
  return bestChoice(agent, world, village)?.score ?? 0;
}

// Montanha não é andável (isWalkable exclui — é barreira, não colhível em
// cima), então o pathfinding nunca alcançaria o próprio tile de depósito
// como destino. Mira o tile andável mais próximo adjacente a ele — minerar
// "da beirada", sem precisar pisar na montanha.
function findDepositTile(agent, world, resource) {
  const entry = recallNearest(agent.memory, agent.position, isSafeDeposit(world, agent, resource));
  if (!entry) return null;
  const spot = findWalkableNear(world, entry.tx, entry.ty, 5);
  return { x: (spot.tx + 0.5) * TILE_SIZE, y: (spot.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  if (!agent.target) {
    const choice = bestChoice(agent, world, village);
    if (!choice) return; // nenhum depósito conhecido; espera a próxima reconsideração
    agent.miningResource = choice.resource;
    agent.target = findDepositTile(agent, world, choice.resource);
    if (!agent.target) return;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent);
    return;
  }
  if (status !== 'arrived') return;

  agent.carryingType = agent.miningResource;
  agent.carrying = Math.min(CARRY_CAPACITY, agent.carrying + GATHER_RATE * dt);
  if (agent.carrying >= CARRY_CAPACITY) {
    clearMovement(agent); // carga cheia; decision.js troca pra "deliver" na próxima reconsideração
  }
}
