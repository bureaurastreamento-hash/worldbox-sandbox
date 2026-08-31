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

  if (!agent.currentAction) {
    agent.currentAction = highestScoring(scores);
    agent.target = null;
    return;
  }

  const currentScore = scores[agent.currentAction];
  let challenger = null;

  for (const type of Object.keys(scores)) {
    if (type === agent.currentAction) continue;
    const margin = type === 'wander' ? 0 : INTERRUPT_MARGIN;
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
