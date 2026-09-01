// Sprites do amigo do usuário (assets/Assets-testes-para-o-claude-testar/) —
// papel visual por AÇÃO corrente, não por facção/clã (ver DESIGN.md §8).
// Substitui de vez as 4 variantes antigas de pele/gênero (WMan/WGirl/BMan/
// BGirl, assets/sprites/) — decisão do usuário, perde aquela diversidade em
// troca de refletir visualmente o que o agente está fazendo agora.
//
// Fora de combate todo agente é "Camponês": pose dedicada quando a ação tem
// uma óbvia (cortando árvore, minerando, construindo, levando tronco); ações
// sem pose específica (comer, dormir, colher comida, vagar, fugir) caem no
// ciclo padrão parado/andando. Durante `fight`, o agente vira visualmente o
// guerreiro sorteado no nascimento (`agent.warriorType` — orc/elfo/cavaleiro,
// fixo pra vida toda, ver agent/agent.js — é cosmético, não afeta combate).
//
// Mesmo tratamento de recorte por alpha de antes: as imagens têm espaço
// vazio ao redor do personagem, calculado uma vez no load
// (computeContentBounds), não fixado no código.
const SPRITE_DIR = 'assets/Assets-testes-para-o-claude-testar';

const SPRITE_FILES = {
  parado: 'ComponesParado',
  andando: 'COmponesAndando',
  cortandoArvore: 'ComponesCortandoArvore',
  mineirando: 'ComponesMineirando',
  construindo: 'ComponesConstruindo',
  levandoTronco: 'ComponesLevandoOTroncoDaArvore',
  orcAtacando: 'OrcAtacando',
  elfoAtirando: 'ElfoAtirando',
  cavaleiroAtacando: 'CavaleiroAtacando',
};

const WARRIOR_ATTACK_SPRITE_KEY = {
  orc: 'orcAtacando',
  elfo: 'elfoAtirando',
  cavaleiro: 'cavaleiroAtacando',
};

const sprites = {}; // key -> Image
let totalSprites = 0;
for (const [key, file] of Object.entries(SPRITE_FILES)) {
  const img = new Image();
  img.src = `${SPRITE_DIR}/${file}.png`;
  sprites[key] = img;
  totalSprites++;
}

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

Object.values(sprites).forEach((img) => {
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

// Ação corrente (+ se está de fato se movendo agora) decide a pose. Ações
// sem pose dedicada (eat, sleep, gather, wander, flee) caem no fallback
// parado/andando no final — pedido explícito do usuário, sem aproximar com
// poses que não batem literalmente com a ação.
function pickSprite(agent, moving, walkFrame) {
  if (agent.currentAction === 'fight') {
    return sprites[WARRIOR_ATTACK_SPRITE_KEY[agent.warriorType]] ?? sprites.parado;
  }
  // Levando tronco cobre a viagem inteira de volta (não só parado entregando).
  if (agent.currentAction === 'deliver' && agent.carryingType === 'wood') {
    return sprites.levandoTronco;
  }
  if (!moving) {
    if (agent.currentAction === 'gatherWood') return sprites.cortandoArvore;
    if (agent.currentAction === 'mine') return sprites.mineirando;
    if (agent.currentAction === 'build') return sprites.construindo;
  }
  return moving ? [sprites.parado, sprites.andando][walkFrame] : sprites.parado;
}

export function drawAgents(ctx, world, camera, selectedAgentId) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const walkFrame = Math.floor(performance.now() / WALK_FRAME_MS) % 2;
  const spritesLoaded = spritesReady === totalSprites;

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
      const sprite = pickSprite(agent, moving, walkFrame);
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
