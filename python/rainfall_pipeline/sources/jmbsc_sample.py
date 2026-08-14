from __future__ import annotations

import hashlib
import shutil
import ssl
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

SAMPLE_URL = (
    "https://www.jmbsc-west.jp/jp/online/online-sample/"
    "SRF_GPV_Ggis1km_Prr60lv/SRF_GPV_Ggis1km_Prr60lv_ANAL_20180707.zip"
)
SAMPLE_SHA256 = "c5d6c0d08fb66950d89a1cb73df683c0eb84e56ff3241a466ca2ad724953f627"
RADAR_SAMPLE_URL = (
    "https://www.jmbsc-west.jp/jp/online/online-sample/"
    "NOWC_GPV_Ggis0p25km/Pri60lv_Aper5min_20180707-1.zip"
)
RADAR_SAMPLE_SHA256 = "40392ecb3b4858bcc4fa4d8db1ec94b46d19688ec9568d35b0aaeb086408b82d"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download_official_sample(destination: Path, *, force: bool = False) -> Path:
    """Download the full-day sample linked from the official JMBSC page.

    The legacy download host currently has a mismatched TLS certificate on some
    Windows installations. A relaxed retry is limited to this fixed public URL,
    then a pinned SHA-256 digest is verified before extraction.
    """

    destination.mkdir(parents=True, exist_ok=True)
    archive = destination / "SRF_GPV_Ggis1km_Prr60lv_ANAL_20180707.zip"
    extract_dir = destination / "SRF_GPV_Ggis1km_Prr60lv_ANAL_20180707"
    if archive.exists() and _sha256(archive) == SAMPLE_SHA256 and not force:
        if not extract_dir.exists():
            with zipfile.ZipFile(archive) as sample_zip:
                sample_zip.extractall(destination)
        return archive

    with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temporary:
        temporary_path = Path(temporary.name)

    try:
        try:
            with urllib.request.urlopen(SAMPLE_URL, timeout=120) as response:  # noqa: S310
                with temporary_path.open("wb") as output:
                    shutil.copyfileobj(response, output)
        except urllib.error.URLError as error:
            if "CERTIFICATE_VERIFY_FAILED" not in str(error):
                raise
            context = ssl._create_unverified_context()  # noqa: SLF001
            with urllib.request.urlopen(  # noqa: S310
                SAMPLE_URL, timeout=120, context=context
            ) as response:
                with temporary_path.open("wb") as output:
                    shutil.copyfileobj(response, output)

        actual = _sha256(temporary_path)
        if actual != SAMPLE_SHA256:
            raise ValueError(f"sample checksum mismatch: {actual}")
        temporary_path.replace(archive)
    finally:
        temporary_path.unlink(missing_ok=True)

    if force and extract_dir.exists():
        shutil.rmtree(extract_dir)
    with zipfile.ZipFile(archive) as sample_zip:
        sample_zip.extractall(destination)
    return archive


def download_highres_nowcast_sample(
    destination: Path,
    *,
    hours: int = 2,
    force: bool = False,
) -> tuple[Path, int]:
    """Download the official 12-hour archive and extract selected 5-minute frames."""

    if not 1 <= hours <= 12:
        raise ValueError("hours must be between 1 and 12")
    destination.mkdir(parents=True, exist_ok=True)
    archive = destination / "Pri60lv_Aper5min_20180707-1.zip"
    archive_valid = archive.exists() and _sha256(archive) == RADAR_SAMPLE_SHA256
    if force or not archive_valid:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as temporary:
            temporary_path = Path(temporary.name)
        try:
            try:
                with urllib.request.urlopen(RADAR_SAMPLE_URL, timeout=120) as response:  # noqa: S310
                    with temporary_path.open("wb") as output:
                        shutil.copyfileobj(response, output)
            except urllib.error.URLError as error:
                if "CERTIFICATE_VERIFY_FAILED" not in str(error):
                    raise
                context = ssl._create_unverified_context()  # noqa: SLF001
                with urllib.request.urlopen(  # noqa: S310
                    RADAR_SAMPLE_URL, timeout=120, context=context
                ) as response:
                    with temporary_path.open("wb") as output:
                        shutil.copyfileobj(response, output)
            actual = _sha256(temporary_path)
            if actual != RADAR_SAMPLE_SHA256:
                raise ValueError(f"radar sample checksum mismatch: {actual}")
            temporary_path.replace(archive)
        finally:
            temporary_path.unlink(missing_ok=True)

    frame_count = hours * 12
    selected_directory = destination / "selected"
    with zipfile.ZipFile(archive) as sample_zip:
        entries = sorted(
            (
                entry
                for entry in sample_zip.infolist()
                if entry.filename.endswith("_Pri60lv_Aper5min_FH0000-0030_grib2.bin.gz")
            ),
            key=lambda entry: entry.filename,
        )[:frame_count]
        if len(entries) != frame_count:
            raise ValueError(f"expected {frame_count} radar frames, found {len(entries)}")
        for entry in entries:
            target = selected_directory / entry.filename
            resolved_target = target.resolve()
            if selected_directory.resolve() not in resolved_target.parents:
                raise ValueError(f"unsafe ZIP entry: {entry.filename}")
            if target.exists() and not force:
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with sample_zip.open(entry) as source, target.open("wb") as output:
                shutil.copyfileobj(source, output)
    return archive, len(entries)
