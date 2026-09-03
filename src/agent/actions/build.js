// Construir um prédio pra vila — consome madeira+pedra do estoque comunitário
// e, ao completar, aplica o efeito do TIPO construído (village/buildings.js).
// Pontua pela pressão institucional, não pela necessidade do agente — mesmo
// espírito de gather.js.
//
// Duas mudanças em relação à versão anterior, que só sabia fazer "casa":
//   1. o TIPO é escolhido pela carência real da vila (teto de população,
//      espaço de comida, espaço de material) — é o que dá função mecânica a
//      cada prédio em vez de "mais um genérico";
//   2. a obra acontece NUM TERRENO ESCOLHIDO, não no centro da vila. O
//      canteiro é reservado quando o agente decide construir e some com ele
//      se a obra for abandonada, então dois construtores não empilham obra
//      no mesmo ponto.

import { BUILD_WORK_SECONDS, BUILD_SCORE_WEIGHT } from '../../utils/constants.js';
import { getVillage } from '../../world/world.js';
import {
  BUILDING,
  addBuilding,
  findBuildingSpot,
  nextBuildingType,
  buildingNeed,
} from '../../village/buildings.js';
import { addStock, canDevelop } from '../../village/stock.js';
import { pushEvent } from '../../world/eventLog.js';
import { moveToward, clearMovement } from '../movement.js';

function canAfford(village, type) {
  if (!type) return false; // nenhuma carência agora — nada a pagar
  const spec = BUILDING[type];
  return village.stock.wood >= spec.wood && village.stock.stone >= spec.stone;
}

export function score(agent, world) {
  if (agent.carrying > 0) return 0; // ocupado entregando outra coisa
  const village = getVillage(world, agent.villageId);
  if (!village) return 0;

  // Mesma trava de explorar e minerar (village/stock.js:hasFoodSurplus):
  // construir tem peso acima de `gather` quando o gargalo é real, e sem esta
  // condição isso vira gente construindo casa enquanto a vila passa fome —
  // medido, população média caiu de 57.6 pra 35.3 com 3 vilas extintas na
  // primeira versão em que construir passou a funcionar de fato.
  if (!canDevelop(village, agent)) return 0;

  const type = nextBuildingType(village);
  if (!canAfford(village, type)) return 0;

  // Pontua pela carência DO PRÉDIO ESCOLHIDO, não pela pressão populacional
  // sempre. Antes, uma vila com o celeiro transbordando pontuava construir
  // pela população — que podia estar folgada — e o celeiro nunca saía.
  //
  // `nextBuildingType` já garante que a carência passou de
  // BUILD_NEED_THRESHOLD, então o score começa perto do teto em vez de num
  // valor baixo. É isso que faz construir vencer colher quando o gargalo é
  // real: com a fórmula antiga (pop/teto sobre um teto base de 30), uma vila
  // de 19 pessoas pontuava 0.32 contra os 0.55 de gather, e CONSTRUIR NUNCA
  // VENCIA — medido num mundo com 64 de pedra em estoque e zero prédios
  // construídos. O gargalo nunca foi o custo da pedra, como o STATUS.md
  // supunha.
  return buildingNeed(village, type) * BUILD_SCORE_WEIGHT;
}

// O CANTEIRO É DA VILA, NÃO DO AGENTE — e isso não é organização, é o que
// faz a construção existir sem quebrar a economia.
//
// Enquanto o progresso morava em `agent.buildProgress`, toda interrupção o
// perdia: a obra exige BUILD_WORK_SECONDS de trabalho e o agente é
// interrompido o tempo todo (fome, predador, guerra). Como `build` pontua
// acima de `gather`, o agente voltava a escolher construir, caminhava até um
// canteiro NOVO, trabalhava alguns segundos, era interrompido de novo — um
// atrator que queimava mão de obra com baixa chance de completar. Medido em
// 600s simulados: com a construção ligada, as quatro vilas iam à extinção
// (pico de 66 moradores aos 240s, zero aos 540s); com ela desligada, a mesma
// configuração ficava estável em ~49 pra sempre. O custo em madeira era
// desprezível (25 por casa, ~50 no total) — o que matava era o TEMPO.
//
// Com o canteiro na vila, o trabalho de qualquer morador se acumula no mesmo
// lugar, ninguém recomeça do zero, e vários podem tocar a mesma obra.
function currentSite(world, village) {
  const site = village.construction;
  if (!site) return null;
  // A carência pode ter mudado enquanto a obra rolava (outra vila entregou
  // comida, alguém morreu): se o tipo deixou de fazer sentido ou de caber no
  // estoque, o canteiro é abandonado e o progresso some junto.
  if (!canAfford(village, site.type)) {
    village.construction = null;
    return null;
  }
  return site;
}

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  let site = currentSite(world, village);
  if (!site) {
    const type = nextBuildingType(village);
    if (!canAfford(village, type)) return; // espera a próxima reconsideração

    const spot = findBuildingSpot(world, village, world.rng);
    if (!spot) return; // clareira cheia; outra ação vence na próxima

    site = { type, x: spot.x, y: spot.y, progress: 0 };
    village.construction = site;
  }

  if (!agent.target) agent.target = { x: site.x, y: site.y };

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    // Só ESTE agente desiste; o canteiro continua de pé pra quem alcançar.
    clearMovement(agent, world);
    return;
  }
  if (status !== 'arrived') return;

  site.progress += dt;
  agent.buildProgress = site.progress; // espelho pro agent/stuck.js contar como progresso

  if (site.progress >= BUILD_WORK_SECONDS) {
    const spec = BUILDING[site.type];
    // O recurso sai do estoque AO CONCLUIR, não na chegada. Debitar na chegada
    // era um vazamento silencioso que sozinho impedia qualquer prédio de
    // existir: cada tentativa abortada queimava o custo inteiro sem deixar
    // nada, e o estoque de madeira ficava oscilando logo abaixo do custo pra
    // sempre (medido: 17-29 de madeira contra um custo de 25, 175 agente-ticks
    // escolhendo construir, zero prédios em 5 mundos).
    addStock(village, 'wood', -spec.wood);
    addStock(village, 'stone', -spec.stone);
    addBuilding(village, site.type, site.x, site.y);
    village.construction = null;
    agent.buildProgress = 0;
    clearMovement(agent, world);
    pushEvent(world, `${village.name} construiu ${spec.label === 'Casa' ? 'uma casa' : `um ${spec.label.toLowerCase()}`}`);
  }
}
