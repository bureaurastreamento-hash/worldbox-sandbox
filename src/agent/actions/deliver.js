// Levar a carga até o estoque da vila. Só entra como candidata se o agente
// já está carregando algo (ver gather.js/gatherWood.js) — score alto e fixo
// pra virar quase um compromisso assumido, não uma escolha reavaliada a cada
// tick. Genérico por tipo de recurso: `agent.carryingType` diz onde entregar,
// escrito por quem encheu a carga.

import { addStock } from '../../village/stock.js';
import { getVillage } from '../../world/world.js';
import { moveToward, clearMovement } from '../movement.js';
import { CARRY_CAPACITY } from '../../utils/constants.js';

export const SCORE_WHEN_CARRYING = 0.8; // alto e fixo, mas ainda interrompível por fome/sono crítica

// Só vale a pena entregar com a carga cheia — `> 0` deixava o agente
// entregar frações de ~5-10% da carga a cada viagem (bug real, ver
// gather.js:score); `>= CARRY_CAPACITY` espelha o gate do lado da coleta,
// fechando o ciclo pretendido: colhe até encher, entrega uma vez, repete.
export function score(agent) {
  return agent.carrying >= CARRY_CAPACITY ? SCORE_WHEN_CARRYING : 0;
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  if (!agent.target) {
    agent.target = { x: village.center.x, y: village.center.y };
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent); // preso longe da vila; tenta de novo na próxima reconsideração
    return;
  }
  if (status !== 'arrived') return;

  addStock(village, agent.carryingType ?? 'food', agent.carrying);
  agent.carrying = 0;
  agent.carryingType = null;
  clearMovement(agent);
}
