$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $projectRoot
$releaseRoot = Join-Path $workspaceRoot "tmp\cnc_param_quickfinder_release"
$stageRoot = Join-Path $releaseRoot "cnc_param_quickfinder_pages_upload"
$zipPath = Join-Path $releaseRoot "cnc_param_quickfinder_pages_upload.zip"

if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

$includeItems = @(
    "index.html",
    "app.js",
    "data.js",
    "kb-extra.js",
    "kb-readme-index.js",
    "styles.css",
    "manifest.webmanifest",
    "service-worker.js",
    "robots.txt",
    "icon-192.svg",
    "icon-512.svg",
    "share-card.svg",
    "assets"
)

foreach ($item in $includeItems) {
    $source = Join-Path $projectRoot $item
    $target = Join-Path $stageRoot $item

    if (-not (Test-Path -LiteralPath $source)) {
        throw "Missing required item: $item"
    }

    $sourceItem = Get-Item -LiteralPath $source
    if ($sourceItem -is [System.IO.DirectoryInfo]) {
        Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
    } else {
        Copy-Item -LiteralPath $source -Destination $target -Force
    }
}

Compress-Archive -LiteralPath $stageRoot -DestinationPath $zipPath -Force

Write-Output "Release package ready:"
Write-Output $stageRoot
Write-Output $zipPath
