import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useMission } from "@/store/mission";
import { SITES } from "@/data/sites";
import type { LandingSite } from "@/types";

export function useSites() {
  return useQuery({ queryKey: ["sites"], queryFn: api.getSites, staleTime: Infinity, initialData: SITES });
}

export function useSite(): LandingSite {
  const { data } = useSites();
  const siteId = useMission((s) => s.siteId);
  const custom = useMission((s) => s.custom);
  if (siteId === "custom" && custom) return custom;
  return data.find((s) => s.id === siteId) ?? data[0];
}
