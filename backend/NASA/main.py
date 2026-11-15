import math
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import ephemeris as eph
import terrain as ter

app = FastAPI(
    title="Lunar Landing Site Navigator API",
    version="0.1.0",
    description="Backend for the NASA Space Apps 'Lunar Landing Site Navigator' challenge.",
)

# Wide-open CORS for the hackathon so the frontend (on a different port/host)
# can call this freely. Tighten allow_origins before sharing the deployed URL.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# --------------------------------------------------------------------------
# shared helpers
# --------------------------------------------------------------------------

def _parse_dt(dt: Optional[str]) -> float:
    """Accepts an ISO datetime (e.g. "2027-08-12T06:00" or with a trailing
    "Z"); omit it for "now". Returns epoch milliseconds."""
    if not dt:
        return datetime.now(timezone.utc).timestamp() * 1000
    try:
        if dt.endswith("Z"):
            dt = dt[:-1] + "+00:00"
        d = datetime.fromisoformat(dt)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.timestamp() * 1000
    except ValueError:
        raise HTTPException(400, f"Bad datetime: {dt!r}. Use ISO format, e.g. 2027-08-12T06:00:00Z")


def _iso(t_ms: float) -> str:
    return datetime.fromtimestamp(t_ms / 1000, tz=timezone.utc).isoformat()


def _mask_fn(lat: float, lon: float, flat_mask: Optional[float]):
    """A function azimuth_deg -> horizon mask (deg) at this site. If the
    caller gave an explicit flat `mask`, that wins everywhere (useful for
    quick what-if testing). Otherwise it's estimated from nearby craters —
    see terrain.py — so different directions get different horizons."""
    if flat_mask is not None:
        return lambda az: flat_mask
    bins = ter.horizon_mask(lat, lon, CRATERS)
    return lambda az: ter.mask_at(bins, az)


# --------------------------------------------------------------------------
# /sites — curated landing sites (core requirement)
# --------------------------------------------------------------------------

@app.get("/sites")
def list_sites():
    """Curated landing-site list — identical data to SITES/ART inside
    moon-navigator-3d.html, so ids/names/positions always match the 3D view."""
    return [
        {
            "id": i,
            "name": name,
            "lat": lat,
            "lon": lon,
            "hardware": eph.ARTIFACTS[i][0],
            "landed": eph.ARTIFACTS[i][1] or None,
            "notes": eph.ARTIFACTS[i][2],
        }
        for i, (name, lat, lon) in enumerate(eph.SITES)
    ]


# --------------------------------------------------------------------------
# /evaluate — one site, one instant (core requirement)
# --------------------------------------------------------------------------

class NextEvent(BaseModel):
    currently_up: bool
    ms_until_change: Optional[float]


class EvaluateResponse(BaseModel):
    datetime_utc: str
    sun_elevation_deg: float
    sun_azimuth_deg: float
    earth_elevation_deg: float
    earth_azimuth_deg: float
    solar_power_fraction: float
    next_sun_event: NextEvent
    next_earth_event: NextEvent
    earth_moon_distance_km: float


@app.get("/evaluate", response_model=EvaluateResponse)
def evaluate(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=360),
    dt: Optional[str] = Query(None, description="ISO datetime, UTC. Omit for now."),
    mask: Optional[float] = Query(None, description="Override the automatic crater-based horizon mask with one flat value, degrees"),
):
    """Sun/Earth position at one site and instant — feeds the elevation bars,
    status chips and 'time to sunset/Earthset' countdowns."""
    t = _parse_dt(dt)
    e = eph.ephem(t)
    sun_el, sun_az = eph.look(lat, lon, e["sun"])
    earth_el, earth_az = eph.look(lat, lon, e["earth"])
    power = max(0.0, math.sin(sun_el * math.pi / 180))
    mfn = _mask_fn(lat, lon, mask)
    return {
        "datetime_utc": _iso(t),
        "sun_elevation_deg": round(sun_el, 2),
        "sun_azimuth_deg": round(sun_az, 1),
        "earth_elevation_deg": round(earth_el, 2),
        "earth_azimuth_deg": round(earth_az, 1),
        "solar_power_fraction": round(power, 3),
        "next_sun_event": eph.next_event(lat, lon, t, "sun", mfn),
        "next_earth_event": eph.next_event(lat, lon, t, "earth", mfn),
        "earth_moon_distance_km": round(e["dist_km"], 0),
    }


