from __future__ import annotations

from abc import ABC, abstractmethod


class RainfallIndexCalculator(ABC):
    """Extension point for indexes with explicitly supplied official conditions."""

    @property
    @abstractmethod
    def configured(self) -> bool: ...

    @abstractmethod
    def calculate(self, values: list[float | None]) -> float | None: ...

