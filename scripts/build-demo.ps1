$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath '.venv\Scripts\python.exe')) {
    throw '.venv がありません。先に scripts/setup.ps1 を実行してください。'
}

& .\.venv\Scripts\python.exe -m rainfall_pipeline download-sample
& .\.venv\Scripts\python.exe -m rainfall_pipeline publish --config config/pipeline.demo.yaml --resume

