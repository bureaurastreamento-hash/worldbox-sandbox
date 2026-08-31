// Rotas de comércio entre vilas: excedente de uma flui pro déficit de outra,
// desde que os clãs permitam (canTrade). É um sistema de vila pra vila, não
// de agente — as vilas ficam bem além do que qualquer morador percebe ou
// lembra, então isso é "conhecimento institucional" da vila, não uma
// decisão de utilidade individual. Isso é o que viabiliza o caso de design
// original: uma vila guerreira sem produção de comida sobrevivendo por
// depender de uma vila agrícola aliada.

import { addStock } from './stock.js';
import { getClan } from '../world/world.js';
import { canTrade } from '../clan/diplomacy.js';
import { TRADE_SURPLUS_DEMAND_MAX, TRADE_DEFICIT_DEMAND_MIN, TRADE_RATE_PER_SEC } from '../utils/constants.js';

function tradeResource(from, to, resource, dt) {
  const amount = Math.min(TRADE_RATE_PER_SEC * dt, from.stock[resource] ?? 0);
  if (amount <= 0) return;
  addStock(from, resource, -amount);
  addStock(to, resource, amount);
}

export function updateTrade(world, dt) {
  for (let i = 0; i < world.villages.length; i++) {
    const a = world.villages[i];
    const clanA = getClan(world, a.clanId);
    if (!clanA) continue;

    for (let j = i + 1; j < world.villages.length; j++) {
      const b = world.villages[j];
      const clanB = getClan(world, b.clanId);
      if (!clanB || !canTrade(clanA, clanB)) continue;

      for (const resource of Object.keys(a.capacity)) {
        const demandA = a.demand[resource] ?? 0;
        const demandB = b.demand[resource] ?? 0;

        if (demandA <= TRADE_SURPLUS_DEMAND_MAX && demandB >= TRADE_DEFICIT_DEMAND_MIN) {
          tradeResource(a, b, resource, dt);
        } else if (demandB <= TRADE_SURPLUS_DEMAND_MAX && demandA >= TRADE_DEFICIT_DEMAND_MIN) {
          tradeResource(b, a, resource, dt);
        }
      }
    }
  }
}
