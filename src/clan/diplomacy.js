// Propõe/assina tratados entre clãs e expõe os termos vigentes. Fatia 7:
// assinar um tratado muda a postura (stanceByClan) entre os dois clãs — o
// efeito concreto nos moradores é isHostileTerritory(), que wander.js,
// gather.js e eat.js consultam pra não escolher alvos em território de um
// clã em guerra/tensão. trade/defense_pact ganham efeito mais forte nas
// fatias 8 (comércio) e 9 (combate), que consomem os tratados vigentes
// daqui.

import { TILE_SIZE } from '../utils/constants.js';
import { distance } from '../utils/mathUtils.js';
import { getVillage, getClan } from '../world/world.js';
import { setStance, getStance } from './clan.js';

const STANCE_BY_TREATY_TYPE = {
  alliance: 'allied',
  defense_pact: 'allied',
  nonaggression: 'neutral',
  trade: 'neutral',
};

let nextTreatyId = 1;

export function proposeTreaty(clanA, clanB, type, terms = {}) {
  return {
    id: `treaty-${nextTreatyId++}`,
    clanA: clanA.id,
    clanB: clanB.id,
    type,
    terms,
    status: 'proposed',
    signedAt: null,
  };
}

export function signTreaty(treaty, clanA, clanB, tick = 0) {
  treaty.status = 'signed';
  treaty.signedAt = tick;
  clanA.treaties.push(treaty);
  clanB.treaties.push(treaty);

  setStance(clanA, clanB, STANCE_BY_TREATY_TYPE[treaty.type] ?? 'neutral');
  return treaty;
}

const DANGEROUS_STANCES = new Set(['war', 'tense']);

export function isHostileTerritory(world, agent, tx, ty) {
  const myVillage = getVillage(world, agent.villageId);
  const myClan = myVillage && getClan(world, myVillage.clanId);
  if (!myVillage || !myClan) return false;

  const point = { x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE };

  for (const village of world.villages) {
    if (village.id === myVillage.id) continue;
    if (distance(point, village.center) > village.territory.radius * TILE_SIZE) continue;

    const otherClan = getClan(world, village.clanId);
    if (!otherClan) continue;
    if (DANGEROUS_STANCES.has(getStance(myClan, otherClan))) return true;
  }

  return false;
}
