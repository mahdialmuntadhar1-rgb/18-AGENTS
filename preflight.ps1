[CmdletBinding()]
param([switch]$SkipInstall=$false)

$ErrorActionPreference = "Stop"

function Section([string]$t){ Write-Host ""; Write-Host "==== $t ====" -ForegroundColor Cyan }
function Ok([string]$m){ Write-Host "OK: $m" -ForegroundColor Green }
function Warn([string]$m){ Write-Host "WARN: $m" -ForegroundColor Yellow }
function Fail([string]$m){ Write-Host ""; Write-Host "FAIL: $m" -ForegroundColor Red; exit 1 }

if (-not (Test-Path ".\package.json")) { Fail "Run from repo root (package.json not found)." }

Section "Install deps"
if (-not $SkipInstall) {
  if (Test-Path ".\package-lock.json") { & npm ci } else { & npm install }
  if ($LASTEXITCODE -ne 0) { Fail "Dependency install failed." }
} else {
  Warn "Skipping install (-SkipInstall)."
}

Section "npm run lint"
& npm run lint
if ($LASTEXITCODE -ne 0) { Fail "lint failed." }
Ok "lint passed."

Section "npm run build"
& npm run build
if ($LASTEXITCODE -ne 0) { Fail "build failed." }
Ok "build passed."

Section "Done"
Ok "Lint + build OK."
