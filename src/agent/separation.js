// Separação leve entre agentes (técnica clássica de "boids"): quando dois
// agentes ficam muito próximos, um pequeno empurrão de afastamento entre
// eles — mexe em `agent.position` de verdade (ao contrário do offset
// puramente visual de render/agentRenderer.js:stackOffset, que só desenha
// deslocado sem mudar a posição real). Só roda pros agentes já classificados
// `active` pelo LOD (simulation/lod.js) — população fora de foco não paga
// esse custo, mesmo espírito de perception/decision já restritas a `active`.
//
// O(n²) pares dentro do conjunto `active` — aceitável porque LOD já mantém
// esse conjunto pequeno (só quem está em tela); não usa spatialIndex de
// propósito, pra manter simples enquanto o custo real for baixo.
//
// Simplificação conhecida: não verifica terreno andável — um empurrão pode,
// em tese, deslocar um agente alguns px pra dentro de água/montanha perto da
// costa. Deslocamento é pequeno (SEPARATION_RADIUS) e ocorre só quando já
// há aglomeração, então o risco visual é baixo; revisitar se aparecer
// jogando.

import { SEPARATION_RADIUS, SEPARATION_STRENGTH } from '../utils/constants.js';

export function applySeparation(agents, dt) {
  for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
      const a = agents[i];
      const b = agents[j];
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= SEPARATION_RADIUS * SEPARATION_RADIUS) continue;

      // Exatamente sobrepostos: empurra numa direção determinística (hash
      // dos ids) em vez de travar numa divisão por zero.
      const dist = Math.sqrt(distSq);
      const nx = dist > 0.001 ? dx / dist : 1;
      const ny = dist > 0.001 ? dy / dist : 0;

      const overlap = (SEPARATION_RADIUS - dist) / SEPARATION_RADIUS; // 0..1
      const push = (SEPARATION_STRENGTH * overlap * dt) / 2; // metade pra cada lado

      a.position.x -= nx * push;
      a.position.y -= ny * push;
      b.position.x += nx * push;
      b.position.y += ny * push;
    }
  }
}
