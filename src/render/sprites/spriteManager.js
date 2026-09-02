// SpriteManager: carrega folhas, identifica o formato de cada uma e agrupa as
// que pertencem ao mesmo personagem num "ator" pronto pra animar.
//
// A distinção entre os dois formatos acontece aqui e não vaza pra fora: quem
// consome um ator (animator.js, e depois os renderers do jogo) pergunta
// "me dá o quadro do clipe X" e recebe um retângulo, sem saber nem precisar
// saber se aquilo veio de uma tira ou de uma grade.

import { loadSheets } from './spriteSheet.js';
import { detectFormat, getFormat, FORMAT } from './sheetFormats.js';
import { unionContentBounds } from './contentBounds.js';

export class SpriteManager {
  constructor() {
    this.sheets = new Map(); // path -> descriptor
    this.actors = new Map(); // id do ator -> { id, format, clips, ... }
    this.failures = [];
  }

  // Carrega e registra uma lista de caminhos. Falha de arquivo individual não
  // derruba o resto — vai pra `failures` e o ator simplesmente fica sem
  // aquele clipe.
  async load(paths) {
    const { loaded, failed } = await loadSheets(paths);
    this.failures.push(...failed);

    for (const [path, img] of loaded) {
      const format = detectFormat(path, img);
      if (!format) {
        this.failures.push({ path, reason: 'nenhum formato reconhecido' });
        continue;
      }
      try {
        this.sheets.set(path, format.describe(path, img));
      } catch (error) {
        this.failures.push({ path, reason: error.message });
      }
    }

    this.#buildActors();
    for (const actor of this.actors.values()) this.#measureActor(actor);
    return { loadedCount: loaded.size, failed: this.failures };
  }

  // Caixa de conteúdo do ator: união de todos os quadros de todos os clipes
  // dele. Feita uma vez no carregamento, nunca por quadro desenhado — é uma
  // leitura de pixels, cara demais pra ficar no laço de render.
  #measureActor(actor) {
    const byImage = new Map(); // image -> retângulos a medir

    for (const clip of actor.clips.values()) {
      const format = getFormat(clip.sheet.format);
      for (const frame of clip.frames) {
        // Na grade, o conteúdo muda por direção também — mede as 4.
        const directions = clip.sheet.directions ?? 1;
        for (let direction = 0; direction < directions; direction++) {
          const rect = format.frameRect(clip.sheet, { frame, direction, charIndex: actor.charIndex });
          if (!byImage.has(clip.sheet.image)) byImage.set(clip.sheet.image, []);
          byImage.get(clip.sheet.image).push(rect);
        }
      }
    }

    // Um ator de tira tem uma imagem por clipe; junta a caixa de todas elas
    // pra escala e âncora ficarem iguais em qualquer estado.
    let union = null;
    for (const [image, rects] of byImage) {
      const bounds = unionContentBounds(image, rects);
      if (!bounds) continue;
      union = union
        ? {
            x: Math.min(union.x, bounds.x),
            y: Math.min(union.y, bounds.y),
            w: Math.max(union.x + union.w, bounds.x + bounds.w) - Math.min(union.x, bounds.x),
            h: Math.max(union.y + union.h, bounds.y + bounds.h) - Math.min(union.y, bounds.y),
          }
        : bounds;
    }

    actor.contentBounds = union;
  }

  // Agrupa as folhas em atores. Tira: um ator por nome de personagem, com um
  // clipe por arquivo. Grade: um ator por personagem dentro da folha, com os
  // clipes derivados do próprio layout (a grade não traz ataque/dano/morte —
  // limitação do formato, não do código).
  #buildActors() {
    for (const desc of this.sheets.values()) {
      if (desc.format === FORMAT.STRIP) {
        const id = desc.variant ? `${desc.actor}_${desc.variant}` : desc.actor;
        const actor = this.#ensureActor(id, FORMAT.STRIP);
        actor.clips.set(desc.clip, {
          name: desc.clip,
          animation: desc.animation,
          sheet: desc,
          frames: Array.from({ length: desc.frameCount }, (_, i) => i),
          loop: desc.loop,
          fps: desc.fps,
        });
        continue;
      }

      for (let charIndex = 0; charIndex < desc.characters; charIndex++) {
        const id = desc.characters > 1 ? `${desc.actor}#${charIndex}` : desc.actor;
        const actor = this.#ensureActor(id, FORMAT.GRID);
        actor.charIndex = charIndex;
        // O quadro do meio (1) é o parado, os três juntos são a caminhada.
        // 0,1,2,1 é o ciclo clássico deste layout: o pé de apoio volta ao
        // centro entre as passadas, senão a caminhada "pula" de um pé pro
        // outro sem transição.
        actor.clips.set('idle', { name: 'idle', animation: 'idle', sheet: desc, frames: [1], loop: true, fps: 1 });
        actor.clips.set('walk', { name: 'walk', animation: 'walk', sheet: desc, frames: [0, 1, 2, 1], loop: true, fps: 8 });
      }
    }
  }

  #ensureActor(id, format) {
    let actor = this.actors.get(id);
    if (!actor) {
      actor = { id, format, clips: new Map(), charIndex: 0 };
      this.actors.set(id, actor);
    }
    return actor;
  }

  getActor(id) {
    return this.actors.get(id) ?? null;
  }

  listActors() {
    return [...this.actors.values()];
  }

  // Retângulo de origem de um quadro. `frame` é o índice DENTRO do clipe
  // (não do arquivo) — o clipe traduz via sua lista `frames`, que é o que
  // permite ao walk da grade tocar 0,1,2,1 sem inventar quadro que não existe.
  frameRect(actor, clipName, frameInClip, direction = 0) {
    const clip = actor.clips.get(clipName);
    if (!clip) return null;

    const format = getFormat(clip.sheet.format);
    const sourceFrame = clip.frames[frameInClip % clip.frames.length] ?? 0;
    const rect = format.frameRect(clip.sheet, {
      frame: sourceFrame,
      direction,
      charIndex: actor.charIndex,
    });

    // Aplica o recorte por alfa do ator, quando existe: o quadro bruto é
    // quase todo transparente nas tiras 100x100.
    const bounds = actor.contentBounds;
    if (!bounds) return { image: clip.sheet.image, ...rect };

    return {
      image: clip.sheet.image,
      sx: rect.sx + bounds.x,
      sy: rect.sy + bounds.y,
      sw: bounds.w,
      sh: bounds.h,
    };
  }

  // Desenha um quadro já resolvido, ancorado no pé do sprite (x,y = base
  // central) — mesma convenção que agentRenderer.js/predatorRenderer.js já
  // usam, pra facilitar a ligação no jogo depois.
  draw(ctx, rect, x, y, height) {
    if (!rect) return;
    const width = height * (rect.sw / rect.sh);
    ctx.drawImage(rect.image, rect.sx, rect.sy, rect.sw, rect.sh, x - width / 2, y - height, width, height);
  }
}
