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
    ctx.fillText(`🌾 ${food}/${cap}`, pos.x, pos.y - size / 2 - 4);
  }
}
