param(
  [string]$Name = ""
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$SnapshotDir = Join-Path (Split-Path $Root -Parent) "_snapshots"
New-Item -ItemType Directory -Force -Path $SnapshotDir | Out-Null

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$SafeName = if ($Name.Trim()) { "-" + ($Name.Trim() -replace '[^\w.-]+', '-') } else { "" }
$Destination = Join-Path $SnapshotDir "xiaoluo-ai-intent-os-source-$Stamp$SafeName.zip"

$ExcludeDirs = @("node_modules", "dist", ".git")
$ExcludeFiles = @("dev-server.log", "dev-server.out.log", "dev-server.err.log", "startup_debug.log")

$Items = Get-ChildItem -Force $Root | Where-Object {
  ($ExcludeDirs -notcontains $_.Name) -and ($ExcludeFiles -notcontains $_.Name)
}

Compress-Archive -Path $Items.FullName -DestinationPath $Destination -Force

Get-Item $Destination | Select-Object FullName, Length, LastWriteTime
