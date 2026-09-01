import { createNeeds } from './needs.js';
import { createMemory } from './memory.js';

export function createAgent({
  id,
  position,
  villageId = null,
  decisionTimer = 0,
  age = 0,
  skinTone = 'light',
  gender = 'man',
}) {
  return {
    id,
    position: { x: position.x, y: position.y },
    skinTone, // 'light' | 'dark' — escolhe o sprite (agentRenderer.js)
    gender, // 'man' | 'woman' — escolhe o sprite (agentRenderer.js)
    target: null, // alvo de movimento da ação corrente; null = precisa escolher um
    path: null, // waypoints até target (agent/movement.js), calculado via pathfinding
    pathTargetKey: null,
    villageId,
    carrying: 0, // unidades de recurso carregadas (gather.js/gatherWood.js/deliver.js)
    carryingType: null, // 'food' | 'wood' — qual recurso está em `carrying`; deliver.js lê pra saber onde entregar
    needs: createNeeds(),
    perception: { tiles: [], agents: [] }, // o que está visível agora (perception.js reescreve a cada tick)
    memory: createMemory(), // o que já foi visto, com confiança decrescente
    currentAction: null,
    lastScores: null, // snapshot dos scores da última reconsideração (decision.js), pra ui/inspector.js
    decisionTimer, // jitter por agente para não recalcular todos no mesmo tick
    age,
    lifeStage: 'child', // corrigido pelo primeiro ageAgent() do tick, ver lifecycle.js
    alive: true,
    health: 100,
  };
}
