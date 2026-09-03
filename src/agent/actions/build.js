// Construir um prédio pra vila — consome madeira+pedra do estoque comunitário
// e, ao completar, aplica o efeito do TIPO construído (village/buildings.js).
// Pontua pela pressão institucional, não pela necessidade do agente — mesmo
// espírito de gather.js.
//
// Duas mudanças em relação à versão anterior, que só sabia fazer "casa":
//   1. o TIPO é escolhido pela carência real da vila (teto de população,
//      espaço de comida, espaço de material) — é o que dá função mecânica a
//      cada prédio em vez de "mais um genérico";
//   2. a obra acontece NUM TERRENO ESCOLHIDO, não no centro da vila. O
//      canteiro é reservado quando o agente decide construir e some com ele
//      se a obra for abandonada, então dois construtores não empilham obra
//      no mesmo ponto.

import { BUILD_WORK_SECONDS, BUILD_SCORE_WEIGHT } from '../../utils/constants.js';
import { getVillage } from '../../world/world.js';
import {
  BUILDING,
  addBuilding,
  findBuildingSpot,
  nextBuildingType,
  getPopulationCap,
} from '../../village/buildings.js';
import { addStock } from '../../village/stock.js';
import { pushEvent } from '../../world/eventLog.js';
import { moveToward, clearMovement } from '../movement.js';

function canAfford(village, type) {
  const spec = BUILDING[type];
  return village.stock.wood >= spec.wood && village.stock.stone >= spec.stone;
}

export function score(agent, world) {
  if (agent.carrying > 0) return 0; // ocupado entregando outra coisa
  const village = getVillage(world, agent.villageId);
  if (!village) return 0;
  if (!canAfford(village, nextBuildingType(village))) return 0;

  const pressure = Math.min(1, village.population.length / getPopulationCap(village));
  return pressure * BUILD_SCORE_WEIGHT;
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  if (!agent.target) {
    const type = nextBuildingType(village);
    if (!canAfford(village, type)) return; // espera a próxima reconsideração

    const spot = findBuildingSpot(world, village, world.rng);
    if (!spot) return; // clareira cheia; outra ação vence na próxima

    agent.buildType = type;
    agent.target = spot;
    agent.buildProgress = 0;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent, world);
    agent.buildProgress = 0;
    agent.buildType = null;
    return;
  }
  if (status !== 'arrived') return;

  const type = agent.buildType ?? 'house';
  const spec = BUILDING[type];

  if (agent.buildProgress === 0) {
    // Reconfere na chegada: outro agente pode ter começado (e gasto o
    // estoque) primeiro entre o momento em que este saiu e o de chegar.
    if (!canAfford(village, type)) {
      clearMovement(agent, world);
      agent.buildType = null;
      return;
    }
    addStock(village, 'wood', -spec.wood);
    addStock(village, 'stone', -spec.stone);
  }

  agent.buildProgress += dt;
  if (agent.buildProgress >= BUILD_WORK_SECONDS) {
    addBuilding(village, type, agent.target.x, agent.target.y);
    agent.buildProgress = 0;
    agent.buildType = null;
    clearMovement(agent, world);
    pushEvent(world, `${village.name} construiu ${spec.label === 'Casa' ? 'uma casa' : `um ${spec.label.toLowerCase()}`}`);
  }
}
