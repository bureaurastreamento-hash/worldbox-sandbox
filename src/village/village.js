import { VILLAGE_FOOD_CAPACITY, VILLAGE_WOOD_CAPACITY, REPRO_COOLDOWN_MIN, TERRITORY_RADIUS } from '../utils/constants.js';

// specialization: 'food' | 'wood' — decide qual dos dois recursos os
// moradores desta vila colhem (gather.js/gatherWood.js só pontuam > 0 pro
// recurso da própria especialização). Ambos os tipos existem em
// stock/capacity/demand pra toda vila, especializada ou não, senão
// village/trade.js nunca teria o recurso "de fora" pra receber via comércio.
export function createVillage({ id, name, center, specialization = 'food' }) {
  return {
    id,
    name,
    clanId: null, // atribuído por clan/clan.js:addVillage
    center: { x: center.x, y: center.y },
    territory: { radius: TERRITORY_RADIUS }, // tiles
    specialization,
    stock: { food: 0, wood: 0 },
    capacity: { food: VILLAGE_FOOD_CAPACITY, wood: VILLAGE_WOOD_CAPACITY },
    demand: { food: 0, wood: 0 },
    population: [],
    reproCooldown: REPRO_COOLDOWN_MIN,
  };
}

export function addResident(village, agentId) {
  village.population.push(agentId);
}
