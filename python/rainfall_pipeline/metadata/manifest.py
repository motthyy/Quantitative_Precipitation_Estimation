from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from rainfall_pipeline import __version__
from rainfall_pipeline.models import RainfallFrame
from rainfall_pipeline.processing.output import atomic_json


def write_manifest(
    path: Path,
    frames: list[RainfallFrame],
    *,
    dataset_name: str,
    source: str,
    product_id: str = "analyzed",
    product_label: str = "解析雨量",
    resolution: str = "1km",
    interval_minutes: int = 30,
    quantity: str = "preceding_1h",
    unit: str = "mm",
    semantics: str = "表示時刻までの前1時間降水量",
) -> None:
    ordered = sorted(frames, key=lambda frame: frame.timestamp)
    if not ordered:
        raise ValueError("manifest requires at least one frame")
    dates: dict[str, list[str]] = defaultdict(list)
    for frame in ordered:
        dates[frame.timestamp.strftime("%Y-%m-%d")].append(frame.timestamp.strftime("%H:%M"))

    payload = {
        "version": 1,
        "productId": product_id,
        "productLabel": product_label,
        "dataset": dataset_name,
        "source": source,
        "sample": True,
        "sampleNotice": "気象業務支援センター公開の実配信サンプル（2018-07-07 UTC）",
        "availableFrom": ordered[0].timestamp.isoformat(),
        "availableTo": ordered[-1].timestamp.isoformat(),
        "timezone": "Asia/Tokyo",
        "resolution": resolution,
        "intervalMinutes": interval_minutes,
        "quantity": quantity,
        "unit": unit,
        "semantics": semantics,
        "processorVersion": __version__,
        "generatedAt": datetime.now(tz=ZoneInfo("Asia/Tokyo")).isoformat(),
        "dates": dict(dates),
        "frames": [frame.model_dump(by_alias=True, mode="json") for frame in ordered],
    }
    atomic_json(path, payload)
