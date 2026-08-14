from pathlib import Path

from pytest import MonkeyPatch
from rainfall_pipeline.processing import output


def test_atomic_json_falls_back_when_replace_is_denied(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    destination = tmp_path / "manifest.json"
    destination.write_text('{"old": true}', encoding="utf-8")

    def deny_replace(_source: Path, _destination: Path) -> None:
        raise PermissionError("managed folder denies replacement")

    monkeypatch.setattr(output.os, "replace", deny_replace)
    monkeypatch.setattr(output.time, "sleep", lambda _seconds: None)

    output.atomic_json(destination, {"new": True})

    assert '"new": true' in destination.read_text(encoding="utf-8")
