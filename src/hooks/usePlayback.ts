import { useEffect } from "react";
import { useMission } from "@/store/mission";

/** advances mission time while Play is on */
export function usePlayback() {
  const playing = useMission((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now(), raf = 0;
    const tick = (now: number) => {
      const { offsetDays, spanDays, speed, setOffset, setPlaying } = useMission.getState();
      const next = offsetDays + ((now - last) / 1000) * speed;
      last = now;
      if (next >= spanDays) { setOffset(spanDays); setPlaying(false); return; }
      setOffset(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
}
