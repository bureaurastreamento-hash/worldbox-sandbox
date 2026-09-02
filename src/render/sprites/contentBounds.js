// Recorte por canal alfa: acha a caixa de conteúdo real dentro do quadro,
// descartando o preenchimento transparente em volta.
//
// Por que isso importa aqui: nas tiras deste pack o quadro é 100x100 mas o
// bicho ocupa ~20x20 no meio. Desenhar o quadro inteiro faria o personagem
// aparecer com um quinto do tamanho pedido, cercado de vazio.
//
// A caixa é a UNIÃO de todos os quadros do ator, não uma por quadro. Essa é a
// parte que não é óbvia: recortar cada quadro na sua própria caixa faria o
// sprite pular de posição e mudar de escala a cada troca de quadro, porque um
// golpe de espada é mais largo que a pose parada. Com a união, o personagem
// fica ancorado e só o desenho dentro dele muda — que é o comportamento de
// uma animação de verdade.
//
// (`render/agentRenderer.js` e `render/predatorRenderer.js` têm cada um a sua
// cópia de um `computeContentBounds` por-imagem. Quando eles migrarem pro
// SpriteManager, é este arquivo que substitui as duas.)

// Um canvas só, reaproveitado — criar um por folha desperdiça memória de GPU
// à toa quando são dezenas de arquivos.
let scratch = null;

function getScratch(width, height) {
  if (!scratch) scratch = document.createElement('canvas');
  if (scratch.width < width) scratch.width = width;
  if (scratch.height < height) scratch.height = height;
  return scratch;
}

const ALPHA_THRESHOLD = 10; // mesmo valor que o resto do render já usa

// `rects` são retângulos de origem dentro da imagem (os quadros do ator).
// Devolve a caixa de conteúdo em coordenadas RELATIVAS ao quadro, pra poder
// somar em qualquer quadro depois.
export function unionContentBounds(image, rects) {
  if (!rects.length) return null;

  const { sw, sh } = rects[0];
  const canvas = getScratch(image.naturalWidth, image.naturalHeight);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0);

  let minX = sw;
  let minY = sh;
  let maxX = -1;
  let maxY = -1;

  for (const rect of rects) {
    let data;
    try {
      data = ctx.getImageData(rect.sx, rect.sy, rect.sw, rect.sh).data;
    } catch {
      return null; // canvas contaminado (arquivo de outra origem) — sem recorte
    }

    for (let y = 0; y < rect.sh; y++) {
      for (let x = 0; x < rect.sw; x++) {
        if (data[(y * rect.sw + x) * 4 + 3] <= ALPHA_THRESHOLD) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null; // tudo transparente
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
