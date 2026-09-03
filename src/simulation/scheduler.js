// Escalonamento temporal da COGNIÇÃO (time-slicing).
//
// Substitui o LOD de simulação por viewport que existia antes
// (`simulation/lod.js`, removido). Aquele desenho tinha um problema de
// fundo: o zoom da câmera decidia quem existia de verdade. Um agente fora
// da tela parava de andar, parava de decidir, e a vila dele era simulada por
// aproximação agregada — então navegar o mapa MUDAVA o resultado do jogo, e
// metade do mundo vivia num modo de faz-de-conta. Agora todo agente é
// simulado a plena fidelidade o tempo todo, independentemente da câmera.
//
// O que torna isso pagável é separar o que é CARO do que é BARATO por frame:
//
//   - Caro (percepção, memória, pontuar ~15 ações): só quando o agente
//     reconsidera, a cada RECONSIDER_INTERVAL de tempo SIMULADO.
//   - Barato (decaimento de needs, envelhecer, executar um passo da ação
//     corrente, checar travamento): todo frame, pra todo mundo.
//
// A percepção era o desperdício principal: ela varria ~450 tiles por agente
// POR FRAME, mesmo o agente só usando esse resultado uma vez a cada 0.5s. Ela
// agora acontece junto da decisão, que é o momento em que faz sentido
// conceitualmente também — o agente olha em volta quando vai decidir.
//
// A fatia é derivada do relógio SIMULADO, não do número do frame. Isso é
// deliberado: com fatias por frame, rodar em 4x faria cada agente reconsiderar
// 4x menos em tempo de jogo, e o comportamento mudaria com a velocidade. Como
// `decisionTimer` já nasce com jitter (main.js e lifecycle.js), as fases se
// distribuem sozinhas e nenhum frame concentra todo mundo.

import { RECONSIDER_INTERVAL, MAX_COGNITION_FRACTION } from '../utils/constants.js';

// Teto de quantos agentes podem pensar no mesmo frame. O jitter já espalha as
// fases naturalmente, então isto é uma válvula de segurança contra picos
// (uma leva grande de nascimentos, ou um `dt` grande depois de um engasgo) —
// não o mecanismo principal. Quem passar do teto fica com o timer negativo e
// entra na frente no frame seguinte, porque está mais atrasado.
//
// O teto ACOMPANHA O `dt`, e isso não é detalhe: a fração de agentes que fica
// devida num frame é `dt / RECONSIDER_INTERVAL`. Com dt de 1/60s isso é ~3%,
// bem abaixo dos 15% — mas em 4x de velocidade, ou num frame que demorou, a
// demanda real passa do teto fixo e a dívida se acumula frame após frame.
// O efeito seria o pior tipo de bug: os agentes pensariam menos quanto mais
// rápido o jogo rodasse, ou seja o COMPORTAMENTO mudaria com o framerate e
// com o multiplicador de velocidade. A margem de 1.5x cobre a variação de
// fase entre agentes sem deixar o teto virar o mecanismo de escalonamento.
export function createCognitionBudget(agentCount, dt) {
  const expected = (agentCount * dt * 1.5) / RECONSIDER_INTERVAL;
  const floor = agentCount * MAX_COGNITION_FRACTION;
  return { remaining: Math.max(1, Math.ceil(Math.max(expected, floor))) };
}

// O agente deve fazer o ciclo caro (percepção + memória + decisão) agora?
// Sempre avança o relógio, mesmo quando devolve false — `timeSinceCognition`
// é o dt acumulado que o decaimento de memória precisa receber pra não
// depender da frequência de chamada.
export function dueForCognition(agent, dt, budget) {
  agent.decisionTimer -= dt;
  agent.timeSinceCognition += dt;

  if (agent.decisionTimer > 0) return false;
  if (budget.remaining <= 0) return false; // fica devendo; volta primeiro no próximo frame

  budget.remaining--;
  agent.decisionTimer += RECONSIDER_INTERVAL;
  return true;
}
