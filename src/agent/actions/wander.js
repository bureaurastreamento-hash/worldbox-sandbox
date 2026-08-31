// Ação de menor prioridade: o que o agente faz quando nenhuma necessidade
// está urgente o bastante para valer a pena (ver decision.js). Escolhe entre
// os tiles atualmente visíveis (agent.perception) — não consulta o mundo
// além do que o agente está vendo agora.

import { isWalkable } from '../../world/tile.js';
import { distance, lerp } from '../../utils/mathUtils.js';
import { TILE_SIZE, AGENT_SPEED } from '../../utils/constants.js';
import { isHostileTerritory } from '../../clan/diplomacy.js';

const ARRIVE_THRESHOLD = 2;

export const BASE_SCORE = 0.05;

export function score() {
  return BASE_SCORE;
}

function pickTarget(agent, world) {
  const candidates = agent.perception.tiles.filter(
    (t) => isWalkable(t.type) && !isHostileTerritory(world, agent, t.tx, t.ty),
  );
  if (candidates.length === 0) return null;

  const choice = candidates[world.rng.int(0, candidates.length - 1)];
  return { x: (choice.tx + 0.5) * TILE_SIZE, y: (choice.ty + 0.5) * TILE_SIZE };
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
