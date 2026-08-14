from __future__ import annotations

import gzip
import re
from collections.abc import Iterator
from datetime import UTC, datetime
from pathlib import Path

import numpy as np

from rainfall_pipeline.decoders.base import Decoder
from rainfall_pipeline.models import RainfallGrid

_TIMESTAMP_PATTERN = re.compile(r"_RJTD_(\d{14})_")


def _unsigned(data: bytes, start: int, length: int) -> int:
    return int.from_bytes(data[start : start + length], byteorder="big", signed=False)


def _signed(data: bytes, start: int, length: int) -> int:
    return int.from_bytes(data[start : start + length], byteorder="big", signed=True)


def parse_sections(message: bytes) -> dict[int, bytes]:
    if message[:4] != b"GRIB" or message[7] != 2:
        raise ValueError("not a GRIB2 message")
    declared_length = _unsigned(message, 8, 8)
    if declared_length != len(message):
        raise ValueError(
            f"GRIB2 length mismatch: declared {declared_length}, actual {len(message)}"
        )
    if message[-4:] != b"7777":
        raise ValueError("GRIB2 end marker is missing")

    sections: dict[int, bytes] = {}
    offset = 16
    while offset < len(message) - 4:
        length = _unsigned(message, offset, 4)
        if length < 5 or offset + length > len(message) - 4:
            raise ValueError(f"invalid GRIB2 section length at byte {offset}")
        number = message[offset + 4]
        sections[number] = message[offset : offset + length]
        offset += length
    return sections


def iter_section_groups(message: bytes) -> Iterator[dict[int, bytes]]:
    """Yield each repeated section 3–7 field from a JMA multi-field message."""

    if message[:4] != b"GRIB" or message[7] != 2:
        raise ValueError("not a GRIB2 message")
    declared_length = _unsigned(message, 8, 8)
    if declared_length != len(message) or message[-4:] != b"7777":
        raise ValueError("invalid multi-field GRIB2 envelope")

    current: dict[int, bytes] = {}
    offset = 16
    while offset < len(message) - 4:
        length = _unsigned(message, offset, 4)
        if length < 5 or offset + length > len(message) - 4:
            raise ValueError(f"invalid GRIB2 section length at byte {offset}")
        number = message[offset + 4]
        section = message[offset : offset + length]
        if number == 3 and 7 in current:
            yield current
            current = {}
        if number in {3, 4, 5, 6, 7}:
            current[number] = section
        offset += length
    if 7 in current:
        yield current


def _sign_magnitude_32(data: bytes) -> int:
    raw = _unsigned(data, 0, 4)
    return -(raw & 0x7FFFFFFF) if raw & 0x80000000 else raw


def _decode_field(sections: dict[int, bytes], expected_points: int) -> np.ndarray:
    required = {3, 4, 5, 6, 7}
    if missing := required.difference(sections):
        raise ValueError(f"missing GRIB2 field sections: {sorted(missing)}")
    bitmap = sections[6]
    if len(bitmap) != 6 or bitmap[5] != 255:
        raise ValueError("bitmap fields are not supported")
    representation = sections[5]
    if _unsigned(representation, 9, 2) != 200:
        raise ValueError("only data representation template 5.200 is supported")
    highest_level = _unsigned(representation, 12, 2)
    maximum_level = _unsigned(representation, 14, 2)
    scale_factor = int.from_bytes(representation[16:17], "big", signed=True)
    representatives = np.frombuffer(
        representation[17 : 17 + maximum_level * 2], dtype=">u2"
    ).astype(np.float32)
    if representatives.size != maximum_level:
        raise ValueError("representative value table is incomplete")
    levels = decode_run_length(sections[7][5:], highest_level, expected_points)
    values = np.full(expected_points, np.nan, dtype=np.float32)
    valid = levels > 0
    if np.any(levels[valid] > maximum_level):
        raise ValueError("decoded level exceeds representative table")
    values[valid] = representatives[levels[valid] - 1] / (10**scale_factor)
    return values


def decode_run_length(code: bytes, highest_level: int, expected_points: int) -> np.ndarray:
    """Decode JMA/WMO data representation templates 5.200 and 7.200."""

    base = 255 - highest_level
    levels: list[int] = []
    counts: list[int] = []
    power = 0
    for raw in code:
        if raw <= highest_level:
            levels.append(raw)
            counts.append(1)
            power = 0
        else:
            if not counts:
                raise ValueError("run-length sequence starts without a level")
            counts[-1] += (base**power) * (raw - (highest_level + 1))
            power += 1

    decoded = np.repeat(np.asarray(levels, dtype=np.uint16), np.asarray(counts, dtype=np.int64))
    if decoded.size != expected_points:
        raise ValueError(f"decoded grid has {decoded.size} points, expected {expected_points}")
    return decoded


