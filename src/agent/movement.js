// Movimento compartilhado por todas as ações que andam até um alvo (wander,
// eat, gather, deliver) — calcula o caminho uma vez (via pathfinding.js) e
// segue os waypoints, em vez de andar em linha reta por cima de água/montanha.

import { findPath } from '../world/pathfinding.js';
import { findHierarchicalPath } from '../world/hpaStar.js';
import { distance, lerp, worldToTile } from '../utils/mathUtils.js';
import { AGENT_SPEED, TILE_SIZE, HPA_MIN_DISTANCE_PX } from '../utils/constants.js';
import { releaseClaim } from '../world/claims.js';
import { getFlowField, sampleFlow } from '../world/flowField.js';

const ARRIVE_THRESHOLD = 3;

function keyFor(pos) {
  return `${Math.round(pos.x)},${Math.round(pos.y)}`;
}

// Avança o agente em direção a targetWorldPos por um passo de dt.
// Retorna 'moving' | 'arrived' | 'unreachable'.
// Decide QUAL busca usar. É o único lugar do jogo que sabe que HPA* existe —
// todas as ações continuam chamando `moveToward` sem saber de nada.
//
// Viagem curta usa A* plano: dentro de um raio pequeno ele já é ótimo, e a
// hierarquia só acrescentaria o custo de inserir dois nós temporários no
// grafo pra depois refinar trechos que caberiam numa busca só.
//
// Viagem longa usa HPA*, e cai no A* plano se ele não resolver. Esse fallback
// é o que garante que nada quebre por uma lacuna do grafo abstrato: o
// comportamento observável continua "o agente chega ou o alvo é
// inalcançável", só que muito mais barato no caso comum.
function computePath(world, from, to) {
  if (distance(from, to) < HPA_MIN_DISTANCE_PX) {
    return findPath(world, from, to);
  }

  const start = worldToTile(from.x, from.y, TILE_SIZE);
  const goal = worldToTile(to.x, to.y, TILE_SIZE);
  const hierarchical = findHierarchicalPath(world, start, goal);
  if (hierarchical !== null) return hierarchical;

  return findPath(world, from, to);
}

export function moveToward(agent, world, dt, targetWorldPos) {
  const targetKey = keyFor(targetWorldPos);
  if (agent.pathTargetKey !== targetKey) {
    agent.path = computePath(world, agent.position, targetWorldPos);
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

// Movimento por CAMPO DE FLUXO, para quando muitas unidades vão ao MESMO
// destino (saque hoje; migração e exércitos nas fases seguintes).
//
// A diferença em relação a `moveToward` não é a velocidade do agente, é quem
// paga a busca: aqui existe UMA busca por destino, compartilhada por todo
// mundo que vai pra lá, e cada unidade só lê a direção da célula onde está.
// Com 50 unidades indo ao mesmo lugar, são 50 buscas contra 1.
//
// Efeito colateral valioso: uma unidade empurrada pra fora da rota por
// agent/separation.js não precisa recalcular nada — ela lê a direção nova da
// célula onde caiu. Não existe caminho pra invalidar.
//
// Cai em `moveToward` quando o campo não cobre a célula do agente (ilha sem
// ligação com o destino, por exemplo), pra o comportamento observável
// continuar idêntico.
export function moveTowardShared(agent, world, dt, targetWorldPos) {
  const field = getFlowField(world, targetWorldPos);
  if (!field) return moveToward(agent, world, dt, targetWorldPos);

  const tx = Math.floor(agent.position.x / TILE_SIZE);
  const ty = Math.floor(agent.position.y / TILE_SIZE);
  const flow = sampleFlow(field, tx, ty);
  if (!flow) return moveToward(agent, world, dt, targetWorldPos);

  // Perto do destino o campo perde resolução (um tile inteiro aponta pro
  // mesmo lugar), então o trecho final é feito no ponto exato.
  if (flow.arrived || distance(agent.position, targetWorldPos) <= TILE_SIZE) {
    return moveToward(agent, world, dt, targetWorldPos);
  }

  const step = AGENT_SPEED * dt;
  agent.position.x += flow.dx * step;
  agent.position.y += flow.dy * step;
  return 'moving';
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
