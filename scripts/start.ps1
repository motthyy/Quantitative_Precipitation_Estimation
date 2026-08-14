$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath 'public\local-data\manifest.json')) {
    & "$PSScriptRoot\build-demo.ps1"
}

npm run dev

