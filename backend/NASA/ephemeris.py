import math

R = math.pi / 180
DAY_MS = 86_400_000
HOUR_MS = 3_600_000

# Curated landing sites: (name, latitude deg, longitude deg E).
# Identical to the SITES array in moon-navigator-3d.html — same order, same
# values — so site ids line up between the 3D view and this API.
SITES = [
    ("Apollo 11", 0.674, 23.473),
    ("Apollo 12", -3.013, -23.422),
    ("Apollo 14", -3.645, -17.471),
    ("Apollo 15", 26.132, 3.634),
    ("Apollo 16", -8.973, 15.5),
    ("Apollo 17", 20.191, 30.772),
    ("Chang'e 3 (CNSA)", 44.121, -19.512),
    ("Chang'e 4 (far side)", -45.456, 177.589),
    ("Chang'e 5 (CNSA)", 43.058, -51.916),
    ("Chandrayaan-3 (ISRO)", -69.373, 32.319),
    ("SLIM (JAXA)", -13.3, 25.2),
    ("IM-1 Odysseus (CLPS)", -80.13, 1.44),
    ("Blue Ghost M1 (CLPS)", 18.56, 61.81),
    ("Luna 25 impact", -57.865, 61.36),
    ("Artemis III ridge (approx.)", -89.45, -137.1),
]

# (hardware kind, landed date or "" if none, notes) — same order as SITES,
# identical to the ART array in the HTML file.
ARTIFACTS = [
    ("lm", "1969-07-20", "Eagle descent stage \u00b7 Laser retroreflector \u00b7 Passive seismometer \u00b7 US flag"),
    ("lm", "1969-11-19", "Intrepid descent stage \u00b7 ALSEP science station \u00b7 Surveyor 3 lander nearby"),
    ("lm", "1971-02-05", "Antares descent stage \u00b7 ALSEP \u00b7 Modular Equipment Transporter handcart"),
    ("lm+rover", "1971-07-30", "Falcon descent stage \u00b7 Lunar Roving Vehicle \u00b7 ALSEP \u00b7 Fallen Astronaut memorial"),
    ("lm+rover", "1972-04-21", "Orion descent stage \u00b7 Lunar Roving Vehicle \u00b7 ALSEP"),
    ("lm+rover", "1972-12-11", "Challenger descent stage \u00b7 Lunar Roving Vehicle \u00b7 ALSEP"),
    ("lander", "2013-12-14", "Chang'e 3 lander \u00b7 Yutu rover"),
    ("lander", "2019-01-03", "Chang'e 4 lander \u00b7 Yutu-2 rover (far side)"),
    ("lander", "2020-12-01", "Chang'e 5 lander (sample-return mission)"),
    ("lander", "2023-08-23", "Vikram lander \u00b7 Pragyan rover"),
    ("lander", "2024-01-19", "SLIM lander with two small probes"),
    ("nova", "2024-02-22", "Odysseus (Nova-C) lander"),
    ("lander", "2025-03-02", "Blue Ghost Mission 1 lander"),
    ("none", "2023-08-19", "Luna 25 crashed here; LRO imaged the impact crater"),
    ("none", "", "No hardware yet: candidate Artemis III region"),
]


def _sn(x):
    return math.sin(x)


def _cs(x):
    return math.cos(x)


