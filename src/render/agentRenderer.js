// Desenha os agentes via render/sprites/ (SpriteManager), com animação de
// verdade. Substitui a leva anterior de quadros estáticos recortados à mão,
// que tinha sido apagada por qualidade — o civil estava caindo no círculo
// geométrico desde então.
//
// Duas famílias de arte, dois formatos, a mesma interface:
//
// - **Civil** (`agent.role === 'civilian'`, a maioria): um dos 32 personagens
//   de `Pers-Sprites/Humanos-separados/`, formato grade RPG 3x4 — caminhada
//   com 4 direções de verdade. Qual dos 32 é escolhido por hash determinístico
//   de `agent.id`, então cada morador tem um rosto fixo pra vida toda. Isso
//   traz de volta a diversidade visual por agente que tinha sido abandonada
//   quando a arte passou a ser por AÇÃO corrente (DESIGN.md §8) — troca que
//   deixou de fazer sentido, porque as poses de trabalho (cortando árvore,
//   minerando, construindo, pescando, levando tronco) NÃO existem em nenhuma
//   arte disponível hoje. Perde-se a pose de trabalho, ganha-se direção real
//   e um elenco reconhecível.
//
// - **Guerreiro designado** (`agent.role === 'warrior'`): as tiras completas
//   de `Soldado1/` e `Monstro3/`, com idle/walk/attack/hurt/death. Sprite de
//   perfil, então a direção é resolvida espelhando no eixo X, não por linha
//   de grade.
//
// O que se perdeu nesta migração, explicitamente: as poses dedicadas de
// trabalho. As partículas (faísca ao minerar, lasca ao cortar) continuam,
// então "está trabalhando ali" ainda se lê — só não pela pose do corpo.

import { spawnDust, spawnSpark, spawnChip } from './particles.js';
import { SpriteManager } from './sprites/spriteManager.js';
import { createAnimator, directionFromVector } from './sprites/animator.js';
import { FORMAT } from './sprites/sheetFormats.js';
import { GRID_SHEETS, sheetsFor } from './sprites/packManifest.js';

// warriorType -> ator. O elfo continua sem arte própria (nenhum pack baixado
// tem uma) e cai no guerreiro genérico — decisão aceita há várias sessões,
// ver ROADMAP.md §2.4. Antes ele caía no círculo geométrico, porque o
// fallback apontava pra um arquivo que também não existia mais.
const WARRIOR_ACTOR = { orc: 'Orc', cavaleiro: 'Soldier', elfo: 'Soldier' };

const CIVILIAN_ACTORS = GRID_SHEETS.map((path) => path.split('/').pop().replace(/\.png$/i, ''));

// Pixels de tela por pixel da arte de origem, em zoom 1. Mesma ideia do
// ART_SCALE de predatorRenderer.js: escala uniforme em vez de altura fixa,
// pra diferença de tamanho entre personagens sair da própria arte.
// Calibrado pra um adulto ficar nos ~44px que a versão anterior usava.
const ART_SCALE = 2.1;
const SCALE_BY_STAGE = { child: 0.68, adult: 1, elder: 1 };

const RADIUS_BY_STAGE = { child: 6, adult: 9, elder: 9 }; // fallback enquanto os sprites carregam
const HEIGHT_BY_STAGE = { child: 30, adult: 44, elder: 44 }; // só pra sombra/anel antes da arte carregar

const MOVE_EPSILON = 0.05; // px de mundo por frame; abaixo disso conta como parado
const HIT_FLASH_SECONDS = 0.15;
const DUST_CHANCE_PER_FRAME = 0.06;
const WORK_PARTICLE_CHANCE_PER_FRAME = 0.08;

const manager = new SpriteManager();
let spritesReady = false;

manager
  .load([...GRID_SHEETS, ...sheetsFor('Soldier'), ...sheetsFor('Orc')])
  .then((result) => {
    spritesReady = true;
    if (result.failed.length) console.warn('[agentRenderer] folhas que não carregaram:', result.failed);
  })
  .catch((error) => console.warn('[agentRenderer] falha ao carregar sprites:', error));

// Hash determinístico de id — mesmo padrão de decorationRenderer.js pra
// variante de espécie, sem consumir a sequência de rng do mundo.
function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h >>> 0;
}

// Estado de apresentação por agente. Ao contrário dos predadores, agentes SÃO
// removidos de world.agents (lifecycle.js:pruneDead), então este Map cresceria
// pra sempre numa sessão longa com muitos nascimentos e mortes — daí a
// varredura periódica em sweepViews(). (O `lastPositions` da versão anterior
// tinha exatamente esse vazamento, nunca notado porque era pequeno.)
const views = new Map(); // agent.id -> { animator, actor, lastX, lastY, facing }

function actorIdFor(agent) {
  if (agent.role === 'warrior') return WARRIOR_ACTOR[agent.warriorType] ?? WARRIOR_ACTOR.cavaleiro;
  return CIVILIAN_ACTORS[hashId(agent.id) % CIVILIAN_ACTORS.length];
}

function viewFor(agent) {
  const wanted = actorIdFor(agent);
  const existing = views.get(agent.id);
  // O papel muda em tempo de execução (clanDecision.js designa guerreiro na
  // guerra e desmobiliza na paz), então o ator do agente pode trocar no meio
  // da vida — reconstrói a view quando isso acontece.
  if (existing && existing.actorId === wanted) return existing;

  const actor = manager.getActor(wanted);
  if (!actor) return null;

  const view = {
    actorId: wanted,
    actor,
    animator: createAnimator(actor, { state: 'idle' }),
    lastX: agent.position.x,
    lastY: agent.position.y,
    facing: 1,
  };
  views.set(agent.id, view);
  return view;
}

