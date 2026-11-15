import { SITES } from "@/data/sites";
import type { HorizonProfile, LandingSite } from "@/types";

const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === "true";
const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function http<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Backend contract (for the backend team):
 *   GET /sites               -> LandingSite[]
 *   GET /horizon?lat=&lon=   -> HorizonProfile   (terrain horizon from LOLA DEM)
 * Sun/Earth positions are computed in the browser: src/lib/ephemeris.ts
 */
export const api = {
  async getSites(): Promise<LandingSite[]> {
    return USE_BACKEND ? http<LandingSite[]>("/sites") : SITES;
  },
  async getHorizon(site: { lat: number; lon: number }): Promise<HorizonProfile | null> {
    return USE_BACKEND ? http<HorizonProfile>("/horizon", site) : null;
  },
};
