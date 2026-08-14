from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import BaseModel, Field, field_validator


class DatasetConfig(BaseModel):
    name: str
    timezone: str = "Asia/Tokyo"
    source: str
    product_id: str = "analyzed"
    product_label: str = "解析雨量"
    resolution: str = "1km"
    interval_minutes: int = Field(default=30, ge=1)
    quantity: str = "preceding_1h"
    unit: str = "mm"
    semantics: str = "表示時刻までの前1時間降水量"


class ProcessingConfig(BaseModel):
    bounds: tuple[float, float, float, float] = (118.0, 20.0, 150.0, 48.0)
    image_width: int = Field(default=1024, ge=256, le=4096)
    image_height: int = Field(default=896, ge=256, le=4096)
    interpolation: str = "nearest"
    generate_cog: bool = True

    @field_validator("interpolation")
    @classmethod
    def validate_interpolation(cls, value: str) -> str:
        if value not in {"nearest", "bilinear"}:
            raise ValueError("interpolation must be nearest or bilinear")
        return value


class StorageConfig(BaseModel):
    type: str = "local"
    raw_directory: Path
    output_directory: Path

    @field_validator("type")
    @classmethod
    def local_only(cls, value: str) -> str:
        if value != "local":
            raise ValueError("This configuration supports local storage only")
        return value


class FrontendConfig(BaseModel):
    manifest_path: str = "manifest.json"
    base_url: str = "/local-data"


class PipelineConfig(BaseModel):
    dataset: DatasetConfig
    processing: ProcessingConfig
    storage: StorageConfig
    frontend: FrontendConfig


def load_config(path: Path) -> PipelineConfig:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return PipelineConfig.model_validate(raw)
