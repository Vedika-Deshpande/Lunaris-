import { create } from "zustand";
import type { LandingSite } from "@/types";

export const LUNAR_DAY = 29.53;
const nowMin = () => Math.floor(Date.now() / 6e4) * 6e4;

interface State {
  siteId: string;
  custom: LandingSite | null;
  startMs: number;
  offsetDays: number;
  spanDays: number;
  playing: boolean;
  speed: number; // days of mission time per real second
  selectSite: (id: string) => void;
  setCustom: (lat: number, lon: number) => void;
  setStart: (ms: number) => void;
  shiftStart: (days: number) => void;
  setOffset: (d: number) => void;
  setSpan: (d: number) => void;
  setPlaying: (p: boolean) => void;
  setSpeed: (s: number) => void;
}

export const useMission = create<State>()((set) => ({
  siteId: "apollo-11", custom: null, startMs: nowMin(), offsetDays: 0, spanDays: 30, playing: false, speed: 1,
  selectSite: (siteId) => set({ siteId }),
  setCustom: (lat, lon) => set({ custom: { id: "custom", name: "Custom location", region: "User-defined", lat, lon, kind: "custom" }, siteId: "custom" }),
  setStart: (startMs) => set({ startMs, offsetDays: 0 }),
  shiftStart: (d) => set((s) => ({ startMs: s.startMs + d * 864e5 })),
  setOffset: (offsetDays) => set({ offsetDays }),
  setSpan: (spanDays) => set((s) => ({ spanDays, offsetDays: Math.min(s.offsetDays, spanDays) })),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
}));

export const currentMs = (s: { startMs: number; offsetDays: number }) => s.startMs + s.offsetDays * 864e5;
