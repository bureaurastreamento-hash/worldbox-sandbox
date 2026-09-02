// Enfrentar um predador percebido — ação nova, separada de fight.js (que só
// cobre agente inimigo de outro clã). Só guerreiro designado
// (agent.role === 'warrior') enfrenta de verdade; civil não tem essa
// candidata viável (score 0), sempre foge — ver fleePredator.js. O
// predador já causa dano sozinho na própria IA (predator/predatorAI.js);
// aqui só o lado do agente batendo de volta.

import { distance, tileToWorld, worldToTile } from '../../utils/mathUtils.js';
import { TILE_SIZE, MELEE_RANGE, FIGHT_PREDATOR_SCORE, FLEE_HEALTH_THRESHOLD } from '../../utils/constants.js';
import { findNearestPredator, resolvePredatorEngagement } from '../../combat/predatorCombat.js';
import { moveToward } from '../movement.js';

export function score(agent, world) {
  if (agent.role !== 'warrior') return 0; // civil não enfrenta predador, só foge
  if (agent.lifeStage === 'child' || agent.health < FLEE_HEALTH_THRESHOLD) return 0;
  if (!findNearestPredator(agent, world)) return 0;
  return FIGHT_PREDATOR_SCORE;
}

export function step(agent, world, dt) {
  const predator = findNearestPredator(agent, world);
  if (!predator) return; // predador sumiu/morreu; decision.js reavalia na próxima reconsideração

  if (distance(agent.position, predator.position) > MELEE_RANGE) {
    const predatorTile = worldToTile(predator.position.x, predator.position.y, TILE_SIZE);
    moveToward(agent, world, dt, tileToWorld(predatorTile.tx, predatorTile.ty, TILE_SIZE));
    return;
  }

  resolvePredatorEngagement(agent, predator, dt);
}
