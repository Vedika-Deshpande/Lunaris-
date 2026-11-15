// NASA Moon Trek WMTS (equirectangular). Tiles load live in the browser from trek.nasa.gov.
// Only layers whose URL has been confirmed are listed. To add a LOLA layer, read its id from
// https://trek.nasa.gov/tiles/Moon/EQ/<LayerId>/1.0.0/WMTSCapabilities.xml and add a row below.
export interface MapLayer { id: string; label: string; url: string; maxNativeZoom: number; attribution: string }

const TREK = "https://trek.nasa.gov/tiles/Moon/EQ";
export const MAP_LAYERS: MapLayer[] = [
  {
    id: "lro-wac",
    label: "LRO WAC mosaic (303 ppd)",
    url: `${TREK}/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/default/default028mm/{z}/{y}/{x}.jpg`,
    maxNativeZoom: 7,
    attribution: "NASA / GSFC / ASU · LRO WAC via NASA Moon Trek",
  },
];
