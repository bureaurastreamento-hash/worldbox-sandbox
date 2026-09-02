// requestAnimationFrame loop: converte dt real em dt simulado via timeState
// (que aplica pausa/velocidade), então chama update(simDt) e render(realDt).
//
// render recebe o dt REAL (não o simulado) de propósito: efeitos de
// apresentação (easing de câmera, tremor, partículas) devem correr no tempo
// do jogador, não no tempo do jogo — continuam suaves com o jogo pausado ou
// em 4x, em vez de congelar/acelerar junto.

export function createGameLoop({ timeState, update, render }) {
  let rafId = null;
  let lastTime = null;

  function frame(now) {
    if (lastTime === null) lastTime = now;
    const realDt = Math.min((now - lastTime) / 1000, 0.1); // cap evita spiral of death em abas inativas
    lastTime = now;

    const simDt = timeState.advance(realDt);
    try {
      update(simDt);
      render(realDt);
    } catch (err) {
      // Sem isso, uma exceção não tratada em qualquer lugar de update/render
      // (agente, vila, clã, o que for) trava o jogo inteiro pra sempre e sem
      // aviso nenhum — nem o próximo requestAnimationFrame chega a ser
      // agendado. Loga o erro real e segue tentando o próximo frame, em vez
      // de travar tudo por um bug isolado num agente/vila específico.
      console.error('Erro no game loop (update/render):', err);
    }

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
