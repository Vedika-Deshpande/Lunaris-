import type { HorizonProfile, SiteConditions, SkyPosition } from "@/types";

const RAD = Math.PI / 180;
const { sin, cos, asin, atan2, hypot } = Math;

export const MS_DAY = 864e5;
export const MS_HOUR = 36e5;
export const MOON_RADIUS_KM = 1737.4;
export const SUN_LIMB_DEG = 0.27;

export interface SubPoint { lonDeg: number; latDeg: number }
export interface BodyState { sun: SubPoint; earth: SubPoint; earthDistanceKm: number }

export function bodyState(tMs: number): BodyState {
  const T = (tMs / MS_DAY + 2440587.5 - 2451545) / 36525;
  const L = 218.3164477 + 481267.88123421 * T;
  const D = (297.8501921 + 445267.1114034 * T) * RAD;
  const M = (357.5291092 + 35999.0502909 * T) * RAD;
  const P = (134.9633964 + 477198.8675055 * T) * RAD;
  const F = (93.272095 + 483202.0175233 * T) * RAD;
  const Om = 125.0445479 - 1934.1362891 * T;

  const lam = L + 6.288774 * sin(P) + 1.274027 * sin(2 * D - P) + 0.658314 * sin(2 * D) +
    0.213618 * sin(2 * P) - 0.185116 * sin(M) - 0.114332 * sin(2 * F) +
    0.058793 * sin(2 * D - 2 * P) + 0.057066 * sin(2 * D - M - P) + 0.053322 * sin(2 * D + P) +
    0.045758 * sin(2 * D - M) - 0.040923 * sin(M - P) - 0.03472 * sin(D) - 0.030383 * sin(M + P);
  const bet = 5.128122 * sin(F) + 0.280602 * sin(P + F) + 0.277693 * sin(P - F) +
    0.173237 * sin(2 * D - F) + 0.055413 * sin(2 * D - P + F) + 0.046271 * sin(2 * D - P - F) +
    0.032573 * sin(2 * D + F) + 0.017198 * sin(2 * P + F);
  const dist = 385000.56 - 20905.355 * cos(P) - 3699.111 * cos(2 * D - P) - 2955.968 * cos(2 * D) -
    569.925 * cos(2 * P) + 48.888 * cos(M) - 3.149 * cos(2 * F) + 246.158 * cos(2 * D - 2 * P) -
    152.138 * cos(2 * D - M - P) - 170.733 * cos(2 * D + P) - 204.586 * cos(2 * D - M) -
    129.62 * cos(M - P) + 108.743 * cos(D) + 104.755 * cos(M + P);

  const Ms = (357.52911 + 35999.05029 * T) * RAD;
  const ls = 280.46646 + 36000.76983 * T + 1.914602 * sin(Ms) + 0.019993 * sin(2 * Ms);
  const I = 1.54242 * RAD;

  const selenographic = (lmDeg: number, bmDeg: number): SubPoint => {
    const W = (lmDeg - Om) * RAD;
    const b = bmDeg * RAD;
    const A = atan2(sin(W) * cos(b) * cos(I) - sin(b) * sin(I), cos(W) * cos(b));
    let l = A / RAD - F / RAD;
    l = ((((l + 180) % 360) + 360) % 360) - 180;
    const latDeg = asin(-sin(W) * cos(b) * sin(I) - sin(b) * cos(I)) / RAD;
    return { lonDeg: l, latDeg };
  };

  return { sun: selenographic(ls + 180, 0), earth: selenographic(lam, bet), earthDistanceKm: dist };
}

type V3 = [number, number, number];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function lookAt(site: { lat: number; lon: number }, p: SubPoint, distanceKm?: number): SkyPosition {
  const f = site.lat * RAD, l = site.lon * RAD, pf = p.latDeg * RAD, pl = p.lonDeg * RAD;
  const s: V3 = [cos(f) * cos(l), cos(f) * sin(l), sin(f)];
  const u: V3 = [cos(pf) * cos(pl), cos(pf) * sin(pl), sin(pf)];
  const k = distanceKm === undefined ? 0 : distanceKm / MOON_RADIUS_KM;
  const v: V3 = distanceKm === undefined ? u : [k * u[0] - s[0], k * u[1] - s[1], k * u[2] - s[2]];
  const east: V3 = [-sin(l), cos(l), 0];
  const north: V3 = [-sin(f) * cos(l), -sin(f) * sin(l), cos(f)];
  const elevationDeg = asin(Math.max(-1, Math.min(1, dot(v, s) / hypot(v[0], v[1], v[2])))) / RAD;
  const azimuthDeg = ((atan2(dot(v, east), dot(v, north)) / RAD) + 360) % 360;
  return { elevationDeg, azimuthDeg };
}

