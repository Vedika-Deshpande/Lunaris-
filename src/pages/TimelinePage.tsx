import { MissionPanel } from "@/components/dashboard/MissionPanel";
import { TimelinePanel } from "@/components/dashboard/TimelinePanel";
import { usePlayback } from "@/hooks/usePlayback";

export default function TimelinePage() {
  usePlayback();
  return (
    <div className="grid gap-2.5 px-2.5 pb-8 pt-[72px] lg:grid-cols-[268px_1fr]">
      <aside className="panel p-3"><MissionPanel /></aside>
      <section className="panel h-[70vh] p-3">
        <h1 className="mb-2 font-display text-xl">Sunlight and Earth visibility over time</h1>
        <div className="h-[calc(100%-2rem)]"><TimelinePanel /></div>
      </section>
    </div>
  );
}
