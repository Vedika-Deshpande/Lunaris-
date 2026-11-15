import math

R_MOON_KM = 1737.4
RIM_HEIGHT_FRACTION = 0.03  # rough rule of thumb — see module docstring


def _great_circle(lat1, lon1, lat2, lon2):
    """Distance (km) and initial bearing (deg, 0=toward lon+ pole-relative
    north) from point 1 to point 2, on a sphere of radius R_MOON_KM."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlon = math.radians(lon2 - lon1)
    cos_d = math.sin(p1) * math.sin(p2) + math.cos(p1) * math.cos(p2) * math.cos(dlon)
    d = math.acos(max(-1.0, min(1.0, cos_d)))
    dist_km = d * R_MOON_KM
    bearing = (math.degrees(math.atan2(
        math.sin(dlon) * math.cos(p2),
        math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dlon),
    )) + 360) % 360
    return dist_km, bearing


def _rim_elevation_angle(distance_km, rim_height_km):
    """Angle (deg) above the geometric horizon at which a rim of this height
    appears at this distance, net of the horizon's own drop due to the
    Moon's curvature over that distance."""
    if distance_km <= 0:
        return 90.0
    curvature_drop_km = (distance_km ** 2) / (2 * R_MOON_KM)
    net_height_km = rim_height_km - curvature_drop_km
    return math.degrees(math.atan2(net_height_km, distance_km))


def horizon_mask(lat, lon, craters, max_range_km=250, az_step_deg=5):
    """Azimuth -> blocking angle (deg), one bin every `az_step_deg`, built
    from every crater within `max_range_km` whose estimated rim would sit
    above the geometric horizon as seen from (lat, lon)."""
    bins = {az: 0.0 for az in range(0, 360, az_step_deg)}
    for c in craters:
        dist, bearing = _great_circle(lat, lon, c["lat"], c["lon"])
        if dist == 0 or dist > max_range_km:
            continue
        rim_height_km = c["diameter_km"] * RIM_HEIGHT_FRACTION
        angle = _rim_elevation_angle(dist, rim_height_km)
        if angle <= 0:
            continue
        az_bin = (az_step_deg * round(bearing / az_step_deg)) % 360
        bins[az_bin] = max(bins[az_bin], angle)
    return bins


def mask_at(bins, azimuth_deg, az_step_deg=5):
    """Linearly interpolate the horizon mask at an arbitrary azimuth."""
    azs = sorted(bins)
    a = azimuth_deg % 360
    lo = max((x for x in azs if x <= a), default=azs[-1])
    hi = min((x for x in azs if x >= a), default=azs[0])
    if lo == hi:
        return bins[lo]
    span = (hi - lo) % 360 or az_step_deg
    frac = ((a - lo) % 360) / span
    return bins[lo] + frac * (bins[hi] - bins[lo])
