import { drawTiles } from './tileRenderer.js';
import { drawTerritories, drawVillages, drawBuildings } from './villageRenderer.js';
import { drawDecorations } from './decorationRenderer.js';
import { drawPredators } from './predatorRenderer.js';
import { drawAgents } from './agentRenderer.js';
import { drawPerceptionRadius } from './debugRenderer.js';
import { updateParticles, drawParticles } from './particles.js';
import { drawLighting } from './lighting.js';

export function createRenderer(canvas, camera) {
  const ctx = canvas.getContext('2d');

  return {
    render(world, debugState, selectedAgentId, selectedVillageId, realDt = 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTiles(ctx, world, camera);
      drawTerritories(ctx, world, camera);
      drawVillages(ctx, world, camera, selectedVillageId);
      drawBuildings(ctx, world, camera);
      drawDecorations(ctx, world, camera);
      drawPredators(ctx, world, camera);
      drawAgents(ctx, world, camera, selectedAgentId);

      updateParticles(realDt);
      drawParticles(ctx, camera, canvas.width, canvas.height);

      if (debugState?.showPerception) drawPerceptionRadius(ctx, world, camera);

      drawLighting(ctx, world, canvas.width, canvas.height);
    },
  };
}
