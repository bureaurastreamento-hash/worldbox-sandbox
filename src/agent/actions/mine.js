// Minerar pra vila — mesma estrutura de gather.js/gatherWood.js, mas
// universal: qualquer vila minera qualquer um dos MINING_RESOURCES, sem gate
// de especialização (stone/coal/iron/gold são material de construção, não
// parte do pilar de interdependência food/wood). Um módulo só em vez de 4
// quase-duplicados, já que a única diferença entre eles é qual recurso/tile
// de montanha, não a lógica.

import { TILE_TYPES } from '../../world/tile.js';
import {
  TILE_SIZE,
  CARRY_CAPACITY,
  GATHER_RATE,
  MINE_SCORE_WEIGHT,
  MINING_RESOURCES,
  MINE_MAX_TRAVEL_TILES,
} from '../../utils/constants.js';
import { canDevelop } from '../../village/stock.js';
import { recallNearest } from '../memory.js';
import { recallVillageSite } from '../../village/knowledge.js';
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


function isSafeDeposit(world, agent, resource) {
  return (e) => e.type === TILE_TYPES.MOUNTAIN && e.resource === resource && !isHostileTerritory(world, agent, e.tx, e.ty);
}

// Depósito conhecido: o que o próprio agente viu (memória individual) ou,
// quando ele não conhece nenhum, o que a VILA sabe porque outro morador
// voltou e contou (village/knowledge.js).
//
// A memória individual vem primeiro de propósito: o que o agente viu com os
// próprios olhos é mais perto e mais confiável que uma indicação de terceiro.
// O quadro é o fallback — sem ele, cada morador teria que redescobrir
// sozinho a mesma cordilheira, e a maioria nunca descobria.
function findDeposit(agent, world, village, resource) {
  const own = recallNearest(agent.memory, agent.position, isSafeDeposit(world, agent, resource), avoid(agent, world));
  if (own) return own;

  const told = recallVillageSite(village, resource, agent.position, (s) =>
    isClaimedByOther(world, agent, s.tx, s.ty) || isTileBlocked(agent, world, s.tx, s.ty),
  );
  if (!told) return null;
  if (isHostileTerritory(world, agent, told.tx, told.ty)) return null;

  // O quadro diz ONDE tem minério, não que valha a pena ir. Um depósito a 60
  // tiles é uma viagem de ~2min de tempo simulado por 10 de pedra, com o
  // morador fora da produção de comida o tempo todo — e minério nem é recurso
  // crítico.
  //
  // Isto foi medido como o desestabilizador principal da economia: em 5 seeds
  // de 600s, a população final caía monotonicamente com o número de vilas que
  // tinham descoberto minério (0 vilas -> 50 moradores; 1 -> 47; 2 -> 32; 3 ->
  // 16; 4 -> extinção). O quadro de descobertas não criou o problema, só
  // tornou a mineração possível de verdade pela primeira vez e revelou o custo
  // que ela sempre teria tido.
  const dx = (told.tx + 0.5) * TILE_SIZE - agent.position.x;
  const dy = (told.ty + 0.5) * TILE_SIZE - agent.position.y;
  const maxPx = MINE_MAX_TRAVEL_TILES * TILE_SIZE;
  if (dx * dx + dy * dy > maxPx * maxPx) return null;

  return { tx: told.tx, ty: told.ty, type: TILE_TYPES.MOUNTAIN, resource: told.resource };
}

// Melhor minério pra essa vila agora: o de maior demanda entre os que o
// agente já viu um depósito conhecido — não é sobre desespero (distress),
// minério nunca alimenta isso, só a demanda comum (village/stock.js).
function bestChoice(agent, world, village) {
  let best = null;
  let bestScore = 0;
  for (const resource of MINING_RESOURCES) {
    if (!findDeposit(agent, world, village, resource)) continue;
    const score = (village.demand[resource] ?? 0) * MINE_SCORE_WEIGHT;
    if (score > bestScore) {
      bestScore = score;
      best = resource;
    }
  }
  return best ? { resource: best, score: bestScore } : null;
}

export function score(agent, world) {
  if (agent.carrying >= CARRY_CAPACITY) return 0; // só solta a ação com a carga cheia; ver gather.js pro porquê do `>= CARRY_CAPACITY` (não `> 0`)
  const village = getVillage(world, agent.villageId);
  if (!village) return 0;

  // Só minera com o celeiro num nível mínimo. Minério é material de
  // construção e está fora de CRITICAL_RESOURCES de propósito — não pode
  // custar a sobrevivência de ninguém.
  //
  // Isto era uma falha latente que só apareceu quando o quadro de
  // descobertas (village/knowledge.js) tornou a mineração possível de
  // verdade: a demanda por minério fica quase sempre perto de 1 (o estoque
  // vive vazio), então `mine` pontua ~0.35 de forma constante, enquanto
  // `fish` (0.4 x demanda de comida) só chega perto disso com o celeiro já
  // quase vazio. Numa vila MADEIREIRA, que não produz comida própria e
  // depende de pescar, isso significa minerar passando fome — medido, 678
  // agente-segundos minerando contra 236 pescando, com as duas vilas
  // madeireiras do teste morrendo de fome.
  //
  // A regra mora em village/stock.js:hasFoodSurplus — a mesma que trava
  // explorar e construir, pelo mesmo motivo, declarada num lugar só.
  if (!canDevelop(village, agent)) return 0;

  return bestChoice(agent, world, village)?.score ?? 0;
}

// Montanha não é andável (isWalkable exclui — é barreira, não colhível em
// cima), então o pathfinding nunca alcançaria o próprio tile de depósito
// como destino. Mira o tile andável mais próximo adjacente a ele — minerar
// "da beirada", sem precisar pisar na montanha.
function findDepositTile(agent, world, village, resource) {
  const entry = findDeposit(agent, world, village, resource);
  if (!entry) return null;
  // Reserva o DEPÓSITO (o tile de montanha), não o ponto de aproximação: dois
  // mineradores podem legitimamente ficar em pontos andáveis diferentes ao
  // redor da mesma montanha, mas quem é disputado é o depósito.
  claimTile(world, agent, entry.tx, entry.ty);
  const spot = findWalkableNear(world, entry.tx, entry.ty, 5);
  return { x: (spot.tx + 0.5) * TILE_SIZE, y: (spot.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  if (!agent.target) {
    const choice = bestChoice(agent, world, village);
    if (!choice) return; // nenhum depósito conhecido; espera a próxima reconsideração
    agent.miningResource = choice.resource;
    agent.target = findDepositTile(agent, world, village, choice.resource);
    if (!agent.target) return;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent, world);
    return;
  }
  if (status !== 'arrived') return;

  agent.carryingType = agent.miningResource;
  agent.carrying = Math.min(CARRY_CAPACITY, agent.carrying + GATHER_RATE * dt);
  if (agent.carrying >= CARRY_CAPACITY) {
    clearMovement(agent, world); // carga cheia; decision.js troca pra "deliver" na próxima reconsideração
  }
}
