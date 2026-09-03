// Quadro de descobertas da vila: onde um depósito de minério visto por um
// morador fica registrado depois que ele volta e conta.
//
// POR QUE ISTO EXISTE. Memória é 100% por agente (agent/memory.js) e decai em
// ~2 minutos. Um batedor podia achar a única jazida do mapa, levar 20s
// voltando pra entregar a carga, e já ter ESQUECIDO o depósito quando
// reconsiderasse minerar — e mesmo que lembrasse, nenhum dos outros sete
// moradores jamais saberia. A descoberta morria com o descobridor. Era o
// terceiro elo da cadeia que impedia mineração/construção de decolar.
//
// COMO NÃO VIRA ONISCIÊNCIA (pilar 2 do design: conhecimento limitado e
// local). Nada entra aqui por percepção. Um local só é registrado quando o
// agente que o viu com os próprios olhos chega FISICAMENTE ao centro da sua
// vila — conhecimento viaja no corpo de alguém, como sempre viajou. O que o
// quadro adiciona é durabilidade e alcance social, não visão: a vila passa a
// lembrar melhor que um indivíduo, e passa a poder CONTAR. É o mesmo tipo de
// conhecimento institucional que village/trade.js já assume há muito tempo
// (uma rota de comércio existe sem nenhum morador ter visto a outra vila).
//
// Sem expiração, de propósito: uma montanha não some. `world/terrain.js`
// nunca muda `type` nem `resource` de um tile depois da geração, então um
// registro daqui não pode ficar desatualizado — ao contrário da memória
// individual, cujo decaimento modela esquecer, não o mundo mudar.

import { TILE_TYPES } from '../world/tile.js';
import { TILE_SIZE } from '../utils/constants.js';

export function createKnownSites() {
  return new Map(); // "tx,ty" -> { tx, ty, resource }
}

// Chamada quando `agent` está no centro da própria vila (agent/actions/
// deliver.js na entrega, village/expedition.js no retorno da expedição):
// despeja no quadro os depósitos que ELE viu e ainda lembra. Devolve quantos
// eram novidade, pra quem quiser noticiar no feed.
export function reportDiscoveries(village, agent) {
  if (!village.knownSites) village.knownSites = createKnownSites();

  let added = 0;
  for (const entry of agent.memory.locations.values()) {
    if (entry.type !== TILE_TYPES.MOUNTAIN || !entry.resource) continue;
    const key = `${entry.tx},${entry.ty}`;
    if (village.knownSites.has(key)) continue;
    village.knownSites.set(key, { tx: entry.tx, ty: entry.ty, resource: entry.resource });
    added++;
  }
  return added;
}

export function knowsResource(village, resource) {
  if (!village.knownSites) return false;
  for (const site of village.knownSites.values()) {
    if (site.resource === resource) return true;
  }
  return false;
}

// Depósito conhecido pela VILA mais próximo de `fromPos`, ou null.
// `skip(site)` é preferência, não proibição — mesmo contrato de
// agent/memory.js:recallNearest, e pelo mesmo motivo (se descartar todos os
// candidatos, a busca é refeita sem ele, pra vila pequena não travar).
export function recallVillageSite(village, resource, fromPos, skip = null) {
  return search(village, resource, fromPos, skip) ?? search(village, resource, fromPos, null);
}

function search(village, resource, fromPos, skip) {
  if (!village.knownSites) return null;

  let best = null;
  let bestDistSq = Infinity;
  for (const site of village.knownSites.values()) {
    if (site.resource !== resource) continue;
    if (skip && skip(site)) continue;
    const dx = (site.tx + 0.5) * TILE_SIZE - fromPos.x;
    const dy = (site.ty + 0.5) * TILE_SIZE - fromPos.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = site;
    }
  }
  return best;
}
