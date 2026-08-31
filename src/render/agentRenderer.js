// Sprites provisórios do amigo do usuário — ver memória do projeto: isto vai
// ser substituído aos poucos. Human1 = parado, Human2 = passo de andar;
// alterna 1/2 enquanto o agente se move de verdade, fica em 1 parado.
//
// As duas imagens são telas grandes (1200x1200) com bastante espaço vazio
// ao redor do personagem, e o conteúdo não fica no mesmo lugar/tamanho
// relativo nas duas — por isso o recorte do conteúdo real é calculado a
// partir do canal alpha na hora de carregar, em vez de fixar coordenadas no
// código (isso sobrevive à próxima troca de arte sem precisar mexer aqui).
const FRAME_PATHS = ['assets/sprites/Human1.png', 'assets/sprites/Human2.png'];
const sprites = FRAME_PATHS.map((path) => {
  const img = new Image();
  img.src = path;
  return img;
});
const spriteBounds = new Map(); // Image -> { x, y, w, h } em px da própria imagem
let spritesReady = 0;

function computeContentBounds(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * 4 + 3] > 10) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) return { x: 0, y: 0, w: canvas.width, h: canvas.height };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

sprites.forEach((img) => {
  img.onload = () => {
    spriteBounds.set(img, computeContentBounds(img));
    spritesReady++;
  };
});

const WALK_FRAME_MS = 220; // troca de perna a cada tanto tempo, só enquanto anda
const MOVE_EPSILON_SQ = 0.05 * 0.05; // px; abaixo disso conta como parado

const RADIUS_BY_STAGE = { child: 6, adult: 9, elder: 9 }; // fallback enquanto os sprites carregam
const HEIGHT_BY_STAGE = { child: 30, adult: 44, elder: 44 }; // px de tela em zoom 1

const lastPositions = new Map(); // agent.id -> { x, y }, pra detectar movimento real

function isAgentMoving(agent) {
  const last = lastPositions.get(agent.id);
  lastPositions.set(agent.id, { x: agent.position.x, y: agent.position.y });
  if (!last) return false;

  const dx = agent.position.x - last.x;
  const dy = agent.position.y - last.y;
  return dx * dx + dy * dy > MOVE_EPSILON_SQ;
}

export function drawAgents(ctx, world, camera, selectedAgentId) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const walkFrame = Math.floor(performance.now() / WALK_FRAME_MS) % 2;
  const spritesLoaded = spritesReady === sprites.length;

  for (const agent of world.agents) {
    const pos = camera.worldToScreen(agent.position.x, agent.position.y, viewW, viewH);
    const moving = isAgentMoving(agent);

    if (agent.id === selectedAgentId) {
      const ringR = Math.max(11, 18 * camera.zoom);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (spritesLoaded) {
      const sprite = sprites[moving ? walkFrame : 0];
      const bounds = spriteBounds.get(sprite);
      const h = (HEIGHT_BY_STAGE[agent.lifeStage] ?? 44) * camera.zoom;
      const w = h * (bounds.w / bounds.h);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, bounds.x, bounds.y, bounds.w, bounds.h, pos.x - w / 2, pos.y - h, w, h);
    } else {
      const radius = Math.max(2, (RADIUS_BY_STAGE[agent.lifeStage] ?? 9) * camera.zoom);
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
