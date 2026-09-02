// Partículas leves ligadas a ação (poeira ao andar, faísca ao minerar,
// lasca ao cortar árvore) — pool simples em memória de módulo (não em
// `world`, é puramente visual, não precisa ser determinístico nem
// serializável). Teto rígido de partículas vivas pra nunca competir com o
// orçamento de frame que Frente 1 mediu (drawTiles/perception dominam o
// custo; isso aqui é O(partículas vivas), sempre pequeno).

const MAX_PARTICLES = 150;
const particles = [];

function spawn(p) {
  if (particles.length >= MAX_PARTICLES) return;
  particles.push({ age: 0, gravity: 0, ...p });
}

// Poeira ao andar: pequena, sobe e desvanece devagar. Chamado com baixa
// probabilidade por agentRenderer.js (não todo frame — senão ninguém nota
// partícula individual, só uma nuvem constante).
export function spawnDust(x, y) {
  spawn({
    x: x + (Math.random() - 0.5) * 8,
    y: y + (Math.random() - 0.5) * 4,
    vx: (Math.random() - 0.5) * 6,
    vy: -4 - Math.random() * 4,
    life: 0.4 + Math.random() * 0.2,
    size: 2 + Math.random() * 1.5,
    color: 'rgba(210, 200, 170, 0.55)',
  });
}

// Faísca de mineração: rápida, some rápido, sobe com um leve arco.
export function spawnSpark(x, y) {
  spawn({
    x: x + (Math.random() - 0.5) * 6,
    y,
    vx: (Math.random() - 0.5) * 30,
    vy: -20 - Math.random() * 20,
    gravity: 60,
    life: 0.25 + Math.random() * 0.15,
    size: 2,
    color: 'rgba(255, 214, 102, 0.9)',
  });
}

// Lasca de madeira ao cortar árvore: marrom, cai com gravidade.
export function spawnChip(x, y) {
  spawn({
    x: x + (Math.random() - 0.5) * 6,
    y,
    vx: (Math.random() - 0.5) * 20,
    vy: -15 - Math.random() * 10,
    gravity: 90,
    life: 0.3 + Math.random() * 0.2,
    size: 2.5,
    color: 'rgba(139, 94, 52, 0.85)',
  });
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.age += dt;
    if (p.age >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
  }
}

export function drawParticles(ctx, camera, viewW, viewH) {
  if (particles.length === 0) return;
  for (const p of particles) {
    const pos = camera.worldToScreen(p.x, p.y, viewW, viewH);
    const t = p.age / p.life;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillStyle = p.color;
    const size = Math.max(1, p.size * camera.zoom);
    ctx.fillRect(pos.x - size / 2, pos.y - size / 2, size, size);
  }
  ctx.globalAlpha = 1;
}
