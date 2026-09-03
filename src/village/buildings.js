// Prédios da vila: tipos, custos, efeitos e posição no mapa.
//
// Antes disto, `village.buildings` era um CONTADOR — uma lista de
// `{ type: 'house' }` sem posição, cujo único uso era `buildings.length`. As
// casas que apareciam no mapa eram decoração puramente visual
// (world/decorations.js), sem nenhum vínculo com elas: o jogador via cinco
// casinhas e a vila podia ter zero prédios.
//
// A consequência prática era pior que a cosmética: como nenhum prédio tinha
// lugar, TODA ação institucional mirava `village.center` — comer, entregar e
// construir, três das ações mais frequentes do jogo, no mesmo ponto. Daí os
// moradores viverem empilhados no meio da vila.
//
// Agora cada prédio é uma entidade com posição e função, e cada ação vai ao
// prédio que lhe corresponde. O espalhamento não é um efeito cosmético
// forçado: é consequência de os destinos serem diferentes.

import {
  TILE_SIZE,
  TERRITORY_RADIUS,
  VILLAGE_POP_CAP,
  VILLAGE_FOOD_CAPACITY,
  VILLAGE_WOOD_CAPACITY,
  VILLAGE_MINERAL_CAPACITY,
  MINING_RESOURCES,
  BUILD_NEED_THRESHOLD,
} from '../utils/constants.js';
import { isWalkable } from '../world/tile.js';
import { getTileAt } from '../world/world.js';
import { distance } from '../utils/mathUtils.js';

export const BUILDING = {
  townhall: {
    label: 'Prefeitura',
    // Não é construída: nasce com a vila, no centro. É o marco institucional
    // e o destino de fallback de qualquer ação cujo prédio próprio não exista.
    buildable: false,
  },
  // Casa é a única construção que NÃO custa pedra, e isso é deliberado.
  //
  // Com pedra no custo, o ciclo de crescimento não fechava: pedra depende de
  // achar uma cordilheira, e medindo 5 mundos a exploração achou uma em
  // apenas 2 deles. Nos outros a vila batia no teto de população e ficava
  // presa lá pra sempre — um teto sem escada, pior que não ter teto nenhum
  // (população média caiu de 57.6 para 44.3 no teste). Uma cabana de madeira
  // numa vila jovem também é o que faz sentido: pedra é para infraestrutura.
  //
  // Assim, crescer depende de madeira (que toda vila consegue) e a pedra
  // continua sendo o gargalo real do celeiro e do depósito — os prédios que
  // ampliam ESTOQUE, onde a progressão por minério ainda vale.
  house: {
    label: 'Casa',
    buildable: true,
    wood: 25,
    stone: 0,
    popBonus: 5, // teto de população
  },
  granary: {
    label: 'Celeiro',
    buildable: true,
    wood: 25,
    stone: 8,
    foodCapacity: 40,
  },
  depot: {
    label: 'Depósito',
    buildable: true,
    wood: 30,
    stone: 15,
    storageCapacity: 30, // madeira e cada minério
  },
};

// Raio em que um agente para ao chegar num prédio. Cada um encosta num ponto
// diferente do anel (escolhido por hash do próprio id), então uma fila de
// moradores no celeiro fica em volta dele — não dentro um do outro.
const APPROACH_RADIUS_PX = TILE_SIZE * 0.9;

// Distância mínima entre prédios, pra a vila não virar um amontoado só com
// outro nome.
const MIN_BUILDING_SPACING_PX = TILE_SIZE * 2.2;

export function createBuilding(type, x, y) {
  return { type, x, y };
}

// Acha um lugar livre e andável dentro da clareira da vila. Devolve null se
// não couber mais nada — o chamador decide o que fazer (build.js simplesmente
// desiste dessa reconsideração).
export function findBuildingSpot(world, village, rng) {
  const clearingPx = TERRITORY_RADIUS * TILE_SIZE * 0.8;

  for (let attempt = 0; attempt < 40; attempt++) {
    const angle = rng.range(0, Math.PI * 2);
    // sqrt distribui uniformemente por ÁREA; sem isso os prédios se
    // concentram perto do centro, que é justamente o que queremos evitar.
    const dist = Math.sqrt(rng.range(0.08, 1)) * clearingPx;
    const x = village.center.x + Math.cos(angle) * dist;
    const y = village.center.y + Math.sin(angle) * dist;

    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    const tile = getTileAt(world, tx, ty);
    if (!tile || !isWalkable(tile.type)) continue;

    const tooClose = village.buildings.some((b) => distance(b, { x, y }) < MIN_BUILDING_SPACING_PX);
    if (tooClose) continue;

    return { x, y };
  }
  return null;
}

// Prédio mais próximo de um tipo. `from` opcional: sem ele devolve o
// primeiro, com ele o mais perto de quem perguntou — é o que faz um morador
// ir ao celeiro do lado dele e não sempre ao mesmo.
export function findBuilding(village, type, from = null) {
  let best = null;
  let bestDist = Infinity;
  for (const b of village.buildings) {
    if (b.type !== type) continue;
    if (!from) return b;
    const d = distance(b, from);
    if (d < bestDist) {
      bestDist = d;
      best = b;
    }
  }
  return best;
}

