// Overlay de iluminação ambiente: uma variação sutil de tom conforme a hora
// do dia, derivada de `world.elapsedSeconds` — não é um ciclo dia/noite de
// verdade (sem nascer-do-sol, sem afetar percepção/jogabilidade), só um
// retângulo semitransparente por cima de tudo, uma única `fillRect` por
// frame (barato de propósito — Frente 1 já achou o orçamento de frame
// apertado em zoom baixo, isso não pode competir com drawTiles).

const DAY_LENGTH_SECONDS = 240; // um "dia" completo a cada 4min simulados

// 4 pontos de cor ao longo do dia (meio-dia, entardecer, meia-noite,
// amanhecer) — interpolados linearmente entre eles. Alpha baixo o bastante
// pra nunca escurecer a leitura do jogo, só dar uma sensação de ambiente.
const KEYFRAMES = [
  { t: 0.0, color: [255, 255, 255], alpha: 0 }, // meio-dia: sem overlay
  { t: 0.25, color: [255, 170, 90], alpha: 0.06 }, // entardecer: laranja leve
  { t: 0.5, color: [40, 50, 110], alpha: 0.16 }, // meia-noite: azul escuro
  { t: 0.75, color: [255, 190, 130], alpha: 0.05 }, // amanhecer: laranja bem leve
  { t: 1.0, color: [255, 255, 255], alpha: 0 },
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function sampleKeyframes(t) {
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (t >= a.t && t <= b.t) {
      const local = (t - a.t) / (b.t - a.t);
      return {
        color: [
          lerp(a.color[0], b.color[0], local),
          lerp(a.color[1], b.color[1], local),
          lerp(a.color[2], b.color[2], local),
        ],
        alpha: lerp(a.alpha, b.alpha, local),
      };
    }
  }
  return KEYFRAMES[0];
}

export function drawLighting(ctx, world, viewW, viewH) {
  const t = ((world.elapsedSeconds ?? 0) % DAY_LENGTH_SECONDS) / DAY_LENGTH_SECONDS;
  const { color, alpha } = sampleKeyframes(t);
  if (alpha <= 0) return;

  ctx.fillStyle = `rgba(${color[0] | 0}, ${color[1] | 0}, ${color[2] | 0}, ${alpha})`;
  ctx.fillRect(0, 0, viewW, viewH);
}
