// Ação de menor prioridade: o que o agente faz quando nenhuma necessidade
// está urgente o bastante para valer a pena (ver decision.js). Escolhe entre
// os tiles atualmente visíveis (agent.perception) — não consulta o mundo
// além do que o agente está vendo agora.

import { isWalkable } from '../../world/tile.js';
import { TILE_SIZE } from '../../utils/constants.js';
import { isHostileTerritory } from '../../clan/diplomacy.js';
import { moveToward, clearMovement } from '../movement.js';

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
  if (!agent.target) {
    agent.target = pickTarget(agent, world);
    if (!agent.target) return;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status !== 'moving') clearMovement(agent); // chegou (ou não dá): escolhe outro alvo depois
}
