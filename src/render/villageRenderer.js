import { TILE_SIZE } from '../utils/constants.js';

function relationColors(village) {
  const hostile = Object.values(village.relations).includes('hostile');
  return hostile
    ? { fill: 'rgba(201, 67, 43, 0.15)', stroke: 'rgba(201, 67, 43, 0.5)' }
    : { fill: 'rgba(90, 140, 200, 0.12)', stroke: 'rgba(90, 140, 200, 0.45)' };
}

export function drawTerritories(ctx, world, camera) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;

  for (const village of world.villages) {
    const pos = camera.worldToScreen(village.center.x, village.center.y, viewW, viewH);
    const r = village.territory.radius * TILE_SIZE * camera.zoom;
    const { fill, stroke } = relationColors(village);

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function drawVillages(ctx, world, camera) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;

  for (const village of world.villages) {
    const pos = camera.worldToScreen(village.center.x, village.center.y, viewW, viewH);
    const size = Math.max(6, 10 * camera.zoom);

    ctx.fillStyle = '#c9432b';
    ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
    ctx.strokeStyle = '#5c1a0e';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x - size / 2, pos.y - size / 2, size, size);

    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const food = Math.round(village.stock.food ?? 0);
    const cap = village.capacity.food ?? 0;
    const hostile = Object.values(village.relations).includes('hostile');
    const suffix = hostile ? ' · hostil' : '';
    ctx.fillText(`${village.name} — 🌾 ${food}/${cap}${suffix}`, pos.x, pos.y - size / 2 - 4);
  }
}
