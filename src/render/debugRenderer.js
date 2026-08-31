import { TILE_SIZE, PERCEPTION_RADIUS } from '../utils/constants.js';

export function drawPerceptionRadius(ctx, world, camera) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const radiusWorld = PERCEPTION_RADIUS * TILE_SIZE;

  for (const agent of world.agents) {
    const pos = camera.worldToScreen(agent.position.x, agent.position.y, viewW, viewH);
    const r = radiusWorld * camera.zoom;

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
