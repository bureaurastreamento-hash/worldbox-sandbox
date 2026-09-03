// Separação leve entre agentes (técnica clássica de "boids"): quando dois
// agentes ficam muito próximos, um pequeno empurrão de afastamento entre
// eles — mexe em `agent.position` de verdade (ao contrário do offset
// puramente visual de render/agentRenderer.js:stackOffset, que só desenha
// deslocado sem mudar a posição real).
//
// Roda pra TODOS os agentes vivos, não só pros que estão em tela — desde que
// o LOD de simulação por viewport foi removido (ver simulation/scheduler.js),
// não existe mais "população fora de foco" que possa pular física.
//
// Por isso a varredura O(n²) que existia aqui teve que sair: ela era
// aceitável quando o conjunto era só quem cabia na tela, mas com o mapa
// inteiro simulado ela é o gargalo mais caro do tick (500 agentes = 125 mil
// pares por frame). Agora usa um índice espacial PRÓPRIO, com célula do
// tamanho do raio de separação — o índice de percepção não serve, porque a
// célula dele tem o tamanho do raio de percepção (384px) e devolveria
// centenas de candidatos pra um teste de 10px.
//
// Cada par é tratado UMA vez (`other.id <= agent.id` descarta a metade
// espelhada), senão o empurrão seria aplicado em dobro.
//
// Simplificação conhecida: não verifica terreno andável — um empurrão pode,
// em tese, deslocar um agente alguns px pra dentro de água/montanha perto da
// costa. Deslocamento é pequeno (SEPARATION_RADIUS) e ocorre só quando já
// há aglomeração, então o risco visual é baixo; revisitar se aparecer
// jogando.

import { SEPARATION_RADIUS, SEPARATION_STRENGTH } from '../utils/constants.js';
import { buildSpatialIndex, queryNearby } from '../world/spatialIndex.js';

export function applySeparation(agents, dt) {
  if (agents.length < 2) return;

  const index = buildSpatialIndex(agents, SEPARATION_RADIUS);

  for (const a of agents) {
    for (const b of queryNearby(index, a.position, SEPARATION_RADIUS)) {
      if (b.id <= a.id) continue; // cada par uma vez só

      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= SEPARATION_RADIUS * SEPARATION_RADIUS) continue;

      // Exatamente sobrepostos: empurra numa direção fixa em vez de dividir
      // por zero.
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
