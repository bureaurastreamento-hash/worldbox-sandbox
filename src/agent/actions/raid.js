// Saque deliberado — dá efeito prático de guerra à diplomacia dinâmica
// (clan/clanDecision.js seta village.raidTargetVillageId quando escala pra
// guerra; ver DESIGN.md §7). O agente marcha até o centro da vila inimiga e
// saqueia o estoque de lá, reaproveitando deliver.js (genérico por
// carryingType) pro transporte de volta — combate em rota emerge sozinho do
// par fight.js/flee.js já existente (nenhuma lógica de combate aqui).
//
// Sem pose visual dedicada (render/agentRenderer.js): cai no ciclo padrão
// parado/andando, igual toda ação sem uma óbvia — decisão já tomada pra
// papéis visuais (DESIGN.md §8), raid.js não fazia parte daquela leva.

import { CARRY_CAPACITY, GATHER_RATE, RAID_SCORE, FLEE_HEALTH_THRESHOLD, WARRIOR_ROLE_SCORE_BONUS } from '../../utils/constants.js';
import { getVillage } from '../../world/world.js';
import { addStock } from '../../village/stock.js';
import { moveToward, clearMovement } from '../movement.js';

export function score(agent, world) {
  if (agent.carrying > 0) return 0; // já tem carga; ver deliver.js
  if (agent.lifeStage === 'child' || agent.health < FLEE_HEALTH_THRESHOLD) return 0;
  const village = getVillage(world, agent.villageId);
  if (!village || !village.raidTargetVillageId) return 0;
  if (!getVillage(world, village.raidTargetVillageId)) return 0; // alvo sumiu
  return agent.role === 'warrior' ? RAID_SCORE + WARRIOR_ROLE_SCORE_BONUS : RAID_SCORE;
}

// Recurso com mais estoque na vila alvo agora — sem preferência por tipo,
// saqueia o que tiver mais pra levar o máximo possível por viagem.
function pickLoot(targetVillage) {
  let best = null;
  let bestAmount = 0;
  for (const resource of Object.keys(targetVillage.stock)) {
    const amount = targetVillage.stock[resource] ?? 0;
    if (amount > bestAmount) {
      bestAmount = amount;
      best = resource;
    }
  }
  return best;
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village || !village.raidTargetVillageId) return;
  const targetVillage = getVillage(world, village.raidTargetVillageId);
  if (!targetVillage) return;

  if (!agent.target) {
    agent.target = { x: targetVillage.center.x, y: targetVillage.center.y };
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent, world);
    return;
  }
  if (status !== 'arrived') return;

  const resource = pickLoot(targetVillage);
  if (!resource) {
    clearMovement(agent, world); // nada pra saquear agora; tenta de novo na próxima reconsideração
    return;
  }

  const amount = Math.min(GATHER_RATE * dt, targetVillage.stock[resource]);
  addStock(targetVillage, resource, -amount);
  agent.carryingType = resource;
  agent.carrying = Math.min(CARRY_CAPACITY, agent.carrying + amount);
  if (agent.carrying >= CARRY_CAPACITY) {
    clearMovement(agent, world); // carga cheia; decision.js troca pra "deliver" na próxima reconsideração
  }
}
