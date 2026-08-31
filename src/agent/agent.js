import { createNeeds } from './needs.js';

export function createAgent({ id, position, decisionTimer = 0 }) {
  return {
    id,
    position: { x: position.x, y: position.y },
    target: null, // alvo de movimento da ação corrente (wander/eat); null = precisa escolher um
    needs: createNeeds(),
    currentAction: null,
    decisionTimer, // jitter por agente para não recalcular todos no mesmo tick
  };
}
