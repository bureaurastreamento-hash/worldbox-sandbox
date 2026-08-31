// Fronteira mais importante da arquitetura: isto é o único lugar que pode
// consultar o mundo "de verdade" para descobrir o que existe. decision.js e
// as ações nunca chamam getTileAt/world.agents diretamente — só leem
// agent.perception (o que está visível agora) ou agent.memory (o que já foi
// visto antes).

import { getTileAt } from '../world/world.js';
import { queryNearby } from '../world/spatialIndex.js';
import { distance } from '../utils/mathUtils.js';
import { TILE_SIZE, PERCEPTION_RADIUS } from '../utils/constants.js';

export function scanPerception(agent, world) {
  const curTx = Math.floor(agent.position.x / TILE_SIZE);
  const curTy = Math.floor(agent.position.y / TILE_SIZE);
  const radiusSq = PERCEPTION_RADIUS * PERCEPTION_RADIUS;

  const tiles = [];
  for (let dy = -PERCEPTION_RADIUS; dy <= PERCEPTION_RADIUS; dy++) {
    for (let dx = -PERCEPTION_RADIUS; dx <= PERCEPTION_RADIUS; dx++) {
      if (dx * dx + dy * dy > radiusSq) continue; // raio circular, não quadrado
      const tx = curTx + dx;
      const ty = curTy + dy;
      const tile = getTileAt(world, tx, ty);
      if (tile) tiles.push({ tx, ty, type: tile.type });
    }
  }

  const perceptionRadiusPx = PERCEPTION_RADIUS * TILE_SIZE;
  const nearby = world.spatialIndex ? queryNearby(world.spatialIndex, agent.position, perceptionRadiusPx) : world.agents;
  const agents = [];
  for (const other of nearby) {
    if (other.id === agent.id || !other.alive) continue;
    if (distance(agent.position, other.position) <= perceptionRadiusPx) agents.push(other);
  }

  agent.perception = { tiles, agents };
  return agent.perception;
}
