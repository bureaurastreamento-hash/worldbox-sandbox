// Ação de menor prioridade: o que o agente faz quando nenhuma necessidade
// está urgente o bastante para valer a pena (ver decision.js).

import { getTileAt } from '../../world/world.js';
import { isWalkable } from '../../world/tile.js';
import { distance, lerp } from '../../utils/mathUtils.js';
import { TILE_SIZE, AGENT_SPEED } from '../../utils/constants.js';

const ARRIVE_THRESHOLD = 2;
const MIN_RADIUS = 2;
const MAX_RADIUS = 6;
const MAX_ATTEMPTS = 20;

export const BASE_SCORE = 0.05;

export function score() {
  return BASE_SCORE;
}

function pickTarget(agent, world) {
  const curTx = Math.floor(agent.position.x / TILE_SIZE);
  const curTy = Math.floor(agent.position.y / TILE_SIZE);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const dx = world.rng.int(-MAX_RADIUS, MAX_RADIUS);
    const dy = world.rng.int(-MAX_RADIUS, MAX_RADIUS);
    if (Math.abs(dx) < MIN_RADIUS && Math.abs(dy) < MIN_RADIUS) continue;

    const tx = curTx + dx;
    const ty = curTy + dy;
    const tile = getTileAt(world, tx, ty);
    if (tile && isWalkable(tile.type)) {
      return { x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE };
    }
  }
  return null;
}

export function step(agent, world, dt) {
  if (!agent.target || distance(agent.position, agent.target) < ARRIVE_THRESHOLD) {
    agent.target = pickTarget(agent, world);
    if (!agent.target) return;
  }

  const d = distance(agent.position, agent.target);
  const move = AGENT_SPEED * dt;

  if (move >= d) {
    agent.position.x = agent.target.x;
    agent.position.y = agent.target.y;
  } else {
    const t = move / d;
    agent.position.x = lerp(agent.position.x, agent.target.x, t);
    agent.position.y = lerp(agent.position.y, agent.target.y, t);
  }
}
