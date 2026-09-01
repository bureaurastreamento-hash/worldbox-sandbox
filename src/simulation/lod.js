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

import { BACKGROUND_NEEDS_RESTORE_PER_SEC } from '../utils/constants.js';

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

// Substitui needs+decision+ação pra quem tá fora de foco: a vila "se vira
// sozinha" sem simular exatamente como. Posição fica parada (ninguém tá
// vendo se anda ou não); idade e morte por idade continuam normais em
// main.js, fora daqui.
export function stepBackgroundAgent(agent, dt) {
  const restore = BACKGROUND_NEEDS_RESTORE_PER_SEC * dt;
  agent.needs.hunger = Math.min(100, agent.needs.hunger + restore);
  agent.needs.sleep = Math.min(100, agent.needs.sleep + restore);
}
