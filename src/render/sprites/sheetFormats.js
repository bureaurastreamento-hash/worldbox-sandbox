// As duas estratégias de leitura de spritesheet. Cada uma sabe responder duas
// perguntas e só isso: "esta folha é minha?" (`detect`) e "onde fica o quadro
// N?" (`frameRect`). Nada aqui toca em tempo, estado ou desenho — isso é do
// animator.js/spriteManager.js.
//
// Adicionar um terceiro formato (a folha de tiles Kenney em
// "Vários tipos de chão-separar conforme-recortar/", que é 16x16 com 1px de
// margem, é o candidato óbvio) significa acrescentar um objeto nesta lista e
// mais nada em nenhum outro arquivo.

import { parseSheetName, getAnimationRule, resolveFrameCount } from './animationCatalog.js';

export const FORMAT = { STRIP: 'strip', GRID: 'grid' };

// ---------------------------------------------------------------------------
// FORMATO 1 — tira horizontal, 1 linha, 1 ação por arquivo (Pers-Sprites/)
// ---------------------------------------------------------------------------

const stripFormat = {
  id: FORMAT.STRIP,

  // A especificação supunha uma pasta por formato ("Pers-Sprites/" para tira,
  // "Characters-Sheets/" para grade), mas no pack que chegou os DOIS formatos
  // moram dentro de `Pers-Sprites/` — as grades estão em
  // `Pers-Sprites/Humanos-separados/`. Então a pasta sozinha não decide nada:
  // o sinal confiável é o token de ação no fim do nome ("..._Walk.png"), que
  // toda tira tem e nenhuma grade tem.
  detect(path) {
    return parseSheetName(path).animation !== null;
  },

  describe(path, img) {
    const parsed = parseSheetName(path);
    const rule = getAnimationRule(parsed.animation);

    const frameHeight = img.naturalHeight;
    const frameCount = resolveFrameCount({
      width: img.naturalWidth,
      height: img.naturalHeight,
      declared: rule?.frames,
      label: parsed.file,
    });

    return {
      format: FORMAT.STRIP,
      path,
      image: img,
      ...parsed,
      frameWidth: img.naturalWidth / frameCount,
      frameHeight,
      frameCount,
      loop: rule?.loop ?? true,
      fps: rule?.fps ?? 10,
      // Uma tira não tem direção — o bicho é desenhado sempre do mesmo lado.
      directions: 1,
    };
  },

  // srcY é sempre 0: a tira tem uma linha só.
  frameRect(desc, { frame = 0 } = {}) {
    const index = Math.min(Math.max(frame, 0), desc.frameCount - 1);
    return {
      sx: index * desc.frameWidth,
      sy: 0,
      sw: desc.frameWidth,
      sh: desc.frameHeight,
    };
  },
};

// ---------------------------------------------------------------------------
// FORMATO 2 — grade de caminhada estilo RPG Maker (blocos de 3 col x 4 lin)
// ---------------------------------------------------------------------------

// Duas variações do mesmo layout aparecem no pack:
//   12 col x 8 lin  -> 8 personagens na mesma imagem (charIndex 0..7)
//    3 col x 4 lin  -> 1 personagem sozinho (charIndex sempre 0)
// O bloco por personagem é idêntico nos dois casos (3 quadros x 4 direções),
// então a fórmula de recorte é uma só — muda apenas quantos blocos cabem.
const GRID_LAYOUTS = [
  { cols: 12, rows: 8, characters: 8 },
  { cols: 3, rows: 4, characters: 1 },
];

// Divisibilidade sozinha NÃO distingue os dois layouts: 96x128 divide certo
// por 12x8 (daria quadro 8x16) e por 3x4 (daria 32x32). O desempate é o
// formato do quadro — quadro de personagem é aproximadamente quadrado ou um
// pouco mais alto que largo, nunca 8x16 achatado. Então testo as duas
// hipóteses e fico com a que produz o quadro mais próximo de 1:1.
// Confere nos quatro arquivos reais: 48x80 e 96x128 caem em 3x4; 192x160 e
// 288x192 caem em 12x8.
function detectGridLayout(width, height) {
  let best = null;

  for (const layout of GRID_LAYOUTS) {
    if (width % layout.cols !== 0 || height % layout.rows !== 0) continue;
    const frameWidth = width / layout.cols;
    const frameHeight = height / layout.rows;
    const squareness = Math.abs(Math.log(frameWidth / frameHeight));
    if (!best || squareness < best.squareness) best = { ...layout, frameWidth, frameHeight, squareness };
  }

  return best;
}

const gridFormat = {
  id: FORMAT.GRID,

  detect(path, img) {
    if (path.includes('Characters-Sheets/')) return true;
    if (!img) return false;
    return detectGridLayout(img.naturalWidth, img.naturalHeight) !== null;
  },

  describe(path, img, { layout: forcedLayout } = {}) {
    const layout = forcedLayout ?? detectGridLayout(img.naturalWidth, img.naturalHeight);
    if (!layout) throw new Error(`grade não reconhecida em ${path} (${img.naturalWidth}x${img.naturalHeight})`);

    return {
      format: FORMAT.GRID,
      path,
      image: img,
      actor: path.split('/').pop().replace(/\.png$/i, ''),
      cols: layout.cols,
      rows: layout.rows,
      characters: layout.characters,
      frameWidth: layout.frameWidth,
      frameHeight: layout.frameHeight,
      // 3 quadros por direção, 4 direções — fixo neste layout.
      frameCount: 3,
      directions: 4,
    };
  },

  frameRect(desc, { frame = 0, direction = 0, charIndex = 0 } = {}) {
    const safeChar = Math.min(Math.max(charIndex, 0), desc.characters - 1);
    const charCol = (safeChar % 4) * 3;
    const charRow = Math.floor(safeChar / 4) * 4;

    const finalCol = charCol + Math.min(Math.max(frame, 0), 2);
    const finalRow = charRow + Math.min(Math.max(direction, 0), 3);

    return {
      sx: finalCol * desc.frameWidth,
      sy: finalRow * desc.frameHeight,
      sw: desc.frameWidth,
      sh: desc.frameHeight,
    };
  },
};

// ---------------------------------------------------------------------------

// Ordem de tentativa importa: a tira é checada primeiro porque o teste dela é
// específico (pasta canônica ou token de ação no nome), enquanto o da grade é
// só proporção e casaria por acidente com tiras de largura conveniente.
const FORMATS = [stripFormat, gridFormat];

export function detectFormat(path, img) {
  return FORMATS.find((format) => format.detect(path, img)) ?? null;
}

export function getFormat(id) {
  return FORMATS.find((format) => format.id === id) ?? null;
}
