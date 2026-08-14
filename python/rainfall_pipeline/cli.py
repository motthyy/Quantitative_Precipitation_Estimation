from __future__ import annotations

import json
import logging
import time
from datetime import date
from pathlib import Path
from typing import Annotated
from zoneinfo import ZoneInfo

import typer

from rainfall_pipeline.config import PipelineConfig, load_config
from rainfall_pipeline.decoders import (
    JmaAnalyzedRainfallDecoder,
    JmaHighResolutionNowcastDecoder,
)
from rainfall_pipeline.metadata import write_manifest
from rainfall_pipeline.models import BuildReport, RainfallFrame
from rainfall_pipeline.processing import process_grid
from rainfall_pipeline.quality import validate_grid
from rainfall_pipeline.sources import LocalGribSource
from rainfall_pipeline.sources.jmbsc_sample import (
    download_highres_nowcast_sample,
    download_official_sample,
)

app = typer.Typer(
    name="rainfall-pipeline",
    help="気象庁解析雨量をローカルWeb表示用データへ変換します。",
    no_args_is_help=True,
)
LOGGER = logging.getLogger("rainfall_pipeline")
JST = ZoneInfo("Asia/Tokyo")


def _configure_logging(verbose: bool = False) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )


def _project_root() -> Path:
    return Path(__file__).resolve().parents[2]


@app.command("download-sample")
def download_sample(
    destination: Annotated[Path, typer.Option(help="保存先フォルダ")] = Path(
        "data/raw/jmbsc-sample-20180707"
    ),
    force: Annotated[bool, typer.Option(help="再ダウンロードする")] = False,
) -> None:
    """公式公開の2018-07-07解析雨量48フレームを取得します。"""

    archive = download_official_sample(destination, force=force)
    typer.echo(f"保存しました: {archive}")


@app.command("download-radar-sample")
def download_radar_sample(
    destination: Annotated[Path, typer.Option(help="保存先フォルダ")] = Path(
        "data/raw/jmbsc-highres-nowcast-20180707"
    ),
    hours: Annotated[int, typer.Option(help="00 UTCから抽出する時間数（1〜12）")] = 2,
    force: Annotated[bool, typer.Option(help="再ダウンロード・再抽出する")] = False,
) -> None:
    """2018-07-07高解像度降水ナウキャスト公式サンプルを取得します。"""

    archive, frames = download_highres_nowcast_sample(
        destination,
        hours=hours,
        force=force,
    )
    typer.echo(f"保存しました: {archive} / 抽出 {frames} フレーム")


@app.command()
def inspect(path: Path) -> None:
    """GRIB2の格子・時刻・雨量範囲を検査します。"""

    grid = JmaAnalyzedRainfallDecoder().decode(path)
    valid = grid.values[grid.values == grid.values]
    payload = {
        "file": str(path),
        "timestampUtc": grid.timestamp.isoformat(),
        "timestampJst": grid.timestamp.astimezone(JST).isoformat(),
        "crs": grid.crs,
        "bounds": grid.bounds,
        "width": int(grid.values.shape[1]),
        "height": int(grid.values.shape[0]),
        "missingValues": int((grid.values != grid.values).sum()),
        "min": float(valid.min()),
        "max": float(valid.max()),
        "unit": "mm (preceding one hour)",
    }
    typer.echo(json.dumps(payload, ensure_ascii=False, indent=2))


def _load_existing_frames(output: Path) -> dict[str, RainfallFrame]:
    manifest = output / "manifest.json"
    if not manifest.exists():
        return {}
    payload = json.loads(manifest.read_text(encoding="utf-8"))
    return {frame["id"]: RainfallFrame.model_validate(frame) for frame in payload.get("frames", [])}


