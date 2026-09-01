import { TILE_SIZE } from '../utils/constants.js';

const TILE_COLORS = {
  water: '#2a6f97',
  sand: '#d9c27a',
  grass: '#4c9a4c',
  forest: '#2d5e2d',
  mountain: '#8a8a8a',
};

// Pasta canônica de arte em uso — ver render/agentRenderer.js.
const SPRITE_DIR = 'assets/sprites';

function isSpriteReady(img) {
  return !!img && img.complete && img.naturalWidth > 0;
}

// Água/grama/areia: textura de tile inteiro (kenney_roguelike-rpg-pack),
// desenhada de borda a borda por cima da cor de base — ao contrário dos
// sprites de personagem/decoração, esses vêm de um tileset de verdade, sem
// padding ao redor (conferido pixel a pixel antes de usar: bbox de alpha
// bate exatamente com os 16x16 do arquivo), então não precisam do recorte
// por alpha que o resto do jogo usa. Água anima entre 2 variantes bem
// parecidas, bem devagar — é ambiente, não deve chamar atenção. Floresta e
// montanha ainda não têm textura aprovada, ficam na cor lisa.
const WATER_FRAME_MS = 900;
const TERRAIN_TILE_FILES = {
  water: ['Agua1', 'Agua2'],
  grass: ['Grama'],
  sand: ['Areia'],
};

const terrainSprites = {}; // tileType -> Image[]
for (const [type, files] of Object.entries(TERRAIN_TILE_FILES)) {
  terrainSprites[type] = files.map((file) => {
    const img = new Image();
    img.src = `${SPRITE_DIR}/${file}.png`;
    return img;
  });
}

function terrainSpriteFor(tileType) {
  const frames = terrainSprites[tileType];
  if (!frames) return null;
  if (frames.length === 1) return frames[0];
  return frames[Math.floor(performance.now() / WATER_FRAME_MS) % frames.length];
}

// Tile de montanha era uma cor lisa, sem nenhuma pista visual de qual dos 4
// minérios tem ali — jogador só descobria pelo estoque da vila depois de um
// agente já ter minerado. Ícone pequeno centralizado no tile, mesmo arquivo
// que ui/inspector.js usa pro estoque. Cada recurso é uma lista de
// variantes (hoje sempre 1, estrutura pronta pra mais quando aprovado) —
// escolhida por hash determinístico da posição do tile, mesmo padrão de
// `decorationRenderer.js:pickVariant` pra árvore/planta.
//
// Reorganização visual em andamento (ver STATUS.md): minério ficou sem arte
// nova nesta rodada, de propósito — os arquivos abaixo não existem ainda.
// isSpriteReady() trata isso graciosamente por tile.
const RESOURCE_ICON_FILES = {
  stone: [{ file: 'Pedra1', dir: SPRITE_DIR }],
  coal: [{ file: 'Carvao', dir: SPRITE_DIR }],
  iron: [{ file: 'Ferro', dir: SPRITE_DIR }],
  gold: [{ file: 'Ouro', dir: SPRITE_DIR }],
};

const resourceSprites = {}; // resource -> Image[]
for (const [resource, variants] of Object.entries(RESOURCE_ICON_FILES)) {
  resourceSprites[resource] = variants.map(({ file, dir }) => {
    const img = new Image();
    img.src = `${dir}/${file}.png`;
    return img;
  });
}

// Mesmo hash de `decorationRenderer.js:pickVariant` — determinístico pela
// posição do tile, não consome a sequência de rng do mundo.
function pickResourceVariant(list, tx, ty) {
  const h = Math.abs(Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;
  return list[Math.floor(h * list.length) % list.length];
}

const resourceSpriteBounds = new Map(); // Image -> { x, y, w, h } em px da própria imagem

function computeContentBounds(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 10) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) return { x: 0, y: 0, w: canvas.width, h: canvas.height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

Object.values(resourceSprites).flat().forEach((img) => {
  img.onload = () => resourceSpriteBounds.set(img, computeContentBounds(img));
});

export function drawTiles(ctx, world, camera) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;

  const topLeft = camera.screenToWorld(0, 0, viewW, viewH);
  const bottomRight = camera.screenToWorld(viewW, viewH, viewW, viewH);

  const minTx = Math.max(0, Math.floor(topLeft.x / TILE_SIZE) - 1);
  const minTy = Math.max(0, Math.floor(topLeft.y / TILE_SIZE) - 1);
  const maxTx = Math.min(world.width - 1, Math.ceil(bottomRight.x / TILE_SIZE) + 1);
  const maxTy = Math.min(world.height - 1, Math.ceil(bottomRight.y / TILE_SIZE) + 1);

  const size = TILE_SIZE * camera.zoom;
  ctx.imageSmoothingEnabled = false;

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const tile = world.tiles[ty][tx];
      const screenPos = camera.worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE, viewW, viewH);

      const terrainSprite = terrainSpriteFor(tile.type);
      if (isSpriteReady(terrainSprite)) {
        ctx.drawImage(terrainSprite, screenPos.x, screenPos.y, size + 1, size + 1);
      } else {
        ctx.fillStyle = TILE_COLORS[tile.type] || '#000';
        ctx.fillRect(screenPos.x, screenPos.y, size + 1, size + 1);
      }

      if (tile.resource) {
        const sprite = pickResourceVariant(resourceSprites[tile.resource], tx, ty);
        if (isSpriteReady(sprite)) {
          const bounds = resourceSpriteBounds.get(sprite);
          const iconH = size * 0.55;
          const iconW = iconH * (bounds.w / bounds.h);
          const cx = screenPos.x + size / 2;
          const cy = screenPos.y + size / 2;
          ctx.drawImage(sprite, bounds.x, bounds.y, bounds.w, bounds.h, cx - iconW / 2, cy - iconH / 2, iconW, iconH);
        }
      }
    }
  }
}
