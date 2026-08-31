// Fatia 2: sem sistema de recursos ainda (isso é fatia 4+/economia), então
// "comer" busca o tile de grama andável mais próximo e recupera fome nele.

import { getTileAt } from '../../world/world.js';
import { TILE_TYPES } from '../../world/tile.js';
import { distance, lerp } from '../../utils/mathUtils.js';
import { TILE_SIZE, AGENT_SPEED } from '../../utils/constants.js';
import { urgency, applyEffect } from '../needs.js';

const ARRIVE_THRESHOLD = 4;
const SEARCH_RADIUS = 12;
const RESTORE_PER_SEC = 100 / 15;

export function score(agent) {
  return urgency(agent.needs.hunger);
}

function findFoodTile(agent, world) {
  const curTx = Math.floor(agent.position.x / TILE_SIZE);
  const curTy = Math.floor(agent.position.y / TILE_SIZE);

  for (let r = 0; r <= SEARCH_RADIUS; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tile = getTileAt(world, curTx + dx, curTy + dy);
        if (tile && tile.type === TILE_TYPES.GRASS) {
          return { x: (curTx + dx + 0.5) * TILE_SIZE, y: (curTy + dy + 0.5) * TILE_SIZE };
        }
      }
    }
  }
  return null;
}

export function step(agent, world, dt) {
  if (!agent.target) {
    agent.target = findFoodTile(agent, world);
    if (!agent.target) return; // nada de grama nas redondezas; espera a próxima reconsideração
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

  applyEffect(agent.needs, 'hunger', RESTORE_PER_SEC * dt);
}
