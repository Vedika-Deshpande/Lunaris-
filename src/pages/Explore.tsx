import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MissionPanel } from "@/components/dashboard/MissionPanel";
import { DossierPanel } from "@/components/dashboard/DossierPanel";
import { MAP_LAYERS } from "@/config/layers";
import { SITES } from "@/data/sites";
import { useMission } from "@/store/mission";
import { useSite } from "@/hooks/useSite";

export default function Explore() {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const pin = useRef<L.CircleMarker | null>(null);
  const site = useSite();

  useEffect(() => {
    const m = L.map(el.current!, { crs: L.CRS.EPSG4326, center: [0, 0], zoom: 1, minZoom: 0, maxZoom: 9, maxBounds: [[-90, -180], [90, 180]] });
    const base = Object.fromEntries(MAP_LAYERS.map((l) => [l.label, L.tileLayer(l.url, { tileSize: 256, noWrap: true, maxNativeZoom: l.maxNativeZoom, attribution: l.attribution })]));
    Object.values(base)[0].addTo(m);
    if (MAP_LAYERS.length > 1) L.control.layers(base).addTo(m);
    SITES.forEach((s) =>
      L.circleMarker([s.lat, s.lon], { radius: 5, color: "#ffc766", weight: 1.5, fillOpacity: 0.5 })
        .bindTooltip(s.name).on("click", () => useMission.getState().selectSite(s.id)).addTo(m));
    m.on("click", (e) => useMission.getState().setCustom(e.latlng.lat, e.latlng.lng));
    pin.current = L.circleMarker([0, 0], { radius: 9, color: "#ffffff", weight: 2, fillOpacity: 0 }).addTo(m);
    map.current = m;
    return () => { m.remove(); };
  }, []);

  useEffect(() => {
    pin.current?.setLatLng([site.lat, site.lon]);
    map.current?.flyTo([site.lat, site.lon], Math.max(map.current.getZoom(), 3), { duration: 0.8 });
  }, [site.lat, site.lon]);

  return (
    <div className="relative min-h-screen pt-[72px] lg:h-screen lg:pt-0">
      <div ref={el} className="h-[60vh] bg-black lg:absolute lg:inset-0 lg:h-full" />
      <aside className="panel z-[1100] m-2.5 overflow-auto p-3 lg:fixed lg:bottom-2.5 lg:left-2.5 lg:top-[72px] lg:m-0 lg:w-[268px]"><MissionPanel /></aside>
      <aside className="panel z-[1100] m-2.5 overflow-auto p-3 lg:fixed lg:bottom-2.5 lg:right-2.5 lg:top-[72px] lg:m-0 lg:w-[330px]"><DossierPanel /></aside>
      <p className="panel pointer-events-none absolute bottom-2.5 left-1/2 z-[1100] hidden -translate-x-1/2 px-3 py-1 text-mut lg:block">
        Click the map to set a custom location. Scroll to zoom, drag to pan. Gold dots are curated sites.
      </p>
    </div>
  );
}