# --------------------------------------------------------------------------
# /timeline — one site over a date range (temporal dynamics)
# --------------------------------------------------------------------------

@app.get("/timeline")
def timeline(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=360),
    dt: Optional[str] = Query(None),
    span_days: float = Query(29.53, gt=0, le=120, description="How far ahead to project"),
    step_hours: float = Query(3.0, gt=0, le=24),
    min_sun: float = Query(2.0),
    min_earth: float = Query(5.0),
    mask: Optional[float] = Query(None, description="Override the automatic crater-based horizon mask with one flat value, degrees"),
):
    """Sun/Earth elevation over time, for an animated scrubber or chart."""
    t0 = _parse_dt(dt)
    grid = eph.build_grid(t0, span_days, step_hours)
    mfn = _mask_fn(lat, lon, mask)
    points = []
    for i, g in enumerate(grid):
        a, az_a = eph.look(lat, lon, g["sun"])
        b, az_b = eph.look(lat, lon, g["earth"])
        ms, me = max(min_sun, mfn(az_a)), max(min_earth, mfn(az_b))
        points.append({
            "t_offset_days": round(i * step_hours / 24, 3),
            "sun_elevation_deg": round(a, 2),
            "earth_elevation_deg": round(b, 2),
            "viable": bool(a >= ms and b >= me),
        })
    return {"start_utc": _iso(t0), "step_hours": step_hours, "points": points}


# --------------------------------------------------------------------------
# /compare — rank several sites over a window (comparison requirement)
# --------------------------------------------------------------------------

class CompareSite(BaseModel):
    id: Optional[int]
    name: str
    lat: float
    lon: float
    sunlit_fraction: float
    earth_visible_fraction: float
    ops_availability: float
    longest_night_days: float


@app.get("/compare", response_model=List[CompareSite])
def compare(
    dt: Optional[str] = Query(None),
    span_days: float = Query(29.53, gt=0, le=120),
    min_sun: float = Query(2.0),
    min_earth: float = Query(5.0),
    mask: Optional[float] = Query(None, description="Override the automatic crater-based horizon mask with one flat value, degrees"),
    site_ids: Optional[str] = Query(None, description="Comma-separated site ids; omit for every curated site"),
    custom: Optional[str] = Query(None, description="Extra ad-hoc sites as 'lat,lon' pairs separated by ';', e.g. '-85.2,10.5;-88.0,-20.0' — to compare a candidate coordinate alongside the curated list"),
):
    """Ranks sites by 'ops availability' (sunlit AND Earth-visible at once)
    over the window — the comparison list / 'Compare sites' screen. Curated
    sites (by id) and ad-hoc custom coordinates can both be included at once."""
    t0 = _parse_dt(dt)
    grid = eph.build_grid(t0, span_days)  # fixed 3h step, matches site_stats' default
    ids = [int(x) for x in site_ids.split(",")] if site_ids else list(range(len(eph.SITES)))
    results = []
    for i in ids:
        if not (0 <= i < len(eph.SITES)):
            raise HTTPException(404, f"No site with id {i}")
        name, lat, lon = eph.SITES[i]
        mfn = _mask_fn(lat, lon, mask)
        stats = eph.site_stats(lat, lon, grid, min_sun, min_earth, mfn)
        results.append({"id": i, "name": name, "lat": lat, "lon": lon, **stats})
    if custom:
        for n, pair in enumerate(custom.split(";"), start=1):
            try:
                lat_s, lon_s = pair.split(",")
                lat, lon = float(lat_s), float(lon_s)
            except ValueError:
                raise HTTPException(400, f"Bad custom site {pair!r}, expected 'lat,lon'")
            mfn = _mask_fn(lat, lon, mask)
            stats = eph.site_stats(lat, lon, grid, min_sun, min_earth, mfn)
            results.append({"id": None, "name": f"Custom {n}", "lat": lat, "lon": lon, **stats})
    results.sort(key=lambda r: r["ops_availability"], reverse=True)
    return results


