from datetime import datetime
from zoneinfo import ZoneInfo

from rainfall_pipeline.analysis import calculate_accumulation

JST = ZoneInfo("Asia/Tokyo")


def at(hour: int, minute: int = 0) -> datetime:
    return datetime(2023, 6, 2, hour, minute, tzinfo=JST)


def test_hourly_accumulation_does_not_double_count_half_hours() -> None:
    result = calculate_accumulation(
        [(at(1), 10), (at(1, 30), 100), (at(2), 20), (at(2, 30), 100), (at(3), 30)],
        at(3),
        3,
    )
    assert result.complete
    assert result.millimetres == 60


def test_missing_hour_is_not_zero_filled() -> None:
    result = calculate_accumulation([(at(1), 10), (at(3), 30)], at(3), 3)
    assert not result.complete
    assert result.millimetres is None
    assert result.available_hours == 2
