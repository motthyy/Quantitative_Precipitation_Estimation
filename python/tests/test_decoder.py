from datetime import UTC
from pathlib import Path

import numpy as np
import pytest
from rainfall_pipeline.decoders.jma_grib2 import (
    JmaAnalyzedRainfallDecoder,
    JmaHighResolutionNowcastDecoder,
    decode_run_length,
)


def test_run_length_decoder() -> None:
    # level 2, followed by two base-252 repeat digits: 1 + 2*252 repeats.
    decoded = decode_run_length(bytes([2, 5, 6]), highest_level=3, expected_points=506)
    assert decoded.shape == (506,)
    assert np.all(decoded == 2)


SAMPLE = next(
    iter(
        Path("data/raw/jmbsc-sample-20180707").glob(
            "**/Z__C_RJTD_20180707000000_SRF_GPV_Ggis1km_Prr60lv_ANAL_grib2.bin"
        )
    ),
    None,
)


@pytest.mark.skipif(SAMPLE is None, reason="official sample is not downloaded")
def test_official_jmbsc_sample_decodes() -> None:
    grid = JmaAnalyzedRainfallDecoder().decode(SAMPLE)  # type: ignore[arg-type]
    assert grid.values.shape == (3360, 2560)
    assert grid.timestamp.tzinfo is UTC
    assert grid.timestamp.hour == 0
    assert float(np.nanmax(grid.values)) == 85.0
    assert np.isnan(grid.values).any()
    assert np.any(grid.values == 0)
    assert grid.bounds == pytest.approx((118, 20, 150, 48), abs=1e-5)


RADAR_SAMPLE = next(
    iter(
        Path("data/raw/jmbsc-highres-nowcast-20180707/selected").glob(
            "**/Z__C_RJTD_20180707000000_NOWC_GPV_Ggis0p25km_"
            "Pri60lv_Aper5min_FH0000-0030_grib2.bin.gz"
        )
    ),
    None,
)


@pytest.mark.skipif(RADAR_SAMPLE is None, reason="official 250 m sample is not downloaded")
def test_official_250m_nowcast_sample_decodes() -> None:
    grid = JmaHighResolutionNowcastDecoder().decode(RADAR_SAMPLE)  # type: ignore[arg-type]
    assert grid.values.shape == (2080, 1920)
    assert grid.timestamp.tzinfo is UTC
    assert grid.timestamp.hour == 0
    assert grid.unit == "mm/h"
    assert float(np.nanmax(grid.values)) == 197.0
    assert np.isnan(grid.values).any()
    assert grid.bounds == pytest.approx((130, 32, 136, 36.3333333333), abs=1e-5)
