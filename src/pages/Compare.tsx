import { useMemo, useState } from "react";
import { computeConditions, formatDuration, nextTransition, sampleSeries } from "@/lib/ephemeris";
import { LUNAR_DAY, useMission } from "@/store/mission";
import { useSites } from "@/hooks/useSite";
import type { LandingSite } from "@/types";

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 16);
interface Scn { id: number; siteId: string; when: string }

function Row({ s, sites, onChange, onRemove }: { s: Scn; sites: LandingSite[]; onChange: (p: Partial<Scn>) => void; onRemove: () => void }) {
  const site = sites.find((x) => x.id === s.siteId) ?? sites[0];
  const t = Date.parse(`${s.when}:00Z`);
  const r = useMemo(() => {
    const c = computeConditions(site, t);
    const ser = sampleSeries(site, t, LUNAR_DAY, 6);
    return {
      c, sun: nextTransition(site, t, "sun"), earth: nextTransition(site, t, "earth"),
      sunPct: (100 * ser.filter((p) => p.sunElDeg > 0).length) / ser.length,
      earthPct: (100 * ser.filter((p) => p.earthElDeg > 0).length) / ser.length,
    };
  }, [site, t]);
  return (
    <tr className="border-b border-line tabular-nums">
      <td className="p-2"><select className="field" value={s.siteId} onChange={(e) => onChange({ siteId: e.target.value })}>{sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></td>
      <td className="p-2"><input className="field" type="datetime-local" value={s.when} onChange={(e) => e.target.value && onChange({ when: e.target.value })} /></td>
      <td className="p-2 text-sun">{r.c.sun.elevationDeg.toFixed(1)}°</td>
      <td className="p-2 text-earth">{r.c.earth.elevationDeg.toFixed(1)}°</td>
      <td className="p-2">{r.sun.up ? "sets" : "rises"} in {formatDuration(r.sun.dtMs)}</td>
      <td className="p-2">{r.earth.up ? "sets" : "rises"} in {formatDuration(r.earth.dtMs)}</td>
      <td className="p-2">{r.sunPct.toFixed(0)}%</td>
      <td className="p-2">{r.earthPct.toFixed(0)}%</td>
      <td className="p-2"><button className="btn" onClick={onRemove} aria-label="Remove scenario">Remove</button></td>
    </tr>
  );
}

export default function Compare() {
  const { data: sites } = useSites();
  const start = useMission((s) => s.startMs);
  const [rows, setRows] = useState<Scn[]>(() => [
    { id: 1, siteId: "apollo-11", when: iso(start) },
    { id: 2, siteId: "im-1", when: iso(start) },
  ]);
  return (
    <div className="px-3 pb-10 pt-[76px] lg:px-6">
      <h1 className="font-display text-3xl">Compare scenarios</h1>
      <p className="mb-3 mt-1 max-w-3xl text-mut">Each row is one site and date. Change either one to see how feasibility shifts. Percentages cover the following lunar day (29.5 d). Smooth-sphere horizon, terrain not included.</p>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead className="text-mut"><tr className="border-b border-line">
            {["Site", "Date and time (UTC)", "Sun elev.", "Earth elev.", "Sun", "Earth", "Sun up", "Earth up", ""].map((h) => <th key={h} className="p-2 font-normal">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((s) => <Row key={s.id} s={s} sites={sites} onChange={(p) => setRows((r) => r.map((x) => (x.id === s.id ? { ...x, ...p } : x)))} onRemove={() => setRows((r) => r.filter((x) => x.id !== s.id))} />)}
          </tbody>
        </table>
      </div>
      {rows.length < 6 && <button className="btn mt-3" onClick={() => setRows((r) => [...r, { id: Date.now(), siteId: "apollo-11", when: iso(start) }])}>Add scenario</button>}
    </div>
  );
}
