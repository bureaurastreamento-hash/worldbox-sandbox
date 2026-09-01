// IA de decisão institucional: cada clã reavalia periodicamente sua relação
// com cada outro clã do mundo, reagindo à pressão econômica real da própria
// vila (village.distress, ver village/stock.js). Espelha agent/decision.js
// no espírito (candidatas avaliadas, decisão baseada em pressão sustentada,
// não script fixo), mas em escala institucional: um clã mantém várias
// relações simultâneas, não uma ação corrente só, então cada par (clã, outro
// clã) é reavaliado de forma independente a cada reconsideração.
//
// Assume 1 vila por clã (verdade em todo o world-gen atual, main.js) — se
// isso mudar, getClanVillage precisa virar getClanVillages (agregando).

import { getStance, setStance } from './clan.js';
import { proposeTreaty, signTreaty, hasTreaty, breakTreaty } from './diplomacy.js';
import {
  CLAN_RECONSIDER_INTERVAL_MIN,
  CLAN_RECONSIDER_INTERVAL_MAX,
  DISTRESS_WAR_THRESHOLD_SECONDS,
  TRADE_SURPLUS_DEMAND_MAX,
  PARTNER_SWITCH_MARGIN,
} from '../utils/constants.js';

function getClanVillage(world, clan) {
  return world.villages.find((v) => v.clanId === clan.id) ?? null;
}

// Recurso mais desesperado da vila agora ({ resource, seconds }), ou null
// se nada está em déficit sustentado.
function mostDistressedResource(village) {
  let best = null;
  for (const [resource, seconds] of Object.entries(village.distress)) {
    if (seconds > 0 && (!best || seconds > best.seconds)) best = { resource, seconds };
  }
  return best;
}

function surplusResources(village) {
  return Object.keys(village.demand).filter((r) => (village.demand[r] ?? 0) <= TRADE_SURPLUS_DEMAND_MAX);
}

// Entre os clãs com quem `clan` ainda não comercia (e não está em clima
// hostil), o mais desesperado pelo `resource` que `clan` tem de sobra —
// só conta se superar a demanda do parceiro atual por uma margem, pra não
// trocar de parceiro por uma diferença mínima a cada reconsideração.
function findBetterPartner(world, clan, currentPartnerId, resource, currentDemand) {
  let best = null;
  let bestDemand = currentDemand + PARTNER_SWITCH_MARGIN;

  for (const other of world.clans) {
    if (other.id === clan.id || other.id === currentPartnerId) continue;
    const stance = getStance(clan, other);
    if (stance === 'war' || stance === 'tense') continue;
    if (hasTreaty(clan, other, 'trade') || stance === 'allied') continue; // já tem o recurso garantido

    const otherVillage = getClanVillage(world, other);
    if (!otherVillage) continue;

    const theirDemand = otherVillage.demand[resource] ?? 0;
    if (theirDemand > bestDemand) {
      bestDemand = theirDemand;
      best = other;
    }
  }

  return best;
}

function reconsiderRelationship(world, clan, other, village, otherVillage) {
  const stance = getStance(clan, other);
  const distress = mostDistressedResource(village);

  // 1. Desespero sustentado por um recurso que essa vila não produz, sem
  //    alívio, e o outro clã tem sobra dele — escala pra guerra.
  if (
    distress &&
    distress.seconds >= DISTRESS_WAR_THRESHOLD_SECONDS &&
    stance !== 'war' &&
    stance !== 'allied' &&
    (otherVillage.stock[distress.resource] ?? 0) > 0 &&
    (otherVillage.demand[distress.resource] ?? 0) <= TRADE_SURPLUS_DEMAND_MAX
  ) {
    setStance(clan, other, 'war');
    return;
  }

  // 2. Guerra que não é mais alimentada por desespero — propõe paz de volta.
  if (stance === 'war' && (!distress || distress.seconds < DISTRESS_WAR_THRESHOLD_SECONDS / 2)) {
    setStance(clan, other, 'neutral');
    return;
  }

  if (stance === 'war' || stance === 'tense' || stance === 'allied') return; // sem diplomacia econômica nesses casos

  // 3. Ainda não comercia com esse clã, precisa de um recurso que ele tem
  //    de sobra — propõe comércio.
  if (!hasTreaty(clan, other, 'trade') && distress && (otherVillage.demand[distress.resource] ?? 0) <= TRADE_SURPLUS_DEMAND_MAX) {
    const treaty = proposeTreaty(clan, other, 'trade');
    signTreaty(treaty, clan, other, world.tick ?? 0);
    return;
  }

  // 4. Já exporta um recurso de sobra pra esse clã, mas existe um 3º bem
  //    mais desesperado por ele — rompe e assina com quem precisa mais
  //    ("achou um parceiro melhor", sem precisar de sistema de pagamento).
  if (hasTreaty(clan, other, 'trade')) {
    for (const resource of surplusResources(village)) {
      const currentDemand = otherVillage.demand[resource] ?? 0;
      const betterPartner = findBetterPartner(world, clan, other.id, resource, currentDemand);
      if (betterPartner) {
        const oldTreaty = clan.treaties.find(
          (t) => t.type === 'trade' && t.status === 'signed' && (t.clanA === other.id || t.clanB === other.id),
        );
        if (oldTreaty) breakTreaty(oldTreaty);
        const treaty = proposeTreaty(clan, betterPartner, 'trade');
        signTreaty(treaty, clan, betterPartner, world.tick ?? 0);
        return;
      }
    }
  }
}

export function updateClanDecision(clan, world, dt) {
  clan.decisionTimer -= dt;
  if (clan.decisionTimer > 0) return;
  clan.decisionTimer = world.rng.range(CLAN_RECONSIDER_INTERVAL_MIN, CLAN_RECONSIDER_INTERVAL_MAX);

  const village = getClanVillage(world, clan);
  if (!village) return;

  for (const other of world.clans) {
    if (other.id === clan.id) continue;
    const otherVillage = getClanVillage(world, other);
    if (!otherVillage) continue;
    reconsiderRelationship(world, clan, other, village, otherVillage);
  }
}