def ephem(t_ms):
    """Selenographic sub-solar and sub-Earth points at time t (epoch
    milliseconds), plus the Earth-Moon distance in km.

    Returns {"sun": (lon_deg, lat_deg), "earth": (lon_deg, lat_deg), "dist_km": x}.
    Same simplified lunar-theory series as the client (accurate to a small
    fraction of a degree, including optical libration) — plenty for ranking
    sites and estimating windows.
    """
    T = (t_ms / DAY_MS + 2440587.5 - 2451545) / 36525
    L = 218.3164477 + 481267.88123421 * T
    D = (297.8501921 + 445267.1114034 * T) * R
    M = (357.5291092 + 35999.0502909 * T) * R
    P = (134.9633964 + 477198.8675055 * T) * R
    F = (93.272095 + 483202.0175233 * T) * R
    O = 125.0445479 - 1934.1362891 * T

    lam = (L + 6.288774 * _sn(P) + 1.274027 * _sn(2 * D - P) + 0.658314 * _sn(2 * D)
           + 0.213618 * _sn(2 * P) - 0.185116 * _sn(M) - 0.114332 * _sn(2 * F)
           + 0.058793 * _sn(2 * D - 2 * P) + 0.057066 * _sn(2 * D - M - P)
           + 0.053322 * _sn(2 * D + P) + 0.045758 * _sn(2 * D - M) - 0.040923 * _sn(M - P)
           - 0.03472 * _sn(D) - 0.030383 * _sn(M + P))
    bet = (5.128122 * _sn(F) + 0.280602 * _sn(P + F) + 0.277693 * _sn(P - F)
           + 0.173237 * _sn(2 * D - F) + 0.055413 * _sn(2 * D - P + F)
           + 0.046271 * _sn(2 * D - P - F) + 0.032573 * _sn(2 * D + F) + 0.017198 * _sn(2 * P + F))

    Ms = (357.52911 + 35999.05029 * T) * R
    ls = 280.46646 + 36000.76983 * T + 1.914602 * _sn(Ms) + 0.019993 * _sn(2 * Ms)
    I = 1.54242 * R

    def sel(lm, bm):
        W = (lm - O) * R
        b = bm * R
        A = math.atan2(_sn(W) * _cs(b) * _cs(I) - _sn(b) * _sn(I), _cs(W) * _cs(b))
        lon = A / R - F / R
        lon = ((lon + 180) % 360 + 360) % 360 - 180
        lat = math.asin(max(-1.0, min(1.0, -_sn(W) * _cs(b) * _sn(I) - _sn(b) * _cs(I)))) / R
        return (lon, lat)

    dist = (385000.56 - 20905.355 * _cs(P) - 3699.111 * _cs(2 * D - P) - 2955.968 * _cs(2 * D)
            - 569.925 * _cs(2 * P) + 48.888 * _cs(M) - 3.149 * _cs(2 * F)
            + 246.158 * _cs(2 * D - 2 * P) - 152.138 * _cs(2 * D - M - P) - 170.733 * _cs(2 * D + P)
            - 204.586 * _cs(2 * D - M) - 129.62 * _cs(M - P) + 108.743 * _cs(D) + 104.755 * _cs(M + P))

    return {"sun": sel(ls + 180, 0), "earth": sel(lam, bet), "dist_km": dist}


def look(lat, lon, point):
    """Elevation and azimuth, in degrees, of a selenographic sub-point
    `point` = (lon, lat) as seen from a surface site at (lat, lon)."""
    plon, plat = point
    f = lat * R
    pl = plat * R
    d = (plon - lon) * R
    se = _sn(f) * _sn(pl) + _cs(f) * _cs(pl) * _cs(d)
    elevation = math.asin(max(-1.0, min(1.0, se))) / R
    azimuth = (math.atan2(_cs(pl) * _sn(d), _cs(f) * _sn(pl) - _sn(f) * _cs(pl) * _cs(d)) / R + 360) % 360
    return (elevation, azimuth)


def next_event(lat, lon, t_ms, body, mask_fn):
    """Next sunrise/sunset (body="sun") or Earthrise/Earthset (body="earth")
    after t_ms: hourly scan up to 60 days ahead, then bisection to the minute
    — same method as the client's nextEv().

    `mask_fn(azimuth_deg)` returns the horizon-blocking angle (deg) in that
    direction — pass `lambda az: 0.0` for a flat/no mask, or a real profile
    (e.g. from terrain.py) for a direction-aware one.

    Returns {"currently_up": bool, "ms_until_change": float | None}.
    """
    def up(x):
        e = ephem(x)
        elev, az = look(lat, lon, e["earth"] if body == "earth" else e["sun"])
        bonus = 0.0 if body == "earth" else 0.27  
        return elev + bonus > mask_fn(az)

    state = up(t_ms)
    for i in range(1, 1441):
        if up(t_ms + i * HOUR_MS) != state:
            lo, hi = t_ms + (i - 1) * HOUR_MS, t_ms + i * HOUR_MS
            for _ in range(9):
                mid = (lo + hi) / 2
                if up(mid) == state:
                    lo = mid
                else:
                    hi = mid
            return {"currently_up": state, "ms_until_change": hi - t_ms}
    return {"currently_up": state, "ms_until_change": None}


def build_grid(start_ms, span_days, step_hours=3.0):
    
    n = round(span_days * 24 / step_hours) + 1
    return [ephem(start_ms + i * step_hours * HOUR_MS) for i in range(n)]


def site_stats(lat, lon, grid, min_sun, min_earth, mask_fn, step_hours=3.0):
    
    sun_up = earth_up = both_up = 0
    run = best_run = 0
    for g in grid:
        a, az_a = look(lat, lon, g["sun"])
        b, az_b = look(lat, lon, g["earth"])
        sun_mask, earth_mask = mask_fn(az_a), mask_fn(az_b)
        ms, me = max(min_sun, sun_mask), max(min_earth, earth_mask)
        s, e = a >= ms, b >= me
        sun_up += s
        earth_up += e
        both_up += (s and e)
        if a < sun_mask:
            run += 1
            best_run = max(best_run, run)
        else:
            run = 0
    n = len(grid) or 1
    return {
        "sunlit_fraction": sun_up / n,
        "earth_visible_fraction": earth_up / n,
        "ops_availability": both_up / n,
        "longest_night_days": best_run * (step_hours / 24),
    }
