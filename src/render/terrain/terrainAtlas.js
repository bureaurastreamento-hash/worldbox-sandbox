// Compõe o tile final (fundo + tipo por cima com borda irregular + minério)
// e guarda em cache. É a única coisa que o render por frame consulta: um
// `drawImage` por tile, exatamente o mesmo custo do desenho de cor chapada
// que existia antes — todo o trabalho de pixel acontece no carregamento e,
// depois, uma vez por combinação nova.
//
// A chave do cache é (tipo, tipoDeFundo, máscara de borda, variante, quadro).
// O produto cartesiano completo seria grande, mas só as combinações que
// existem de fato no mapa chegam a ser construídas — um mapa sem praia nunca
// gera transição grama/areia.

import { hash2 } from './noise.js';
import { TERRAIN_PRIORITY } from './palette.js';
import { buildTerrainTextures, SRC, VARIANTS, WATER_FRAMES } from './tileTextures.js';
import { buildOreTextures } from './oreTextures.js';
import { getEdgeMasks, SIDE } from './edgeMasks.js';

let textures = null;
let ores = null;
const cache = new Map();

export function initTerrainAtlas() {
  if (!textures) {
    textures = buildTerrainTextures();
    ores = buildOreTextures();
    getEdgeMasks();
  }
  return textures;
}

// Variante determinística por posição — mesmo padrão de hash que
// decorationRenderer.js usa pra espécie de árvore, sem consumir a rng do
// mundo. Sem isso, todo tile de grama do mapa seria idêntico e a repetição
// apareceria como padrão de papel de parede.
export function variantAt(tx, ty, salt = 0) {
  return Math.floor(hash2(tx, ty, 1013 + salt) * VARIANTS) % VARIANTS;
}

function baseCanvas(type, variant, frame) {
  const list = textures[type];
  if (!list) return null;
  if (type === 'water') return list[variant][frame % WATER_FRAMES];
  return list[variant];
}

// Máscara de quais lados fazem fronteira com terreno de prioridade MENOR.
export function edgeMaskFor(world, tx, ty, type) {
  const mine = TERRAIN_PRIORITY[type] ?? 0;
  let mask = 0;
  const check = (x, y, bit) => {
    const row = world.tiles[y];
    const neighbour = row && row[x];
    // Fora do mapa não gera transição: a borda do mundo já é oceano.
    if (!neighbour) return;
    if ((TERRAIN_PRIORITY[neighbour.type] ?? 0) < mine) mask |= bit;
  };
  check(tx, ty - 1, SIDE.N);
  check(tx + 1, ty, SIDE.E);
  check(tx, ty + 1, SIDE.S);
  check(tx - 1, ty, SIDE.W);
  return mask;
}

// Tipo de fundo: o vizinho de menor prioridade entre os 4 ortogonais. É ele
// que aparece na mordida da borda.
export function backgroundTypeFor(world, tx, ty, type) {
  const mine = TERRAIN_PRIORITY[type] ?? 0;
  let best = null;
  let bestPriority = mine;
  const check = (x, y) => {
    const row = world.tiles[y];
    const neighbour = row && row[x];
    if (!neighbour) return;
    const p = TERRAIN_PRIORITY[neighbour.type] ?? 0;
    if (p < bestPriority) {
      bestPriority = p;
      best = neighbour.type;
    }
  };
  check(tx, ty - 1);
  check(tx + 1, ty);
  check(tx, ty + 1);
  check(tx - 1, ty);
  return best;
}

// Canvas final pronto pra desenhar. `ore` é opcional e só se aplica a rocha.
export function getTileCanvas({ type, background, mask, variant, frame = 0, ore = null, oreVariant = 0 }) {
  const key = `${type}|${background ?? '-'}|${mask}|${variant}|${type === 'water' ? frame % WATER_FRAMES : 0}|${ore ?? '-'}|${oreVariant}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const base = baseCanvas(type, variant, frame);
  if (!base) return null;

  // Sem vizinho mais baixo e sem minério, o tile É a textura base — não
  // precisa compor nem ocupar espaço no cache com uma cópia.
  if (!background || mask === 0) {
    if (!ore) {
      cache.set(key, base);
      return base;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = SRC;
  canvas.height = SRC;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  if (background && mask !== 0) {
    // Fundo inteiro, e por cima o tipo deste tile recortado pela máscara.
    const bg = baseCanvas(background, variantAt(mask * 7 + variant, variant, 5), frame);
    if (bg) ctx.drawImage(bg, 0, 0);

    const cut = document.createElement('canvas');
    cut.width = SRC;
    cut.height = SRC;
    const cutCtx = cut.getContext('2d');
    cutCtx.drawImage(base, 0, 0);
    cutCtx.globalCompositeOperation = 'destination-in';
    cutCtx.drawImage(getEdgeMasks()[mask], 0, 0);
    ctx.drawImage(cut, 0, 0);
  } else {
    ctx.drawImage(base, 0, 0);
  }

  if (ore && ores[ore]) ctx.drawImage(ores[ore][oreVariant % VARIANTS], 0, 0);

  cache.set(key, canvas);
  return canvas;
}

export function atlasStats() {
  return { cacheSize: cache.size };
}
