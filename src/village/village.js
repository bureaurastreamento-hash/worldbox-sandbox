import { VILLAGE_FOOD_CAPACITY, REPRO_COOLDOWN_MIN, TERRITORY_RADIUS } from '../utils/constants.js';

export function createVillage({ id, name, center }) {
  return {
    id,
    name,
    clanId: null, // atribuído por clan/clan.js:addVillage
    center: { x: center.x, y: center.y },
    territory: { radius: TERRITORY_RADIUS }, // tiles
    stock: { food: 0 },
    capacity: { food: VILLAGE_FOOD_CAPACITY },
    demand: { food: 0 },
    population: [],
    reproCooldown: REPRO_COOLDOWN_MIN,
  };
}

export function addResident(village, agentId) {
  village.population.push(agentId);
}
