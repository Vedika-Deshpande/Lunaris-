import { useMemo, useState } from "react";
import { Moon3D } from "@/components/dashboard/Moon3D";
import { MissionPanel } from "@/components/dashboard/MissionPanel";
import { DossierPanel } from "@/components/dashboard/DossierPanel";
import { TimelinePanel } from "@/components/dashboard/TimelinePanel";
import { bodyState } from "@/lib/ephemeris";
import { currentMs, useMission } from "@/store/mission";
import { useSite, useSites } from "@/hooks/useSite";
import { usePlayback } from "@/hooks/usePlayback";

export default function Dashboard({ simulator = false }: { simulator?: boolean }) {
  usePlayback();
  const site = useSite();
  const sites = useSites().data;
  const selectSite = useMission((s) => s.selectSite);
  const [sunFixed, setSunFixed] = useState(simulator);
  const [grid, setGrid] = useState(true);
  const [orbiters, setOrbiters] = useState(simulator);
  const t = useMission(currentMs);
  const b = useMemo(() => bodyState(t), [t]);

  return (
    <div className="relative min-h-screen pt-[72px] lg:h-screen lg:overflow-hidden lg:pt-0">
      <div className="h-[55vh] lg:absolute lg:inset-0 lg:h-full"><Moon3D site={site} sites={sites} sun={b.sun} earth={b.earth} sunFixed={sunFixed} showGrid={grid} showOrbiters={orbiters} onPick={selectSite} /></div>
      <div className="relative z-10 flex flex-wrap gap-1.5 px-3 pt-1 lg:absolute lg:left-1/2 lg:top-[72px] lg:-translate-x-1/2 lg:px-0 lg:pt-0">
        <button className={`btn ${sunFixed ? "border-sun text-sun" : ""}`} onClick={() => setSunFixed((v) => !v)}>{sunFixed ? "Sun-fixed: Moon rotates" : "Moon-fixed: Sun moves"}</button>
        <button className={`btn ${grid ? "border-sun text-sun" : ""}`} onClick={() => setGrid((v) => !v)}>Lat/lon grid</button>
        <button className={`btn ${orbiters ? "border-sun text-sun" : ""}`} onClick={() => setOrbiters((v) => !v)}>Orbiters</button>
      </div>
      <p className="pointer-events-none px-3 py-1 text-[11px] text-mut lg:absolute lg:bottom-[212px] lg:left-1/2 lg:-translate-x-1/2 lg:px-0">
        Drag to rotate, scroll to zoom. Sun and Earth markers show direction only, not to scale.
      </p>
      <aside className="panel m-2.5 overflow-auto p-3 lg:fixed lg:bottom-[206px] lg:left-2.5 lg:top-[72px] lg:m-0 lg:w-[268px]"><MissionPanel /></aside>
      <aside className="panel m-2.5 overflow-auto p-3 lg:fixed lg:bottom-[206px] lg:right-2.5 lg:top-[72px] lg:m-0 lg:w-[330px]"><DossierPanel /></aside>
      <section className="panel m-2.5 h-[240px] p-3 lg:fixed lg:inset-x-2.5 lg:bottom-2.5 lg:m-0 lg:h-[188px]"><TimelinePanel /></section>
    </div>
  );
}
