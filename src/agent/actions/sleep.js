// Dormir — agora indo até uma CASA, o que fecha o TODO que estava neste
// arquivo desde a fatia 2 ("dorme onde estiver, sem se deslocar até um
// abrigo; isso entra quando existir vila/casa").
//
// É a maior alavanca contra o amontoado no centro da vila: sono é uma
// necessidade constante de todo mundo, e as casas ficam espalhadas pela
// clareira. Enquanto se dormia em pé onde estivesse, o único lugar pra onde
// os moradores se deslocavam era o centro.
//
// Regra de segurança: sem casa disponível (vila recém-fundada, ou casa
// inalcançável), dorme onde estiver, como antes. Sono não pode virar uma
// necessidade impossível de satisfazer — isso mataria a vila por um detalhe
// de urbanismo.

import { urgency, applyEffect } from '../needs.js';
import { getVillage } from '../../world/world.js';
import { findBuilding, approachPoint } from '../../village/buildings.js';
import { moveToward, clearMovement } from '../movement.js';

const RESTORE_PER_SEC = 100 / 20;

export function score(agent) {
  return urgency(agent.needs.sleep);
}

function restAndFinish(agent, world, dt) {
  applyEffect(agent.needs, 'sleep', RESTORE_PER_SEC * dt);
  if (agent.needs.sleep >= 100) clearMovement(agent, world);
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  const house = village ? findBuilding(village, 'house', agent.position) : null;

  if (!house) {
    restAndFinish(agent, world, dt);
    return;
  }

  if (!agent.target) agent.target = approachPoint(house, agent);

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    // Casa inalcançável (do outro lado de um rio, por exemplo): dorme mesmo
    // assim em vez de ficar acordado pra sempre tentando chegar.
    clearMovement(agent, world);
    restAndFinish(agent, world, dt);
    return;
  }
  if (status !== 'arrived') return;

  restAndFinish(agent, world, dt);
}
