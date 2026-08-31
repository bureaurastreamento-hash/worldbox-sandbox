// requestAnimationFrame loop: converte dt real em dt simulado via timeState
// (que aplica pausa/velocidade), então chama update(simDt) e render().

export function createGameLoop({ timeState, update, render }) {
  let rafId = null;
  let lastTime = null;

  function frame(now) {
    if (lastTime === null) lastTime = now;
    const realDt = Math.min((now - lastTime) / 1000, 0.1); // cap evita spiral of death em abas inativas
    lastTime = now;

    const simDt = timeState.advance(realDt);
    update(simDt);
    render();

    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      lastTime = null;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
    },
  };
}
