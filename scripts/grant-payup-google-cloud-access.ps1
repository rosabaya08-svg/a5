[CmdletBinding()]
param(
    [switch]$InstallMissingCli,
    [switch]$RotateInternalSecrets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Has-Command([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-WithWinget([string]$Id, [string]$Name) {
    if (-not (Has-Command "winget")) {
        throw "$Name 설치가 필요하지만 winget을 찾을 수 없습니다. Microsoft Store의 App Installer를 먼저 복구해 주세요."
    }
    Write-Host "$Name 설치를 시작합니다." -ForegroundColor Yellow
    & winget install --id $Id --exact --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) { throw "$Name 설치에 실패했습니다." }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$bootstrap = Join-Path $PSScriptRoot "bootstrap-payup-cloud-access.ps1"
if (-not (Test-Path $bootstrap)) {
    throw "bootstrap-payup-cloud-access.ps1 파일을 찾지 못했습니다. 최신 main 브랜치를 pull 하세요."
}

Write-Step "Google Cloud CLI와 GitHub CLI 확인"
if (-not (Has-Command "gcloud")) {
    if (-not $InstallMissingCli) {
        throw "Google Cloud CLI가 없습니다. -InstallMissingCli 옵션으로 다시 실행하거나 공식 Google Cloud CLI를 설치하세요."
    }
    Install-WithWinget -Id "Google.CloudSDK" -Name "Google Cloud CLI"
}
if (-not (Has-Command "gh")) {
    if (-not $InstallMissingCli) {
        throw "GitHub CLI가 없습니다. -InstallMissingCli 옵션으로 다시 실행하거나 GitHub CLI를 설치하세요."
    }
    Install-WithWinget -Id "GitHub.cli" -Name "GitHub CLI"
}

Write-Step "대표님 Google Cloud 관리자 계정 로그인"
$activeGoogleAccount = (& gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>$null | Select-Object -First 1).Trim()
if (-not $activeGoogleAccount) {
    & gcloud auth login --update-adc
    if ($LASTEXITCODE -ne 0) { throw "Google Cloud 로그인에 실패했습니다." }
    $activeGoogleAccount = (& gcloud auth list --filter="status:ACTIVE" --format="value(account)" | Select-Object -First 1).Trim()
}
if (-not $activeGoogleAccount) { throw "활성 Google Cloud 계정을 확인하지 못했습니다." }
Write-Host "Google Cloud 계정: $activeGoogleAccount" -ForegroundColor Green

Write-Step "GitHub 관리자 계정 로그인"
& gh auth status --hostname github.com *> $null
if ($LASTEXITCODE -ne 0) {
    & gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) { throw "GitHub 로그인에 실패했습니다." }
}

Write-Step "A5·A5LS GitHub Actions용 Google Cloud 권한 구성"
$arguments = @(
    "-A5ProjectId", "a5-closed-mall",
    "-A5lsProjectId", "lussoboutique",
    "-Region", "asia-northeast3",
    "-GitHubOwner", "rosabaya08-svg",
    "-A5Repository", "a5",
    "-A5lsRepository", "a5ls-lusso-boutique",
    "-EnvironmentName", "payup-test",
    "-A5PublicOrigin", "https://a5-closed-mall.pages.dev",
    "-A5lsPublicOrigin", "https://lussoboutique.co.kr",
    "-BootstrapAdminEmails", "rosabaya08@gmail.com",
    "-SkipInfrastructure",
    "-SkipApplicationDeploy",
    "-SkipA5lsDeploy"
)
if ($RotateInternalSecrets) { $arguments += "-RotateInternalSecrets" }

& pwsh -ExecutionPolicy Bypass -File $bootstrap @arguments
if ($LASTEXITCODE -ne 0) { throw "Google Cloud/GitHub 권한 구성에 실패했습니다." }

Write-Step "권한 구성 완료"
Write-Host "다음 항목을 자동 구성했습니다." -ForegroundColor Green
Write-Host "- GitHub OIDC Workload Identity Pool/Provider"
Write-Host "- A5·A5LS 전용 배포 서비스계정"
Write-Host "- 두 저장소의 payup-test GitHub Environment"
Write-Host "- WIF Provider·Service Account GitHub Secrets"
Write-Host "- GCP 프로젝트·리전·공개 URL GitHub Variables"
Write-Host "- 주문정보 암호화키와 A5LS 중앙 Gateway HMAC Secret"
Write-Host ""
Write-Host "이 창에는 PayUp 인증키를 입력하지 않았고, 실제 결제·배포도 실행하지 않았습니다." -ForegroundColor Yellow
Write-Host "완료 후 ChatGPT에 '구글 권한 완료'라고 알려주세요. 이후 GitHub Actions를 통해 테스트 Functions 배포를 진행합니다." -ForegroundColor Cyan
