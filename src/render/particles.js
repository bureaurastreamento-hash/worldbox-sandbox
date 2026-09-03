// Partículas leves ligadas a ação (poeira ao andar, faísca ao minerar,
// lasca ao cortar árvore) — pool simples em memória de módulo (não em
// `world`, é puramente visual, não precisa ser determinístico nem
// serializável). Teto rígido de partículas vivas pra nunca competir com o
// orçamento de frame que Frente 1 mediu (drawTiles/perception dominam o
// custo; isso aqui é O(partículas vivas), sempre pequeno).

import { createPool } from '../utils/objectPool.js';

const MAX_PARTICLES = 150;

// Pool pré-alocado em vez de `push`/`splice` num array.
//
// A versão anterior criava um objeto literal por partícula e usava `splice`
// pra removê-la — ou seja, alocação constante MAIS realocação do array a cada
// morte, no caminho mais quente do render. O custo médio era baixo, mas era
// exatamente o tipo de lixo por frame que faz o coletor parar tudo em
// intervalos irregulares: some no tempo médio de frame e aparece como
// engasgo.
const pool = createPool(MAX_PARTICLES, () => ({
  x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 1, gravity: 0, color: '#fff',
}));

// Reinicializa NO LUGAR. Escrever campo a campo (em vez de `Object.assign`
// com um literal) é o ponto: um literal aqui traria a alocação de volta.
function spawn(x, y, vx, vy, life, size, color, gravity = 0) {
  const p = pool.acquire();
  if (!p) return; // pool cheio: simplesmente não nasce, sem crescer memória
  p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  p.age = 0; p.life = life; p.size = size; p.color = color; p.gravity = gravity;
}

// Poeira ao andar: pequena, sobe e desvanece devagar. Chamado com baixa
// probabilidade por agentRenderer.js (não todo frame — senão ninguém nota
// partícula individual, só uma nuvem constante).
export function spawnDust(x, y) {
  spawn(
    x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 4,
    (Math.random() - 0.5) * 6, -4 - Math.random() * 4,
    0.4 + Math.random() * 0.2, 2 + Math.random() * 1.5,
    'rgba(210, 200, 170, 0.55)',
  );
}

// Faísca de mineração: rápida, some rápido, sobe com um leve arco.
export function spawnSpark(x, y) {
  spawn(
    x + (Math.random() - 0.5) * 6, y,
    (Math.random() - 0.5) * 30, -20 - Math.random() * 20,
    0.25 + Math.random() * 0.15, 2,
    'rgba(255, 214, 102, 0.9)', 60,
  );
}

// Lasca de madeira ao cortar árvore: marrom, cai com gravidade.
export function spawnChip(x, y) {
  spawn(
    x + (Math.random() - 0.5) * 6, y,
    (Math.random() - 0.5) * 20, -15 - Math.random() * 10,
    0.3 + Math.random() * 0.2, 2.5,
    'rgba(139, 94, 52, 0.85)', 90,
  );
}

export function updateParticles(dt) {
  pool.forEachActive((p) => {
    p.age += dt;
    if (p.age >= p.life) {
      pool.release(p); // só marca a flag; nada de splice realocando o array
      return;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
  });
}

export function drawParticles(ctx, camera, viewW, viewH) {
  if (pool.live === 0) return;
  pool.forEachActive((p) => {
    const pos = camera.worldToScreen(p.x, p.y, viewW, viewH);
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = p.color;
    const size = Math.max(1, p.size * camera.zoom);
    ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
  });
  ctx.globalAlpha = 1;
}

export function liveParticleCount() {
  return pool.live;
}
