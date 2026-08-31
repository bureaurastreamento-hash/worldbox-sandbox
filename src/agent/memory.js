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
export function recallNearest(memory, fromPos, predicate) {
  let best = null;
  let bestDistSq = Infinity;

  for (const entry of memory.locations.values()) {
    if (!predicate(entry)) continue;
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
