// Ruído determinístico para a arte procedural de terreno. Nada aqui depende
// de `Math.random` nem da rng do mundo: a textura de um tile é função pura da
// posição dele, então a mesma seed produz sempre o mesmo mapa, e um tile não
// muda de aparência entre frames.

// Hash inteiro rápido (xorshift-ish). Devolve 0..1.
export function hash2(x, y, seed = 0) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1442695040;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

// Gerador sequencial derivado de uma posição — útil pra "sortear" vários
// valores dentro de um mesmo tile sem repetir o mesmo hash.
export function rngAt(x, y, seed = 0) {
  let n = 0;
  return () => hash2(x, y, seed + n++ * 7919);
}

function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

// Ruído de valor com interpolação suave. É o que dá manchas grandes e
// orgânicas em vez do chuvisco de TV que sai de um `random()` por pixel —
// a diferença entre "textura" e "sujeira".
export function valueNoise(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smoothstep(x - xi);
  const yf = smoothstep(y - yi);

  const v00 = hash2(xi, yi, seed);
  const v10 = hash2(xi + 1, yi, seed);
  const v01 = hash2(xi, yi + 1, seed);
  const v11 = hash2(xi + 1, yi + 1, seed);

  const top = v00 + (v10 - v00) * xf;
  const bottom = v01 + (v11 - v01) * xf;
  return top + (bottom - top) * yf;
}

// Soma de oitavas — detalhe fino sobre manchas grandes.
export function fbm(x, y, { octaves = 3, seed = 0, lacunarity = 2, gain = 0.5 } = {}) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * freq, y * freq, seed + i * 131) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}
