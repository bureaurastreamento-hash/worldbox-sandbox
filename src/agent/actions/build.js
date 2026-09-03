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
import { addStock, hasFoodSurplus } from '../../village/stock.js';
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
  if (!hasFoodSurplus(village)) return 0;

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

export function step(agent, world, dt) {
  const village = getVillage(world, agent.villageId);
  if (!village) return;

  if (!agent.target) {
    const type = nextBuildingType(village);
    if (!canAfford(village, type)) return; // espera a próxima reconsideração

    const spot = findBuildingSpot(world, village, world.rng);
    if (!spot) return; // clareira cheia; outra ação vence na próxima

    agent.buildType = type;
    agent.target = spot;
    agent.buildProgress = 0;
  }

  const status = moveToward(agent, world, dt, agent.target);
  if (status === 'unreachable') {
    clearMovement(agent, world);
    agent.buildProgress = 0;
    agent.buildType = null;
    return;
  }
  if (status !== 'arrived') return;

  const type = agent.buildType ?? 'house';
  const spec = BUILDING[type];

  // Reconfere na chegada só pra não gastar 15s de trabalho à toa — mas NÃO
  // debita nada aqui.
  if (!canAfford(village, type)) {
    clearMovement(agent, world);
    agent.buildProgress = 0;
    agent.buildType = null;
    return;
  }

  agent.buildProgress += dt;
  if (agent.buildProgress >= BUILD_WORK_SECONDS) {
    // O recurso sai do estoque AGORA, ao completar — não na chegada.
    //
    // Debitar na chegada era um vazamento silencioso que sozinho impedia
    // qualquer prédio de existir. A obra exige BUILD_WORK_SECONDS de trabalho
    // CONTÍNUO, mas o agente é interrompido o tempo todo (fome, predador,
    // guerra): quando isso acontece, decision.js zera `agent.target`, o step
    // seguinte escolhe outro canteiro e reseta `buildProgress` — e debita a
    // madeira DE NOVO. Cada tentativa abortada queimava o custo inteiro sem
    // deixar nada, e o estoque de madeira ficava oscilando logo abaixo do
    // custo pra sempre (medido: 17-29 de madeira contra um custo de 25, 175
    // agente-ticks escolhendo construir, zero prédios em 5 mundos).
    //
    // Debitando na conclusão, uma obra abandonada custa só o tempo de quem a
    // tentou, que é o que já se paga em qualquer outra ação interrompida.
    // Dois agentes concluindo juntos também deixam de ser um problema: o
    // segundo simplesmente reprova no canAfford acima.
    addStock(village, 'wood', -spec.wood);
    addStock(village, 'stone', -spec.stone);
    addBuilding(village, type, agent.target.x, agent.target.y);
    agent.buildProgress = 0;
    agent.buildType = null;
    clearMovement(agent, world);
    pushEvent(world, `${village.name} construiu ${spec.label === 'Casa' ? 'uma casa' : `um ${spec.label.toLowerCase()}`}`);
  }
}
