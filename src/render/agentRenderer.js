export function drawAgents(ctx, world, camera) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;

  for (const agent of world.agents) {
    const pos = camera.worldToScreen(agent.position.x, agent.position.y, viewW, viewH);
    const radius = Math.max(3, 5 * camera.zoom);

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdd55';
    ctx.fill();
    ctx.strokeStyle = '#402c00';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
