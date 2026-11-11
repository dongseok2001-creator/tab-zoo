# Builds the Chrome Web Store upload zip from an allowlist of runtime files.
# Preview pages, docs and unused artwork in extension/ are deliberately left out.
# Entries are written with forward slashes; Compress-Archive on Windows PowerShell 5.1 writes
# backslashes, which the Web Store rejects.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$extension = Join-Path $root "extension"
$manifest = Get-Content -Raw -Encoding UTF8 (Join-Path $extension "manifest.json") | ConvertFrom-Json

$files = @(
  "manifest.json",
  "background.js",
  "popup.html",
  "popup.css",
  "popup.js",
  "atlas-clips.js",
  "sprite-art.js",
  "movement.js",
  "assets/icon16.png",
  "assets/icon32.png",
  "assets/icon48.png",
  "assets/icon128.png",
  "assets/animal-atlas.png",
  "assets/animal-redraw-atlas.png",
  "assets/adult-favicon-atlas.png",
  "assets/adult-sleep-atlas.png"
)

$outputs = Join-Path $root "outputs"
New-Item -ItemType Directory -Force $outputs | Out-Null
$zipPath = Join-Path $outputs "tab-zoo-extension-$($manifest.version).zip"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in $files) {
    $source = Join-Path $extension $file
    if (-not (Test-Path $source)) { throw "Missing extension file: $file" }
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip, $source, $file, [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
} finally {
  $zip.Dispose()
}

$size = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
Write-Output "Packaged $($files.Count) files into $zipPath ($size MB)"
