// Fine surface relief for the Moon, built on top of the real global albedo map.
// Pure typed-array code (no DOM) so it can run inside a Web Worker.
// The result is a bump map (8-bit, 128 = flat). Rows are written bottom-up for THREE.DataTexture.

const RAD = Math.PI / 180;
const MOON_KM = 1737.4;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Box blur, wraps in longitude (x), clamps at the poles (y). */
function blur(src: Float32Array, W: number, H: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += src[y * W + ((k + W) % W)];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = s / n;
      s += src[y * W + ((x + r + 1) % W)] - src[y * W + ((x - r + W) % W)];
    }
  }
  for (let x = 0; x < W; x++) {
    let s = 0;
    for (let k = -r; k <= r; k++) s += tmp[Math.min(H - 1, Math.max(0, k)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = s / n;
      s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
  return out;
}

/**
 * @param lum albedo luminance 0..255, row 0 = north pole, W x (W/2)
 * Relief = high-passed albedo (crater rims and walls are brighter) + regolith noise + small craters below the photo's resolution.
 */
export function generateMoonBump(lum: Uint8Array, W: number, seed = 20260619): Uint8Array {
  const H = W >> 1, N = W * H, rand = rng(seed);
  const l = new Float32Array(N);
  for (let i = 0; i < N; i++) l[i] = lum[i] / 255;
  const lo = blur(l, W, H, 5), hgt = new Float32Array(N);
  for (let i = 0; i < N; i++) hgt[i] = (l[i] - lo[i]) * 210;

  // regolith: fractal value noise, wraps in longitude
  for (let oct = 0; oct < 6; oct++) {
    const gx = 64 << oct, gy = gx >> 1, g = new Float32Array(gx * (gy + 1));
    for (let i = 0; i < g.length; i++) g[i] = rand();
    const amp = 3.5 * Math.pow(0.7, oct);
    for (let y = 0; y < H; y++) {
      const fy = (y / H) * gy, y0 = Math.floor(fy), ty = sstep(0, 1, fy - y0);
      for (let x = 0; x < W; x++) {
        const fx = (x / W) * gx, x0 = Math.floor(fx), tx = sstep(0, 1, fx - x0), x1 = (x0 + 1) % gx;
        const a = g[y0 * gx + x0], b = g[y0 * gx + x1], c = g[(y0 + 1) * gx + x0], d = g[(y0 + 1) * gx + x1];
        hgt[y * W + x] += ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty - 0.5) * amp;
      }
    }
  }

  // small craters (about 3 to 18 km across), denser on bright highlands
  const sinLat = new Float32Array(H), cosLat = new Float32Array(H), sinLon = new Float32Array(W), cosLon = new Float32Array(W);
  for (let y = 0; y < H; y++) { const la = (90 - ((y + 0.5) / H) * 180) * RAD; sinLat[y] = Math.sin(la); cosLat[y] = Math.cos(la); }
  for (let x = 0; x < W; x++) { const lg = (((x + 0.5) / W) * 360 - 180) * RAD; sinLon[x] = Math.sin(lg); cosLon[x] = Math.cos(lg); }
  const target = W * 14;
  let placed = 0, tries = 0;
  while (placed < target && tries < target * 6) {
    tries++;
    const u = rand(), z = rand() * 2 - 1, lat = Math.asin(z) / RAD, lon = u * 360 - 180;
    const px = Math.min(W - 1, Math.floor(u * W)), py = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H));
    if (rand() > 0.25 + 0.75 * l[py * W + px]) continue;
    const rKm = (3 / Math.sqrt(Math.max(1e-3, rand()))) / 2 * 0.55;
    const rho = Math.min(rKm, 9) / MOON_KM, la0 = lat * RAD, lo0 = lon * RAD;
    const s0 = Math.sin(la0), c0 = Math.cos(la0), sl0 = Math.sin(lo0), cl0 = Math.cos(lo0);
    const ext = rho * 2.4, yc = ((90 - lat) / 180) * H, dy = Math.ceil((ext / Math.PI) * H) + 1;
    const dx = Math.min(W >> 1, Math.ceil((ext / Math.max(0.05, c0) / (2 * Math.PI)) * W) + 1), xc = ((lon + 180) / 360) * W;
    const amp = 9 + rand() * 9;
    for (let y = Math.max(0, Math.floor(yc - dy)); y <= Math.min(H - 1, Math.ceil(yc + dy)); y++) {
      for (let xx = Math.floor(xc - dx); xx <= Math.ceil(xc + dx); xx++) {
        const x = ((xx % W) + W) % W;
        const cd = s0 * sinLat[y] + c0 * cosLat[y] * (cosLon[x] * cl0 + sinLon[x] * sl0);
        const t = Math.acos(Math.min(1, Math.max(-1, cd))) / rho;
        if (t > 2.4) continue;
        let h = t < 1 ? -amp * (1 - sstep(0.45, 1, t)) : 0;
        h += amp * 0.6 * Math.exp(-(((t - 1.03) / 0.2) ** 2));
        hgt[y * W + x] += h;
      }
    }
    placed++;
  }

  const bump = new Uint8Array(N);
  for (let y = 0; y < H; y++) {
    const oy = H - 1 - y;
    for (let x = 0; x < W; x++) bump[oy * W + x] = Math.min(255, Math.max(0, 128 + hgt[y * W + x]));
  }
  return bump;
}
