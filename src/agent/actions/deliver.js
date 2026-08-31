// Levar a carga até o estoque da vila. Só entra como candidata se o agente
// já está carregando algo (ver gather.js) — score alto e fixo pra virar
// quase um compromisso assumido, não uma escolha reavaliada a cada tick.

import { distance, lerp } from '../../utils/mathUtils.js';
import { TILE_SIZE, AGENT_SPEED } from '../../utils/constants.js';
import { addStock } from '../../village/stock.js';
import { getVillage } from '../../world/world.js';

const ARRIVE_THRESHOLD = 4;
export const SCORE_WHEN_CARRYING = 0.95;

export function score(agent) {
  return agent.carrying > 0 ? SCORE_WHEN_CARRYING : 0;
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  if (!agent.target) {
    agent.target = { x: village.center.x, y: village.center.y };
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

  addStock(village, 'food', agent.carrying);
  agent.carrying = 0;
  agent.target = null;
}
