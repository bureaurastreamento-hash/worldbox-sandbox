import { urgency, applyEffect } from '../needs.js';

const RESTORE_PER_SEC = 100 / 20;

export function score(agent) {
  return urgency(agent.needs.sleep);
}

// Fatia 2: dorme onde estiver, sem se deslocar até um abrigo (isso entra
// quando existir vila/casa).
export function step(agent, world, dt) {
  applyEffect(agent.needs, 'sleep', RESTORE_PER_SEC * dt);
}
