import { useMemo } from "react";
import { computeConditions, nextTransition, formatDuration, MS_HOUR } from "@/lib/ephemeris";
import { currentMs, useMission } from "@/store/mission";
import { useSite } from "@/hooks/useSite";

const fmtCoord = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(3)}° ${lat < 0 ? "S" : "N"}, ${Math.abs(lon).toFixed(3)}° ${lon < 0 ? "W" : "E"}`;

function Row({ label, value, color, pct }: { label: string; value: string; color: string; pct?: number }) {
  return (
    <div className="my-2">
      <div className="flex justify-between text-mut"><span>{label}</span><b className="text-ink">{value}</b></div>
      {pct !== undefined && (
        <div className="mt-1 h-[5px] rounded bg-white/10"><i className="block h-full rounded" style={{ width: `${pct}%`, background: color }} /></div>
      )}
    </div>
  );
}

export function DossierPanel() {
  const site = useSite();
  const t = useMission(currentMs);
  const c = useMemo(() => computeConditions(site, t), [site, t]);
  // recompute countdowns once per simulated hour, not every frame
  const hour = Math.floor(t / MS_HOUR);
  const sunT = useMemo(() => nextTransition(site, hour * MS_HOUR, "sun"), [site, hour]);
  const earthT = useMemo(() => nextTransition(site, hour * MS_HOUR, "earth"), [site, hour]);
  const clamp = (v: number) => Math.max(0, Math.min(100, (v / 90) * 100));

  return (
    <div>
      <h2 className="font-display text-lg leading-tight">{site.name}</h2>
      <p className="text-mut">{site.region}</p>
      <p className="mt-1 tabular-nums">{fmtCoord(site.lat, site.lon)}</p>
      {site.approx && <p className="mt-1 text-sun">Coordinates are approximate. Verify before use.</p>}

      <Row label="Sun elevation" value={`${c.sun.elevationDeg.toFixed(1)}°`} color="var(--color-sun)" pct={clamp(c.sun.elevationDeg)} />
      <Row label="Earth elevation" value={`${c.earth.elevationDeg.toFixed(1)}°`} color="var(--color-earth)" pct={clamp(c.earth.elevationDeg)} />
      <Row label="Sun azimuth" value={`${c.sun.azimuthDeg.toFixed(0)}°`} color="" />
      <Row label="Earth azimuth" value={`${c.earth.azimuthDeg.toFixed(0)}°`} color="" />
      <Row label={sunT.up ? "Sunset in" : "Sunrise in"} value={formatDuration(sunT.dtMs)} color="" />
      <Row label={earthT.up ? "Earthset in" : "Earthrise in"} value={formatDuration(earthT.dtMs)} color="" />
      <Row label="Sun" value={c.sunUp ? "Above horizon" : "Below horizon"} color="" />
      <Row label="Earth (direct line of sight)" value={c.earthUp ? "Visible" : "Not visible"} color="" />

      <p className="mt-3 border-t border-line pt-2 text-[11px] text-mut">
        Approximate model: truncated lunar series with libration, smooth-sphere horizon. Terrain (LOLA) is not included, so polar results are optimistic. Not NASA SPICE or JPL Horizons data.
      </p>
    </div>
  );
}
