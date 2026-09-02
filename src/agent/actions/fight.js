// Engajar um inimigo percebido (ver combat/combat.js). Crianças e agentes
// muito feridos não lutam — ver flee.js, que cobre esses casos com score
// ainda mais alto.

import { distance, tileToWorld, worldToTile } from '../../utils/mathUtils.js';
import { TILE_SIZE, MELEE_RANGE, FIGHT_SCORE, FLEE_HEALTH_THRESHOLD, WARRIOR_ROLE_SCORE_BONUS } from '../../utils/constants.js';
import { findNearestEnemy, resolveEngagement } from '../../combat/combat.js';
import { moveToward } from '../movement.js';

export function score(agent, world) {
  if (agent.lifeStage === 'child' || agent.health < FLEE_HEALTH_THRESHOLD) return 0;
  if (!findNearestEnemy(agent, world)) return 0;
  return agent.role === 'warrior' ? FIGHT_SCORE + WARRIOR_ROLE_SCORE_BONUS : FIGHT_SCORE;
}

export function step(agent, world, dt) {
  const enemy = findNearestEnemy(agent, world);
  if (!enemy) return; // ameaça sumiu; decision.js reavalia na próxima reconsideração

  if (distance(agent.position, enemy.position) > MELEE_RANGE) {
    // persegue o tile atual do inimigo, não a posição exata — evita
    // recalcular o caminho a cada frame só porque ele deu um passo.
    const enemyTile = worldToTile(enemy.position.x, enemy.position.y, TILE_SIZE);
    moveToward(agent, world, dt, tileToWorld(enemyTile.tx, enemyTile.ty, TILE_SIZE));
    return;
  }

  resolveEngagement(agent, enemy, dt, world);
}