def _run_publish(
    pipeline_config: PipelineConfig,
    *,
    start: date | None,
    end: date | None,
    resume: bool,
    force: bool,
    dry_run: bool,
) -> BuildReport:
    started = time.perf_counter()
    output = pipeline_config.storage.output_directory
    colors = _project_root() / "config/rainfall-colors.json"
    if pipeline_config.dataset.product_id == "radar250m":
        source = LocalGribSource(
            pipeline_config.storage.raw_directory,
            pattern="*.bin.gz",
            filename_contains="Pri60lv_Aper5min",
        )
        decoder = JmaHighResolutionNowcastDecoder(bounds=pipeline_config.processing.bounds)
    else:
        source = LocalGribSource(pipeline_config.storage.raw_directory)
        decoder = JmaAnalyzedRainfallDecoder()
    report = BuildReport()
    frames = _load_existing_frames(output) if resume and not force else {}
    errors_path = output / "errors.jsonl"

    files = list(source.iter_files())
    if not files:
        raise typer.BadParameter(
            f"GRIB2がありません: {pipeline_config.storage.raw_directory}. "
            "先に download-sample を実行してください。"
        )

    for index, path in enumerate(files, start=1):
        typer.echo(f"[{index}/{len(files)}] {path.name}")
        try:
            grid = decoder.decode(path)
            local_timestamp = grid.timestamp.astimezone(JST)
            local_date = local_timestamp.date()
            if start and local_date < start:
                continue
            if end and local_date > end:
                continue
            frame_id = local_timestamp.strftime("%Y%m%dT%H%MJST")
            if resume and not force and frame_id in frames:
                report.frames_skipped += 1
                continue
            for warning in validate_grid(grid):
                LOGGER.warning("%s: %s", path.name, warning)
            if dry_run:
                report.frames_skipped += 1
                continue
            frame = process_grid(
                grid,
                output,
                pipeline_config.processing,
                colors,
                pipeline_config.frontend.base_url,
            )
            frames[frame.id] = frame
            report.frames_processed += 1
        except Exception as error:  # batch processing must continue and report all failures
            report.errors += 1
            output.mkdir(parents=True, exist_ok=True)
            with errors_path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps({"file": str(path), "error": str(error)}) + "\n")
            LOGGER.exception("failed to process %s", path)

    if not dry_run and frames:
        write_manifest(
            output / pipeline_config.frontend.manifest_path,
            list(frames.values()),
            dataset_name=pipeline_config.dataset.name,
            source=pipeline_config.dataset.source,
            product_id=pipeline_config.dataset.product_id,
            product_label=pipeline_config.dataset.product_label,
            resolution=pipeline_config.dataset.resolution,
            interval_minutes=pipeline_config.dataset.interval_minutes,
            quantity=pipeline_config.dataset.quantity,
            unit=pipeline_config.dataset.unit,
            semantics=pipeline_config.dataset.semantics,
        )
    if output.exists():
        report.output_bytes = sum(
            path.stat().st_size for path in output.rglob("*") if path.is_file()
        )
    report.elapsed_seconds = round(time.perf_counter() - started, 3)
    if not dry_run:
        output.mkdir(parents=True, exist_ok=True)
        (output / "build-report.json").write_text(
            report.model_dump_json(indent=2), encoding="utf-8"
        )
    return report


@app.command()
def publish(
    config: Annotated[Path, typer.Option(help="YAML設定ファイル")] = Path(
        "config/pipeline.demo.yaml"
    ),
    start: Annotated[str | None, typer.Option(help="開始日 YYYY-MM-DD")] = None,
    end: Annotated[str | None, typer.Option(help="終了日 YYYY-MM-DD")] = None,
    resume: Annotated[bool, typer.Option(help="完了済みフレームを再利用")] = True,
    force: Annotated[bool, typer.Option(help="既存フレームを再生成")] = False,
    dry_run: Annotated[bool, typer.Option(help="対象だけを表示")] = False,
    verbose: Annotated[bool, typer.Option(help="詳細ログ")] = False,
) -> None:
    """decode → image/COG → manifestを原子的に生成します。"""

    _configure_logging(verbose)
    start_date = date.fromisoformat(start) if start else None
    end_date = date.fromisoformat(end) if end else None
    report = _run_publish(
        load_config(config),
        start=start_date,
        end=end_date,
        resume=resume,
        force=force,
        dry_run=dry_run,
    )
    typer.echo(report.model_dump_json(indent=2))


@app.command()
def estimate(
    config: Annotated[Path, typer.Option(help="YAML設定ファイル")] = Path(
        "config/pipeline.demo.yaml"
    ),
) -> None:
    """入力数と処理済み容量を実測ベースで表示します。"""

    pipeline_config = load_config(config)
    if pipeline_config.dataset.product_id == "radar250m":
        source = LocalGribSource(
            pipeline_config.storage.raw_directory,
            pattern="*.bin.gz",
            filename_contains="Pri60lv_Aper5min",
        )
    else:
        source = LocalGribSource(pipeline_config.storage.raw_directory)
    files = list(source.iter_files())
    input_bytes = sum(path.stat().st_size for path in files)
    typer.echo(
        json.dumps(
            {
                "inputFiles": len(files),
                "inputBytes": input_bytes,
                "estimatedFrames": len(files),
                "note": "本番容量は実データ処理後にbuild-report.jsonで確認してください。",
            },
            ensure_ascii=False,
            indent=2,
        )
    )
