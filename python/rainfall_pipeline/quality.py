from __future__ import annotations

import numpy as np

from rainfall_pipeline.models import RainfallGrid


def validate_grid(grid: RainfallGrid) -> list[str]:
    warnings: list[str] = []
    finite = grid.values[np.isfinite(grid.values)]
    if finite.size == 0:
        raise ValueError("frame contains no valid rainfall values")
    if float(finite.min()) < 0:
        raise ValueError("negative rainfall value detected")
    if float(finite.max()) > 1000:
        warnings.append("maximum rainfall exceeds 1000 mm; verify source metadata")
    nodata_ratio = 1 - finite.size / grid.values.size
    if nodata_ratio > 0.95:
        warnings.append("more than 95% of the grid is NoData")
    return warnings
