from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
from PIL import Image

from rainfall_pipeline import __version__
from rainfall_pipeline.config import ProcessingConfig
from rainfall_pipeline.models import RainfallFrame, RainfallGrid
from rainfall_pipeline.processing.colors import colorize


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _replace_output(temporary: Path, destination: Path) -> None:
    """Replace an output, with a safe fallback for restrictive Windows/OneDrive ACLs."""
    last_error: PermissionError | None = None
    for attempt in range(5):
        try:
            os.replace(temporary, destination)
            return
        except PermissionError as error:
            last_error = error
            time.sleep(0.05 * (attempt + 1))

    # Some managed Windows folders allow writes but deny deletion of an existing
    # path. In that case os.replace cannot be atomic, so flush an in-place copy.
    try:
        with temporary.open("rb") as source, destination.open("wb") as target:
            shutil.copyfileobj(source, target, length=1024 * 1024)
            target.flush()
            os.fsync(target.fileno())
    except OSError as copy_error:
        if last_error is not None:
            raise last_error from copy_error
        raise
    temporary.unlink(missing_ok=True)


def atomic_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", dir=path.parent, delete=False, suffix=".tmp"
    ) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, default=str)
        temporary = Path(handle.name)
    try:
        _replace_output(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def _write_webp(
    grid: RainfallGrid, output: Path, config: ProcessingConfig, colors_path: Path
) -> None:
    rgba = colorize(grid.values, colors_path)
    image = Image.fromarray(rgba, mode="RGBA")
    resampling = (
        Image.Resampling.BILINEAR
        if config.interpolation == "bilinear"
        else Image.Resampling.NEAREST
    )
    image = image.resize((config.image_width, config.image_height), resample=resampling)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=output.parent, delete=False, suffix=".webp") as handle:
        temporary = Path(handle.name)
    try:
        image.save(temporary, format="WEBP", lossless=True, method=4)
        _replace_output(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)


def _write_cog(grid: RainfallGrid, output: Path) -> None:
    try:
        import rasterio
        from rasterio.transform import from_bounds
    except ImportError as error:  # pragma: no cover
        raise RuntimeError("COG generation requires the 'geo' optional dependencies") from error

    output.parent.mkdir(parents=True, exist_ok=True)
    tenths = np.where(np.isnan(grid.values), 65535, np.rint(grid.values * 10)).astype(np.uint16)
    west, south, east, north = grid.bounds
    transform = from_bounds(west, south, east, north, tenths.shape[1], tenths.shape[0])
    with tempfile.NamedTemporaryFile(dir=output.parent, delete=False, suffix=".tif") as handle:
        temporary = Path(handle.name)
    try:
        with rasterio.open(
            temporary,
            "w",
            driver="GTiff",
            width=tenths.shape[1],
            height=tenths.shape[0],
            count=1,
            dtype="uint16",
            crs=grid.crs,
            transform=transform,
            nodata=65535,
            tiled=True,
            blockxsize=512,
            blockysize=512,
            compress="DEFLATE",
            predictor=2,
        ) as dataset:
            dataset.write(tenths, 1)
            dataset.update_tags(
                unit=f"0.1 {grid.unit}",
                rainfall_semantics=grid.semantics,
                timestamp=grid.timestamp.isoformat(),
            )
        _replace_output(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)


def process_grid(
    grid: RainfallGrid,
    output_directory: Path,
    config: ProcessingConfig,
    colors_path: Path,
    public_base_url: str = "/local-data",
) -> RainfallFrame:
    timestamp_jst = grid.timestamp.astimezone(ZoneInfo("Asia/Tokyo"))
    frame_id = timestamp_jst.strftime("%Y%m%dT%H%MJST")
    relative_base = Path("frames") / timestamp_jst.strftime("%Y/%m/%d") / frame_id
    image_path = output_directory / relative_base.with_suffix(".webp")
    numeric_path = output_directory / Path("numeric") / relative_base.with_suffix(".tif")
    metadata_path = output_directory / Path("metadata") / relative_base.with_suffix(".json")

    _write_webp(grid, image_path, config, colors_path)
    if config.generate_cog:
        _write_cog(grid, numeric_path)

    source_checksum = sha256(grid.source_file)
    metadata = {
        "version": 1,
        "frameId": frame_id,
        "sourceFile": grid.source_file.name,
        "sourceTimestamp": grid.timestamp.isoformat(),
        "timestamp": timestamp_jst.isoformat(),
        "processedAt": datetime.now(tz=ZoneInfo("Asia/Tokyo")).isoformat(),
        "processorVersion": __version__,
        "checksum": source_checksum,
        "bounds": grid.bounds,
        "width": int(grid.values.shape[1]),
        "height": int(grid.values.shape[0]),
        "unit": grid.unit,
        "semantics": grid.semantics,
        "minimum": float(np.nanmin(grid.values)),
        "maximum": float(np.nanmax(grid.values)),
        "nodataRatio": float(np.count_nonzero(np.isnan(grid.values)) / grid.values.size),
    }
    atomic_json(metadata_path, metadata)

    def public_url(path: Path) -> str:
        return public_base_url.rstrip("/") + "/" + path.relative_to(output_directory).as_posix()

    return RainfallFrame(
        id=frame_id,
        timestamp=timestamp_jst,
        displayUrl=public_url(image_path),
        numericUrl=public_url(numeric_path),
        metadataUrl=public_url(metadata_path),
        bounds=grid.bounds,
        sourceTimestamp=grid.timestamp,
        checksum=source_checksum,
    )
