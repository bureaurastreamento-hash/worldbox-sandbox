import { clamp } from '../utils/mathUtils.js';

// Tempo (em segundos, a 1x) para cada necessidade esvaziar do máximo a zero.
const HUNGER_DEPLETE_SECONDS = 60;
const SLEEP_DEPLETE_SECONDS = 90;

const HUNGER_DECAY_PER_SEC = 100 / HUNGER_DEPLETE_SECONDS;
const SLEEP_DECAY_PER_SEC = 100 / SLEEP_DEPLETE_SECONDS;

export function createNeeds() {
  return { hunger: 100, sleep: 100 };
}

export function updateNeeds(needs, dt) {
  needs.hunger = clamp(needs.hunger - HUNGER_DECAY_PER_SEC * dt, 0, 100);
  needs.sleep = clamp(needs.sleep - SLEEP_DECAY_PER_SEC * dt, 0, 100);
}

export function applyEffect(needs, type, amount) {
  needs[type] = clamp(needs[type] + amount, 0, 100);
}

// Curva não-linear: necessidade alta pontua quase nada, necessidade crítica
// domina o score de utilidade (needs.hunger=100 -> 0, needs.hunger=0 -> 1).
export function urgency(value) {
  const deficit = (100 - value) / 100;
  return deficit * deficit;
}
