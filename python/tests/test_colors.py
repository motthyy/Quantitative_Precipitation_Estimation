from pathlib import Path

import numpy as np
from rainfall_pipeline.processing.colors import colorize, load_color_scale


def test_numeric_values_map_to_the_same_shared_color_classes() -> None:
    path = Path("config/rainfall-colors.json")
    thresholds, colors = load_color_scale(path)
    values = np.array([[np.nan, 0, 1, 19.9, 20, 100]], dtype=np.float32)
    result = colorize(values, path)
    assert tuple(result[0, 0]) == (0, 0, 0, 0)
    assert tuple(result[0, 1]) == (0, 0, 0, 0)
    assert np.array_equal(result[0, 2], colors[np.where(thresholds == 1)[0][0]])
    assert np.array_equal(result[0, 4], colors[np.where(thresholds == 20)[0][0]])
    assert np.array_equal(result[0, 5], colors[np.where(thresholds == 100)[0][0]])
