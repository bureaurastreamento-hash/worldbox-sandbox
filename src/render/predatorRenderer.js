// Desenha os predadores (predator/predatorAI.js), agora com animação de
// verdade via render/sprites/ em vez de um quadro estático por estado.
//
// Arte: Tiny RPG Character Asset Pack 02, lida direto das tiras do pack
// (`assets/Pers-Sprites/Monstro1` e `Monstro2`) — Idle/Walk/Attack/Hurt/Death
// completos. Os recortes estáticos que existiam antes em `assets/sprites/`
// (Demonio.png, MonstroSangue.png e os dois "Atacando") saíram: eram um
// quadro escolhido a dedo de cada tira, e agora a tira inteira é usada.
//
// Este arquivo não guarda estado de jogo — só o estado de apresentação
// (qual quadro cada predador está mostrando, pra que lado ele olha), num Map
// de módulo, mesmo padrão de render/particles.js.

import { SpriteManager } from './sprites/spriteManager.js';
import { createAnimator } from './sprites/animator.js';
import { sheetsFor } from './sprites/packManifest.js';

const ACTOR_BY_SPECIES = { demon: 'Demon_A', blood: 'Blood Monster_A' };

// Quantos pixels de tela vale um pixel da arte de origem, em zoom 1. Como as
// duas espécies vêm do mesmo pack, desenhadas na mesma escala pelo artista,
// uma escala única já produz o tamanho relativo certo entre elas — o demônio
// em pé tem 20px de arte e o monstro rasteiro tem 15px, e essa diferença
// aparece sozinha. É o que torna o antigo `renderScale` por espécie
// desnecessário: ele existia só porque o recorte por alfa de um quadro
// estático normalizava as duas pra mesma altura na tela.
const ART_SCALE = 1.4;

const HIT_FLASH_SECONDS = 0.15; // mesmo valor de render/agentRenderer.js

// Deslocamento mínimo (px de mundo, por quadro) pra contar como "andando".
// Um predador a 40px/s a 60fps anda ~0.67px por quadro, então a margem é
// folgada o bastante pra não confundir com ruído e apertada o bastante pra
// não engolir movimento real.
const MOVE_EPSILON = 0.001;

const manager = new SpriteManager();
let spritesReady = false;

manager
  .load(Object.values(ACTOR_BY_SPECIES).flatMap(sheetsFor))
  .then((result) => {
    spritesReady = true;
    if (result.failed.length) console.warn('[predatorRenderer] tiras que não carregaram:', result.failed);
  })
  .catch((error) => console.warn('[predatorRenderer] falha ao carregar sprites:', error));

// Estado de apresentação por predador. Chaveado por id; predador nunca é
// removido de world.predators (só marcado `alive: false`), então não há
// entrada órfã pra limpar.
const views = new Map(); // predator.id -> { animator, lastX, lastY, facing }

function viewFor(predator) {
  let view = views.get(predator.id);
  if (view) return view;

  const actor = manager.getActor(ACTOR_BY_SPECIES[predator.species]);
  if (!actor) return null;

  view = {
    animator: createAnimator(actor, { state: 'idle' }),
    lastX: predator.position.x,
    lastY: predator.position.y,
    facing: 1, // 1 = olhando pra direita (o lado em que a arte foi desenhada)
  };
  views.set(predator.id, view);
  return view;
}

// A FSM do predador é sobre intenção ("estou perseguindo"); a do animator é
// sobre o que se vê. A tradução não é 1:1 de propósito: patrulhar/perseguir/
// fugir viram "andando" ou "parado" conforme o bicho tenha realmente se
// mexido no último quadro — um predador em `patrolling` que já chegou ao
// alvo está parado, e mostrar ele marchando no lugar entregaria o truque.
function animationStateFor(predator, moved) {
  if (!predator.alive) return 'dead';
  if (predator.state === 'attacking') return 'attacking';
  return moved ? 'walking' : 'idle';
}

function drawPlaceholder(ctx, x, y, size) {
  ctx.beginPath();
  ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#8a3b2b';
  ctx.fill();
}

function drawShadow(ctx, x, y, width) {
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, width / 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fill();
}

// Delta de tempo SIMULADO, derivado de world.elapsedSeconds.
//
// Ao contrário de partículas/câmera/tremor (que usam tempo real de propósito,
// pra continuarem suaves com o jogo pausado), a animação de um personagem
// precisa andar junto com a simulação: a perna se mexendo representa chão
// sendo percorrido. Com tempo real, um predador congelado pelo pause seguiria
// marchando no lugar, e em 4x andaria rápido animando devagar.
let lastElapsed = null;
function simDelta(world) {
  const now = world.elapsedSeconds ?? 0;
  if (lastElapsed === null) {
    lastElapsed = now;
    return 0;
  }
  const delta = Math.max(0, Math.min(now - lastElapsed, 0.25)); // teto contra salto após pause longo
  lastElapsed = now;
  return delta;
}

export function drawPredators(ctx, world, camera) {
  if (!world.predators?.length) return;

  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const now = world.elapsedSeconds ?? 0;
  const dt = simDelta(world);
  ctx.imageSmoothingEnabled = false;

  for (const predator of world.predators) {
    const pos = camera.worldToScreen(predator.position.x, predator.position.y, viewW, viewH);

    // Predador morto continua desenhado: `world.predators` nunca é podado,
    // então a animação de morte roda e segura no último quadro (o animator
    // marca 'dead' com hold). Antes o corpo sumia no mesmo tick da morte,
    // por falta de arte pra mostrar — não por decisão de design.
    const view = spritesReady ? viewFor(predator) : null;
    if (!view) {
      if (predator.alive) drawPlaceholder(ctx, pos.x, pos.y, 28 * camera.zoom);
      continue;
    }

    // "Andou?" precisa olhar os DOIS eixos: com só o X, um predador subindo
    // ou descendo em linha reta contaria como parado e mostraria a pose de
    // repouso enquanto se desloca. O X sozinho decide apenas pra que lado ele
    // olha — e só quando há deslocamento horizontal de verdade, senão o
    // espelhamento ficaria trocando de lado no ruído de um movimento vertical.
    const dx = predator.position.x - view.lastX;
    const dy = predator.position.y - view.lastY;
    view.lastX = predator.position.x;
    view.lastY = predator.position.y;

    const moved = Math.hypot(dx, dy) > MOVE_EPSILON;
    if (Math.abs(dx) > MOVE_EPSILON) view.facing = dx < 0 ? -1 : 1;

    view.animator.setState(animationStateFor(predator, moved));
    view.animator.update(dt);

    const rect = view.animator.currentFrame(manager);
    if (!rect) continue;

    const h = rect.sh * ART_SCALE * camera.zoom;
    const w = rect.sw * ART_SCALE * camera.zoom;
    if (predator.alive) drawShadow(ctx, pos.x, pos.y, w * 0.6);

    // A arte olha pra direita; espelha no eixo X quando o bicho anda pra
    // esquerda, em vez de manter todo predador virado pro mesmo lado.
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(view.facing, 1);
    ctx.drawImage(rect.image, rect.sx, rect.sy, rect.sw, rect.sh, -w / 2, -h, w, h);

    if (predator.hitFlashAt != null && now - predator.hitFlashAt < HIT_FLASH_SECONDS) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255, 40, 40, 0.55)';
      ctx.fillRect(-w / 2, -h, w, h);
    }
    ctx.restore();
  }
}

