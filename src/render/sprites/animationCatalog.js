// Catálogo de animações: traduz o nome do arquivo em uma animação canônica e
// diz quantos quadros esperar, se repete em loop e a que ritmo tocar.
//
// A tabela de quadros aqui é a DECLARADA (a que veio na especificação). Ela
// não é a fonte da verdade: `resolveFrameCount()` deriva a contagem real da
// imagem sempre que consegue, e usa a declarada só como validação. Motivo
// concreto, medido nos arquivos do pack: "Attack: 8 quadros" vale pro Blood
// Monster (800x100), mas o Demon tem 7 (700x100), o Orc 6 e o Soldier 6 — e o
// Soldier_Attack03 tem 9. Fixar 8 faria três dos quatro lerem além do fim da
// tira e piscarem quadros vazios no meio do golpe. Walk (8), Idle (6),
// Hurt (4) e Death (4) batem em 100% dos arquivos.

export const DIRECTION = { DOWN: 0, LEFT: 1, RIGHT: 2, UP: 3 };

// Ordem importa pouco aqui (as palavras-chave não se sobrepõem), mas a busca
// é feita da direita pra esquerda no nome do arquivo, então a última palavra
// separada por "_" é a que manda.
const RULES = [
  { animation: 'walk', keywords: ['walk', 'andar', 'run', 'correr'], frames: 8, loop: true, fps: 12 },
  { animation: 'idle', keywords: ['idle', 'parado', 'stand'], frames: 6, loop: true, fps: 8 },
  { animation: 'attack', keywords: ['attack', 'ataque'], frames: 8, loop: false, fps: 14 },
  { animation: 'hurt', keywords: ['hurt', 'hit', 'dano'], frames: 4, loop: false, fps: 12 },
  { animation: 'death', keywords: ['death', 'die', 'morte'], frames: 4, loop: false, fps: 8 },
];

function normalize(token) {
  return token
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // tira acento: "ataque"/"atáque" caem no mesmo lugar
}

// Um token vira animação se COMEÇAR com a palavra-chave — assim "attack01" e
// "attack02" casam com 'attack' e ainda preservam o sufixo numérico, que é o
// que distingue os dois golpes de um mesmo bicho. Comparação por "começa com"
// em vez de "contém" evita casar palavra dentro de nome próprio.
function matchRule(token) {
  const clean = normalize(token);
  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      if (!clean.startsWith(keyword)) continue;
      const suffix = clean.slice(keyword.length);
      // sufixo válido é só dígito ("attack01") ou vazio ("attack")
      if (suffix && !/^\d+$/.test(suffix)) continue;
      return { rule, suffix };
    }
  }
  return null;
}

export function getAnimationRule(animation) {
  return RULES.find((rule) => rule.animation === animation) ?? null;
}

// Quebra "[Ator]_[Variante]_[Animação].png" nas partes que importam.
//
// A especificação assume que a variante sempre existe, mas no pack ela é
// opcional: "Blood Monster_A_Walk.png" tem, "Orc_Walk.png" e
// "Soldier_Walk.png" não têm. Por isso a leitura é da direita pra esquerda —
// acha a animação primeiro, e o que sobra à esquerda é ator (+ variante, se
// o token do meio for curto o bastante pra ser uma).
export function parseSheetName(path) {
  const file = path.split('/').pop().replace(/\.png$/i, '');
  const tokens = file.split('_');

  let animationAt = -1;
  let match = null;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const candidate = matchRule(tokens[i]);
    if (candidate) {
      animationAt = i;
      match = candidate;
      break;
    }
  }

  if (!match) return { file, actor: file, variant: null, animation: null, clip: null };

  const head = tokens.slice(0, animationAt);
  // Variante é o último token antes da animação quando é curto e sem espaço
  // ("A", "B", "lvl2") — senão faz parte do nome do ator.
  const isVariant = head.length > 1 && /^[A-Za-z0-9]{1,4}$/.test(head[head.length - 1]);
  const variant = isVariant ? head[head.length - 1] : null;
  const actor = (isVariant ? head.slice(0, -1) : head).join('_') || file;

  return {
    file,
    actor,
    variant,
    animation: match.rule.animation,
    // clip é o identificador único da tira dentro do ator: 'attack01' e
    // 'attack02' são clipes diferentes da mesma animação 'attack'.
    clip: match.rule.animation + match.suffix,
  };
}

// Deriva a contagem real de quadros da imagem. Nas tiras deste pack o quadro
// é quadrado (altura 100, largura múltipla de 100), então largura/altura dá o
// número exato. Quando isso não fecha em inteiro (tira de quadro não-quadrado),
// cai na contagem declarada da tabela.
export function resolveFrameCount({ width, height, declared, label = 'tira' }) {
  const bySquareFrame = width / height;

  if (Number.isInteger(bySquareFrame) && bySquareFrame >= 1) {
    if (declared && bySquareFrame !== declared) {
      console.warn(
        `[SpriteManager] ${label}: a tabela declara ${declared} quadros, a imagem tem ` +
          `${bySquareFrame} (${width}x${height}). Usando ${bySquareFrame}, que é o que existe no arquivo.`
      );
    }
    return bySquareFrame;
  }

  if (declared && width % declared === 0) return declared;

  console.warn(`[SpriteManager] ${label}: não deu pra deduzir a contagem de quadros de ${width}x${height}. Assumindo 1.`);
  return 1;
}
