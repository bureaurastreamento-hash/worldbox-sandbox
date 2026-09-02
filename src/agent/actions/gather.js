// Colher comida pra vila — distinto de eat.js (que satisfaz a fome do
// próprio agente). O score não depende da necessidade do agente, e sim da
// demanda da vila: estoque baixo puxa todo mundo pra colher, sem ninguém
// decidir isso de cima.

import { TILE_TYPES } from '../../world/tile.js';
import { TILE_SIZE, CARRY_CAPACITY, GATHER_RATE, GATHER_SCORE_WEIGHT } from '../../utils/constants.js';
import { recallNearest } from '../memory.js';
import { getVillage } from '../../world/world.js';
import { isHostileTerritory } from '../../clan/diplomacy.js';
import { moveToward, clearMovement } from '../movement.js';

function isSafeGrass(world, agent) {
  return (e) => e.type === TILE_TYPES.GRASS && !isHostileTerritory(world, agent, e.tx, e.ty);
}

export function score(agent, world) {
  // Só solta a ação quando a carga está cheia — commitment real até
  // CARRY_CAPACITY, não a cada fração de unidade colhida (bug real: `> 0`
  // deixava o agente abandonar a colheita assim que carregava qualquer
  // coisa, porque deliver.js pontua fixo 0.8 e esmagava qualquer score
  // parcial de gather; resultado era viagem de ~5-10% da carga em vez de
  // cheia, throughput real bem abaixo do esperado — ver STATUS.md).
  if (agent.carrying >= CARRY_CAPACITY) return 0;
  const village = getVillage(world, agent.villageId);
  if (!village || village.specialization !== 'food') return 0; // vila madeireira não colhe comida
  const known = recallNearest(agent.memory, agent.position, isSafeGrass(world, agent));
  if (!known) return 0;
  return (village.demand.food ?? 0) * GATHER_SCORE_WEIGHT;
}

function findGatherTile(agent, world) {
  const entry = recallNearest(agent.memory, agent.position, isSafeGrass(world, agent));
  if (!entry) return null;
  return { x: (entry.tx + 0.5) * TILE_SIZE, y: (entry.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  if (!agent.target) {
    agent.target = findGatherTile(agent, world);
    if (!agent.target) return; // nada de grama conhecida; espera a próxima reconsideração
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent);
    return;
  }
  if (status !== 'arrived') return;

  agent.carryingType = 'food';
  agent.carrying = Math.min(CARRY_CAPACITY, agent.carrying + GATHER_RATE * dt);
  if (agent.carrying >= CARRY_CAPACITY) {
    clearMovement(agent); // carga cheia; decision.js troca pra "deliver" na próxima reconsideração
  }
}
