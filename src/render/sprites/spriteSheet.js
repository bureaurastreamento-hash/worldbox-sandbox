// Carregamento e cache de imagens de spritesheet. Este módulo NÃO sabe nada
// sobre formato, grade ou animação — só entrega um HTMLImageElement pronto.
// Quem interpreta os pixels é sheetFormats.js.

const cache = new Map(); // path -> Promise<HTMLImageElement>

// Os caminhos do pack têm espaço e acento ("Pers-Sprites/Monstro1/Blood
// Monster_A_Walk.png", "Vários tipos de chão-separar conforme-recortar/").
// encodeURI cobre os dois sem mexer nas barras — sem isso a requisição sai
// malformada e o `onload` simplesmente nunca dispara, que é o tipo de erro
// silencioso que custa uma sessão inteira de debug.
function toUrl(path) {
  return encodeURI(path);
}

export function loadSheet(path) {
  const cached = cache.get(path);
  if (cached) return cached;

  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`spritesheet não carregou: ${path}`));
    img.src = toUrl(path);
  });

  cache.set(path, promise);
  return promise;
}

// Carrega várias e devolve só as que deram certo, com a lista de falhas em
// separado — uma folha faltando não pode derrubar o carregamento inteiro
// (mesma lição do `isSpriteReady()` por-sprite que o resto do render já usa:
// um gate global fazia um único arquivo ausente travar todos os outros).
export async function loadSheets(paths) {
  const results = await Promise.allSettled(paths.map(loadSheet));
  const loaded = new Map();
  const failed = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') loaded.set(paths[i], result.value);
    else failed.push({ path: paths[i], reason: result.reason?.message ?? String(result.reason) });
  });

  return { loaded, failed };
}
