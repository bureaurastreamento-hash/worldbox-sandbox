// Feed de eventos: registro leve dos marcos institucionais que já acontecem
// escondidos (guerra, paz, morte, nascimento, casa completada) — só torna
// visível o que a simulação já decide sozinha, não muda nenhuma lógica de
// jogo. Guarda só as últimas MAX_EVENTS entradas, não histórico completo —
// não existe save/load nem UI de rolar pra trás que justifique mais que
// isso (ver STATUS.md/ROADMAP.md).

const MAX_EVENTS = 50;

export function pushEvent(world, text) {
  world.events.push({ text, at: world.elapsedSeconds ?? 0 });
  if (world.events.length > MAX_EVENTS) world.events.shift();
}
