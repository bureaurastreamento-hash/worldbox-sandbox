import { TILE_SIZE } from '../utils/constants.js';
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

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
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

    ctx.fillStyle = '#c9432b';
    ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
    ctx.strokeStyle = '#5c1a0e';
    ctx.lineWidth = 1;
    ctx.strokeRect(pos.x - size / 2, pos.y - size / 2, size, size);

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
    ctx.fillText(
      `${roleIcon} ${village.name} — 🌾 ${food}/${foodCap} · 🪵 ${wood}/${woodCap}${suffix}${tradeSuffix}${chaosSuffix}`,
      pos.x,
      pos.y - size / 2 - 4,
    );
  }
}
