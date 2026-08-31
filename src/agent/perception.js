// Fronteira mais importante da arquitetura: isto é o único lugar que pode
// consultar o mundo "de verdade" para descobrir o que existe. decision.js e
// as ações nunca chamam getTileAt diretamente — só leem agent.perception
// (o que está visível agora) ou agent.memory (o que já foi visto antes).

import { getTileAt } from '../world/world.js';
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

  agent.perception = { tiles };
  return agent.perception;
}
