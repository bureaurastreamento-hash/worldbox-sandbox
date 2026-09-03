// Ação de menor prioridade: o que o agente faz quando nenhuma necessidade
// está urgente o bastante para valer a pena (ver decision.js). Escolhe entre
// os tiles atualmente visíveis (agent.perception) — não consulta o mundo
// além do que o agente está vendo agora.
//
// O alvo NÃO é sorteado de forma isotrópica: o agente mantém um rumo
// (`agent.wanderHeading`) que persiste entre alvos e só desvia um pouco a
// cada escolha. Sem isso, wander é um passeio aleatório puro — deslocamento
// cresce com √N, e como a fome puxa todo mundo de volta ao celeiro a cada
// ciclo, o passeio era resetado ao centro da vila antes de sair do lugar. Na
// prática o mapa inteiro além de ~15 tiles da vila era inalcançável. Com o
// rumo persistente o movimento vira balístico e o agente cobre distância de
// verdade, sem nenhum sistema novo.

import { isWalkable } from '../../world/tile.js';
import { TILE_SIZE } from '../../utils/constants.js';
import { isHostileTerritory } from '../../clan/diplomacy.js';
import { moveToward, clearMovement } from '../movement.js';

export const BASE_SCORE = 0.05;

// Desvio máximo do rumo a cada alvo novo. Pequeno o bastante pra a trajetória
// ler como "indo pra algum lado", grande o bastante pra não virar linha reta
// eterna (o que faria todo mundo empilhar na borda do mapa).
const MAX_TURN_RADIANS = 0.7;

// Abaixo disto, o melhor candidato está mal alinhado com o rumo — significa
// obstáculo (lago, cordilheira) na direção pretendida. Em vez de insistir e
// ficar batendo na margem, o agente ADOTA a direção do que sobrou, o que faz
// ele contornar a costa naturalmente em vez de oscilar contra ela.
const REALIGN_DOT = 0.3;

// Quão longe à frente mirar, em tiles. Menor que PERCEPTION_RADIUS de
// propósito: mirar exatamente na borda faria quase todo alvo cair em tiles
// que o agente mal enxerga, onde a amostra de candidatos é rala e a escolha
// vira ruído.
const REACH_TILES = 8;

export function score() {
  return BASE_SCORE;
}

function pickTarget(agent, world) {
  const candidates = agent.perception.tiles.filter(
    (t) => isWalkable(t.type) && !isHostileTerritory(world, agent, t.tx, t.ty),
  );
  if (candidates.length === 0) return null;

  if (agent.wanderHeading === null) {
    agent.wanderHeading = world.rng.next() * Math.PI * 2;
  } else {
    agent.wanderHeading += (world.rng.next() * 2 - 1) * MAX_TURN_RADIANS;
  }

  // Ponto ideal: à frente, na borda do que o agente enxerga. O alvo real é o
  // tile visível mais próximo dele — assim o rumo é respeitado sem exigir que
  // exista um tile exatamente naquele ponto.
  const hx = Math.cos(agent.wanderHeading);
  const hy = Math.sin(agent.wanderHeading);

  let best = null;
  let bestDistSq = Infinity;
  for (const t of candidates) {
    const dx = t.tx + 0.5 - agent.position.x / TILE_SIZE;
    const dy = t.ty + 0.5 - agent.position.y / TILE_SIZE;
    const distSq = (dx - hx * REACH_TILES) ** 2 + (dy - hy * REACH_TILES) ** 2;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = { t, dx, dy };
    }
  }
  if (!best) return null;

  const len = Math.hypot(best.dx, best.dy);
  if (len > 0 && (best.dx * hx + best.dy * hy) / len < REALIGN_DOT) {
    agent.wanderHeading = Math.atan2(best.dy, best.dx); // contorna o obstáculo em vez de insistir contra ele
  }

  return { x: (best.t.tx + 0.5) * TILE_SIZE, y: (best.t.ty + 0.5) * TILE_SIZE };
}

export function step(agent, world, dt) {
  if (!agent.target) {
    agent.target = pickTarget(agent, world);
    if (!agent.target) return;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status !== 'moving') clearMovement(agent, world); // chegou (ou não dá): escolhe outro alvo depois
}
