// Colher comida pra vila — distinto de eat.js (que satisfaz a fome do
// próprio agente). O score não depende da necessidade do agente, e sim da
// demanda da vila: estoque baixo puxa todo mundo pra colher, sem ninguém
// decidir isso de cima.

import { TILE_TYPES } from '../../world/tile.js';
import { TILE_SIZE, CARRY_CAPACITY, GATHER_RATE, GATHER_SCORE_WEIGHT } from '../../utils/constants.js';
import { recallNearest } from '../memory.js';
import { getVillage } from '../../world/world.js';
import { isHostileTerritory } from '../../clan/diplomacy.js';
import { moveToward, clearMovement } from '../movement.js';

function isSafeGrass(world, agent) {
  return (e) => e.type === TILE_TYPES.GRASS && !isHostileTerritory(world, agent, e.tx, e.ty);
}

export function score(agent, world) {
  if (agent.carrying > 0) return 0; // já tem carga; ver deliver.js
  const village = getVillage(world, agent.villageId);
  if (!village) return 0;
  const known = recallNearest(agent.memory, agent.position, isSafeGrass(world, agent));
  if (!known) return 0;
  return (village.demand.food ?? 0) * GATHER_SCORE_WEIGHT;
}

function findGatherTile(agent, world) {
  const entry = recallNearest(agent.memory, agent.position, isSafeGrass(world, agent));
  if (!entry) return null;
  return { x: (entry.tx + 0.5) * TILE_SIZE, y: (entry.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  if (!agent.target) {
    agent.target = findGatherTile(agent, world);
    if (!agent.target) return; // nada de grama conhecida; espera a próxima reconsideração
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent);
    return;
  }
  if (status !== 'arrived') return;

  agent.carrying = Math.min(CARRY_CAPACITY, agent.carrying + GATHER_RATE * dt);
  if (agent.carrying >= CARRY_CAPACITY) {
    clearMovement(agent); // carga cheia; decision.js troca pra "deliver" na próxima reconsideração
  }
}
