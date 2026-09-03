// Pré-renderização do terreno em blocos (chunks) offscreen.
//
// O problema que isto resolve: em zoom baixo o mapa inteiro cabe na tela, e
// desenhar tile a tile são ~40 mil `drawImage` por frame — medido em 80ms,
// o gargalo de FPS do jogo desde sempre (ver STATUS.md §6). O terreno é
// ESTÁTICO: tipo, vizinhos e minério nunca mudam depois da geração. Então
// desenhar os mesmos 40 mil tiles 60 vezes por segundo é refazer trabalho
// idêntico. Assado uma vez por bloco, o mesmo frame vira algumas dezenas de
// `drawImage`.
//
// Resolução: o bloco é assado na resolução de AUTORIA da textura (16px por
// tile), não na de tela. Assim a qualidade é idêntica à de antes (a textura
// de 16px já era desenhada esticada pra 32), e a memória fica 4x menor do que
// assar em resolução de tela.

import { SRC } from './tileTextures.js';

export const CHUNK_TILES = 32;
const CHUNK_PX = CHUNK_TILES * SRC; // 512x512 por bloco (~1MB)

// Teto de blocos vivos. No zoom mínimo de um mapa 220x220 cabem 49 blocos,
// então 64 cobre o pior caso com folga; o limite existe pro caso de um mapa
// maior no futuro não estourar a memória de vídeo silenciosamente.
const MAX_CHUNKS = 64;

const chunks = new Map(); // "cx,cy" -> { canvas, lastUsed }
let tick = 0;

export function chunkCountFor(world) {
  return {
    cols: Math.ceil(world.width / CHUNK_TILES),
    rows: Math.ceil(world.height / CHUNK_TILES),
  };
}

// `artOf(tile, tx, ty)` é injetado por tileRenderer.js — é ele que sabe
// resolver (e cachear) a arte de um tile. Este módulo só sabe montar o bloco.
function bakeChunk(world, cx, cy, artOf) {
  const canvas = document.createElement('canvas');
  canvas.width = CHUNK_PX;
  canvas.height = CHUNK_PX;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const tx0 = cx * CHUNK_TILES;
  const ty0 = cy * CHUNK_TILES;

  for (let y = 0; y < CHUNK_TILES; y++) {
    const ty = ty0 + y;
    if (ty >= world.height) break;
    const row = world.tiles[ty];
    for (let x = 0; x < CHUNK_TILES; x++) {
      const tx = tx0 + x;
      if (tx >= world.width) break;
      const art = artOf(row[tx], tx, ty);
      // Água é assada no quadro 0; a animação é desenhada por cima em zoom
      // alto (ver tileRenderer.js) — em zoom baixo ninguém enxerga ondulação
      // de 1px, então não vale 3x de memória pra assar os três quadros.
      const canvasForTile = Array.isArray(art) ? art[0] : art;
      if (canvasForTile) ctx.drawImage(canvasForTile, x * SRC, y * SRC, SRC, SRC);
    }
  }

  return canvas;
}

function evictIfNeeded() {
  if (chunks.size <= MAX_CHUNKS) return;
  let oldestKey = null;
  let oldest = Infinity;
  for (const [key, entry] of chunks) {
    if (entry.lastUsed < oldest) {
      oldest = entry.lastUsed;
      oldestKey = key;
    }
  }
  if (oldestKey) chunks.delete(oldestKey);
}

export function getChunk(world, cx, cy, artOf) {
  const key = `${cx},${cy}`;
  let entry = chunks.get(key);
  if (!entry) {
    entry = { canvas: bakeChunk(world, cx, cy, artOf), lastUsed: 0 };
    chunks.set(key, entry);
    evictIfNeeded();
  }
  entry.lastUsed = ++tick;
  return entry.canvas;
}

// Chamado se o mundo for regerado — sem isso os blocos do mapa antigo
// ficariam em cache e apareceriam no mapa novo.
export function clearChunks() {
  chunks.clear();
}

export function chunkStats() {
  return { chunks: chunks.size, chunkPx: CHUNK_PX };
}
