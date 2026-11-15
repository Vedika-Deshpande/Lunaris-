import { useState } from "react";
import { useMission, LUNAR_DAY } from "@/store/mission";
import { useSites } from "@/hooks/useSite";

const toInput = (ms: number) => new Date(ms).toISOString().slice(0, 16);

export function MissionPanel() {
  const { data: sites } = useSites();
  const m = useMission();
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [err, setErr] = useState("");

  const applyCustom = () => {
    const la = Number(lat), lo = Number(lon);
    if (lat === "" || lon === "" || !Number.isFinite(la) || !Number.isFinite(lo) || la < -90 || la > 90 || lo < -180 || lo > 360) {
      setErr("Latitude must be −90 to 90 and longitude −180 to 360 (east positive).");
      return;
    }
    setErr("");
    m.setCustom(la, lo > 180 ? lo - 360 : lo);
  };

  return (
    <div className="space-y-3">
      <h2 className="font-display text-base">Mission</h2>
      <label className="block text-mut">Landing site
        <select className="field mt-1" value={m.siteId} onChange={(e) => m.selectSite(e.target.value)}>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          {m.custom && <option value="custom">Custom location</option>}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-mut">Latitude °<input className="field mt-1" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-89.45" /></label>
        <label className="text-mut">Longitude °E<input className="field mt-1" inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="-137.1" /></label>
      </div>
      <button className="btn w-full" onClick={applyCustom}>Use these coordinates</button>
      {err && <p className="text-bad">{err}</p>}
      <label className="block text-mut">Start date and time (UTC)
        <input className="field mt-1" type="datetime-local" value={toInput(m.startMs)}
          onChange={(e) => e.target.value && m.setStart(new Date(`${e.target.value}:00Z`).getTime())} />
      </label>
      <div className="flex flex-wrap gap-1.5">
        <button className="btn" onClick={() => m.shiftStart(-LUNAR_DAY)}>−1 lunar day</button>
        <button className="btn" onClick={() => m.shiftStart(-1)}>−1 d</button>
        <button className="btn" onClick={() => m.shiftStart(1)}>+1 d</button>
        <button className="btn" onClick={() => m.shiftStart(LUNAR_DAY)}>+1 lunar day</button>
        <button className="btn" onClick={() => m.setStart(Math.floor(Date.now() / 6e4) * 6e4)}>Now</button>
      </div>
      <label className="block text-mut">Timeline length
        <select className="field mt-1" value={m.spanDays} onChange={(e) => m.setSpan(Number(e.target.value))}>
          <option value={7}>7 days</option><option value={15}>15 days</option>
          <option value={30}>30 days</option><option value={60}>60 days</option>
        </select>
      </label>
    </div>
  );
}
