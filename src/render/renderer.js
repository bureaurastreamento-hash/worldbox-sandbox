import { drawTiles } from './tileRenderer.js';
import { drawTerritories, drawVillages } from './villageRenderer.js';
import { drawAgents } from './agentRenderer.js';
import { drawPerceptionRadius } from './debugRenderer.js';

export function createRenderer(canvas, camera) {
  const ctx = canvas.getContext('2d');

  return {
    render(world, debugState) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTiles(ctx, world, camera);
      drawTerritories(ctx, world, camera);
      drawVillages(ctx, world, camera);
      drawAgents(ctx, world, camera);
      if (debugState?.showPerception) drawPerceptionRadius(ctx, world, camera);
    },
  };
}
