// Animator: a máquina de estados que liga "o que a entidade está fazendo" a
// "qual clipe tocar e em que quadro ele está agora".
//
// Fica de fora da simulação de propósito — o animator só LÊ um estado que
// alguém já decidiu (a FSM do predador, a ação escolhida pelo utility AI do
// agente) e escolhe pixels. Nenhum estado de jogo mora aqui, mesmo espírito
// de render/particles.js.

import { DIRECTION } from './animationCatalog.js';

export { DIRECTION };

// Estado da entidade -> clipes aceitáveis, em ordem de preferência. A lista é
// uma cascata porque nem todo ator tem todo clipe: a grade RPG só tem
// idle/walk, então "atacando" cai em walk e depois em idle em vez de sumir
// da tela. `hold` marca os estados cuja animação para no último quadro em vez
// de voltar (morte fica caída; ataque e dano voltam sozinhos).
const STATE_CLIPS = {
  idle: { clips: ['idle', 'walk'], hold: false },
  walking: { clips: ['walk', 'idle'], hold: false },
  attacking: { clips: ['attack01', 'attack', 'attack02', 'idle'], hold: false },
  hurt: { clips: ['hurt', 'idle'], hold: false },
  dead: { clips: ['death', 'hurt', 'idle'], hold: true },
};

const DEFAULT_STATE = 'idle';

// Direção a partir de um vetor de movimento. Eixo dominante vence — sem isso
// um agente andando na diagonal ficaria alternando de sprite a cada quadro.
export function directionFromVector(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? DIRECTION.LEFT : DIRECTION.RIGHT;
  return dy < 0 ? DIRECTION.UP : DIRECTION.DOWN;
}

export function createAnimator(actor, { state = DEFAULT_STATE, direction = DIRECTION.DOWN } = {}) {
  let currentState = null;
  let clip = null;
  let frameInClip = 0;
  let elapsed = 0;
  let finished = false;
  let onComplete = null;

  function resolveClip(stateName) {
    const entry = STATE_CLIPS[stateName] ?? STATE_CLIPS[DEFAULT_STATE];
    for (const name of entry.clips) {
      const candidate = actor.clips.get(name);
      if (candidate) return { clip: candidate, hold: entry.hold };
    }
    // Ator sem nenhum clipe da cascata: usa o primeiro que tiver, pra sempre
    // sobrar alguma coisa desenhável.
    const [first] = actor.clips.values();
    return first ? { clip: first, hold: entry.hold } : null;
  }

  function setState(stateName, { force = false } = {}) {
    if (stateName === currentState && !force) return;
    const resolved = resolveClip(stateName);
    if (!resolved) return;

    currentState = stateName;
    clip = resolved.clip;
    api.hold = resolved.hold;
    frameInClip = 0;
    elapsed = 0;
    finished = false;
  }

  const api = {
    actor,
    direction,
    hold: false,

    get state() {
      return currentState;
    },
    get clipName() {
      return clip?.name ?? null;
    },
    get finished() {
      return finished;
    },

    setState,

    setDirection(value) {
      api.direction = value;
    },

    // Conveniência pro caso mais comum: a entidade se moveu, então ela está
    // andando e olhando pra onde foi. Abaixo de um limiar mínimo conta como
    // parada — senão o menor ajuste de posição (a separação entre agentes,
    // por exemplo) já dispararia a animação de caminhada.
    setMovement(dx, dy, { threshold = 0.01 } = {}) {
      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        if (currentState === 'walking') setState('idle');
        return;
      }
      api.direction = directionFromVector(dx, dy);
      if (currentState === 'idle' || currentState === null) setState('walking');
    },

    // `onFinish` dispara uma vez quando um clipe não-loop termina — é como o
    // chamador sabe que o golpe acabou e pode voltar pro estado anterior.
    onFinish(callback) {
      onComplete = callback;
    },

    update(dt) {
      if (!clip || finished) return;

      elapsed += dt;
      const frameDuration = 1 / (clip.fps || 10);
      while (elapsed >= frameDuration) {
        elapsed -= frameDuration;
        frameInClip += 1;

        if (frameInClip < clip.frames.length) continue;

        if (clip.loop) {
          frameInClip = 0;
          continue;
        }

        // Clipe de uma passada só terminou.
        frameInClip = clip.frames.length - 1;
        finished = true;
        onComplete?.(currentState);
        if (!api.hold) setState(DEFAULT_STATE);
        break;
      }
    },

    // Retângulo de origem do quadro atual, pronto pro spriteManager.draw().
    currentFrame(manager) {
      if (!clip) return null;
      return manager.frameRect(actor, clip.name, frameInClip, api.direction);
    },
  };

  setState(state, { force: true });
  return api;
}
