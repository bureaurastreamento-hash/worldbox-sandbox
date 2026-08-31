const RADIUS_BY_STAGE = { child: 3, adult: 5, elder: 5 };

export function drawAgents(ctx, world, camera) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;

  for (const agent of world.agents) {
    const pos = camera.worldToScreen(agent.position.x, agent.position.y, viewW, viewH);
    const base = RADIUS_BY_STAGE[agent.lifeStage] ?? 5;
    const radius = Math.max(2, base * camera.zoom);

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = agent.lifeStage === 'elder' ? '#c9b25a' : '#ffdd55';
    ctx.fill();
    ctx.strokeStyle = '#402c00';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
