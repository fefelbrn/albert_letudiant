$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "V1"

if (!(Test-Path (Join-Path $BackendDir "package.json"))) {
  Write-Error "Erreur: backend/package.json introuvable."
}

if (!(Test-Path (Join-Path $FrontendDir "package.json"))) {
  Write-Error "Erreur: V1/package.json introuvable."
}

Write-Host "Demarrage backend (http://localhost:4000)..."
$backendJob = Start-Job -ScriptBlock {
  param($dir)
  Set-Location $dir
  npm run dev
} -ArgumentList $BackendDir

Write-Host "Demarrage frontend (http://localhost:5173)..."
$frontendJob = Start-Job -ScriptBlock {
  param($dir)
  Set-Location $dir
  npm run dev
} -ArgumentList $FrontendDir

Write-Host "Serveurs lances. Ctrl + C pour tout arreter."

try {
  while ($true) {
    Receive-Job -Job $backendJob -Keep | Out-Host
    Receive-Job -Job $frontendJob -Keep | Out-Host
    Start-Sleep -Milliseconds 500
  }
}
finally {
  Write-Host ""
  Write-Host "Arret des serveurs..."
  Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
  Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
}
