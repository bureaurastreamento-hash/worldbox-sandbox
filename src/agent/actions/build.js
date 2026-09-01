// Construir uma casa pra vila — consome madeira+pedra do estoque comunitário
// e, ao completar, aumenta o teto de população (village/village.js:
// getPopulationCap). Pontua pela pressão populacional (quão perto do teto
// atual a vila está), não pela necessidade do agente — mesmo espírito de
// gather.js: demanda institucional, não pessoal.

import { HOUSE_WOOD_COST, HOUSE_STONE_COST, BUILD_WORK_SECONDS, BUILD_SCORE_WEIGHT } from '../../utils/constants.js';
import { getVillage } from '../../world/world.js';
import { getPopulationCap } from '../../village/village.js';
import { addStock } from '../../village/stock.js';
import { moveToward, clearMovement } from '../movement.js';

function hasEnoughResources(village) {
  return village.stock.wood >= HOUSE_WOOD_COST && village.stock.stone >= HOUSE_STONE_COST;
}

export function score(agent, world) {
  if (agent.carrying > 0) return 0; // ocupado entregando outra coisa
  const village = getVillage(world, agent.villageId);
  if (!village || !hasEnoughResources(village)) return 0;

  const pressure = Math.min(1, village.population.length / getPopulationCap(village));
  return pressure * BUILD_SCORE_WEIGHT;
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  if (!agent.target) {
    if (!hasEnoughResources(village)) return; // espera a próxima reconsideração
    agent.target = { x: village.center.x, y: village.center.y };
    agent.buildProgress = 0;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent);
    agent.buildProgress = 0;
    return;
  }
  if (status !== 'arrived') return;

  if (agent.buildProgress === 0) {
    // Reconfere na chegada: outro agente pode ter começado (e gasto o
    // estoque) primeiro entre o momento em que este saiu e o de chegar.
    if (!hasEnoughResources(village)) {
      clearMovement(agent);
      return;
    }
    addStock(village, 'wood', -HOUSE_WOOD_COST);
    addStock(village, 'stone', -HOUSE_STONE_COST);
  }

  agent.buildProgress += dt;
  if (agent.buildProgress >= BUILD_WORK_SECONDS) {
    village.buildings.push({ type: 'house' });
    agent.buildProgress = 0;
    clearMovement(agent);
  }
}
