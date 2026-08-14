from __future__ import annotations

import json
from pathlib import Path

import numpy as np


def _rgba(hex_color: str) -> tuple[int, int, int, int]:
    value = hex_color.removeprefix("#")
    if len(value) == 6:
        value += "ff"
    channels = tuple(int(value[index : index + 2], 16) for index in range(0, 8, 2))
    return channels  # type: ignore[return-value]


def load_color_scale(path: Path) -> tuple[np.ndarray, np.ndarray]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    stops = payload["stops"]
    values = np.asarray([stop["value"] for stop in stops], dtype=np.float32)
    colors = np.asarray([_rgba(stop["color"]) for stop in stops], dtype=np.uint8)
    return values, colors


def colorize(values: np.ndarray, scale_path: Path) -> np.ndarray:
    thresholds, colors = load_color_scale(scale_path)
    indices = np.searchsorted(thresholds, np.nan_to_num(values, nan=-1), side="right") - 1
    indices = np.clip(indices, 0, len(colors) - 1)
    rgba = colors[indices].copy()
    rgba[np.isnan(values)] = (0, 0, 0, 0)
    rgba[values <= 0] = (0, 0, 0, 0)
    return rgba
