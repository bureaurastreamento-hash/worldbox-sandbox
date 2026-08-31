// Sprite provisório do amigo do usuário — ver memória do projeto: isto vai
// ser substituído aos poucos, então o resto do código não deve depender de
// nada específico dessa imagem além de "é um retrato de corpo inteiro".
const sprite = new Image();
let spriteLoaded = false;
sprite.onload = () => {
  spriteLoaded = true;
};
sprite.src = 'assets/sprites/human.png';

const RADIUS_BY_STAGE = { child: 5, adult: 8, elder: 8 }; // fallback enquanto o sprite carrega
const HEIGHT_BY_STAGE = { child: 26, adult: 38, elder: 38 }; // px de tela em zoom 1

export function drawAgents(ctx, world, camera, selectedAgentId) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;

  for (const agent of world.agents) {
    const pos = camera.worldToScreen(agent.position.x, agent.position.y, viewW, viewH);

    if (agent.id === selectedAgentId) {
      const ringR = Math.max(10, 16 * camera.zoom);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (spriteLoaded) {
      const h = (HEIGHT_BY_STAGE[agent.lifeStage] ?? 20) * camera.zoom;
      const w = h * (sprite.naturalWidth / sprite.naturalHeight);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, pos.x - w / 2, pos.y - h, w, h);
    } else {
      const radius = Math.max(2, (RADIUS_BY_STAGE[agent.lifeStage] ?? 5) * camera.zoom);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffdd55';
      ctx.fill();
      ctx.strokeStyle = '#402c00';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}
