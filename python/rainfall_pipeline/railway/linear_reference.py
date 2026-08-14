from __future__ import annotations

from dataclasses import dataclass
from itertools import pairwise
from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_M = 6_371_008.8


def geodesic_distance_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Great-circle distance; never treats longitude/latitude degrees as metres."""

    lon1, lat1 = map(radians, a)
    lon2, lat2 = map(radians, b)
    delta_lon = lon2 - lon1
    delta_lat = lat2 - lat1
    haversine = sin(delta_lat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(delta_lon / 2) ** 2
    return 2 * EARTH_RADIUS_M * asin(sqrt(haversine))


@dataclass(frozen=True, slots=True)
class LineReference:
    line_id: str
    coordinates: tuple[tuple[float, float], ...]
    explicit_m_values: tuple[float, ...] | None = None

    def cumulative_distances_m(self) -> tuple[float, ...]:
        if self.explicit_m_values is not None:
            if len(self.explicit_m_values) != len(self.coordinates):
                raise ValueError("M value count must match coordinate count")
            return self.explicit_m_values
        distances = [0.0]
        for start, end in pairwise(self.coordinates):
            distances.append(distances[-1] + geodesic_distance_m(start, end))
        return tuple(distances)
