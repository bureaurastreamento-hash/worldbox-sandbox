import {
  VILLAGE_FOOD_CAPACITY,
  VILLAGE_WOOD_CAPACITY,
  VILLAGE_MINERAL_CAPACITY,
  MINING_RESOURCES,
  REPRO_COOLDOWN_MIN,
  TERRITORY_RADIUS,
  STARTING_FOOD_STOCK,
} from '../utils/constants.js';
import { addBuilding, findBuildingSpot, getPopulationCap } from './buildings.js';
import { createKnownSites } from './knowledge.js';

// getPopulationCap mora em village/buildings.js (é efeito de prédio), mas
// continua sendo importado daqui pelo resto do jogo.
export { getPopulationCap };

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
    hungerWarningActive: false, // fome média crítica já avisada no feed — ver lifecycle.js:updateHungerWarning
    raidTargetVillageId: null, // ordem institucional de saque, ver clan/clanDecision.js e agent/actions/raid.js
    buildings: [],
    // Depósitos de minério que moradores viram e vieram contar — ver
    // village/knowledge.js. Sobrevive ao decaimento da memória individual e
    // ao próprio descobridor, mas só recebe o que alguém trouxe no corpo.
    knownSites: createKnownSites(),
    expedition: null, // expedição de exploração em curso, ver village/expedition.js
    population: [],
    reproCooldown: REPRO_COOLDOWN_MIN,
  };
}

export function addResident(village, agentId) {
  village.population.push(agentId);
}

// Prédios fundacionais: toda vila nasce com prefeitura (no centro) e um
// celeiro. O celeiro não é opcional — sem ele não haveria onde comer no
// minuto 1, e a vila voltaria a morrer de fome antes de construir o primeiro,
// exatamente a espiral corrigida em §1e do STATUS.md. Chamada de main.js
// depois de o mundo existir, porque a colocação precisa checar terreno andável.
export function foundVillageBuildings(world, village, rng) {
  addBuilding(village, 'townhall', village.center.x, village.center.y);

  const spot = findBuildingSpot(world, village, rng);
  if (spot) addBuilding(village, 'granary', spot.x, spot.y);
}
