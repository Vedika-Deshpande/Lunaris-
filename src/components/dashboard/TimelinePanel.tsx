import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { currentMs, useMission } from "@/store/mission";
import { sampleSeries } from "@/lib/ephemeris";
import { useSite } from "@/hooks/useSite";

const day = (ms: number) => new Date(ms).toISOString().slice(5, 10);

export function TimelinePanel() {
  const site = useSite();
  const { startMs, spanDays, offsetDays, playing, speed, setOffset, setPlaying, setSpeed } = useMission();
  const t = useMission(currentMs);
  const data = useMemo(() => sampleSeries(site, startMs, spanDays, 3), [site, startMs, spanDays]);

  return (
    <div className="flex h-full flex-col gap-1.5">
      <div className="flex items-center gap-3">
        <button className="btn w-14" onClick={() => { if (offsetDays >= spanDays) setOffset(0); setPlaying(!playing); }}>{playing ? "Pause" : "Play"}</button>
        <input type="range" min={0} max={spanDays} step={0.01} value={offsetDays} onChange={(e) => setOffset(Number(e.target.value))} aria-label="Mission time offset" />
        <span className="w-16 whitespace-nowrap tabular-nums text-mut">+{offsetDays.toFixed(1)} d</span>
        <select className="field w-24" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} aria-label="Playback speed">
          <option value={0.25}>0.25 d/s</option><option value={1}>1 d/s</option><option value={3}>3 d/s</option>
        </select>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="rgba(255,255,255,.1)" />
            <XAxis dataKey="tMs" type="number" domain={["dataMin", "dataMax"]} tickFormatter={day} stroke="#9aa3b0" fontSize={11} />
            <YAxis domain={[-30, 90]} ticks={[-30, 0, 30, 60, 90]} stroke="#9aa3b0" fontSize={11} unit="°" />
            <Tooltip contentStyle={{ background: "#0b0f17", border: "1px solid rgba(255,255,255,.14)" }} labelFormatter={(v) => `${new Date(v as number).toISOString().slice(0, 16).replace("T", " ")} UTC`} formatter={(v) => `${Number(v).toFixed(1)}°`} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,.3)" />
            <ReferenceLine x={t} stroke="#fff" />
            <Line dataKey="sunElDeg" name="Sun elevation" stroke="#ffc766" dot={false} strokeWidth={2} isAnimationActive={false} />
            <Line dataKey="earthElDeg" name="Earth elevation" stroke="#6cb4ff" dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
