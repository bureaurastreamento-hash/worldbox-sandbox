// Pescar comida em tile de água — universal (qualquer vila, sem gate de
// especialização), mesmo padrão de mine.js: água não é andável
// (world/tile.js:isWalkable), então o alvo é o tile andável mais próximo
// adjacente à água, não o próprio tile de água. Produz 'food', reaproveita
// o mesmo carryingType/pathway de gather.js — só a origem do recurso muda.
// Pensado pra atenuar (não substituir) a dependência de comércio de uma
// vila madeireira, que hoje não tem nenhuma forma direta de produzir
// comida: peso mais baixo que GATHER_SCORE_WEIGHT, ver FISH_SCORE_WEIGHT
// em utils/constants.js.

import { TILE_TYPES } from '../../world/tile.js';
import { TILE_SIZE, CARRY_CAPACITY, GATHER_RATE, FISH_SCORE_WEIGHT } from '../../utils/constants.js';
import { recallNearest } from '../memory.js';
import { getVillage, findWalkableNear } from '../../world/world.js';
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


function isSafeWater(world, agent) {
  return (e) => e.type === TILE_TYPES.WATER && !isHostileTerritory(world, agent, e.tx, e.ty);
}

export function score(agent, world) {
  if (agent.carrying >= CARRY_CAPACITY) return 0; // só solta a ação com a carga cheia; ver gather.js pro porquê do `>= CARRY_CAPACITY` (não `> 0`)
  const village = getVillage(world, agent.villageId);
  if (!village) return 0;
  const known = recallNearest(agent.memory, agent.position, isSafeWater(world, agent), avoid(agent, world), TILE_TYPES.WATER);
  if (!known) return 0;
  return (village.demand.food ?? 0) * FISH_SCORE_WEIGHT;
}

function findFishTile(agent, world) {
  const entry = recallNearest(agent.memory, agent.position, isSafeWater(world, agent), avoid(agent, world), TILE_TYPES.WATER);
  if (!entry) return null;
  // Reserva o tile de ÁGUA, não o ponto de pesca na margem: dois pescadores
  // podem ficar em margens diferentes, mas o pesqueiro é o disputado.
  claimTile(world, agent, entry.tx, entry.ty);
  const spot = findWalkableNear(world, entry.tx, entry.ty, 5);
  return { x: (spot.tx + 0.5) * TILE_SIZE, y: (spot.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  if (!agent.target) {
    agent.target = findFishTile(agent, world);
    if (!agent.target) return; // nenhuma água conhecida; espera a próxima reconsideração
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent, world);
    return;
  }
  if (status !== 'arrived') return;

  agent.carryingType = 'food';
  agent.carrying = Math.min(CARRY_CAPACITY, agent.carrying + GATHER_RATE * dt);
  if (agent.carrying >= CARRY_CAPACITY) {
    clearMovement(agent, world); // carga cheia; decision.js troca pra "deliver" na próxima reconsideração
  }
}
