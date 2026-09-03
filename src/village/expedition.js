// Expedição de exploração: um grupo pequeno de moradores que sai da vila
// junto, vai a um ponto bem além do raio de percepção, e volta pra contar o
// que viu (village/knowledge.js).
//
// COORDENAÇÃO SEM SISTEMA DE COORDENAÇÃO. Todo o resto do jogo é decisão
// individual — nenhum agente jamais consultou o que outro está fazendo. Uma
// expedição precisa de algo compartilhado, mas o mínimo possível: os membros
// dividem um ALVO, não ordens. Cada um continua andando por conta própria
// (agent/movement.js) até um ponto no anel em volta desse alvo comum, estável
// por agente — o mesmo truque de village/buildings.js:approachPoint. Como
// todos partem do mesmo lugar, na mesma velocidade, para o mesmo lugar, eles
// viajam juntos sem que ninguém siga ninguém: o grupo é uma consequência, não
// uma formação imposta. Não existe líder, e nenhum agente lê o estado de
// outro.
//
// A expedição também não MANDA ninguém ficar. Um membro sai dela sozinho ao
// deixar de escolher `explore` (fome, predador, guerra vencem no utility
// score como qualquer outra coisa) — `prune` só percebe que ele saiu. É por
// isso que uma expedição pode voltar menor do que partiu, sem nenhum código
// de deserção.

import {
  TILE_SIZE,
  EXPLORE_DISTANCE_TILES,
  EXPEDITION_MAX_SIZE,
  EXPEDITION_MIN_POPULATION,
  EXPEDITION_POPULATION_PER_MEMBER,
  EXPLORE_MIN_FOOD_FRACTION,
  EXPEDITION_TIMEOUT_SECONDS,
  EXPEDITION_JOIN_RADIUS_TILES,
  EXPEDITION_FORMATION_RADIUS,
} from '../utils/constants.js';
import { findWalkableNear } from '../world/world.js';
import { distance } from '../utils/mathUtils.js';
import { reportDiscoveries } from './knowledge.js';
import { hasFoodSurplus } from './stock.js';
import { destinationFor } from './buildings.js';

