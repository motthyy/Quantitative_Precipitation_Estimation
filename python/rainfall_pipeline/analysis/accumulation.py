from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True, slots=True)
class AccumulationResult:
    millimetres: float | None
    complete: bool
    expected_hours: int
    available_hours: int


def calculate_accumulation(
    observations: list[tuple[datetime, float | None]],
    end: datetime,
    hours: int,
) -> AccumulationResult:
    """Sum only non-overlapping hourly-ending analyzed-rainfall fields."""

    if hours <= 0:
        raise ValueError("hours must be positive")
    expected = {end - timedelta(hours=offset) for offset in range(hours)}
    hourly = {timestamp: value for timestamp, value in observations if timestamp.minute == 0}
    values = [hourly.get(timestamp) for timestamp in sorted(expected)]
    available = sum(value is not None for value in values)
    if available != hours:
        return AccumulationResult(None, False, hours, available)
    return AccumulationResult(
        sum(value for value in values if value is not None), True, hours, available
    )
