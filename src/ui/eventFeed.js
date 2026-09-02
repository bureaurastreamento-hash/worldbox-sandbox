// Feed de eventos: mostra as últimas linhas do que já acontece escondido na
// simulação (world.events, ver world/eventLog.js: guerra, paz, comércio,
// morte, nascimento, casa completada) — só instrumentação e UI, não
// influencia nem lê nada além do log. Painel fixo, não interativo (mesmo
// padrão de #hud), canto inferior esquerdo. Mostra só as últimas
// VISIBLE_LINES na tela, mais recente no topo — o buffer completo (até 50,
// ver eventLog.js) existe só pra essa janela nunca ficar vazia à toa, não
// tem UI de rolar pra trás.

const VISIBLE_LINES = 6;

export function createEventFeed(container) {
  let lastLength = -1;
  let lastNewestText; // undefined, não null — bate com `newest?.text` quando `newest` é null (evita reconstruir o DOM à toa todo frame enquanto a lista tá vazia)

  function update(events) {
    // Eventos são raros (cadência institucional, não por tick) — só
    // reconstrói o DOM quando algo novo chegou de verdade.
    const newest = events.length > 0 ? events[events.length - 1] : null;
    if (events.length === lastLength && newest?.text === lastNewestText) return;
    lastLength = events.length;
    lastNewestText = newest?.text;

    // Reconstrução completa só na primeira vez (ou se o buffer encolheu,
    // o que não deveria acontecer no jogo normal). No caso comum (chegou
    // 1 evento novo), só o nó novo entra — os outros mantêm identidade de
    // DOM, então a animação de entrada (CSS) toca só na linha nova, não
    // reanima o painel inteiro a cada evento.
    const visible = events.slice(-VISIBLE_LINES).reverse();
    const shouldRebuildAll = container.children.length === 0 || container.children.length > visible.length;

    if (shouldRebuildAll) {
      container.innerHTML = '';
      for (const event of visible) container.appendChild(makeLine(event.text, false));
      return;
    }

    const newestLine = makeLine(visible[0].text, true);
    container.insertBefore(newestLine, container.firstChild);
    while (container.children.length > VISIBLE_LINES) {
      container.removeChild(container.lastChild);
    }
  }

  function makeLine(text, animateIn) {
    const line = document.createElement('div');
    line.className = animateIn ? 'event-feed-line event-feed-line-enter' : 'event-feed-line';
    line.textContent = text;
    return line;
  }

  return { update };
}
