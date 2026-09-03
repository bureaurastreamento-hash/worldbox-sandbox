// Decisão do agente: coleta os neurônios que podem disparar, escolhe um, e
// troca a ação corrente se valer a pena.
//
// A pontuação contínua continua sendo a mesma de sempre (cada ação em
// agent/actions/* sabe se pontuar a partir da necessidade do agente e da
// demanda da vila) — ela virou o PESO do neurônio. O que este arquivo ganhou
// foi a camada de agent/neuron.js: faixas de prioridade, limiar de ativação e
// escolha com ruído.
//
// A REGRA DE INTERRUPÇÃO agora tem dois casos, e a distinção é o coração da
// mudança:
//
//   - Faixa MAIS ALTA que a atual interrompe na hora, sem margem. É o que faz
//     um agente faminto largar a machadaria: antes fome e madeira eram só dois
//     números competindo, e madeira podia ganhar.
//   - Mesma faixa exige a margem de sempre, pra não trocar de ação por ruído
//     de score — o comportamento anti-flip-flop que já existia continua
//     valendo dentro da faixa.

import { ACTION_TYPES } from './actions/actionTypes.js';
import { collectActive, selectNeuron, priorityOf } from './neuron.js';

const INTERRUPT_MARGIN = 0.15;

// Reutilizado entre reconsiderações: este objeto é só um snapshot pra
// ui/inspector.js, e alocar um por agente por reconsideração é lixo por frame
// à toa. Cada agente guarda o SEU (agent.lastScores), então precisa ser um
// objeto novo por agente — mas só na primeira vez.
function scoresFor(agent) {
  if (!agent.lastScores) agent.lastScores = {};
  for (const id of Object.keys(ACTION_TYPES)) agent.lastScores[id] = 0;
  return agent.lastScores;
}

// Reavalia as candidatas e possivelmente troca a ação corrente. É a parte
// CARA do ciclo, e por isso quem decide QUANDO ela roda é o escalonador
// (simulation/scheduler.js), não este módulo.
export function reconsider(agent, world) {
  const active = collectActive(agent, world, scoresFor(agent));

  const chosen = selectNeuron(active, world.rng);
  if (!chosen) {
    // Nenhum neurônio pôde disparar (nem `wander`, que só falha se o agente
    // não enxerga nenhum tile andável). Mantém a ação atual em vez de zerar:
    // zerar faria o agente parar de vez até a próxima reconsideração.
    return;
  }

  if (!agent.currentAction) {
    agent.currentAction = chosen.id;
    agent.target = null;
    return;
  }

  if (chosen.id === agent.currentAction) return;

  const currentWeightNow = active.find((n) => n.id === agent.currentAction)?.weight ?? 0;
  const currentPriority = priorityOf(agent, agent.currentAction, currentWeightNow);
  if (chosen.priority > currentPriority) {
    // Urgência maior não negocia.
    agent.currentAction = chosen.id;
    agent.target = null;
    return;
  }
  if (chosen.priority < currentPriority) return; // não desce de faixa no meio de algo urgente

  // Mesma faixa: só troca se superar a atual pela margem. `wander` é isento
  // por ser o fallback — qualquer coisa real deve conseguir reclamar a vez
  // assim que ele deixar de valer a pena, sem esperar a necessidade zerar.
  const currentWeight = currentWeightNow;
  const margin = agent.currentAction === 'wander' ? 0 : INTERRUPT_MARGIN;
  if (chosen.weight > currentWeight + margin) {
    agent.currentAction = chosen.id;
    agent.target = null;
  }
}

// Executa um passo da ação já escolhida. É a parte BARATA, e roda todo frame
// pra todo agente vivo — é o que faz o movimento continuar suave mesmo nos
// frames em que o agente não reconsidera nada.
export function stepAction(agent, world, dt) {
  const action = ACTION_TYPES[agent.currentAction];
  if (action) action.step(agent, world, dt);
}
