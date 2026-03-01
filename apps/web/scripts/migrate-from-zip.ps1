# Migração migration.zip -> apps/web
# Uso: .\migrate-from-zip.ps1 [-ZipPath "C:\caminho\migration.zip"]
# Se ZipPath omitido, usa Downloads\migration.zip

param(
    [string]$ZipPath = "c:\Users\Francisco Cardoso\Downloads\migration.zip"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$webSrc = Join-Path $projectRoot "src"
$tempDir = Join-Path $env:TEMP "rxfin-migration"

if (-not (Test-Path $ZipPath)) {
    Write-Host "Arquivo nao encontrado: $ZipPath" -ForegroundColor Red
    Write-Host "Coloque migration.zip nesse caminho ou execute: .\migrate-from-zip.ps1 -ZipPath 'C:\seu\caminho\migration.zip'"
    exit 1
}

Write-Host "Extraindo $ZipPath para $tempDir ..."
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
Expand-Archive -Path $ZipPath -DestinationPath $tempDir -Force

$migrationSrc = Join-Path $tempDir "migration\src"
if (-not (Test-Path $migrationSrc)) {
    $migrationSrc = Join-Path $tempDir "src"
}
if (-not (Test-Path $migrationSrc)) {
    Write-Host "Estrutura inesperada no zip. Esperado: migration/src ou src em $tempDir" -ForegroundColor Red
    Get-ChildItem $tempDir -Recurse -Depth 2 | Select-Object FullName
    exit 1
}

function Copy-MergeDir {
    param($Source, $Dest)
    $Source = (Resolve-Path $Source.TrimEnd('\')).Path
    if (-not (Test-Path $Source)) {
        Write-Host "  [AVISO] Origem nao existe: $Source"
        return
    }
    if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Path $Dest -Force | Out-Null }
    Get-ChildItem $Source -Recurse -File | ForEach-Object {
        $full = $_.FullName -replace '/', '\'
        $srcNorm = $Source -replace '/', '\'
        $rel = $full.Substring($srcNorm.Length).TrimStart('\')
        $destFile = Join-Path $Dest $rel
        $destDir = Split-Path $destFile -Parent
        if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
        Copy-Item $_.FullName -Destination $destFile -Force
        Write-Host "  Copiado: $rel"
    }
}

Write-Host "Copiando/mergeando pastas em $webSrc ..."
Copy-MergeDir (Join-Path $migrationSrc "components") (Join-Path $webSrc "components")
Copy-MergeDir (Join-Path $migrationSrc "hooks") (Join-Path $webSrc "hooks")
Copy-MergeDir (Join-Path $migrationSrc "contexts") (Join-Path $webSrc "contexts")
Copy-MergeDir (Join-Path $migrationSrc "lib") (Join-Path $webSrc "lib")
Copy-MergeDir (Join-Path $migrationSrc "utils") (Join-Path $webSrc "utils")
Copy-MergeDir (Join-Path $migrationSrc "types") (Join-Path $webSrc "types")
Copy-MergeDir (Join-Path $migrationSrc "data") (Join-Path $webSrc "data")
Copy-MergeDir (Join-Path $migrationSrc "integrations") (Join-Path $webSrc "integrations")
Copy-MergeDir (Join-Path $migrationSrc "assets") (Join-Path $webSrc "assets")

$webRoot = Split-Path $projectRoot -Parent
$tailwindSrc = Join-Path $tempDir "migration\tailwind.config.ts"
if (-not (Test-Path $tailwindSrc)) { $tailwindSrc = Join-Path $tempDir "tailwind.config.ts" }
if (Test-Path $tailwindSrc) {
    Copy-Item $tailwindSrc (Join-Path $projectRoot "tailwind.config.ts") -Force
    Write-Host "Substituido: tailwind.config.ts"
}

$globalsSrc = Join-Path $migrationSrc "globals.css"
$globalsDest = Join-Path $projectRoot "src\app\globals.css"
if (Test-Path $globalsSrc) {
    Copy-Item $globalsSrc $globalsDest -Force
    Write-Host "Substituido: src/app/globals.css"
}

Write-Host "Limpando pasta temporaria..."
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Migracao concluida. layout.tsx, page.tsx e simulador-fipe/page.tsx nao foram alterados." -ForegroundColor Green
