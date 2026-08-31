// Colher comida pra vila — distinto de eat.js (que satisfaz a fome do
// próprio agente). O score não depende da necessidade do agente, e sim da
// demanda da vila: estoque baixo puxa todo mundo pra colher, sem ninguém
// decidir isso de cima.

import { TILE_TYPES } from '../../world/tile.js';
import { distance, lerp } from '../../utils/mathUtils.js';
import { TILE_SIZE, AGENT_SPEED, CARRY_CAPACITY, GATHER_RATE } from '../../utils/constants.js';
import { recallNearest } from '../memory.js';
import { getVillage } from '../../world/world.js';

const ARRIVE_THRESHOLD = 4;

export function score(agent, world) {
  if (agent.carrying > 0) return 0; // já tem carga; ver deliver.js
  const village = getVillage(world, agent.villageId);
  if (!village) return 0;
  const known = recallNearest(agent.memory, agent.position, (e) => e.type === TILE_TYPES.GRASS);
  if (!known) return 0;
  return village.demand.food ?? 0;
}

function findGatherTile(agent) {
  const entry = recallNearest(agent.memory, agent.position, (e) => e.type === TILE_TYPES.GRASS);
  if (!entry) return null;
  return { x: (entry.tx + 0.5) * TILE_SIZE, y: (entry.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  if (!agent.target) {
    agent.target = findGatherTile(agent);
    if (!agent.target) return; // nada de grama conhecida; espera a próxima reconsideração
  }

  const d = distance(agent.position, agent.target);
  if (d > ARRIVE_THRESHOLD) {
    const move = AGENT_SPEED * dt;
    if (move >= d) {
      agent.position.x = agent.target.x;
      agent.position.y = agent.target.y;
    } else {
      const t = move / d;
      agent.position.x = lerp(agent.position.x, agent.target.x, t);
      agent.position.y = lerp(agent.position.y, agent.target.y, t);
    }
    return;
  }

  agent.carrying = Math.min(CARRY_CAPACITY, agent.carrying + GATHER_RATE * dt);
  if (agent.carrying >= CARRY_CAPACITY) {
    agent.target = null; // carga cheia; decision.js troca pra "deliver" na próxima reconsideração
  }
}
