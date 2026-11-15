import type { LandingSite } from "@/types";

// Coordinates copied from the design reference. Verify against official sources.
const s = (id: string, name: string, region: string, lat: number, lon: number, approx = false): LandingSite =>
  ({ id, name, region, lat, lon, kind: "predefined", approx });

export const SITES: LandingSite[] = [
  s("apollo-11", "Apollo 11", "NASA · 1969", 0.674, 23.473),
  s("apollo-12", "Apollo 12", "NASA · 1969", -3.013, -23.422),
  s("apollo-14", "Apollo 14", "NASA · 1971", -3.645, -17.471),
  s("apollo-15", "Apollo 15", "NASA · 1971", 26.132, 3.634),
  s("apollo-16", "Apollo 16", "NASA · 1972", -8.973, 15.5),
  s("apollo-17", "Apollo 17", "NASA · 1972", 20.191, 30.772),
  s("change-3", "Chang’e 3", "CNSA · 2013", 44.121, -19.512),
  s("change-4", "Chang’e 4 (far side)", "CNSA · 2019", -45.456, 177.589),
  s("change-5", "Chang’e 5", "CNSA · 2020", 43.058, -51.916),
  s("chandrayaan-3", "Chandrayaan-3", "ISRO · 2023", -69.373, 32.319),
  s("slim", "SLIM", "JAXA · 2024", -13.3, 25.2),
  s("im-1", "IM-1 Odysseus", "CLPS · 2024", -80.13, 1.44),
  s("blue-ghost-m1", "Blue Ghost M1", "CLPS · 2025", 18.56, 61.81),
  s("luna-25", "Luna 25 impact", "Roscosmos · 2023", -57.865, 61.36, true),
  s("artemis-iii", "Artemis III ridge (approx.)", "NASA · candidate", -89.45, -137.1, true),
];
