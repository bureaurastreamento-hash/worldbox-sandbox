// Nível de detalhe de simulação: agentes fora da viewport não precisam de
// percepção/decisão/pathfinding completos todo tick — ninguém tá vendo, e
// isso é o que mais pesa por agente. Promove/rebaixa sozinho a cada tick,
// só olhando se a posição do agente cai dentro da tela atual (mais uma
// margem), sem estado persistente de "quem tá em foco" — sem transição para
// tratar à parte.
//
// Precisa ser em espaço de tela (via camera.worldToScreen), não um raio fixo
// em px de mundo: um raio fixo não escala com o zoom, então em zoom baixo
// (mapa mais visível) a maioria dos agentes visíveis caía fora do raio e
// congelava mesmo estando na tela — bug reportado pelo usuário.

import { updateNeeds, applyEffect } from '../agent/needs.js';
import { addStock } from '../village/stock.js';
import {
  EAT_FOOD_PER_SEC,
  EAT_RESTORE_PER_FOOD,
  BACKGROUND_EAT_HUNGER_THRESHOLD,
  BACKGROUND_WORK_EFFICIENCY,
  BACKGROUND_FISHING_PENALTY,
  GATHER_RATE,
} from '../utils/constants.js';

const LOD_SCREEN_MARGIN = 200; // px de tela; agente logo fora da borda ainda conta como ativo

export function classifyAgents(world, camera, viewW, viewH) {
  const active = [];
  const background = [];

  for (const agent of world.agents) {
    if (!agent.alive) continue;
    const pos = camera.worldToScreen(agent.position.x, agent.position.y, viewW, viewH);
    const onScreen =
      pos.x >= -LOD_SCREEN_MARGIN &&
      pos.x <= viewW + LOD_SCREEN_MARGIN &&
      pos.y >= -LOD_SCREEN_MARGIN &&
      pos.y <= viewH + LOD_SCREEN_MARGIN;
    (onScreen ? active : background).push(agent);
  }

  return { active, background };
}

// Substitui decision+ação pra quem tá fora de foco: a vila "se vira
// sozinha" sem simular exatamente como. Posição fica parada (ninguém tá
// vendo se anda ou não); idade e morte por idade continuam normais em
// main.js, fora daqui.
//
// Fome/sono decaem igual a um agente `active` (updateNeeds real, sem
// tratamento especial) — antes disso, `stepBackgroundAgent` RESTAURAVA os
// dois até 100 (achado numa sessão de diagnóstico: agente fora de tela era
// praticamente imortal à fome, e o estoque real podia secar sem que a fome
// individual refletisse isso, dando um salto brusco quando a câmera
// voltava). feedBackgroundVillage abaixo cobre o lado de "comer" de forma
// agregada, sem cada agente precisar andar até o centro da vila.
export function stepBackgroundAgent(agent, dt) {
  updateNeeds(agent.needs, dt);
}

// Chamado uma vez por vila por tick, com a lista de agentes `background`
// dela: versão agregada de agent/actions/eat.js — mesma taxa por pessoa
// (EAT_FOOD_PER_SEC/EAT_RESTORE_PER_FOOD) que um agente `active` já usa,
// só que sem simular a caminhada até o centro da vila (ninguém tá vendo).
// Sem estoque, ninguém come — fome de agente fora de foco depende do
// estoque real, podendo cair a zero se a vila secar, igual valeria em
// tela.
export function feedBackgroundVillage(village, backgroundResidents, dt) {
  // O filtro era `hunger < 100`, e isso drenava o estoque de qualquer vila
  // fora de foco em segundos: um morador com fome 99 contava como faminto e
  // comia na taxa CHEIA, continuamente, só pra ficar coberto. Oito moradores
  // assim consomem 8 de comida por segundo pra sempre — os 60 de estoque
  // inicial evaporavam em 7,5s, e como agente `background` não decide nem
  // colhe, a vila nunca repunha e morria inteira de fome.
  //
  // Um agente `active` não come assim: ele só vai comer quando `eat` passa a
  // vencer o utility score (por volta de fome 55, ver DESIGN.md §6), em
  // rajadas, e para quando enche. O agregado tem que imitar ISSO, não "todo
  // mundo comendo o tempo todo" — senão estar fora de tela sai mais caro pra
  // vila do que estar em tela, que é o oposto do que um LOD deve fazer.
  const hungry = backgroundResidents.filter((a) => a.needs.hunger < BACKGROUND_EAT_HUNGER_THRESHOLD);
  if (hungry.length === 0) return;

  const consume = Math.min(EAT_FOOD_PER_SEC * hungry.length * dt, village.stock.food ?? 0);
  if (consume <= 0) return;

  addStock(village, 'food', -consume);
  const restorePerAgent = (consume * EAT_RESTORE_PER_FOOD) / hungry.length;
  for (const agent of hungry) applyEffect(agent.needs, 'hunger', restorePerAgent);
}

