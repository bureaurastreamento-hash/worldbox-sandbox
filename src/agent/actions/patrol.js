// Patrulha: o que um guerreiro designado faz quando não há nada melhor a
// fazer — anda o perímetro do território da vila em vez de vagar sem rumo.
//
// O score fica logo acima de `wander` e abaixo de qualquer trabalho real, e
// isso é o desenho inteiro: patrulhar NÃO tira ninguém da economia, só
// substitui o ócio. Um guerreiro continua colhendo, entregando e construindo
// como qualquer um — a diferença aparece quando ele não tem o que fazer, que
// antes era o momento em que ele passeava aleatoriamente igual a um civil.
//
// Efeito colateral pretendido, e o motivo real de existir: andando o
// perímetro, o guerreiro CRUZA com o que se aproxima da vila. Como
// fightPredator.js exige role === 'warrior' e só reage a predador percebido,
// uma guarnição que fica parada no centro nunca percebe nada. A patrulha é o
// que transforma "existe um soldado na vila" em "a vila é defendida".

import { TILE_SIZE, TERRITORY_RADIUS, PATROL_SCORE, PATROL_RADIUS_FRACTION } from '../../utils/constants.js';
import { getVillage, findWalkableNear } from '../../world/world.js';
import { canDevelop } from '../../village/stock.js';
import { moveToward, clearMovement } from '../movement.js';

export function score(agent, world) {
  if (agent.role !== 'warrior') return 0;
  if (agent.carrying > 0) return 0; // entrega o que está carregando primeiro
  const village = getVillage(world, agent.villageId);
  if (!village) return 0;
  // Mesma trava das ações de desenvolvimento (village/stock.js:hasFoodSurplus):
  // rondar também não produz comida, e numa vila com o celeiro baixo o
  // guerreiro tem mais o que fazer. É o que faz a guarnição ir pra roça
  // quando aperta, em vez de desfilar enquanto a vila passa fome.
  if (!canDevelop(village, agent)) return 0;
  return PATROL_SCORE;
}

// Próximo posto: um ponto no anel do território, em ângulo sorteado. Sem
// rota fixa de propósito — uma ronda com ordem fixa vira decorativa e
// previsível, e o ponto é cobrir o perímetro ao longo do tempo, não desenhar
// um circuito.
function pickPost(agent, world, village) {
  const angle = world.rng.next() * Math.PI * 2;
  const radius = TERRITORY_RADIUS * PATROL_RADIUS_FRACTION;
  const tx = Math.round(village.center.x / TILE_SIZE + Math.cos(angle) * radius);
  const ty = Math.round(village.center.y / TILE_SIZE + Math.sin(angle) * radius);
  const spot = findWalkableNear(world, tx, ty, 6);
  if (!spot) return null;
  return { x: (spot.tx + 0.5) * TILE_SIZE, y: (spot.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  if (!agent.target) {
    agent.target = pickPost(agent, world, village);
    if (!agent.target) return;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status !== 'moving') clearMovement(agent, world); // chegou (ou não dá): escolhe outro posto
}
