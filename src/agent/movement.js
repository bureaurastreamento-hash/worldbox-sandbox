// Movimento compartilhado por todas as ações que andam até um alvo (wander,
// eat, gather, deliver) — calcula o caminho uma vez (via pathfinding.js) e
// segue os waypoints, em vez de andar em linha reta por cima de água/montanha.

import { findPath } from '../world/pathfinding.js';
import { distance, lerp } from '../utils/mathUtils.js';
import { AGENT_SPEED } from '../utils/constants.js';
import { releaseClaim } from '../world/claims.js';

const ARRIVE_THRESHOLD = 3;

function keyFor(pos) {
  return `${Math.round(pos.x)},${Math.round(pos.y)}`;
}

// Avança o agente em direção a targetWorldPos por um passo de dt.
// Retorna 'moving' | 'arrived' | 'unreachable'.
export function moveToward(agent, world, dt, targetWorldPos) {
  const targetKey = keyFor(targetWorldPos);
  if (agent.pathTargetKey !== targetKey) {
    agent.path = findPath(world, agent.position, targetWorldPos);
    agent.pathTargetKey = targetKey;
  }

  if (agent.path === null) return 'unreachable';

  // Sem waypoints restantes (mesmo tile do alvo, ou já consumidos todos):
  // anda direto pro ponto exato — sem risco de cruzar obstáculo, é o mesmo tile.
  const waypoint = agent.path.length > 0 ? agent.path[0] : targetWorldPos;
  const d = distance(agent.position, waypoint);
  const move = AGENT_SPEED * dt;

  if (move >= d) {
    agent.position.x = waypoint.x;
    agent.position.y = waypoint.y;
    if (agent.path.length > 0) agent.path.shift();
  } else {
    const t = move / d;
    agent.position.x = lerp(agent.position.x, waypoint.x, t);
    agent.position.y = lerp(agent.position.y, waypoint.y, t);
  }

  if (agent.path.length > 0) return 'moving';
  return distance(agent.position, targetWorldPos) <= ARRIVE_THRESHOLD ? 'arrived' : 'moving';
}

// `world` é opcional só por compatibilidade com os pontos de chamada que não
// o têm à mão; quando vem, a reserva de tile do agente é liberada junto —
// largar o alvo sem liberar deixaria o tile bloqueado pros outros pra sempre.
export function clearMovement(agent, world = null) {
  agent.target = null;
  agent.path = null;
  agent.pathTargetKey = null;
  if (world) releaseClaim(world, agent);
}