/* ---------- horizon mask (flat now; LOLA terrain profile plugs in later) ---------- */
export type MaskFn = (azimuthDeg: number) => number;
export const flatMask = (deg = 0): MaskFn => () => deg;
export function terrainMask(p: HorizonProfile): MaskFn {
  const n = p.elevationDeg.length;
  return (az) => {
    const x = (((az % 360) + 360) % 360) / p.azimuthStepDeg;
    const i = Math.floor(x), w = x - i;
    return p.elevationDeg[i % n] * (1 - w) + p.elevationDeg[(i + 1) % n] * w;
  };
}

export function computeConditions(site: { lat: number; lon: number }, tMs: number, mask: MaskFn = flatMask(0)): SiteConditions {
  const e = bodyState(tMs);
  const sun = lookAt(site, e.sun);
  const earth = lookAt(site, e.earth, e.earthDistanceKm);
  return {
    timestampMs: tMs, sun, earth,
    sunUp: sun.elevationDeg + SUN_LIMB_DEG > mask(sun.azimuthDeg),
    earthUp: earth.elevationDeg > mask(earth.azimuthDeg),
    horizon: "smooth-sphere", source: "computed-approx",
  };
}

/* ---------- time to sunset / Earthset (or rise) ---------- */
export type Body = "sun" | "earth";
function isUp(site: { lat: number; lon: number }, t: number, body: Body, mask: MaskFn) {
  const e = bodyState(t);
  const p = body === "sun" ? lookAt(site, e.sun) : lookAt(site, e.earth, e.earthDistanceKm);
  return p.elevationDeg + (body === "sun" ? SUN_LIMB_DEG : 0) > mask(p.azimuthDeg);
}
export interface Transition { up: boolean; dtMs: number | null }
/** hourly scan + bisection; events shorter than 1 h can be missed */
export function nextTransition(site: { lat: number; lon: number }, t: number, body: Body, mask: MaskFn = flatMask(0), maxDays = 60): Transition {
  const state = isUp(site, t, body, mask);
  for (let i = 1; i <= maxDays * 24; i++) {
    if (isUp(site, t + i * MS_HOUR, body, mask) !== state) {
      let lo = t + (i - 1) * MS_HOUR, hi = t + i * MS_HOUR;
      for (let j = 0; j < 9; j++) { const m = (lo + hi) / 2; if (isUp(site, m, body, mask) === state) lo = m; else hi = m; }
      return { up: state, dtMs: hi - t };
    }
  }
  return { up: state, dtMs: null };
}
export function formatDuration(ms: number | null, maxDays = 60): string {
  if (ms === null) return `>${maxDays} d`;
  const d = ms / MS_DAY;
  if (d >= 1) return `${Math.floor(d)} d ${Math.round((d % 1) * 24)} h`;
  return `${Math.floor(ms / MS_HOUR)} h ${Math.round((ms % MS_HOUR) / 6e4)} min`;
}

/* ---------- timeline series ---------- */
export interface SeriesPoint { tMs: number; sunElDeg: number; earthElDeg: number }
export function sampleSeries(site: { lat: number; lon: number }, startMs: number, spanDays: number, stepHours = 3): SeriesPoint[] {
  const n = Math.round((spanDays * 24) / stepHours) + 1;
  return Array.from({ length: n }, (_, i) => {
    const tMs = startMs + i * stepHours * MS_HOUR, e = bodyState(tMs);
    return { tMs, sunElDeg: lookAt(site, e.sun).elevationDeg, earthElDeg: lookAt(site, e.earth, e.earthDistanceKm).elevationDeg };
  });
}
