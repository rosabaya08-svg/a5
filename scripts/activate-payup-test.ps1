[CmdletBinding()]
param(
    [string]$PayupMerchantId = "",
    [string]$PayupApiKey = "",
    [string]$PayupApiCertKey = "",
    [switch]$EnableLiveTestCalls,
    [switch]$SkipA5lsDeploy,
    [switch]$RotateInternalSecrets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSVersion.Major -lt 7) {
    throw "이 자동화는 PowerShell 7 이상(pwsh)이 필요합니다. Windows PowerShell이 아니라 pwsh에서 실행하세요."
}
foreach ($command in @("gcloud", "gh")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "필수 명령어 '$command'가 설치되지 않았습니다. Google Cloud CLI와 GitHub CLI를 설치하세요."
    }
}

$activeGcloudAccount = (& gcloud auth list --filter=status:ACTIVE --format="value(account)").Trim()
if (-not $activeGcloudAccount) {
    & gcloud auth login
    if ($LASTEXITCODE -ne 0) { throw "Google Cloud 로그인을 완료하지 못했습니다." }
}
& gh auth status *> $null
if ($LASTEXITCODE -ne 0) {
    & gh auth login --hostname github.com --git-protocol https --web
    if ($LASTEXITCODE -ne 0) { throw "GitHub 로그인을 완료하지 못했습니다." }
}

$bootstrap = Join-Path $PSScriptRoot "bootstrap-payup-cloud-access.ps1"
if (-not (Test-Path $bootstrap)) {
    throw "bootstrap-payup-cloud-access.ps1 파일을 찾지 못했습니다. 최신 main 브랜치를 pull 하세요."
}

$bootstrapArgs = @{
    SkipInfrastructure = $true
    SkipApplicationDeploy = $true
}
if ($RotateInternalSecrets) { $bootstrapArgs.RotateInternalSecrets = $true }
if ($PayupMerchantId) { $bootstrapArgs.PayupMerchantId = $PayupMerchantId }
if ($PayupApiKey) { $bootstrapArgs.PayupApiKey = $PayupApiKey }
if ($PayupApiCertKey) { $bootstrapArgs.PayupApiCertKey = $PayupApiCertKey }

Write-Host "`n=== Google Cloud WIF·GitHub Environment·내부 Secret 구성 ===" -ForegroundColor Cyan
& $bootstrap @bootstrapArgs
if (-not $?) { throw "Cloud access bootstrap failed." }

$credentialsReady = $PayupMerchantId -and $PayupApiKey -and $PayupApiCertKey
if (-not $credentialsReady) {
    Write-Warning "PayUp 신규 merchantId/apiKey/apiCertKey가 모두 입력되지 않아 실연동 배포를 중단했습니다. 기존 노출 키는 사용하지 않습니다."
    Write-Host "신규 인증정보 수령 후 다음 형식으로 다시 실행하세요:" -ForegroundColor Yellow
    Write-Host ".\scripts\activate-payup-test.ps1 -PayupMerchantId '<신규 MID>' -PayupApiKey '<신규 apiKey>' -PayupApiCertKey '<신규 apiCertKey>' -EnableLiveTestCalls" -ForegroundColor Yellow
    exit 0
}

function Invoke-Gh([string[]]$Arguments) {
    & gh @Arguments
    if ($LASTEXITCODE -ne 0) { throw "gh 실행 실패: $($Arguments -join ' ')" }
}

function Get-LatestRun([string]$Repository, [string]$Workflow) {
    Start-Sleep -Seconds 5
    $json = & gh run list --repo $Repository --workflow $Workflow --limit 1 --json databaseId,status,conclusion,createdAt
    if ($LASTEXITCODE -ne 0) { throw "Workflow Run 목록 조회 실패" }
    $rows = $json | ConvertFrom-Json
    if (-not $rows -or $rows.Count -lt 1) { throw "Workflow Run을 찾지 못했습니다." }
    return [string]$rows[0].databaseId
}

$a5Repo = "rosabaya08-svg/a5"
$a5lsRepo = "rosabaya08-svg/a5ls-lusso-boutique"

Write-Host "`n=== A5 PayUp 테스트 Functions·Rules 배포 ===" -ForegroundColor Cyan
Invoke-Gh @(
    "workflow", "run", "payup-test-live-deploy.yml",
    "--repo", $a5Repo,
    "--ref", "main",
    "-f", "enable_payup_live_test_calls=$($EnableLiveTestCalls.ToString().ToLowerInvariant())"
)
$a5Run = Get-LatestRun -Repository $a5Repo -Workflow "payup-test-live-deploy.yml"
Write-Host "A5 Run ID: $a5Run" -ForegroundColor Yellow
Invoke-Gh @("run", "watch", $a5Run, "--repo", $a5Repo, "--exit-status")

if (-not $SkipA5lsDeploy) {
    Write-Host "`n=== A5LS 중앙 PayUp Gateway Functions 배포 ===" -ForegroundColor Cyan
    Invoke-Gh @(
        "workflow", "run", "a5ls-payup-deploy.yml",
        "--repo", $a5lsRepo,
        "--ref", "main",
        "-f", "deploy_functions=true"
    )
    $a5lsRun = Get-LatestRun -Repository $a5lsRepo -Workflow "a5ls-payup-deploy.yml"
    Write-Host "A5LS Run ID: $a5lsRun" -ForegroundColor Yellow
    Invoke-Gh @("run", "watch", $a5lsRun, "--repo", $a5lsRepo, "--exit-status")
}

Write-Host "`n=== PayUp 테스트 배포 완료 ===" -ForegroundColor Green
Write-Host "- 테스트 서버는 PayUp 회신에 따라 고정 IP 없이 연결됩니다." -ForegroundColor Green
Write-Host "- 배포 후 중요 회로는 안전을 위해 OFF입니다." -ForegroundColor Green
Write-Host "- A5S 기업관리자 > PayUp 운영 배전판에서 2인 승인 후 PAYUP_MASTER, NEW_ORDER, PAYMENT_WINDOW, CART_DISTRIBUTION, FINAL_APPROVAL을 순차 활성화하세요." -ForegroundColor Green
