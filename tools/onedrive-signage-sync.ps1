param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$oneDriveRoot = [Environment]::GetEnvironmentVariable("OneDriveConsumer", "User")
if ([string]::IsNullOrWhiteSpace($oneDriveRoot)) {
  $oneDriveRoot = [Environment]::GetEnvironmentVariable("OneDrive", "User")
}

if ([string]::IsNullOrWhiteSpace($oneDriveRoot) -or -not (Test-Path -LiteralPath $oneDriveRoot)) {
  throw "OneDrive sync root was not found. Start or sign in to OneDrive first."
}

$backupRoot = Join-Path $oneDriveRoot "signage-backup"
$logRoot = Join-Path $backupRoot "_logs"
New-Item -ItemType Directory -Force -Path $backupRoot, $logRoot | Out-Null

$jobs = @(
  @{ Name = "a5-my-app-current"; Source = "C:\Users\djfhl\Desktop\my-app" },
  @{ Name = "a1-console"; Source = "C:\학습 자료\a1" },
  @{ Name = "a2-signage-partner-original"; Source = "C:\signage_partner" },
  @{ Name = "a3-apk-original"; Source = "C:\signage_player - apk 전용" },
  @{ Name = "a4-learning"; Source = "C:\학습 자료\a4" },
  @{ Name = "a5-learning"; Source = "C:\학습 자료\a5" },
  @{ Name = "a5-deploy-fix"; Source = "C:\학습 자료\a5-deploy-fix" },
  @{ Name = "b1-learning"; Source = "C:\학습 자료\b1" }
)

$excludeDirs = @(
  "OneDrive",
  "node_modules",
  ".next",
  "out",
  "build",
  ".dart_tool",
  ".gradle",
  ".turbo",
  ".vercel",
  ".wrangler",
  ".firebase",
  ".codex",
  ".git"
)

$excludeFiles = @(
  "*.log",
  "*.tmp",
  "*.cache",
  "Thumbs.db",
  ".DS_Store"
)

$summary = @()

foreach ($job in $jobs) {
  $source = $job.Source
  if (-not (Test-Path -LiteralPath $source)) {
    $summary += [pscustomobject]@{
      Name = $job.Name
      Source = $source
      Status = "missing"
      Destination = ""
    }
    continue
  }

  $destination = Join-Path $backupRoot $job.Name
  New-Item -ItemType Directory -Force -Path $destination | Out-Null

  $logFile = Join-Path $logRoot ("{0}-{1}.log" -f $job.Name, (Get-Date -Format "yyyyMMdd-HHmmss"))
  $args = @(
    $source,
    $destination,
    "/MIR",
    "/FFT",
    "/XJ",
    "/R:1",
    "/W:1",
    "/NP",
    "/TEE",
    "/LOG:$logFile",
    "/XD"
  ) + $excludeDirs + @("/XF") + $excludeFiles

  if ($DryRun) {
    $args += "/L"
  }

  & robocopy @args
  $code = $LASTEXITCODE
  if ($code -gt 7) {
    throw "Robocopy failed for $($job.Name) with exit code $code. See $logFile"
  }

  $summary += [pscustomobject]@{
    Name = $job.Name
    Source = $source
    Status = if ($DryRun) { "dry-run" } else { "synced" }
    Destination = $destination
    ExitCode = $code
    Log = $logFile
  }
}

$manifest = Join-Path $backupRoot "last-sync-manifest.json"
$summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifest -Encoding UTF8
$summary | Format-Table -AutoSize