# --------------------------------------------------------------------------
# /assets — rovers & probes, for an Orbit-Codex-style tracker panel (stretch)
# --------------------------------------------------------------------------

ROVERS = [
    {"id": "lunokhod-1", "name": "Lunokhod 1", "status": "inactive", "landed": "1970-11-17"},
    {"id": "lunokhod-2", "name": "Lunokhod 2", "status": "inactive", "landed": "1973-01-15"},
    {"id": "yutu", "name": "Yutu (Jade Rabbit)", "status": "inactive", "landed": "2013-12-14"},
    {"id": "yutu-2", "name": "Yutu-2", "status": "active", "landed": "2019-01-03"},
    {"id": "pragyan", "name": "Pragyan", "status": "inactive", "landed": "2023-08-23"},
]

PROBES = [
    {"id": "lro", "name": "LRO (Lunar Reconnaissance Orbiter)", "status": "active"},
    {"id": "kplo", "name": "KPLO / Danuri (Korea Pathfinder Lunar Orbiter)", "status": "active"},
    {"id": "queqiao-2", "name": "Queqiao-2 (relay)", "status": "active"},
]


@app.get("/assets")
def list_assets():
    """Static reference data for an 'asset tracker' panel, in the spirit of
    the Orbit Codex screenshots. No live telemetry — that needs a licensed
    tracking feed and is out of scope for this hackathon."""
    return {"rovers": ROVERS, "probes": PROBES}


# --------------------------------------------------------------------------
# /craters — south-pole atlas, for a polar map view (stretch)
# --------------------------------------------------------------------------

CRATERS = [
    {"name": "Shackleton", "lat": -89.9, "lon": 0.0, "diameter_km": 21},
    {"name": "de Gerlache", "lat": -88.5, "lon": -87.0, "diameter_km": 32},
    {"name": "Shoemaker", "lat": -88.1, "lon": 44.9, "diameter_km": 51},
    {"name": "Faustini", "lat": -87.3, "lon": 77.0, "diameter_km": 39},
    {"name": "Haworth", "lat": -87.4, "lon": -4.6, "diameter_km": 51},
    {"name": "Nobile", "lat": -85.3, "lon": 56.1, "diameter_km": 74},
    {"name": "Cabeus", "lat": -84.9, "lon": -35.5, "diameter_km": 98},
    {"name": "Amundsen", "lat": -84.4, "lon": 83.2, "diameter_km": 105},
    {"name": "Malapert", "lat": -84.9, "lon": 0.4, "diameter_km": 69},
    {"name": "Sverdrup", "lat": -88.5, "lon": -27.0, "diameter_km": 34},
]


@app.get("/craters")
def list_craters():
    """South-pole crater reference points for a polar atlas view. Coordinates
    are approximate placeholders — replace with exact LOLA-derived values
    before relying on them for real site picking."""
    return CRATERS


@app.get("/terrain")
def terrain_profile(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=360),
):
    """Azimuth -> estimated horizon-blocking angle (deg), from nearby crater
    rims (see terrain.py for the method and its limits). Feeds a horizon-line
    visualization on the frontend — e.g. the jagged skyline in the dashboard's
    Sun/Earth illustration, instead of a flat line."""
    bins = ter.horizon_mask(lat, lon, CRATERS)
    return {
        "lat": lat,
        "lon": lon,
        "profile": [{"azimuth_deg": az, "mask_deg": round(v, 2)} for az, v in sorted(bins.items())],
    }


@app.get("/")
def root():
    return {"ok": True, "docs": "/docs", "endpoints": ["/sites", "/evaluate", "/timeline", "/compare", "/assets", "/craters", "/terrain"]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
