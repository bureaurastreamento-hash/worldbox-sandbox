export function createClan({ id, name, color, decisionTimer = 0 }) {
  return {
    id,
    name,
    color,
    memberVillageIds: [],
    stanceByClan: {}, // clanId -> war | tense | neutral | allied
    treaties: [],
    decisionTimer, // jitter por clã pra reconsideração diplomática não sincronizar (clan/clanDecision.js)
  };
}

export function addVillage(clan, village) {
  clan.memberVillageIds.push(village.id);
  village.clanId = clan.id;
}

export function setStance(clanA, clanB, stance) {
  clanA.stanceByClan[clanB.id] = stance;
  clanB.stanceByClan[clanA.id] = stance;
}

export function getStance(clanA, clanB) {
  if (clanA.id === clanB.id) return 'allied';
  return clanA.stanceByClan[clanB.id] ?? 'neutral';
}
