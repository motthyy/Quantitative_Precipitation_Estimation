from __future__ import annotations

from abc import ABC, abstractmethod
from pathlib import Path

from rainfall_pipeline.models import RainfallGrid


class Decoder(ABC):
    @abstractmethod
    def decode(self, path: Path) -> RainfallGrid:
        """Decode a source file into a normalized rainfall grid."""
