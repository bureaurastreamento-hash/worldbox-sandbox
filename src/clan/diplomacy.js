// Propõe/assina tratados entre clãs e expõe os termos vigentes. Assinar um
// tratado muda a postura (stanceByClan) entre os dois clãs. Dois efeitos
// concretos consomem isso hoje: isHostileTerritory() (wander/gather/eat não
// escolhem alvo em território de clã em guerra/tensão) e canTrade()
// (village/trade.js só move recurso entre clãs aliados ou com tratado
// 'trade' assinado). defense_pact ganha efeito na fatia 9 (combate).

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

// Mesma clã sempre comercia; clãs diferentes precisam ser aliados ou ter um
// tratado de comércio assinado (não basta postura neutra por si só).
export function canTrade(clanA, clanB) {
  if (clanA.id === clanB.id) return true;
  if (getStance(clanA, clanB) === 'allied') return true;
  return clanA.treaties.some(
    (t) => t.type === 'trade' && t.status === 'signed' && (t.clanA === clanB.id || t.clanB === clanB.id),
  );
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
