$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Split-Path -Parent $projectRoot
$releaseRoot = Join-Path $workspaceRoot "tmp\cnc_param_quickfinder_github_release"
$repoRoot = Join-Path $releaseRoot "cnc_param_quickfinder_github_repo"
$zipPath = Join-Path $releaseRoot "cnc_param_quickfinder_github_repo.zip"

if (Test-Path -LiteralPath $repoRoot) {
    Remove-Item -LiteralPath $repoRoot -Recurse -Force
}

if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

New-Item -ItemType Directory -Path $repoRoot -Force | Out-Null

$includeItems = @(
    ".github",
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
    "assets",
    "README.md"
)

foreach ($item in $includeItems) {
    $source = Join-Path $projectRoot $item
    $target = Join-Path $repoRoot $item

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

New-Item -ItemType File -Path (Join-Path $repoRoot ".nojekyll") -Force | Out-Null
Compress-Archive -LiteralPath $repoRoot -DestinationPath $zipPath -Force

Write-Output "GitHub Pages package ready:"
Write-Output $repoRoot
Write-Output $zipPath
