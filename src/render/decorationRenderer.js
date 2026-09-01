// Placeholder geométrico enquanto não há arte de decoração (árvore/planta/
// casa) — mesmo tratamento visual e camada dos personagens, mas parado e sem
// lógica. Trocar por sprites reais aqui quando a arte chegar, reaproveitando
// `world.decorations` (world/decorations.js) sem mudar o resto do pipeline.

function drawTree(ctx, x, y, size) {
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

function drawPlant(ctx, x, y, size) {
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

const DRAW_BY_TYPE = { tree: drawTree, plant: drawPlant, house: drawHouse };
const BASE_SIZE_BY_TYPE = { tree: 26, plant: 12, house: 30 }; // px de tela em zoom 1

export function drawDecorations(ctx, world, camera) {
  if (!world.decorations?.length) return;

  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const topLeft = camera.screenToWorld(0, 0, viewW, viewH);
  const bottomRight = camera.screenToWorld(viewW, viewH, viewW, viewH);
  const margin = 64;

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
    DRAW_BY_TYPE[deco.type]?.(ctx, pos.x, pos.y, size);
  }
}