function hashId(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

// Alvo: um ponto a EXPLORE_DISTANCE_TILES do centro da vila, num ângulo
// sorteado. `findWalkableNear` puxa pro tile andável mais próximo se calhar
// de cair em água ou montanha — sem isso o pathfinding recusaria o destino de
// saída e a expedição nasceria morta.
function pickTarget(world, village) {
  const angle = world.expeditionRng.next() * Math.PI * 2;
  const tx = Math.round(village.center.x / TILE_SIZE + Math.cos(angle) * EXPLORE_DISTANCE_TILES);
  const ty = Math.round(village.center.y / TILE_SIZE + Math.sin(angle) * EXPLORE_DISTANCE_TILES);
  const clampedTx = Math.max(1, Math.min(world.width - 2, tx));
  const clampedTy = Math.max(1, Math.min(world.height - 2, ty));
  const spot = findWalkableNear(world, clampedTx, clampedTy, 12);
  if (!spot) return null;
  return { x: (spot.tx + 0.5) * TILE_SIZE, y: (spot.ty + 0.5) * TILE_SIZE };
}

// Este agente tem vaga numa expedição agora? Consultado por
// agent/actions/explore.js:score ANTES de pontuar: uma ação que não dá pra
// executar tem que pontuar 0 (mesmo padrão de gather.js). Sem isso, com o
// grupo cheio os agentes excedentes continuariam pontuando explorar alto,
// venceriam a colheita, e ficariam parados esperando uma vaga que não vem.
// Quantos moradores esta vila pode ter no mapa ao mesmo tempo. Sai da
// população, não é fixo: ver EXPEDITION_MIN_POPULATION.
export function expeditionCapacity(village) {
  const pop = village.population.length;
  if (pop < EXPEDITION_MIN_POPULATION) return 0;
  return Math.max(1, Math.min(EXPEDITION_MAX_SIZE, Math.floor(pop / EXPEDITION_POPULATION_PER_MEMBER)));
}

// A vila tem folga pra bancar uma expedição agora? Gente sobrando E comida
// no celeiro. Quem já está viajando não passa por aqui — o teste de partida é
// mais exigente que o de permanência de propósito, senão uma expedição seria
// dissolvida e refundada a cada oscilação de estoque.
export function canAffordExpedition(village) {
  if (expeditionCapacity(village) === 0) return false;
  // Mesma regra de minerar e construir (village/stock.js:hasFoodSurplus), com
  // um limiar próprio: uma expedição tira o membro da economia por ~1min, bem
  // mais que uma viagem de mineração, então exige uma folga maior.
  return hasFoodSurplus(village, EXPLORE_MIN_FOOD_FRACTION);
}

export function canJoin(village, agent) {
  const exp = village.expedition;
  if (exp?.memberIds.includes(agent.id)) return true; // já está dentro, não reavalia
  if (!canAffordExpedition(village)) return false;
  if (!exp) return true; // funda a sua
  if (exp.state !== 'outbound') return false;
  if (exp.memberIds.length >= expeditionCapacity(village)) return false;
  return distance(agent.position, village.center) <= EXPEDITION_JOIN_RADIUS_TILES * TILE_SIZE;
}

// Entra numa expedição existente, ou funda uma. Devolve a expedição, ou null
// se não deu (grupo cheio, longe demais, sem alvo andável).
export function joinOrStart(world, village, agent) {
  const existing = village.expedition;

  if (existing) {
    if (existing.memberIds.includes(agent.id)) return existing;
    // Só entra quem ainda está perto da vila, e só na ida — senão alguém do
    // outro lado do mapa "teleportaria" pro grupo, e um retorno em andamento
    // ganharia membros que nunca viajaram.
    if (!canJoin(village, agent)) return null;
    existing.memberIds.push(agent.id);
    agent.expeditionVillageId = village.id;
    return existing;
  }

  const target = pickTarget(world, village);
  if (!target) return null;

  village.expedition = { memberIds: [agent.id], target, state: 'outbound', elapsed: 0 };
  agent.expeditionVillageId = village.id;
  return village.expedition;
}

export function leaveExpedition(world, agent) {
  if (!agent.expeditionVillageId) return;
  const village = world.villages.find((v) => v.id === agent.expeditionVillageId);
  agent.expeditionVillageId = null;
  const exp = village?.expedition;
  if (!exp) return;
  const i = exp.memberIds.indexOf(agent.id);
  if (i >= 0) exp.memberIds.splice(i, 1);
  if (exp.memberIds.length === 0) village.expedition = null;
}

// Ponto de destino DESTE agente: no anel em volta do alvo comum, estável por
// agente, pra o grupo chegar espalhado em vez de empilhado num pixel.
export function destinationFrom(exp, village, agent) {
  const base = exp.state === 'returning' ? destinationFor(village, 'townhall', agent.position) : exp.target;
  const angle = ((hashId(agent.id) % 1000) / 1000) * Math.PI * 2;
  return {
    x: base.x + Math.cos(angle) * EXPEDITION_FORMATION_RADIUS,
    y: base.y + Math.sin(angle) * EXPEDITION_FORMATION_RADIUS,
  };
}

// Chamada uma vez por vila por tick (main.js), como village/trade.js: cuida
// do relógio e das transições ida->volta->fim. As decisões individuais dos
// membros continuam em agent/actions/explore.js.
export function updateExpedition(world, village, dt) {
  const exp = village.expedition;
  if (!exp) return;

  prune(world, village, exp);
  if (!village.expedition) return;

  exp.elapsed += dt;

  const members = exp.memberIds
    .map((id) => world.agents.find((a) => a.id === id))
    .filter((a) => a?.alive);

  // Teto de duração: um alvo que virou inalcançável (ilha, cordilheira
  // fechando o caminho) prenderia os membros fora da economia pra sempre.
  // Estourar não cancela a expedição — manda voltar, que é o que faz o que
  // eles já viram chegar ao quadro da vila.
  if (exp.state === 'outbound' && exp.elapsed > EXPEDITION_TIMEOUT_SECONDS / 2) {
    exp.state = 'returning';
    return;
  }

  if (exp.state === 'outbound') {
    const arrived = members.some((a) => distance(a.position, exp.target) < EXPEDITION_FORMATION_RADIUS * 2);
    if (arrived) exp.state = 'returning';
    return;
  }

  // Voltando: cada membro que chega em casa reporta e sai do grupo. A
  // expedição acaba quando não sobra ninguém — inclusive se todos morreram
  // no caminho, caso em que `prune` já a terá encerrado.
  const home = destinationFor(village, 'townhall', village.center);
  for (const agent of members) {
    if (distance(agent.position, home) > EXPEDITION_FORMATION_RADIUS * 2) continue;
    reportDiscoveries(village, agent);
    leaveExpedition(world, agent);
  }

  if (exp.elapsed > EXPEDITION_TIMEOUT_SECONDS) {
    // Nunca chegou de volta (perdido, encurralado): dissolve mesmo assim, pra
    // o LOD parar de mantê-los ativos e eles voltarem à vida normal.
    for (const agent of members) leaveExpedition(world, agent);
    village.expedition = null;
  }
}

// Tira do grupo quem morreu, sumiu, ou simplesmente deixou de escolher
// `explore` — a saída é sempre consequência da decisão individual, nunca uma
// ordem da expedição.
function prune(world, village, exp) {
  exp.memberIds = exp.memberIds.filter((id) => {
    const agent = world.agents.find((a) => a.id === id);
    if (!agent || !agent.alive || agent.currentAction !== 'explore') {
      if (agent) agent.expeditionVillageId = null;
      return false;
    }
    return true;
  });
  if (exp.memberIds.length === 0) village.expedition = null;
}