// Contrapartida de feedBackgroundVillage: produção agregada dos moradores
// `background`. Chamada junto com ela, uma vez por vila por tick.
//
// Sem isso o LOD ficava pela metade — a versão anterior simulava o CONSUMO
// de quem está fora de tela mas não o TRABALHO, então o estoque de uma vila
// fora da câmera só sabia cair. A conta é fechada: a fome decai 100/60 por
// segundo e cada unidade de comida restaura 100/15, então cada morador
// precisa de 0.25 de comida por segundo só pra empatar. Uma vila de 8
// pessoas queimava os 60 de estoque inicial em ~30s e morria inteira, sem
// nenhuma chance de reagir — e como o mundo tem 4 vilas e a câmera só cobre
// uma, três estavam sempre condenadas. Foi assim que "rodei 45s no 4x e todas
// as vilas foram extintas" acontecia mesmo sem predador nenhum encostar.
//
// A produção é do recurso da especialização da vila (mesma regra de
// gather.js/gatherWood.js): vila agrícola gera comida, vila madeireira gera
// madeira e continua dependendo de village/trade.js pra comer — o pilar 4 do
// design continua valendo fora de tela, não vira uma isenção.
//
// BACKGROUND_WORK_EFFICIENCY é o "ciclo útil": um agente `active` só colhe de
// fato numa fração do tempo (o resto é caminhar até o recurso, voltar pra
// entregar, comer, dormir). Sem esse fator, estar fora de tela seria mais
// produtivo que estar em tela, e o LOD passaria a mudar o resultado do jogo
// em vez de só baratear a simulação.
// O trabalho é dividido pela DEMANDA, do mesmo jeito que a demanda da vila
// enviesa o utility score de um agente `active` (pilar 3 do design): quanto
// mais faltar comida, mais gente larga a especialização e vai pescar. Sem
// essa parte, uma vila madeireira fora de tela produzia madeira e nenhuma
// comida — e morria de fome antes de qualquer tratado de comércio se formar,
// que foi exatamente o que aconteceu no primeiro teste desta correção (as
// duas vilas madeireiras zeradas enquanto as agrícolas estavam com o estoque
// no teto). Em tela ela não morre porque `fish.js` é universal; era esse
// caminho que faltava no agregado.
//
// A pesca leva uma penalidade (BACKGROUND_FISHING_PENALTY) por não ser a
// especialização da vila — é alívio, não independência. Uma madeireira
// desesperada fica pouco acima do ponto de empate e continua precisando de
// `village/trade.js` pra prosperar, que é o pilar 4 do design.
export function produceBackgroundVillage(village, backgroundResidents, dt) {
  if (!backgroundResidents.length) return;

  const work = GATHER_RATE * BACKGROUND_WORK_EFFICIENCY * backgroundResidents.length * dt;
  const foodShare = Math.min(Math.max(village.demand?.food ?? 0, 0), 1);

  if (village.specialization === 'wood') {
    addStock(village, 'food', work * foodShare * BACKGROUND_FISHING_PENALTY);
    addStock(village, 'wood', work * (1 - foodShare));
    return;
  }

  // Vila agrícola: os dois lados do split são comida, então não há divisão
  // a fazer — o trabalho todo vai pro mesmo estoque.
  addStock(village, 'food', work);
}
