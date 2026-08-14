$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath '.venv')) {
    python -m venv .venv
}

& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -e '.[dev,geo]'
npm install
& .\.venv\Scripts\python.exe -m rainfall_pipeline download-sample
& .\.venv\Scripts\python.exe -m rainfall_pipeline publish --config config/pipeline.demo.yaml

Write-Host ''
Write-Host 'セットアップが完了しました。次を実行してください:' -ForegroundColor Green
Write-Host 'npm run dev'

