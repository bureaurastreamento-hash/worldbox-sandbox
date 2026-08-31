// Fugir de um inimigo percebido — prioridade de crianças e agentes muito
// feridos (ver fight.js, que cobre o resto). Foge pro tile visível mais
// distante do inimigo, não necessariamente pra dentro do próprio território.

import { isWalkable } from '../../world/tile.js';
import { distance } from '../../utils/mathUtils.js';
import { TILE_SIZE, FLEE_SCORE, FLEE_HEALTH_THRESHOLD } from '../../utils/constants.js';
import { findNearestEnemy } from '../../combat/combat.js';
import { moveToward, clearMovement } from '../movement.js';

const ARRIVE_THRESHOLD = 3;

export function score(agent, world) {
  const weak = agent.lifeStage === 'child' || agent.health < FLEE_HEALTH_THRESHOLD;
  if (!weak) return 0;
  return findNearestEnemy(agent, world) ? FLEE_SCORE : 0;
}

function pickFleeTarget(agent, enemy) {
  const candidates = agent.perception.tiles.filter((t) => isWalkable(t.type));
  if (candidates.length === 0) return null;

  let best = null;
  let bestDist = -Infinity;
  for (const t of candidates) {
    const pos = { x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 0.5) * TILE_SIZE };
    const d = distance(pos, enemy.position);
    if (d > bestDist) {
      bestDist = d;
      best = pos;
    }
  }
  return best;
}

export function step(agent, world, dt) {
  const enemy = findNearestEnemy(agent, world);
  if (!enemy) {
    clearMovement(agent);
    return;
  }

  if (!agent.target || distance(agent.position, agent.target) < ARRIVE_THRESHOLD) {
    agent.target = pickFleeTarget(agent, enemy);
    if (!agent.target) return;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status !== 'moving') clearMovement(agent);
}
