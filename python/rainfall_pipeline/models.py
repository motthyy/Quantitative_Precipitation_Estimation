from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import numpy as np
from pydantic import BaseModel, ConfigDict, Field


@dataclass(frozen=True, slots=True)
class RainfallGrid:
    """A decoded rainfall grid.

    NaN represents NoData and must never be converted to 0 mm.
    """

    values: np.ndarray
    timestamp: datetime
    bounds: tuple[float, float, float, float]
    source_file: Path
    crs: str = "EPSG:4326"
    unit: str = "mm"
    semantics: str = "表示時刻までの前1時間降水量"


class RainfallFrame(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    timestamp: datetime
    display_url: str = Field(alias="displayUrl")
    numeric_url: str = Field(alias="numericUrl")
    metadata_url: str = Field(alias="metadataUrl")
    bounds: tuple[float, float, float, float]
    status: str = "available"
    source_timestamp: datetime = Field(alias="sourceTimestamp")
    checksum: str


class BuildReport(BaseModel):
    frames_processed: int = 0
    frames_skipped: int = 0
    errors: int = 0
    output_bytes: int = 0
    elapsed_seconds: float = 0
