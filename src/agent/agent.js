import { createNeeds } from './needs.js';
import { createMemory } from './memory.js';

export function createAgent({ id, position, villageId = null, decisionTimer = 0 }) {
  return {
    id,
    position: { x: position.x, y: position.y },
    target: null, // alvo de movimento da ação corrente; null = precisa escolher um
    villageId,
    carrying: 0, // unidades de recurso carregadas (gather.js/deliver.js)
    needs: createNeeds(),
    perception: { tiles: [] }, // o que está visível agora (perception.js reescreve a cada tick)
    memory: createMemory(), // o que já foi visto, com confiança decrescente
    currentAction: null,
    decisionTimer, // jitter por agente para não recalcular todos no mesmo tick
  };
}
