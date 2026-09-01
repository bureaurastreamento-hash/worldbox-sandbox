import { TILE_SIZE } from '../utils/constants.js';

const TILE_COLORS = {
  water: '#2a6f97',
  sand: '#d9c27a',
  grass: '#4c9a4c',
  forest: '#2d5e2d',
  mountain: '#8a8a8a',
};

// Tile de montanha era uma cor lisa, sem nenhuma pista visual de qual dos 4
// minérios tem ali — jogador só descobria pelo estoque da vila depois de um
// agente já ter minerado. Ícone pequeno centralizado no tile, mesmo arquivo
// que ui/inspector.js usa pro estoque.
const RESOURCE_SPRITE_DIR = 'assets/Assets-testes-para-o-claude-testar';
const RESOURCE_ICON_FILES = { stone: 'Pedra1', coal: 'Carvao', iron: 'Ferro', gold: 'Ouro' };

const resourceSprites = {}; // resource -> Image
let resourceSpritesReady = 0;
const totalResourceSprites = Object.keys(RESOURCE_ICON_FILES).length;
for (const [resource, file] of Object.entries(RESOURCE_ICON_FILES)) {
  const img = new Image();
  img.src = `${RESOURCE_SPRITE_DIR}/${file}.png`;
  resourceSprites[resource] = img;
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

Object.values(resourceSprites).forEach((img) => {
  img.onload = () => {
    resourceSpriteBounds.set(img, computeContentBounds(img));
    resourceSpritesReady++;
  };
});

// Água era uma cor lisa; os 3 sprites (variações sutis de onda) têm o mesmo
// padding ao redor do conteúdo que os outros sprites do jogo — não são
// textura full-bleed, achado só na primeira tentativa (esticar direto no
// tile inteiro criava um grid preto feio nas bordas). Recortados por alpha
// e desenhados por cima da cor de base, igual ao ícone de minério acima.
// Troca de frame por tempo (mesmo padrão do WALK_FRAME_MS de agentRenderer),
// bem mais lento — é ambiente, não deve chamar atenção.
const WATER_FRAME_MS = 900;
const waterSprites = ['Agua1', 'Agua2', 'Agua3'].map((file) => {
  const img = new Image();
  img.src = `${RESOURCE_SPRITE_DIR}/${file}.png`;
  return img;
});
const waterSpriteBounds = new Map(); // Image -> { x, y, w, h }
let waterSpritesReady = 0;
waterSprites.forEach((img) => {
  img.onload = () => {
    waterSpriteBounds.set(img, computeContentBounds(img));
    waterSpritesReady++;
  };
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
  const resourceSpritesLoaded = resourceSpritesReady === totalResourceSprites;
  const waterSpritesLoaded = waterSpritesReady === waterSprites.length;
  const waterFrame = waterSprites[Math.floor(performance.now() / WATER_FRAME_MS) % waterSprites.length];

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const tile = world.tiles[ty][tx];
      const screenPos = camera.worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE, viewW, viewH);

      ctx.fillStyle = TILE_COLORS[tile.type] || '#000';
      ctx.fillRect(screenPos.x, screenPos.y, size + 1, size + 1);

      if (tile.type === 'water' && waterSpritesLoaded) {
        const bounds = waterSpriteBounds.get(waterFrame);
        const iconH = size * 0.85;
        const iconW = iconH * (bounds.w / bounds.h);
        const cx = screenPos.x + size / 2;
        const cy = screenPos.y + size / 2;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(waterFrame, bounds.x, bounds.y, bounds.w, bounds.h, cx - iconW / 2, cy - iconH / 2, iconW, iconH);
      }

      if (tile.resource && resourceSpritesLoaded) {
        const sprite = resourceSprites[tile.resource];
        const bounds = resourceSpriteBounds.get(sprite);
        const iconH = size * 0.55;
        const iconW = iconH * (bounds.w / bounds.h);
        const cx = screenPos.x + size / 2;
        const cy = screenPos.y + size / 2;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, bounds.x, bounds.y, bounds.w, bounds.h, cx - iconW / 2, cy - iconH / 2, iconW, iconH);
      }
    }
  }
}
