// Nível de detalhe de simulação: agentes longe da câmera não precisam de
// percepção/decisão/pathfinding completos todo tick — ninguém tá vendo, e
// isso é o que mais pesa por agente. Promove/rebaixa sozinho a cada tick,
// só olhando a distância até a câmera — sem estado persistente de "quem tá
// em foco", então não tem transição para tratar à parte.

import { distance } from '../utils/mathUtils.js';
import { LOD_ACTIVE_RADIUS, BACKGROUND_NEEDS_RESTORE_PER_SEC } from '../utils/constants.js';

export function classifyAgents(world, camera) {
  const active = [];
  const background = [];

  for (const agent of world.agents) {
    if (!agent.alive) continue;
    const target = distance(agent.position, camera) <= LOD_ACTIVE_RADIUS ? active : background;
    target.push(agent);
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
