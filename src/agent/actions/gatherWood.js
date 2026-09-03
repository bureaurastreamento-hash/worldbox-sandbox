// Colher madeira pra vila — espelha gather.js (comida), mas em tiles de
// floresta e só pontua pra vilas especializadas em madeira. Ver village.js
// (specialization) e deliver.js (genérico, lê agent.carryingType).

import { TILE_TYPES } from '../../world/tile.js';
import { TILE_SIZE, CARRY_CAPACITY, GATHER_RATE, GATHER_SCORE_WEIGHT } from '../../utils/constants.js';
import { recallNearest } from '../memory.js';
import { getVillage } from '../../world/world.js';
import { isHostileTerritory } from '../../clan/diplomacy.js';
import { moveToward, clearMovement } from '../movement.js';
import { claimTile, isClaimedByOther } from '../../world/claims.js';
import { isTileBlocked } from '../stuck.js';

// Filtro de preferência pro recallNearest: evita tile reservado por outro
// agente (world/claims.js) e tile marcado como sem-saída por travamento
// (agent/stuck.js). NÃO é proibição — se descartar todos os candidatos, o
// recallNearest refaz a busca sem ele.
function avoid(agent, world) {
  return (e) => isClaimedByOther(world, agent, e.tx, e.ty) || isTileBlocked(agent, world, e.tx, e.ty);
}


function isSafeForest(world, agent) {
  return (e) => e.type === TILE_TYPES.FOREST && !isHostileTerritory(world, agent, e.tx, e.ty);
}

export function score(agent, world) {
  if (agent.carrying >= CARRY_CAPACITY) return 0; // só solta a ação com a carga cheia; ver gather.js pro porquê do `>= CARRY_CAPACITY` (não `> 0`)
  const village = getVillage(world, agent.villageId);
  if (!village || village.specialization !== 'wood') return 0; // vila agrícola não colhe madeira
  const known = recallNearest(agent.memory, agent.position, isSafeForest(world, agent), avoid(agent, world), TILE_TYPES.FOREST);
  if (!known) return 0;
  return (village.demand.wood ?? 0) * GATHER_SCORE_WEIGHT;
}

function findGatherTile(agent, world) {
  const entry = recallNearest(agent.memory, agent.position, isSafeForest(world, agent), avoid(agent, world), TILE_TYPES.FOREST);
  if (!entry) return null;
  // Reserva na hora de escolher: é o que impede o próximo agente a decidir de
  // mirar esta mesma árvore.
  claimTile(world, agent, entry.tx, entry.ty);
  return { x: (entry.tx + 0.5) * TILE_SIZE, y: (entry.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  if (!agent.target) {
    agent.target = findGatherTile(agent, world);
    if (!agent.target) return; // nenhuma floresta conhecida; espera a próxima reconsideração
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent, world);
    return;
  }
  if (status !== 'arrived') return;

  agent.carryingType = 'wood';
  agent.carrying = Math.min(CARRY_CAPACITY, agent.carrying + GATHER_RATE * dt);
  if (agent.carrying >= CARRY_CAPACITY) {
    clearMovement(agent, world); // carga cheia; decision.js troca pra "deliver" na próxima reconsideração
  }
}
