// Pool de objetos pré-alocados: em vez de criar e descartar, reutiliza.
//
// O ganho não é velocidade bruta de alocação — motores JS alocam rápido. É
// PREVISIBILIDADE DE FRAME: objetos criados e abandonados a cada frame viram
// lixo, e o coletor decide sozinho quando parar tudo pra recolher. O sintoma
// é um engasgo periódico que não aparece no tempo médio de frame, só no pior
// caso — exatamente o que estraga a sensação de 60fps.
//
// O pool é de tamanho FIXO. Estourar não aloca mais: `acquire` devolve null e
// quem chamou desiste. Isso é deliberado — um pool que cresce sob pressão
// tem o mesmo problema que ele existe pra resolver, só adiado.
//
// `reset(obj, ...args)` reinicializa NO LUGAR, sem criar objeto novo. É o
// contrato que faz o pool valer: se o reset construísse um literal e
// copiasse, a alocação estaria de volta.

export function createPool(size, factory) {
  const items = new Array(size);
  for (let i = 0; i < size; i++) {
    items[i] = factory();
    items[i].active = false;
  }

  // Cursor circular: a busca por um slot livre começa de onde parou, em vez
  // de sempre do zero. Sem isso, com o pool quase cheio, cada `acquire`
  // varreria a lista inteira até o fim.
  let cursor = 0;
  let liveCount = 0;

  return {
    get live() {
      return liveCount;
    },
    get capacity() {
      return size;
    },

    acquire() {
      for (let n = 0; n < size; n++) {
        const item = items[cursor];
        cursor = (cursor + 1) % size;
        if (!item.active) {
          item.active = true;
          liveCount++;
          return item;
        }
      }
      return null; // cheio: quem chamou simplesmente não cria
    },

    release(item) {
      if (!item.active) return;
      item.active = false;
      liveCount--;
    },

    // Percorre só os ativos. O chamador pode liberar durante a iteração (é o
    // caso normal: partícula que expirou), porque `release` só marca a flag.
    forEachActive(fn) {
      for (let i = 0; i < size; i++) {
        if (items[i].active) fn(items[i]);
      }
    },

    releaseAll() {
      for (let i = 0; i < size; i++) items[i].active = false;
      liveCount = 0;
    },
  };
}
