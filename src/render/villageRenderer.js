import { TILE_SIZE } from '../utils/constants.js';
import { buildDecorTextures, DECOR_ART_SCALE } from './terrain/decorTextures.js';
import { getClan } from '../world/world.js';
import { getStance } from '../clan/clan.js';
import { canTrade } from '../clan/diplomacy.js';

const STANCE_RANK = { neutral: 0, allied: 0, tense: 1, war: 2 };

const STANCE_COLORS = {
  war: { fill: 'rgba(201, 67, 43, 0.18)', stroke: 'rgba(201, 67, 43, 0.55)' },
  tense: { fill: 'rgba(212, 150, 40, 0.15)', stroke: 'rgba(212, 150, 40, 0.5)' },
  neutral: { fill: 'rgba(90, 140, 200, 0.12)', stroke: 'rgba(90, 140, 200, 0.45)' },
  allied: { fill: 'rgba(80, 180, 120, 0.14)', stroke: 'rgba(80, 180, 120, 0.5)' },
};

// Altura da prefeitura (34px de arte x DECOR_ART_SCALE) mais uma folga, pra
// o rótulo ficar acima do telhado em vez de atravessá-lo.
const LABEL_OFFSET_PX = 34 * DECOR_ART_SCALE + 6;

const STANCE_LABELS = { war: ' · guerra', tense: ' · tensão', neutral: '', allied: ' · aliada' };

// Pior postura do clã da vila em relação a qualquer outro clã presente
// (com só 2 clãs, é sempre a única relação que existe).
function worstStance(world, village) {
  const myClan = getClan(world, village.clanId);
  if (!myClan) return 'neutral';

  let worst = 'neutral';
  for (const other of world.villages) {
    if (other.id === village.id) continue;
    const otherClan = getClan(world, other.clanId);
    if (!otherClan) continue;

    const stance = getStance(myClan, otherClan);
    if (STANCE_RANK[stance] > STANCE_RANK[worst]) worst = stance;
    else if (worst === 'neutral' && stance === 'allied') worst = 'allied';
  }
  return worst;
}

// Só interessa reportar quando não é óbvio pela postura (aliada já comercia).
function hasExtraTradeLink(world, village) {
  const myClan = getClan(world, village.clanId);
  if (!myClan) return false;

  for (const other of world.villages) {
    if (other.id === village.id) continue;
    const otherClan = getClan(world, other.clanId);
    if (!otherClan || otherClan.id === myClan.id) continue;
    if (getStance(myClan, otherClan) !== 'allied' && canTrade(myClan, otherClan)) return true;
  }
  return false;
}

export function drawTerritories(ctx, world, camera) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;

  for (const village of world.villages) {
    const pos = camera.worldToScreen(village.center.x, village.center.y, viewW, viewH);
    const r = village.territory.radius * TILE_SIZE * camera.zoom;
    const { fill, stroke } = STANCE_COLORS[worstStance(world, village)];

    // Gradiente em vez de preenchimento chapado: transparente no miolo,
    // tingindo só perto da borda. Enquanto o terreno era cor lisa, um disco
    // uniforme não incomodava; com o terreno texturizado ele virou a maior
    // mancha achatada da tela, lavando justamente a área onde o jogador mais
    // olha (o centro da vila). O território continua legível pela borda, que
    // é o que de fato comunica o alcance.
    const gradient = ctx.createRadialGradient(pos.x, pos.y, r * 0.35, pos.x, pos.y, r);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, fill);

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

export function drawVillages(ctx, world, camera, selectedVillageId) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;

  for (const village of world.villages) {
    const pos = camera.worldToScreen(village.center.x, village.center.y, viewW, viewH);
    const size = Math.max(6, 10 * camera.zoom);

    if (village.id === selectedVillageId) {
      const ringR = Math.max(10, size * 0.9);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // O quadrado vermelho que marcava o centro saiu: a PREFEITURA
    // (village/buildings.js) agora ocupa esse ponto e comunica a mesma coisa
    // com arte de verdade. Mantido só o anel de seleção e o rótulo — o
    // marcador ficava desenhado por cima do telhado da própria prefeitura.

    ctx.fillStyle = '#fff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const food = Math.round(village.stock.food ?? 0);
    const foodCap = village.capacity.food ?? 0;
    const wood = Math.round(village.stock.wood ?? 0);
    const woodCap = village.capacity.wood ?? 0;
    const roleIcon = village.specialization === 'wood' ? '⚔️' : '🌾';
    const suffix = STANCE_LABELS[worstStance(world, village)];
    const tradeSuffix = hasExtraTradeLink(world, village) ? ' · 🤝 comércio' : '';
    const chaosSuffix = village.inChaos ? ' · 💥 colapso' : '';
    // Vila extinta continua existindo como entidade com estoque (ver
    // clan/clanDecision.js), mas não participa mais de nada institucional —
    // marcar no mapa evita confundir com uma vila só em colapso econômico.
    const extinctSuffix = village.population.length === 0 ? ' · 💀 extinta' : '';
    ctx.fillText(
      `${roleIcon} ${village.name} — 🌾 ${food}/${foodCap} · 🪵 ${wood}/${woodCap}${suffix}${tradeSuffix}${chaosSuffix}${extinctSuffix}`,
      pos.x,
      pos.y - LABEL_OFFSET_PX * camera.zoom,
    );
  }
}

// Prédios da vila (village/buildings.js). Desenhados aqui e não em
// decorationRenderer.js porque pertencem à VILA, não ao mundo — o renderer de
// decoração lê `world.decorations`, que é outra coisa.
//
// Ancorados no pé, como todo o resto que fica em pé no chão (personagens,
// árvores), pra a ordem de sobreposição ficar coerente.
const BUILDING_TEXTURE = {
  townhall: 'Prefeitura',
  house: 'Casa',
  granary: 'Celeiro',
  depot: 'Deposito',
};

let buildingTextures = null;

export function drawBuildings(ctx, world, camera) {
  if (!buildingTextures) buildingTextures = buildDecorTextures();

  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  ctx.imageSmoothingEnabled = false;

  for (const village of world.villages) {
    for (const building of village.buildings) {
      const pos = camera.worldToScreen(building.x, building.y, viewW, viewH);
      if (pos.x < -80 || pos.x > viewW + 80 || pos.y < -80 || pos.y > viewH + 80) continue;

      const texture = buildingTextures[BUILDING_TEXTURE[building.type]];
      if (!texture) continue;

      const h = texture.height * DECOR_ART_SCALE * camera.zoom;
      const w = texture.width * DECOR_ART_SCALE * camera.zoom;

      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y, w * 0.4, w * 0.16, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fill();

      ctx.drawImage(texture, pos.x - w / 2, pos.y - h, w, h);
    }
  }
}
