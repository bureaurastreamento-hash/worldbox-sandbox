import {
  VILLAGE_FOOD_CAPACITY,
  VILLAGE_WOOD_CAPACITY,
  VILLAGE_MINERAL_CAPACITY,
  MINING_RESOURCES,
  REPRO_COOLDOWN_MIN,
  TERRITORY_RADIUS,
  VILLAGE_POP_CAP,
  HOUSE_POP_BONUS,
  STARTING_FOOD_STOCK,
} from '../utils/constants.js';

// specialization: 'food' | 'wood' — decide qual dos dois recursos os
// moradores desta vila colhem (gather.js/gatherWood.js só pontuam > 0 pro
// recurso da própria especialização). Ambos os tipos existem em
// stock/capacity/demand pra toda vila, especializada ou não, senão
// village/trade.js nunca teria o recurso "de fora" pra receber via comércio.
// Minério (MINING_RESOURCES: stone/coal/iron/gold) é universal — qualquer
// vila colhe, sem gate de especialização (agent/actions/mine.js) — e fica
// fora de `distress` de propósito: não alimenta guerra/colapso (ver
// utils/constants.js:CRITICAL_RESOURCES), só comércio genérico e construção.
export function createVillage({ id, name, center, specialization = 'food' }) {
  const capacity = { food: VILLAGE_FOOD_CAPACITY, wood: VILLAGE_WOOD_CAPACITY };
  const stock = { food: STARTING_FOOD_STOCK, wood: 0 }; // ver STARTING_FOOD_STOCK: bootstrap seguro pra eat.js
  const demand = { food: 0, wood: 0 };
  for (const resource of MINING_RESOURCES) {
    capacity[resource] = VILLAGE_MINERAL_CAPACITY;
    stock[resource] = 0;
    demand[resource] = 0;
  }

  return {
    id,
    name,
    clanId: null, // atribuído por clan/clan.js:addVillage
    center: { x: center.x, y: center.y },
    territory: { radius: TERRITORY_RADIUS }, // tiles
    specialization,
    stock,
    capacity,
    demand,
    distress: { food: 0, wood: 0 }, // só CRITICAL_RESOURCES; ver village/stock.js:updateDistress
    inChaos: false, // colapso interno — derivado da distress, ver village/stock.js:updateChaos
    raidTargetVillageId: null, // ordem institucional de saque, ver clan/clanDecision.js e agent/actions/raid.js
    buildings: [],
    population: [],
    reproCooldown: REPRO_COOLDOWN_MIN,
  };
}

export function addResident(village, agentId) {
  village.population.push(agentId);
}

// Teto de população efetivo — base + bônus por casa construída
// (agent/actions/build.js). Usado tanto pra pontuar a decisão de construir
// quanto pro gate de reprodução (lifecycle.js), pra não duplicar a fórmula.
export function getPopulationCap(village) {
  return VILLAGE_POP_CAP + village.buildings.length * HOUSE_POP_BONUS;
}
