import { drawTiles } from './tileRenderer.js';
import { drawTerritories, drawVillages, drawBuildings } from './villageRenderer.js';
import { drawDecorations } from './decorationRenderer.js';
import { drawPredators } from './predatorRenderer.js';
import { drawAgents } from './agentRenderer.js';
import { drawPerceptionRadius } from './debugRenderer.js';
import { updateParticles, drawParticles } from './particles.js';
import { drawLighting } from './lighting.js';
import { LOD, lodForZoom, drawEntityDots } from './lodRenderer.js';

export function createRenderer(canvas, camera) {
  const ctx = canvas.getContext('2d');

  return {
    render(world, debugState, selectedAgentId, selectedVillageId, realDt = 0) {
      const lod = lodForZoom(camera.zoom);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawTiles(ctx, world, camera);
      drawTerritories(ctx, world, camera);
      drawVillages(ctx, world, camera, selectedVillageId);
      drawBuildings(ctx, world, camera);

      // Decoração é o volume maior do mapa (árvore/planta/casa espalhadas) e
      // some primeiro: em zoom aberto ela vira ruído de 1px que o terreno já
      // sugere pela cor.
      if (lod === LOD.FULL) drawDecorations(ctx, world, camera);

      if (lod === LOD.DOTS) {
        // Um retângulo por entidade, agrupado por cor de clã. As posições são
        // as mesmas da simulação — o que muda é só a forma de desenhar.
        drawEntityDots(ctx, world, camera, canvas.width, canvas.height);
      } else {
        drawPredators(ctx, world, camera);
        drawAgents(ctx, world, camera, selectedAgentId);
      }

      // Partículas continuam sendo atualizadas sempre (são estado visual com
      // tempo próprio), mas em zoom aberto não são desenhadas: cada uma
      // renderiza como sub-pixel.
      updateParticles(realDt);
      if (lod === LOD.FULL) drawParticles(ctx, camera, canvas.width, canvas.height);

      if (debugState?.showPerception) drawPerceptionRadius(ctx, world, camera);

      drawLighting(ctx, world, canvas.width, canvas.height);
    },
  };
}
