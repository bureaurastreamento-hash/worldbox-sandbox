import { clamp } from '../utils/mathUtils.js';

export function addStock(village, type, amount) {
  const cap = village.capacity[type] ?? Infinity;
  village.stock[type] = clamp((village.stock[type] ?? 0) + amount, 0, cap);
}

// Estoque baixo -> demanda alta -> puxa o score de ações que suprem o
// recurso pra cima, pra todos os moradores (ver agent/actions/gather.js).
export function computeDemand(village) {
  for (const type of Object.keys(village.capacity)) {
    const cap = village.capacity[type];
    const stock = village.stock[type] ?? 0;
    village.demand[type] = cap > 0 ? clamp(1 - stock / cap, 0, 1) : 0;
  }
  return village.demand;
}
