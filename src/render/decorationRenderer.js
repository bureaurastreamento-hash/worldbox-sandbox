// Árvore e planta usam a arte real (assets/Assets-testes-para-o-claude-testar/)
// — casa continua no placeholder geométrico, a leva de arte não trouxe
// sprite de casa. `world.decorations` (world/decorations.js) não muda: cada
// entrada só tem { type, x, y }, então a variante de espécie (árvore comum/
// pinheiro/palmeira, arbusto liso/com fruta) é escolhida na hora do desenho,
// determinística pela posição — mesma decoração sempre cai na mesma variante
// entre frames, sem precisar guardar isso nos dados.

const SPRITE_DIR = 'assets/Assets-testes-para-o-claude-testar';

const TREE_FILES = ['ArvoreComum', 'Pinheiro', 'Palmeira'];
const PLANT_FILES = ['Arbusto', 'ArbustoComida'];
const VARIANTS_BY_TYPE = { tree: TREE_FILES, plant: PLANT_FILES };

const sprites = {}; // filename -> Image
let totalSprites = 0;
for (const file of [...TREE_FILES, ...PLANT_FILES]) {
  const img = new Image();
  img.src = `${SPRITE_DIR}/${file}.png`;
  sprites[file] = img;
  totalSprites++;
}

const spriteBounds = new Map(); // Image -> { x, y, w, h } em px da própria imagem
let spritesReady = 0;

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

Object.values(sprites).forEach((img) => {
  img.onload = () => {
    spriteBounds.set(img, computeContentBounds(img));
    spritesReady++;
  };
});

// Hash determinístico pela posição de mundo — não é rng consumida de lugar
// nenhum, só distribui as variantes entre as decorações de forma estável.
function pickVariant(list, x, y) {
  const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  return list[Math.floor(h * list.length) % list.length];
}

// Placeholders geométricos: casa não tem sprite na leva de arte (fica assim
// pra sempre); árvore/planta caem aqui só enquanto os sprites carregam, pra
// não deixar o mapa vazio nos primeiros frames.
function drawTreePlaceholder(ctx, x, y, size) {
  ctx.fillStyle = '#3b7a3b';
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x - size * 0.6, y);
  ctx.lineTo(x + size * 0.6, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(x - size * 0.08, y, size * 0.16, size * 0.3);
}

function drawPlantPlaceholder(ctx, x, y, size) {
  ctx.fillStyle = '#5fae5f';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawHouse(ctx, x, y, size) {
  ctx.fillStyle = '#c8a366';
  ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size * 0.5);
  ctx.fillStyle = '#8a4b3b';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.6, y - size * 0.5);
  ctx.lineTo(x, y - size * 0.95);
  ctx.lineTo(x + size * 0.6, y - size * 0.5);
  ctx.closePath();
  ctx.fill();
}

const PLACEHOLDER_BY_TYPE = { tree: drawTreePlaceholder, plant: drawPlantPlaceholder };
const BASE_SIZE_BY_TYPE = { tree: 26, plant: 12, house: 30 }; // px de tela em zoom 1

export function drawDecorations(ctx, world, camera) {
  if (!world.decorations?.length) return;

  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const topLeft = camera.screenToWorld(0, 0, viewW, viewH);
  const bottomRight = camera.screenToWorld(viewW, viewH, viewW, viewH);
  const margin = 64;
  const spritesLoaded = spritesReady === totalSprites;

  for (const deco of world.decorations) {
    if (
      deco.x < topLeft.x - margin ||
      deco.x > bottomRight.x + margin ||
      deco.y < topLeft.y - margin ||
      deco.y > bottomRight.y + margin
    ) {
      continue;
    }

    const pos = camera.worldToScreen(deco.x, deco.y, viewW, viewH);
    const size = (BASE_SIZE_BY_TYPE[deco.type] ?? 16) * camera.zoom;

    if (deco.type === 'house') {
      drawHouse(ctx, pos.x, pos.y, size);
      continue;
    }

    const variants = VARIANTS_BY_TYPE[deco.type];
    if (!variants || !spritesLoaded) {
      PLACEHOLDER_BY_TYPE[deco.type]?.(ctx, pos.x, pos.y, size);
      continue;
    }

    const sprite = sprites[pickVariant(variants, deco.x, deco.y)];
    const bounds = spriteBounds.get(sprite);
    const h = size;
    const w = h * (bounds.w / bounds.h);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, bounds.x, bounds.y, bounds.w, bounds.h, pos.x - w / 2, pos.y - h, w, h);
  }
}
