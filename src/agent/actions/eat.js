// Comer consome o estoque comunitário da vila (village.stock.food) — antes
// (fatia 2, sem sistema de recursos ainda) comia direto de qualquer tile de
// grama por perto, sem nenhuma relação com o estoque; era o limite conhecido
// registrado em DESIGN.md §6. Agora, sem comida no estoque, o agente não tem
// candidata viável (mesmo padrão de gather.js: "só entra na lista se o
// agente sabe que existe algo pra fazer") — ele passa fome de verdade se a
// vila não produz nem recebe comida, cumprindo o pilar 4 também no nível
// individual, não só institucional.

import { urgency, applyEffect } from '../needs.js';
import { getVillage } from '../../world/world.js';
import { addStock } from '../../village/stock.js';
import { EAT_FOOD_PER_SEC, EAT_RESTORE_PER_FOOD } from '../../utils/constants.js';
import { moveToward, clearMovement } from '../movement.js';

export function score(agent, world) {
  const village = getVillage(world, agent.villageId);
  if (!village || (village.stock.food ?? 0) <= 0) return 0; // nada pra comer agora
  return urgency(agent.needs.hunger);
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  if (!agent.target) {
    agent.target = { x: village.center.x, y: village.center.y };
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent);
    return;
  }
  if (status !== 'arrived') return;

  const consume = Math.min(EAT_FOOD_PER_SEC * dt, village.stock.food ?? 0);
  if (consume <= 0) return; // estoque esvaziou enquanto ele vinha andando; espera a próxima reconsideração
  addStock(village, 'food', -consume);
  applyEffect(agent.needs, 'hunger', consume * EAT_RESTORE_PER_FOOD);
}
