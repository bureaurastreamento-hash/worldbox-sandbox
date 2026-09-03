import { TILE_SIZE } from '../utils/constants.js';

const FORGET_THRESHOLD = 0.05;
const EMPTY = new Map(); // balde ausente: nada lembrado daquele tipo ainda
const DECAY_PER_SEC = 1 / 120; // esquece um local não revisto em ~2min

export function createMemory() {
  // `byType` é um índice sobre `locations`, não uma segunda fonte de verdade:
  // as duas guardam referência ao MESMO objeto de entrada.
  //
  // Existe porque `recallNearest` sempre filtra por um tipo de tile só (grama,
  // floresta, água, montanha — ver os 7 pontos que o chamam), mas varria a
  // memória inteira. Com ~600 locais lembrados e ~7 chamadas por
  // reconsideração (mine.js sozinho faz 4, uma por minério), isso eram ~4200
  // iterações por agente só pra decidir — o maior custo do tick, medido.
  // Varrer só o balde do tipo certo corta a maior parte disso, porque montanha
  // e água são uma fração pequena do que um agente lembra.
  return { locations: new Map(), byType: new Map() };
}

function bucketFor(memory, type) {
  let bucket = memory.byType.get(type);
  if (!bucket) {
    bucket = new Map();
    memory.byType.set(type, bucket);
  }
  return bucket;
}

export function remember(memory, entry) {
  const key = `${entry.tx},${entry.ty}`;
  const previous = memory.locations.get(key);
  // O tipo de um tile não muda (world/terrain.js nunca reescreve `type`), mas
  // se um dia mudar, deixar a entrada velha no balde antigo criaria um
  // fantasma que só some por decaimento.
  if (previous && previous.type !== entry.type) {
    memory.byType.get(previous.type)?.delete(key);
  }

  const stored = { ...entry, confidence: 1 };
  memory.locations.set(key, stored);
  bucketFor(memory, entry.type).set(key, stored);
}

export function decayMemory(memory, dt) {
  for (const [key, entry] of memory.locations) {
    entry.confidence -= DECAY_PER_SEC * dt;
    if (entry.confidence <= FORGET_THRESHOLD) {
      memory.locations.delete(key);
      memory.byType.get(entry.type)?.delete(key);
    }
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
// `tileType` é uma dica de INDEXAÇÃO, não um filtro semântico: quem passa
// continua responsável pelo `predicate` completo (o tipo é só o que permite
// varrer um balde em vez da memória inteira — ver createMemory). Omitir é
// sempre correto, só mais lento.
export function recallNearest(memory, fromPos, predicate, skip = null, tileType = null) {
  const found = searchNearest(memory, fromPos, predicate, skip, tileType);
  if (found || !skip) return found;
  return searchNearest(memory, fromPos, predicate, null, tileType);
}

function searchNearest(memory, fromPos, predicate, skip, tileType) {
  let best = null;
  let bestDistSq = Infinity;

  const source = tileType === null ? memory.locations : (memory.byType.get(tileType) ?? EMPTY);

  for (const entry of source.values()) {
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
