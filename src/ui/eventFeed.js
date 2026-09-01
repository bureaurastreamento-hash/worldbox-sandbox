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

    container.innerHTML = '';
    const visible = events.slice(-VISIBLE_LINES).reverse();
    for (const event of visible) {
      const line = document.createElement('div');
      line.className = 'event-feed-line';
      line.textContent = event.text;
      container.appendChild(line);
    }
  }

  return { update };
}
