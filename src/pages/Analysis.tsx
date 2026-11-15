import { useMemo } from "react";
import { bodyState, lookAt, MS_HOUR } from "@/lib/ephemeris";
import { MissionPanel } from "@/components/dashboard/MissionPanel";
import { DossierPanel } from "@/components/dashboard/DossierPanel";
import { currentMs, useMission } from "@/store/mission";
import { useSite } from "@/hooks/useSite";

const W = 720, H = 300, X = (az: number) => 30 + (az / 360) * (W - 40), Y = (el: number) => 10 + ((90 - Math.max(-20, el)) / 110) * (H - 30);

export default function Analysis() {
  const site = useSite();
  const t = useMission(currentMs);
  const { startMs, spanDays } = useMission();
  const trail = useMemo(() => {
    const out: { s: [number, number]; e: [number, number] }[] = [];
    for (let i = 0; i <= spanDays * 4; i++) {
      const b = bodyState(startMs + i * 6 * MS_HOUR), s = lookAt(site, b.sun), e = lookAt(site, b.earth, b.earthDistanceKm);
      out.push({ s: [s.azimuthDeg, s.elevationDeg], e: [e.azimuthDeg, e.elevationDeg] });
    }
    return out;
  }, [site, startMs, spanDays]);
  const b = bodyState(t), sun = lookAt(site, b.sun), earth = lookAt(site, b.earth, b.earthDistanceKm);

  return (
    <div className="grid gap-2.5 px-2.5 pb-8 pt-[72px] lg:grid-cols-[268px_1fr_330px]">
      <aside className="panel p-3"><MissionPanel /></aside>
      <section className="panel p-3">
        <h1 className="font-display text-xl">Sky from {site.name}</h1>
        <p className="mb-2 text-mut">Sun and Earth by azimuth (from north, clockwise) and elevation. Dots trace the selected timeline; the large markers are the chosen time.</p>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sky plot of Sun and Earth">
          <rect x={30} y={Y(0)} width={W - 40} height={Y(-20) - Y(0)} fill="rgba(255,255,255,.06)" />
          {[0, 30, 60, 90].map((e) => <g key={e}><line x1={30} x2={W - 10} y1={Y(e)} y2={Y(e)} stroke="rgba(255,255,255,.14)" /><text x={4} y={Y(e) + 4} fontSize={10} fill="#9aa3b0">{e}°</text></g>)}
          {[["N", 0], ["E", 90], ["S", 180], ["W", 270], ["N", 360]].map(([l, a]) => <text key={`${l}${a}`} x={X(a as number)} y={H - 4} fontSize={11} fill="#9aa3b0" textAnchor="middle">{l}</text>)}
          {trail.map((p, i) => <g key={i}><circle cx={X(p.s[0])} cy={Y(p.s[1])} r={1.6} fill="#ffc766" opacity={0.55} /><circle cx={X(p.e[0])} cy={Y(p.e[1])} r={1.6} fill="#6cb4ff" opacity={0.55} /></g>)}
          <circle cx={X(sun.azimuthDeg)} cy={Y(sun.elevationDeg)} r={7} fill="#ffc766" stroke="#fff" />
          <circle cx={X(earth.azimuthDeg)} cy={Y(earth.elevationDeg)} r={5} fill="#6cb4ff" stroke="#fff" />
        </svg>
        <p className="mt-1 text-[11px] text-mut">Shaded band = below a smooth-sphere horizon. Terrain (LOLA) is not applied.</p>
      </section>
      <aside className="panel p-3"><DossierPanel /></aside>
    </div>
  );
}
