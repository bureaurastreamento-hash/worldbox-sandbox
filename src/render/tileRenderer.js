// Desenha a camada de terreno. A arte é PROCEDURAL (render/terrain/) — não
// vem de nenhum pack.
//
// Motivo: o terreno estava caindo numa cor chapada por tipo de tile, e nenhum
// dos packs baixados tem tileset no estilo do resto do jogo. O único
// disponível (Kenney roguelike, 16x16) é flat e saturado, exatamente o
// "muito cartoon" que se queria eliminar — usá-lo teria trocado um problema
// por ele mesmo.
//
// Três camadas fazem o mapa parar de parecer tabuleiro, em ordem de impacto:
//   1. transição irregular entre tipos (terrain/edgeMasks.js) — dissolve a
//      grade de quadrados perfeitos, que é o que mais entregava;
//   2. variação por tile (variantes escolhidas por hash da posição) — mata a
//      repetição de papel de parede;
//   3. textura interna com rampa de 5 tons e luz vinda de cima-esquerda —
//      é a variação de VALOR que separa "superfície" de "cor chapada".
//
// DESENHO: o terreno é assado em blocos offscreen (terrain/terrainChunks.js)
// e o frame desenha alguns blocos em vez de dezenas de milhares de tiles.

import { TILE_SIZE } from '../utils/constants.js';
import {
  initTerrainAtlas,
  getTileCanvas,
  edgeMaskFor,
  backgroundTypeFor,
  variantAt,
} from './terrain/terrainAtlas.js';
import { WATER_FRAMES, SRC } from './terrain/tileTextures.js';
import { getChunk, CHUNK_TILES, chunkCountFor } from './terrain/terrainChunks.js';

const WATER_FRAME_MS = 900; // ondulação lenta: é ambiente, não deve chamar atenção

// Abaixo deste zoom a ondulação da água não é desenhada. Um tile ocupa menos
// de ~19px de tela aqui, e a ondulação é um traço de 1px da textura — não é
// perceptível, mas custaria um `drawImage` por tile de água justamente no
// zoom em que existem dezenas de milhares deles na tela. Em zoom alto o
// número de tiles visíveis é pequeno e a animação sai de graça.
const WATER_ANIM_MIN_ZOOM = 0.6;

let ready = false;

// Resolve a arte de um tile UMA VEZ e guarda no próprio tile.
//
// O terreno é estático: tipo, vizinhos e minério nunca mudam depois da
// geração. Sem esse cache, montar o bloco refazia por tile duas varreduras de
// 4 vizinhos e uma string de chave. `_art` guarda o canvas pronto, ou um
// array de quadros no caso da água (o único terreno que anima).
function artFor(tile, tx, ty, world) {
  if (tile._art !== undefined) return tile._art;

  const background = backgroundTypeFor(world, tx, ty, tile.type);
  const mask = edgeMaskFor(world, tx, ty, tile.type);
  const variant = variantAt(tx, ty);
  const ore = tile.resource ?? null;
  const oreVariant = variantAt(tx, ty, 77);

  let art;
  if (tile.type === 'water') {
    art = [];
    for (let f = 0; f < WATER_FRAMES; f++) {
      art.push(getTileCanvas({ type: tile.type, background, mask, variant, frame: f, ore, oreVariant }));
    }
  } else {
    art = getTileCanvas({ type: tile.type, background, mask, variant, frame: 0, ore, oreVariant });
  }

  tile._art = art;
  return art;
}

export function drawTiles(ctx, world, camera) {
  if (!ready) {
    initTerrainAtlas();
    ready = true;
  }

  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;

  const topLeft = camera.screenToWorld(0, 0, viewW, viewH);
  const bottomRight = camera.screenToWorld(viewW, viewH, viewW, viewH);

  const minTx = Math.max(0, Math.floor(topLeft.x / TILE_SIZE) - 1);
  const minTy = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
  const maxTx = Math.min(world.width - 1, Math.ceil(bottomRight.x / TILE_SIZE) + 1);
  const maxTy = Math.min(world.height - 1, Math.ceil(bottomRight.y / TILE_SIZE) + 1);

  ctx.imageSmoothingEnabled = false;

  // --- blocos assados -------------------------------------------------
  const { cols, rows } = chunkCountFor(world);
  const minCx = Math.max(0, Math.floor(minTx / CHUNK_TILES));
  const maxCx = Math.min(cols - 1, Math.floor(maxTx / CHUNK_TILES));
  const minCy = Math.max(0, Math.floor(minTy / CHUNK_TILES));
  const maxCy = Math.min(rows - 1, Math.floor(maxTy / CHUNK_TILES));

  const artOf = (tile, tx, ty) => artFor(tile, tx, ty, world);
  const chunkScreenSize = CHUNK_TILES * TILE_SIZE * camera.zoom;

  for (let cy = minCy; cy <= maxCy; cy++) {
    for (let cx = minCx; cx <= maxCx; cx++) {
      const canvas = getChunk(world, cx, cy, artOf);
      const pos = camera.worldToScreen(cx * CHUNK_TILES * TILE_SIZE, cy * CHUNK_TILES * TILE_SIZE, viewW, viewH);
      // +1 evita costura de subpixel entre blocos em zoom fracionário.
      ctx.drawImage(canvas, pos.x, pos.y, chunkScreenSize + 1, chunkScreenSize + 1);
    }
  }

  // --- ondulação da água, só em zoom alto -----------------------------
  if (camera.zoom < WATER_ANIM_MIN_ZOOM) return;

  const frame = Math.floor(performance.now() / WATER_FRAME_MS) % WATER_FRAMES;
  if (frame === 0) return; // quadro 0 já está assado no bloco

  const size = TILE_SIZE * camera.zoom;
  for (let ty = minTy; ty <= maxTy; ty++) {
    const row = world.tiles[ty];
    for (let tx = minTx; tx <= maxTx; tx++) {
      const tile = row[tx];
      if (tile.type !== 'water') continue;
      const art = artFor(tile, tx, ty, world);
      if (!Array.isArray(art)) continue;
      const pos = camera.worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE, viewW, viewH);
      ctx.drawImage(art[frame], pos.x, pos.y, size + 1, size + 1);
    }
  }
}

export { SRC };
