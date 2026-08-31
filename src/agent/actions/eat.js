// Fatia 2: sem sistema de recursos ainda (isso é fatia 4+/economia), então
// "comer" busca o tile de grama conhecido mais próximo e recupera fome nele.
// Fatia 3: "conhecido" agora é agent.memory, não o mundo inteiro — se o
// agente nunca viu grama por perto, essa ação não tem candidata (score cai
// a zero mesmo com fome alta, e ele precisa vagar até avistar uma).

import { TILE_TYPES } from '../../world/tile.js';
import { distance, lerp } from '../../utils/mathUtils.js';
import { TILE_SIZE, AGENT_SPEED } from '../../utils/constants.js';
import { urgency, applyEffect } from '../needs.js';
import { recallNearest } from '../memory.js';

const ARRIVE_THRESHOLD = 4;
const RESTORE_PER_SEC = 100 / 15;

export function score(agent) {
  const known = recallNearest(agent.memory, agent.position, (e) => e.type === TILE_TYPES.GRASS);
  if (!known) return 0;
  return urgency(agent.needs.hunger);
}

function findFoodTile(agent) {
  const entry = recallNearest(agent.memory, agent.position, (e) => e.type === TILE_TYPES.GRASS);
  if (!entry) return null;
  return { x: (entry.tx + 0.5) * TILE_SIZE, y: (entry.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  if (!agent.target) {
    agent.target = findFoodTile(agent);
    if (!agent.target) return; // nenhuma grama conhecida; espera a próxima reconsideração
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
