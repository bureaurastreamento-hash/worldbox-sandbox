import { TILE_SIZE } from '../utils/constants.js';

const TILE_COLORS = {
  water: '#2a6f97',
  sand: '#d9c27a',
  grass: '#4c9a4c',
  forest: '#2d5e2d',
  mountain: '#8a8a8a',
};

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

  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      const tile = world.tiles[ty][tx];
      const screenPos = camera.worldToScreen(tx * TILE_SIZE, ty * TILE_SIZE, viewW, viewH);
      ctx.fillStyle = TILE_COLORS[tile.type] || '#000';
      ctx.fillRect(screenPos.x, screenPos.y, size + 1, size + 1);
    }
  }
}
