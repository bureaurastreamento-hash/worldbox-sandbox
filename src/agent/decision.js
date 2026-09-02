// Utility AI: a cada intervalo de reconsideração, pontua todas as ações
// candidatas e troca a ação corrente se alguma superar a atual por uma
// margem (evita flip-flop por ruído mínimo de score). Wander é isento da
// margem: é o fallback, então qualquer necessidade real deve conseguir
// reclamar a vez assim que deixar de valer a pena (score < baseline de
// wander), sem precisar "esvaziar" a necessidade até zero.

import { ACTION_TYPES } from './actions/actionTypes.js';
import { BASE_SCORE as WANDER_BASE_SCORE } from './actions/wander.js';

const RECONSIDER_INTERVAL = 0.5;
const INTERRUPT_MARGIN = 0.15;

function highestScoring(scores) {
  let best = null;
  for (const type of Object.keys(scores)) {
    if (best === null || scores[type] > scores[best]) best = type;
  }
  return best;
}

function reconsider(agent, world) {
  const scores = {};
  for (const type of Object.keys(ACTION_TYPES)) {
    scores[type] = ACTION_TYPES[type].score(agent, world);
  }
  agent.lastScores = scores; // snapshot pra UI de inspeção (ui/inspector.js), não usado pela decisão em si

  if (!agent.currentAction) {
    agent.currentAction = highestScoring(scores);
    agent.target = null;
    return;
  }

  const currentScore = scores[agent.currentAction];
  // Isento de margem quando a ação ATUAL é wander (o fallback) — qualquer
  // necessidade real deve conseguir reclamar a vez assim que wander deixar
  // de valer a pena, sem esperar "esvaziar" a necessidade até zero. Bug
  // real corrigido aqui: checava `type` (a candidata) em vez de
  // `agent.currentAction` (a atual) — o oposto do que este comentário (e o
  // do topo do arquivo) sempre descreveu. Na prática, sair de wander pra
  // qualquer ação real sempre pagava a margem inteira, e qualquer ação real
  // podia ser roubada de volta por wander sem pagar margem nenhuma — risco
  // de oscilação sempre que um score real cai perto do baseline de wander
  // (0.05), sem precisar do bug do carrying pra acontecer.
  const margin = agent.currentAction === 'wander' ? 0 : INTERRUPT_MARGIN;
  let challenger = null;

  for (const type of Object.keys(scores)) {
    if (type === agent.currentAction) continue;
    if (scores[type] > currentScore + margin && (!challenger || scores[type] > scores[challenger])) {
      challenger = type;
    }
  }

  if (challenger) {
    agent.currentAction = challenger;
    agent.target = null;
  }
}

export function updateDecision(agent, world, dt) {
  agent.decisionTimer -= dt;
  if (agent.decisionTimer <= 0) {
    agent.decisionTimer += RECONSIDER_INTERVAL;
    reconsider(agent, world);
  }

  const action = ACTION_TYPES[agent.currentAction];
  if (action) action.step(agent, world, dt);
}
