import { TILE_SIZE } from '../utils/constants.js';

const FORGET_THRESHOLD = 0.05;
const DECAY_PER_SEC = 1 / 120; // esquece um local não revisto em ~2min

export function createMemory() {
  return { locations: new Map() };
}

export function remember(memory, entry) {
  const key = `${entry.tx},${entry.ty}`;
  memory.locations.set(key, { ...entry, confidence: 1 });
}

export function decayMemory(memory, dt) {
  for (const [key, entry] of memory.locations) {
    entry.confidence -= DECAY_PER_SEC * dt;
    if (entry.confidence <= FORGET_THRESHOLD) memory.locations.delete(key);
  }
}

// Local conhecido mais próximo que satisfaz predicate(entry), ou null.
//
// `skip(entry)` é um filtro OPCIONAL e NÃO-OBRIGATÓRIO: serve pra descartar
// tiles reservados por outro agente (world/claims.js) ou marcados como
// bloqueados por travamento (agent/stuck.js). Se ele descartar TODOS os
// candidatos, a busca é refeita ignorando-o — essa segunda passada é o
// fallback que impede uma vila pequena, com poucos tiles conhecidos, de
// travar quando todos já estão reservados. Preferência, não proibição.
export function recallNearest(memory, fromPos, predicate, skip = null) {
  const found = searchNearest(memory, fromPos, predicate, skip);
  if (found || !skip) return found;
  return searchNearest(memory, fromPos, predicate, null);
}

function searchNearest(memory, fromPos, predicate, skip) {
  let best = null;
  let bestDistSq = Infinity;

  for (const entry of memory.locations.values()) {
    if (!predicate(entry)) continue;
    if (skip && skip(entry)) continue;
    const wx = (entry.tx + 0.5) * TILE_SIZE;
    const wy = (entry.ty + 0.5) * TILE_SIZE;
    const distSq = (wx - fromPos.x) ** 2 + (wy - fromPos.y) ** 2;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = entry;
    }
  }
  return best;
}