// Prédio de destino de uma ação, com queda pra prefeitura e, em último caso,
// pro centro da vila — nenhuma ação pode ficar sem destino por falta de
// prédio, senão a vila trava.
export function destinationFor(village, type, from = null) {
  return findBuilding(village, type, from) ?? findBuilding(village, 'townhall', from) ?? village.center;
}

function hashId(id) {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) | 0;
  return h >>> 0;
}

// Ponto de parada de um agente específico num prédio: um lugar no anel em
// volta, estável por agente. É o que substitui "todo mundo no mesmo pixel".
export function approachPoint(building, agent) {
  const angle = (hashId(agent.id) % 1000) / 1000 * Math.PI * 2;
  return {
    x: building.x + Math.cos(angle) * APPROACH_RADIUS_PX,
    y: building.y + Math.sin(angle) * APPROACH_RADIUS_PX,
  };
}

export function countByType(village, type) {
  let n = 0;
  for (const b of village.buildings) if (b.type === type) n++;
  return n;
}

// Prédio a construir em seguida, escolhido pela carência REAL da vila — é o
// que dá função mecânica a cada tipo em vez de "mais um prédio genérico".
// Ordem de prioridade deliberada: teto de população primeiro (sem gente, a
// vila não faz mais nada), depois espaço pra comida (estoque transbordando é
// trabalho jogado fora), depois espaço pra material.
//
// Devolve `null` quando NADA está apertado. Antes o fallback era `'house'`,
// o que contradizia o "carência real" deste comentário: a vila sempre tinha
// um próximo prédio, mesmo sem precisar de nenhum, e `build.js` pontuava por
// uma pressão populacional que raramente chegava perto do teto. Agora
// construir é uma candidata que só existe quando há de fato um gargalo.
export function nextBuildingType(village) {
  // A MAIOR carência vence, entre as que passaram do limiar — não uma ordem
  // fixa. A versão anterior testava população primeiro e devolvia 'house'
  // assim que ela passasse de 75% do teto; como a vila vive encostada no
  // teto, isso era quase sempre verdade e celeiro/depósito NUNCA chegavam a
  // ser considerados. O efeito colateral era pior que a prioridade errada:
  // como só a casa é construída e só ela não custa pedra, o minério ficava
  // sem nenhum consumidor real — a vila minerava e o estoque só acumulava.
  let best = null;
  let bestNeed = BUILD_NEED_THRESHOLD;
  for (const type of BUILDABLE_TYPES) {
    // Só concorre o que a vila consegue pagar AGORA. Sem esta checagem, um
    // tipo de carência alta mas inviável (depósito com madeira no teto e zero
    // pedra) vencia a comparação e bloqueava um tipo mais barato que estava
    // perfeitamente ao alcance — a vila "queria" construir e nunca construía.
    if (!affordable(village, type)) continue;
    const need = buildingNeed(village, type);
    if (need > bestNeed) {
      bestNeed = need;
      best = type;
    }
  }
  return best;
}

function affordable(village, type) {
  const spec = BUILDING[type];
  return (village.stock.wood ?? 0) >= spec.wood && (village.stock.stone ?? 0) >= spec.stone;
}

const BUILDABLE_TYPES = Object.keys(BUILDING).filter((t) => BUILDING[t].buildable);

// O quão apertado está o gargalo que `nextBuildingType` apontou, de 0 a 1 —
// é isto que `build.js` usa pra pontuar, em vez de sempre a pressão
// populacional. Sem isso, uma vila com o celeiro transbordando pontuava
// construir pela população (que podia estar folgada) e nunca construía o
// celeiro que ela precisava.
export function buildingNeed(village, type) {
  if (type === 'granary') return clamp01(village.stock.food / village.capacity.food);
  if (type === 'depot') return clamp01(village.stock.wood / village.capacity.wood);
  return clamp01(village.population.length / getPopulationCap(village));
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// --- efeitos dos prédios sobre os limites da vila ---------------------
//
// Estas três funções moram aqui, e não em village.js, porque são o EFEITO de
// um prédio: quem adiciona um tipo novo à tabela BUILDING acima muda o
// comportamento sem procurar a fórmula em outro arquivo. `village.js` só
// reexporta getPopulationCap, que o resto do jogo já importava de lá.

export function getPopulationCap(village) {
  return VILLAGE_POP_CAP + countByType(village, 'house') * BUILDING.house.popBonus;
}

export function getFoodCapacity(village) {
  return VILLAGE_FOOD_CAPACITY + countByType(village, 'granary') * BUILDING.granary.foodCapacity;
}

export function getStorageCapacity(village, base) {
  return base + countByType(village, 'depot') * BUILDING.depot.storageCapacity;
}

// Recalcula os tetos de estoque a partir dos prédios. Chamada sempre que a
// lista de prédios muda — o estoque é genérico por chave de recurso
// (village/stock.js), então basta reescrever `capacity`.
export function refreshCapacities(village) {
  village.capacity.food = getFoodCapacity(village);
  village.capacity.wood = getStorageCapacity(village, VILLAGE_WOOD_CAPACITY);
  for (const resource of MINING_RESOURCES) {
    village.capacity[resource] = getStorageCapacity(village, VILLAGE_MINERAL_CAPACITY);
  }
}

// Único caminho pra adicionar prédio: garante que os tetos acompanhem.
export function addBuilding(village, type, x, y) {
  const building = createBuilding(type, x, y);
  village.buildings.push(building);
  refreshCapacities(village);
  return building;
}
