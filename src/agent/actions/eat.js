// Fatia 2: sem sistema de recursos ainda (isso é fatia 4+/economia), então
// "comer" busca o tile de grama conhecido mais próximo e recupera fome nele.
// Fatia 3: "conhecido" agora é agent.memory, não o mundo inteiro — se o
// agente nunca viu grama por perto, essa ação não tem candidata (score cai
// a zero mesmo com fome alta, e ele precisa vagar até avistar uma).

import { TILE_TYPES } from '../../world/tile.js';
import { TILE_SIZE } from '../../utils/constants.js';
import { urgency, applyEffect } from '../needs.js';
import { recallNearest } from '../memory.js';
import { isHostileTerritory } from '../../clan/diplomacy.js';
import { moveToward, clearMovement } from '../movement.js';

const RESTORE_PER_SEC = 100 / 15;

function isSafeGrass(world, agent) {
  return (e) => e.type === TILE_TYPES.GRASS && !isHostileTerritory(world, agent, e.tx, e.ty);
}

export function score(agent, world) {
  const known = recallNearest(agent.memory, agent.position, isSafeGrass(world, agent));
  if (!known) return 0;
  return urgency(agent.needs.hunger);
}

function findFoodTile(agent, world) {
  const entry = recallNearest(agent.memory, agent.position, isSafeGrass(world, agent));
  if (!entry) return null;
  return { x: (entry.tx + 0.5) * TILE_SIZE, y: (entry.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  if (!agent.target) {
    agent.target = findFoodTile(agent, world);
    if (!agent.target) return; // nenhuma grama conhecida; espera a próxima reconsideração
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent);
    return;
  }
  if (status === 'arrived') {
    applyEffect(agent.needs, 'hunger', RESTORE_PER_SEC * dt);
  }
}
