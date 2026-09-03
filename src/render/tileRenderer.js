// Desenha a camada de terreno. A arte é PROCEDURAL (render/terrain/) — não
// vem de nenhum pack.
//
// Motivo: o terreno estava caindo numa cor chapada por tipo de tile, e nenhum
// dos packs baixados tem tileset no estilo do resto do jogo. O único
// disponível (Kenney roguelike, 16x16) é flat e saturado, exatamente o
// "muito cartoon" que se queria eliminar — usá-lo teria trocado um problema
// por ele mesmo. Gerar dá controle total sobre paleta e direção de luz, e o
// custo por frame é idêntico ao de antes: um `drawImage` por tile, com toda
// a geração acontecendo no carregamento (ver terrain/terrainAtlas.js).
//
// Três camadas fazem o mapa parar de parecer tabuleiro, em ordem de impacto:
//   1. transição irregular entre tipos diferentes (terrain/edgeMasks.js) —
//      dissolve a grade de quadrados perfeitos, que é o que mais entregava;
//   2. variação por tile (4 variantes escolhidas por hash da posição) — mata
//      a repetição de papel de parede;
//   3. textura interna com rampa de 5 tons e luz vinda de cima-esquerda —
//      é a variação de VALOR que separa "superfície" de "cor chapada".

import { TILE_SIZE } from '../utils/constants.js';
import {
  initTerrainAtlas,
  getTileCanvas,
  edgeMaskFor,
  backgroundTypeFor,
  variantAt,
} from './terrain/terrainAtlas.js';
import { WATER_FRAMES } from './terrain/tileTextures.js';

const WATER_FRAME_MS = 900; // ondulação lenta: é ambiente, não deve chamar atenção

// Cor de emergência caso algo dê errado na geração — nunca deve aparecer.
const FALLBACK_COLORS = {
  water: '#33596f',
  sand: '#c2ab86',
  grass: '#617947',
  forest: '#33472c',
  mountain: '#6c7076',
};

let ready = false;

// Resolve a arte de um tile UMA VEZ e guarda no próprio tile.
//
// O terreno é estático: tipo, vizinhos e minério nunca mudam depois da
// geração. Sem esse cache, cada frame refazia por tile duas varreduras de 4
// vizinhos e montava uma string de chave pro cache do atlas — com ~40 mil
// tiles visíveis em zoom baixo, isso é dezenas de milhares de alocações de
// string por frame, num laço que o STATUS.md já registrava como o gargalo de
// FPS do jogo. Resolvido por tile, o custo por frame volta a ser um
// `drawImage` e nada mais.
//
// `_art` guarda o canvas pronto, ou um array de quadros no caso da água (o
// único terreno que anima).
function artFor(world, tx, ty, tile) {
  const background = backgroundTypeFor(world, tx, ty, tile.type);
  const mask = edgeMaskFor(world, tx, ty, tile.type);
  const variant = variantAt(tx, ty);
  const ore = tile.resource ?? null;
  const oreVariant = variantAt(tx, ty, 77);

  if (tile.type === 'water') {
    const frames = [];
    for (let f = 0; f < WATER_FRAMES; f++) {
      frames.push(getTileCanvas({ type: tile.type, background, mask, variant, frame: f, ore, oreVariant }));
    }
    return frames;
  }

  return getTileCanvas({ type: tile.type, background, mask, variant, frame: 0, ore, oreVariant });
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

  const size = TILE_SIZE * camera.zoom;
  const frame = Math.floor(performance.now() / WATER_FRAME_MS) % WATER_FRAMES;
  ctx.imageSmoothingEnabled = false;

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const tile = world.tiles[ty][tx];
      const screenPos = camera.worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE, viewW, viewH);

      let art = tile._art;
      if (art === undefined) {
        art = artFor(world, tx, ty, tile);
        tile._art = art;
      }
      const canvas = Array.isArray(art) ? art[frame] : art;

      if (canvas) {
        // +1 no tamanho evita a costura de subpixel entre tiles vizinhos em
        // zoom fracionário (o mesmo truque que a versão anterior já usava).
        ctx.drawImage(canvas, screenPos.x, screenPos.y, size + 1, size + 1);
      } else {
        ctx.fillStyle = FALLBACK_COLORS[tile.type] || '#000';
        ctx.fillRect(screenPos.x, screenPos.y, size + 1, size + 1);
      }
    }
  }
}
