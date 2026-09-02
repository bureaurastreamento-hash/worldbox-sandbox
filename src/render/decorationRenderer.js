// Árvore e planta usam arte real do kenney_roguelike-rpg-pack (mesma fonte
// da água/grama/areia, ver render/tileRenderer.js — mantém o traço
// consistente no mapa inteiro). A leva anterior (ArvoreComum/Pinheiro/
// Palmeira/Arbusto/ArbustoComida) foi substituída durante a reorganização
// visual em andamento (ver STATUS.md): `ArvoreComum`/`Pinheiro` são os
// mesmos nomes de arquivo de antes por coincidência de conceito, mas o
// conteúdo é novo; `Palmeira` virou `ArvoreAzulada` (o pack não tinha
// silhueta de palmeira, só uma variante de cor) e `ArbustoComida` virou
// `Sebe` (não achamos arbusto com fruta, só uma 2ª silhueta de planta).
// `world.decorations` (world/decorations.js) não muda: cada entrada só tem
// { type, x, y }, então a variante de espécie é escolhida na hora do
// desenho, determinística pela posição — mesma decoração sempre cai na
// mesma variante entre frames, sem precisar guardar isso nos dados.

// Pasta canônica de arte em uso — ver render/agentRenderer.js.
const SPRITE_DIR = 'assets/sprites';

const TREE_FILES = ['ArvoreComum', 'Pinheiro', 'ArvoreAzulada'];
const PLANT_FILES = ['Arbusto', 'Sebe'];
// Fogueira/baú (`SuperRetroWorld_CharacterPack_Full`) — decoração nova,
// sem mecânica nenhuma associada (baú não é loot de verdade hoje).
const CAMPFIRE_FILES = ['Fogueira'];
const CHEST_FILES = ['Bau'];
const VARIANTS_BY_TYPE = {
  tree: TREE_FILES,
  plant: PLANT_FILES,
  campfire: CAMPFIRE_FILES,
  chest: CHEST_FILES,
};
// A fauna (que já foi decoração parada aqui) virou predador de verdade — ver
// render/predatorRenderer.js. Não existe mais como tipo de decoração aqui.

const sprites = {}; // filename -> Image
for (const file of [...TREE_FILES, ...PLANT_FILES, ...CAMPFIRE_FILES, ...CHEST_FILES]) {
  const img = new Image();
  img.src = `${SPRITE_DIR}/${file}.png`;
  sprites[file] = img;
}

// Casa: sem sprite único disponível (o pack só tem casa em peças pra montar
// construções maiores) — telhado + parede empilhados, mesma estrutura de 2
// formas que o placeholder geométrico já usava (drawHousePlaceholder
// abaixo), só que com pixel art de verdade em vez de cor lisa. Full-bleed
// como água/grama/areia, sem padding — não precisa de recorte por alpha.
const HOUSE_ROOF_FILE = 'CasaTelhado';
const HOUSE_WALL_FILE = 'CasaParede';
const houseRoofSprite = new Image();
houseRoofSprite.src = `${SPRITE_DIR}/${HOUSE_ROOF_FILE}.png`;
const houseWallSprite = new Image();
houseWallSprite.src = `${SPRITE_DIR}/${HOUSE_WALL_FILE}.png`;

const spriteBounds = new Map(); // Image -> { x, y, w, h } em px da própria imagem

// Ver o mesmo helper em render/agentRenderer.js: cada decoração cai no
// placeholder individualmente se a variante dela especificamente não
// carregou, em vez de travar TODAS as decorações no placeholder até que
// 100% dos arquivos existam — importante durante a reorganização visual em
// andamento, onde árvore pode ficar pronta antes de planta (ou vice-versa).
function isSpriteReady(img) {
  return !!img && img.complete && img.naturalWidth > 0;
}

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
  img.onload = () => spriteBounds.set(img, computeContentBounds(img));
});

// Hash determinístico pela posição de mundo — não é rng consumida de lugar
// nenhum, só distribui as variantes entre as decorações de forma estável.
function pickVariant(list, x, y) {
  const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
  return list[Math.floor(h * list.length) % list.length];
}

// Placeholders geométricos: árvore/planta/casa caem aqui enquanto o sprite
// real não carregou (ou não existe ainda) — não deixa o mapa vazio.
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

function drawHousePlaceholder(ctx, x, y, size) {
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

// Telhado + parede empilhados, cada um esticado pro próprio tile (16x16
// nativo, full-bleed) — mesma proporção 1:2 (altura:largura dobrada) que o
// placeholder geométrico já usava.
function drawHouseSprite(ctx, x, y, size) {
  const half = size / 2;
  ctx.drawImage(houseWallSprite, x - half, y - half, size, half);
  ctx.drawImage(houseRoofSprite, x - half, y - size, size, half);
}

// Brilho pulsante atrás da fogueira — `performance.now()` (não `world.
// elapsedSeconds`) de propósito: é feedback visual de ambiente, deve
// continuar pulsando mesmo com o jogo pausado, mesmo espírito do easing de
// câmera (render/camera.js:tick usa tempo real, não o simulado).
const GLOW_PULSE_MS = 900;
function drawCampfireGlow(ctx, x, y, size) {
  const pulse = (Math.sin(performance.now() / GLOW_PULSE_MS) + 1) / 2; // 0..1
  const radius = size * (0.9 + pulse * 0.25);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255, 160, 60, ${0.35 + pulse * 0.15})`);
  gradient.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Sombra elipse translúcida — mesmo padrão de render/agentRenderer.js.
function drawShadow(ctx, x, y, width) {
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, width / 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.fill();
}
const SHADOW_BY_TYPE = { tree: true, house: true }; // planta/fogueira/baú são baixos demais pra render valer a pena

const PLACEHOLDER_BY_TYPE = {
  tree: drawTreePlaceholder,
  plant: drawPlantPlaceholder,
  campfire: drawPlantPlaceholder,
  chest: drawPlantPlaceholder,
};
const BASE_SIZE_BY_TYPE = { tree: 26, plant: 12, house: 30, campfire: 14, chest: 16 }; // px de tela em zoom 1

export function drawDecorations(ctx, world, camera) {
  if (!world.decorations?.length) return;

  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const topLeft = camera.screenToWorld(0, 0, viewW, viewH);
  const bottomRight = camera.screenToWorld(viewW, viewH, viewW, viewH);
  const margin = 64;
  ctx.imageSmoothingEnabled = false;

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

    if (SHADOW_BY_TYPE[deco.type]) drawShadow(ctx, pos.x, pos.y, size * 0.7);

    if (deco.type === 'campfire') drawCampfireGlow(ctx, pos.x, pos.y, size);

    if (deco.type === 'house') {
      if (isSpriteReady(houseRoofSprite) && isSpriteReady(houseWallSprite)) {
        drawHouseSprite(ctx, pos.x, pos.y, size);
      } else {
        drawHousePlaceholder(ctx, pos.x, pos.y, size);
      }
      continue;
    }

    const variants = VARIANTS_BY_TYPE[deco.type];
    const sprite = variants ? sprites[pickVariant(variants, deco.x, deco.y)] : null;
    const bounds = isSpriteReady(sprite) ? spriteBounds.get(sprite) : null;
    if (!bounds) {
      PLACEHOLDER_BY_TYPE[deco.type]?.(ctx, pos.x, pos.y, size);
      continue;
    }

    const h = size;
    const w = h * (bounds.w / bounds.h);
    ctx.drawImage(sprite, bounds.x, bounds.y, bounds.w, bounds.h, pos.x - w / 2, pos.y - h, w, h);
  }
}
