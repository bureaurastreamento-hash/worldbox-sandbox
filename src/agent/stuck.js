// Detecção de travamento por falta de progresso.
//
// O que já existia: `movement.js` devolve 'unreachable' quando o pathfinding
// falha, e todas as ações que andam tratam isso. O que NÃO existia: qualquer
// mecanismo pra perceber que o agente parou de progredir sem que o
// pathfinding tenha reclamado.
//
// O buraco concreto: as ações re-escolhem o alvo com `recallNearest`, que é
// deterministicamente o MAIS PRÓXIMO — o mesmo de antes. Como o `score` não
// olha alcançabilidade, a ação continua vencendo, e o ciclo vira
// "escolhe → falha → limpa → escolhe o mesmo". A única saída era o
// decaimento de memória (~114s), que **nem sempre chega**: se o alvo estiver
// dentro do raio de percepção, `scanPerception` restaura a confiança pra 1
// todo tick e o agente nunca esquece — trava pra sempre.
//
// Medição antes desta correção: `unreachable` disparou ZERO vezes em 390s
// simulados com 63 agentes, então a incidência real é baixíssima. Isto é
// seguro preventivo, não conserto de fogo — a diferença entre "raro" e
// "impossível".

import { TILE_SIZE } from '../utils/constants.js';
import { claimKey } from '../world/claims.js';
import { clearMovement } from './movement.js';

// Tempo parado sem NENHUM progresso até desistir do alvo.
//
// Calibrado contra a ação legítima mais longa que fica parada: colher uma
// carga cheia leva CARRY_CAPACITY/GATHER_RATE = 8s. Mas colher faz `carrying`
// subir todo tick, e comer/dormir fazem a necessidade subir, e construir faz
// `buildProgress` subir — todos contam como progresso abaixo. Ou seja,
// nenhuma ação legítima fica 6s sem mover NENHUM desses contadores, e o
// limiar não precisa acomodar a duração delas, só o ruído.
const STUCK_SECONDS = 6;

// Quanto tempo um tile fica marcado como sem-saída pra esse agente. Longo o
// bastante pra ele escolher outro alvo e sair do lugar, curto o bastante pra
// não descartar pra sempre um recurso que só estava temporariamente
// bloqueado (por uma aglomeração, por exemplo).
const BLOCK_SECONDS = 30;

const MOVE_EPSILON = 0.5; // px de mundo

export function createStuckState() {
  return { noProgressFor: 0, lastX: null, lastY: null, lastCarrying: 0, lastBuild: 0, lastHunger: 0, lastSleep: 0 };
}

function ensureState(agent) {
  if (!agent.stuck) agent.stuck = createStuckState();
  return agent.stuck;
}

// Marca um tile como sem-saída pra este agente, com validade. Fica na memória
// dele (não no mundo): o tile pode estar perfeitamente acessível pra outro
// morador vindo de outra direção.
export function blockTile(agent, world, tx, ty) {
  if (!agent.memory.blocked) agent.memory.blocked = new Map();
  agent.memory.blocked.set(claimKey(tx, ty), (world.elapsedSeconds ?? 0) + BLOCK_SECONDS);
}

export function isTileBlocked(agent, world, tx, ty) {
  const until = agent.memory.blocked?.get(claimKey(tx, ty));
  if (until === undefined) return false;
  if ((world.elapsedSeconds ?? 0) >= until) {
    agent.memory.blocked.delete(claimKey(tx, ty));
    return false;
  }
  return true;
}

// Chamada uma vez por agente ativo por tick, em main.js, DEPOIS da ação —
// pra medir o resultado do passo que acabou de rodar.
export function updateStuck(agent, world, dt) {
  const s = ensureState(agent);

  const carrying = agent.carrying ?? 0;
  const build = agent.buildProgress ?? 0;
  const hunger = agent.needs?.hunger ?? 0;
  const sleep = agent.needs?.sleep ?? 0;

  const moved =
    s.lastX === null ||
    Math.abs(agent.position.x - s.lastX) > MOVE_EPSILON ||
    Math.abs(agent.position.y - s.lastY) > MOVE_EPSILON;

  // Qualquer um destes subindo é trabalho acontecendo. Sem contá-los, o timer
  // dispararia em falso positivo justamente em quem está colhendo, comendo,
  // dormindo ou construindo direito — que é o normal de ficar parado.
  const progressed =
    moved || carrying > s.lastCarrying || build > s.lastBuild || hunger > s.lastHunger || sleep > s.lastSleep;

  s.lastX = agent.position.x;
  s.lastY = agent.position.y;
  s.lastCarrying = carrying;
  s.lastBuild = build;
  s.lastHunger = hunger;
  s.lastSleep = sleep;

  if (progressed) {
    s.noProgressFor = 0;
    return false;
  }

  s.noProgressFor += dt;
  if (s.noProgressFor < STUCK_SECONDS) return false;

  // Travado: marca o alvo como sem-saída e larga tudo. A próxima
  // reconsideração escolhe outra coisa — e `recallNearest` vai pular este
  // tile enquanto a marca durar.
  if (agent.target) {
    blockTile(agent, world, Math.floor(agent.target.x / TILE_SIZE), Math.floor(agent.target.y / TILE_SIZE));
  }
  clearMovement(agent, world);
  agent.buildProgress = 0;
  s.noProgressFor = 0;
  return true;
}
