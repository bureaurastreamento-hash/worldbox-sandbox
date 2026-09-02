// Fugir de um predador percebido — ação nova, separada de flee.js (que só
// cobre agente inimigo de outro clã) porque a decisão de QUEM foge é
// diferente aqui: civil foge sempre que um predador está por perto;
// guerreiro designado (agent.role === 'warrior') só foge se a própria vida
// já estiver crítica (mesmo padrão de FLEE_HEALTH_THRESHOLD que fight.js já
// usa contra outro clã) — ele prefere enfrentar, ver fightPredator.js.

import { isWalkable } from '../../world/tile.js';
import { distance } from '../../utils/mathUtils.js';
import { TILE_SIZE, FLEE_PREDATOR_SCORE, FLEE_HEALTH_THRESHOLD } from '../../utils/constants.js';
import { findNearestPredator } from '../../combat/predatorCombat.js';
import { moveToward, clearMovement } from '../movement.js';

const ARRIVE_THRESHOLD = 3;

export function score(agent, world) {
  const predator = findNearestPredator(agent, world);
  if (!predator) return 0;

  if (agent.role === 'warrior') {
    // guerreiro só foge de predador com a vida já crítica; do contrário
    // prefere enfrentar (fightPredator.js).
    return agent.health < FLEE_HEALTH_THRESHOLD ? FLEE_PREDATOR_SCORE : 0;
  }
  return FLEE_PREDATOR_SCORE;
}

function pickFleeTarget(agent, predator) {
  const candidates = agent.perception.tiles.filter((t) => isWalkable(t.type));
  if (candidates.length === 0) return null;

  let best = null;
  let bestDist = -Infinity;
  for (const t of candidates) {
    const pos = { x: (t.tx + 0.5) * TILE_SIZE, y: (t.ty + 0.5) * TILE_SIZE };
    const d = distance(pos, predator.position);
    if (d > bestDist) {
      bestDist = d;
      best = pos;
    }
  }
  return best;
}

export function step(agent, world, dt) {
  const predator = findNearestPredator(agent, world);
  if (!predator) {
    clearMovement(agent);
    return;
  }

  if (!agent.target || distance(agent.position, agent.target) < ARRIVE_THRESHOLD) {
    agent.target = pickFleeTarget(agent, predator);
    if (!agent.target) return;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status !== 'moving') clearMovement(agent);
}
