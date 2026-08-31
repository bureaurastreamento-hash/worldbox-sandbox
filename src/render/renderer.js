import { drawTiles } from './tileRenderer.js';
import { drawAgents } from './agentRenderer.js';

export function createRenderer(canvas, camera) {
  const ctx = canvas.getContext('2d');

  return {
    render(world) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTiles(ctx, world, camera);
      drawAgents(ctx, world, camera);
    },
  };
}
