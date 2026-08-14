from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator
from pathlib import Path


class DataSource(ABC):
    @abstractmethod
    def iter_files(self) -> Iterator[Path]:
        """Yield source files without assuming how they were acquired."""
