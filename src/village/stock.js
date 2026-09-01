import { clamp } from '../utils/mathUtils.js';
import { TRADE_DEFICIT_DEMAND_MIN, DISTRESS_CHAOS_THRESHOLD_SECONDS } from '../utils/constants.js';

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

// Segundos consecutivos com demanda em nível de déficit — sinal de
// "desespero" pra clan/clanDecision.js decidir propor comércio ou escalar
// pra guerra. Reseta assim que a demanda cai abaixo do limiar (não decai
// aos poucos): a semântica é "há quanto tempo isso está sem alívio agora".
export function updateDistress(village, dt) {
  for (const type of Object.keys(village.demand)) {
    const inDeficit = (village.demand[type] ?? 0) >= TRADE_DEFICIT_DEMAND_MIN;
    village.distress[type] = inDeficit ? (village.distress[type] ?? 0) + dt : 0;
  }
}

// Colapso interno: nenhum recurso resolveu o déficit por tempo longo o
// bastante, apesar de comércio/guerra já terem tido chance de agir — ver
// lifecycle.js (bloqueia reprodução) e main.js (acelera decaimento de needs).
export function updateChaos(village) {
  village.inChaos = Object.values(village.distress).some((seconds) => seconds >= DISTRESS_CHAOS_THRESHOLD_SECONDS);
}
