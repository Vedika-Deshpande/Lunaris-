import { NavLink } from "react-router-dom";
import { currentMs, useMission } from "@/store/mission";

export const NAV = [
  { to: "/", label: "Overview" }, { to: "/simulator", label: "3D Simulator" }, { to: "/explore", label: "Explore" }, { to: "/analysis", label: "Analysis" },
  { to: "/compare", label: "Compare" }, { to: "/timeline", label: "Timeline" },
];

export function TopBar() {
  const t = useMission(currentMs);
  return (
    <header className="panel fixed inset-x-2.5 top-2.5 z-[1200] flex h-[52px] items-center justify-between gap-3 px-4">
      <b className="font-display text-[17px]">Lunar Landing Site Navigator</b>
      <nav className="flex gap-1 overflow-x-auto">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `btn whitespace-nowrap ${isActive ? "border-sun text-sun" : "text-mut"}`}>{n.label}</NavLink>
        ))}
      </nav>
      <span className="hidden tabular-nums text-mut md:block">{new Date(t).toISOString().slice(0, 16).replace("T", " ")} UTC</span>
    </header>
  );
}
