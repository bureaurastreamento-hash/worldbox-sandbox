// Geração procedural por ruído de valor (value noise) em camadas, sem
// dependências externas. A mesma seed sempre gera o mesmo terreno.

import { createRng } from '../utils/rng.js';
import { TILE_TYPES, createTile } from './tile.js';

const NOISE_SCALE = 18; // tiles por "feature" de terreno
const OCTAVES = 4;

const WATER_MAX = 0.32;
const GRASS_MAX = 0.55;
const FOREST_MAX = 0.75;

function hash2D(x, y, seed) {
  let h = x * 374761393 + y * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 100000) / 100000;
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);

  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x1, y0, seed);
  const n01 = hash2D(x0, y1, seed);
  const n11 = hash2D(x1, y1, seed);

  const ix0 = lerp(n00, n10, sx);
  const ix1 = lerp(n01, n11, sx);
  return lerp(ix0, ix1, sy);
}

function fractalNoise(x, y, seed) {
  let total = 0;
  let freq = 1;
  let amp = 1;
  let maxAmp = 0;
  for (let o = 0; o < OCTAVES; o++) {
    total += valueNoise(x * freq, y * freq, seed + o * 1013) * amp;
    maxAmp += amp;
    freq *= 2;
    amp *= 0.5;
  }
  return total / maxAmp;
}

function elevationToType(elevation) {
  if (elevation < WATER_MAX) return TILE_TYPES.WATER;
  if (elevation < GRASS_MAX) return TILE_TYPES.GRASS;
  if (elevation < FOREST_MAX) return TILE_TYPES.FOREST;
  return TILE_TYPES.MOUNTAIN;
}

export function generateTerrain({ seed, width, height }) {
  const rng = createRng(seed);
  const noiseSeed = Math.floor(rng.next() * 1e9);

  const tiles = [];
  for (let ty = 0; ty < height; ty++) {
    const row = [];
    for (let tx = 0; tx < width; tx++) {
      const elevation = fractalNoise(tx / NOISE_SCALE, ty / NOISE_SCALE, noiseSeed);
      row.push(createTile(elevationToType(elevation)));
    }
    tiles.push(row);
  }
  return tiles;
}
