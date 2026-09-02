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
import { EAT_FOOD_PER_SEC, EAT_RESTORE_PER_FOOD } from '../utils/constants.js';

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
  const hungry = backgroundResidents.filter((a) => a.needs.hunger < 100);
  if (hungry.length === 0) return;

  const consume = Math.min(EAT_FOOD_PER_SEC * hungry.length * dt, village.stock.food ?? 0);
  if (consume <= 0) return;

  addStock(village, 'food', -consume);
  const restorePerAgent = (consume * EAT_RESTORE_PER_FOOD) / hungry.length;
  for (const agent of hungry) applyEffect(agent.needs, 'hunger', restorePerAgent);
}
