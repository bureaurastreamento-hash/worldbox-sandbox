import { createNeeds } from './needs.js';
import { createMemory } from './memory.js';
import { WARRIOR_TYPES } from '../utils/constants.js';

export function createAgent({
  id,
  position,
  villageId = null,
  decisionTimer = 0,
  age = 0,
  warriorType,
  rng,
}) {
  return {
    id,
    position: { x: position.x, y: position.y },
    // 'orc' | 'elfo' | 'cavaleiro' — sprite de combate (render/agentRenderer.js),
    // só aparece durante a ação `fight`. Sorteado se não vier explícito.
    warriorType: warriorType ?? WARRIOR_TYPES[rng.int(0, WARRIOR_TYPES.length - 1)],
    target: null, // alvo de movimento da ação corrente; null = precisa escolher um
    wanderHeading: null, // rumo persistente de wander.js (radianos); null = ainda não sorteado
    path: null, // waypoints até target (agent/movement.js), calculado via pathfinding
    pathTargetKey: null,
    villageId,
    carrying: 0, // unidades de recurso carregadas (gather.js/gatherWood.js/mine.js/deliver.js)
    carryingType: null, // 'food' | 'wood' | um de MINING_RESOURCES — qual recurso está em `carrying`; deliver.js lê pra saber onde entregar
    miningResource: null, // qual minério mine.js está mirando na viagem corrente (persiste entre reconsiderações até entregar)
    buildProgress: 0, // segundos de trabalho acumulados em build.js na construção corrente
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
    deathLinger: 0, // segundos desde a morte; ver DEATH_LINGER_SECONDS e lifecycle.js:pruneDead
    role: 'civilian', // 'civilian' | 'warrior' — emergente pela demanda de defesa, ver clan/clanDecision.js
  };
}