let sweepCounter = 0;
function sweepViews(world) {
  if (++sweepCounter < 600) return; // ~10s a 60fps; varrer todo frame não paga
  sweepCounter = 0;
  const alive = new Set(world.agents.map((a) => a.id));
  for (const id of views.keys()) if (!alive.has(id)) views.delete(id);
}

function animationStateFor(agent, moving) {
  if (!agent.alive) return 'dead';
  if (agent.currentAction === 'fight' || agent.currentAction === 'fightPredator') return 'attacking';
  return moving ? 'walking' : 'idle';
}

function drawShadow(ctx, x, y, width) {
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, width / 5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fill();
}

// Vários agentes convergindo pro mesmo ponto (centro da vila) acabariam
// desenhados exatamente sobrepostos, dando a impressão de que sumiram (achado
// jogando, ver STATUS.md). Espalha só o desenho, nunca `agent.position`.
function stackOffset(agent, camera) {
  const h = hashId(agent.id);
  const angle = ((h % 1000) / 1000) * Math.PI * 2;
  const dist = Math.max(2, 6 * camera.zoom);
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
}

// Delta simulado, mesma justificativa de predatorRenderer.js: animação de
// personagem representa deslocamento no mundo, então congela no pause e
// acelera em 4x junto com a simulação (ao contrário de partículas/câmera).
let lastElapsed = null;
function simDelta(world) {
  const now = world.elapsedSeconds ?? 0;
  if (lastElapsed === null) {
    lastElapsed = now;
    return 0;
  }
  const delta = Math.max(0, Math.min(now - lastElapsed, 0.25));
  lastElapsed = now;
  return delta;
}

function drawFallbackCircle(ctx, agent, pos, camera, flashing) {
  const radius = Math.max(2, (RADIUS_BY_STAGE[agent.lifeStage] ?? 9) * camera.zoom);
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = flashing ? '#ff4040' : '#ffdd55';
  ctx.fill();
  ctx.strokeStyle = '#402c00';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawAgents(ctx, world, camera, selectedAgentId) {
  const viewW = ctx.canvas.width;
  const viewH = ctx.canvas.height;
  const now = world.elapsedSeconds ?? 0;
  const dt = simDelta(world);
  sweepViews(world);

  for (const agent of world.agents) {
    const pos = camera.worldToScreen(agent.position.x, agent.position.y, viewW, viewH);
    const offset = stackOffset(agent, camera);
    pos.x += offset.x;
    pos.y += offset.y;

    const flashing = agent.hitFlashAt != null && now - agent.hitFlashAt < HIT_FLASH_SECONDS;
    const view = spritesReady ? viewFor(agent) : null;

    if (!view) {
      drawShadow(ctx, pos.x, pos.y, (HEIGHT_BY_STAGE[agent.lifeStage] ?? 44) * camera.zoom * 0.6);
      drawFallbackCircle(ctx, agent, pos, camera, flashing);
      continue;
    }

    const dx = agent.position.x - view.lastX;
    const dy = agent.position.y - view.lastY;
    view.lastX = agent.position.x;
    view.lastY = agent.position.y;
    const moved = Math.hypot(dx, dy) > MOVE_EPSILON;

    const isGrid = view.actor.format === FORMAT.GRID;
    if (moved) {
      // Grade tem as 4 direções desenhadas; tira é de perfil e só espelha.
      if (isGrid) view.animator.setDirection(directionFromVector(dx, dy));
      else if (Math.abs(dx) > MOVE_EPSILON) view.facing = dx < 0 ? -1 : 1;
    }

    view.animator.setState(animationStateFor(agent, moved));
    view.animator.update(dt);

    const rect = view.animator.currentFrame(manager);
    if (!rect) {
      drawFallbackCircle(ctx, agent, pos, camera, flashing);
      continue;
    }

    const stageScale = SCALE_BY_STAGE[agent.lifeStage] ?? 1;
    const h = rect.sh * ART_SCALE * stageScale * camera.zoom;
    const w = rect.sw * ART_SCALE * stageScale * camera.zoom;

    if (agent.alive) drawShadow(ctx, pos.x, pos.y, w * 0.6);

    if (agent.id === selectedAgentId) {
      const ringR = Math.max(11, 18 * camera.zoom);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (agent.alive) {
      if (moved && Math.random() < DUST_CHANCE_PER_FRAME) {
        spawnDust(agent.position.x, agent.position.y);
      } else if (!moved && Math.random() < WORK_PARTICLE_CHANCE_PER_FRAME) {
        if (agent.currentAction === 'mine') spawnSpark(agent.position.x, agent.position.y - 10);
        else if (agent.currentAction === 'gatherWood') spawnChip(agent.position.x, agent.position.y - 10);
      }
    }

    // Um civil não tem clipe de morte (a grade RPG só traz caminhada), então
    // a cascata do animator o deixaria de pé durante o DEATH_LINGER_SECONDS —
    // um cadáver em posição de sentido. Deita e desbota nesse caso; o
    // guerreiro, que tem `death` de verdade, toca a animação normalmente.
    const fallen = !agent.alive && view.animator.clipName !== 'death';

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(pos.x, pos.y);
    if (fallen) {
      ctx.rotate(Math.PI / 2);
      ctx.globalAlpha = 0.65;
    }
    ctx.scale(view.facing, 1);
    ctx.drawImage(rect.image, rect.sx, rect.sy, rect.sw, rect.sh, -w / 2, -h, w, h);

    if (flashing) {
      // 'source-atop' só pinta sobre os pixels opacos do sprite recém
      // desenhado — silhueta exata, sem retângulo vazando.
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(255, 40, 40, 0.55)';
      ctx.fillRect(-w / 2, -h, w, h);
    }
    ctx.restore();
  }
}