class JmaAnalyzedRainfallDecoder(Decoder):
    """Decode JMA analyzed rainfall PDT 4.50008 / DRT 5.200 files."""

    def decode(self, path: Path) -> RainfallGrid:
        sections = parse_sections(path.read_bytes())
        required = {1, 3, 4, 5, 6, 7}
        if missing := required.difference(sections):
            raise ValueError(f"missing GRIB2 sections: {sorted(missing)}")

        grid_section = sections[3]
        if _unsigned(grid_section, 12, 2) != 0:
            raise ValueError("only latitude/longitude grid template 3.0 is supported")
        nx = _unsigned(grid_section, 30, 4)
        ny = _unsigned(grid_section, 34, 4)
        point_count = _unsigned(grid_section, 6, 4)
        if nx * ny != point_count:
            raise ValueError("grid dimensions do not match point count")

        lat_first = _signed(grid_section, 46, 4) / 1_000_000
        lon_first = _signed(grid_section, 50, 4) / 1_000_000
        lat_last = _signed(grid_section, 55, 4) / 1_000_000
        lon_last = _signed(grid_section, 59, 4) / 1_000_000
        lon_step = _unsigned(grid_section, 63, 4) / 1_000_000
        lat_step = _unsigned(grid_section, 67, 4) / 1_000_000
        scan_mode = grid_section[71]
        if scan_mode != 0:
            raise ValueError(f"unsupported GRIB2 scanning mode: {scan_mode}")

        values = _decode_field(sections, point_count).reshape((ny, nx))

        match = _TIMESTAMP_PATTERN.search(path.name)
        if not match:
            raise ValueError(f"timestamp is missing from filename: {path.name}")
        timestamp = datetime.strptime(match.group(1), "%Y%m%d%H%M%S").replace(tzinfo=UTC)

        west = min(lon_first, lon_last) - lon_step / 2
        east = max(lon_first, lon_last) + lon_step / 2
        south = min(lat_first, lat_last) - lat_step / 2
        north = max(lat_first, lat_last) + lat_step / 2
        return RainfallGrid(
            values=values,
            timestamp=timestamp,
            bounds=(west, south, east, north),
            source_file=path,
        )


class JmaHighResolutionNowcastDecoder(Decoder):
    """Mosaic the 250 m, FH0000 fields from JMA PDT 4.50011 nowcast files."""

    def __init__(
        self,
        bounds: tuple[float, float, float, float] = (130.0, 32.0, 136.0, 36.3333333333),
        forecast_minutes: int = 0,
    ) -> None:
        self.bounds = bounds
        self.forecast_minutes = forecast_minutes

    def decode(self, path: Path) -> RainfallGrid:
        if path.suffix == ".gz":
            with gzip.open(path, "rb") as handle:
                message = handle.read()
        else:
            message = path.read_bytes()

        west, south, east, north = self.bounds
        mosaic: np.ndarray | None = None
        output_dx = 0.0
        output_dy = 0.0
        decoded_tiles = 0
        for sections in iter_section_groups(message):
            grid_section = sections[3]
            product_section = sections[4]
            if _unsigned(grid_section, 12, 2) != 0:
                continue
            if _unsigned(product_section, 7, 2) != 50011:
                continue
            forecast = _sign_magnitude_32(product_section[18:22])
            if forecast != self.forecast_minutes:
                continue

            nx = _unsigned(grid_section, 30, 4)
            ny = _unsigned(grid_section, 34, 4)
            if nx != 160 or ny != 160:
                continue
            lat_first = _signed(grid_section, 46, 4) / 1_000_000
            lon_first = _signed(grid_section, 50, 4) / 1_000_000
            lat_last = _signed(grid_section, 55, 4) / 1_000_000
            lon_last = _signed(grid_section, 59, 4) / 1_000_000
            dx = (lon_last - lon_first) / (nx - 1)
            dy = (lat_first - lat_last) / (ny - 1)
            tile_west = lon_first - dx / 2
            tile_east = lon_last + dx / 2
            tile_south = lat_last - dy / 2
            tile_north = lat_first + dy / 2
            if tile_east <= west or tile_west >= east or tile_north <= south or tile_south >= north:
                continue

            if mosaic is None:
                output_dx = dx
                output_dy = dy
                width = round((east - west) / output_dx)
                height = round((north - south) / output_dy)
                mosaic = np.full((height, width), np.nan, dtype=np.float32)
            elif not np.isclose(dx, output_dx) or not np.isclose(dy, output_dy):
                raise ValueError("mixed resolutions in the selected 250 m fields")

            tile = _decode_field(sections, nx * ny).reshape((ny, nx))
            column = round((lon_first - (west + output_dx / 2)) / output_dx)
            row = round(((north - output_dy / 2) - lat_first) / output_dy)
            source_x = max(0, -column)
            source_y = max(0, -row)
            destination_x = max(0, column)
            destination_y = max(0, row)
            copy_width = min(nx - source_x, mosaic.shape[1] - destination_x)
            copy_height = min(ny - source_y, mosaic.shape[0] - destination_y)
            if copy_width > 0 and copy_height > 0:
                mosaic[
                    destination_y : destination_y + copy_height,
                    destination_x : destination_x + copy_width,
                ] = tile[source_y : source_y + copy_height, source_x : source_x + copy_width]
                decoded_tiles += 1

        if mosaic is None or decoded_tiles == 0:
            raise ValueError("no FH0000 250 m tiles intersect the requested bounds")
        match = _TIMESTAMP_PATTERN.search(path.name)
        if not match:
            raise ValueError(f"timestamp is missing from filename: {path.name}")
        timestamp = datetime.strptime(match.group(1), "%Y%m%d%H%M%S").replace(tzinfo=UTC)
        return RainfallGrid(
            values=mosaic,
            timestamp=timestamp,
            bounds=self.bounds,
            source_file=path,
            unit="mm/h",
            semantics=(
                "表示時刻の降水強度です。"
                "1時間積算雨量ではなく、その強さが1時間続いた場合の雨量 [mm/h] です。"
            ),
        )
