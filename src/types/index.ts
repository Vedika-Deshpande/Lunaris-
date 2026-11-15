export interface LandingSite {
  id: string;
  name: string;
  region: string;
  lat: number; // degrees, -90..90
  lon: number; // degrees east, -180..180
  kind: "predefined" | "custom";
  approx?: boolean; // coordinates approximate, verify before use
}
export interface SkyPosition { elevationDeg: number; azimuthDeg: number }
export interface SiteConditions {
  timestampMs: number;
  sun: SkyPosition;
  earth: SkyPosition;
  sunUp: boolean;
  earthUp: boolean;
  horizon: "smooth-sphere" | "terrain";
  source: "computed-approx" | "api";
}
/** Backend contract: GET /horizon?lat=&lon= (from LOLA DEM) */
export interface HorizonProfile {
  azimuthStepDeg: number;
  elevationDeg: number[]; // index i = azimuth i*step, north = 0, clockwise
  source: string;
  resolutionMPerPx: number;
  observerHeightM: number;
}
