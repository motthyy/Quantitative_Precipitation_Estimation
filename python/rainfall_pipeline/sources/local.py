from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

from rainfall_pipeline.sources.base import DataSource


class LocalGribSource(DataSource):
    def __init__(
        self,
        directory: Path,
        *,
        pattern: str = "*.bin",
        filename_contains: str = "Prr60lv_ANAL",
    ) -> None:
        self.directory = directory
        self.pattern = pattern
        self.filename_contains = filename_contains

    def iter_files(self) -> Iterator[Path]:
        if not self.directory.exists():
            return
        for path in sorted(self.directory.rglob(self.pattern)):
            if self.filename_contains in path.name and "Aper10min" not in path.name:
                yield path
