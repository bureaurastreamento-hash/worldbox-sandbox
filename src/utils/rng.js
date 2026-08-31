// PRNG determinístico (mulberry32) a partir de uma seed string ou numérica.
// Mesma seed -> mesma sequência sempre, em qualquer navegador.

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

export function createRng(seed) {
  let state = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));

  function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function range(min, max) {
    return min + next() * (max - min);
  }

  function int(min, max) {
    return Math.floor(range(min, max + 1));
  }

  // Sorteia uma chave de { chave: peso, ... } proporcionalmente ao peso.
  function weighted(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = next() * total;
    for (const [key, w] of entries) {
      if (roll < w) return key;
      roll -= w;
    }
    return entries[entries.length - 1][0];
  }

  return { next, range, int, weighted };
}
