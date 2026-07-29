[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [Parameter(Mandatory = $true)]
    [string]$MerchantId,

    [ValidateSet("test", "production")]
    [string]$Environment = "test",

    [switch]$FixedIpRegistered,
    [switch]$EnableLiveCalls,
    [switch]$SkipSecrets,
    [switch]$Deploy
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Require-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "필수 명령어를 찾을 수 없습니다: $Name"
    }
}

if ($EnableLiveCalls -and -not $FixedIpRegistered) {
    throw "실제 PayUp 호출을 켜려면 먼저 -FixedIpRegistered를 지정해야 합니다."
}

Require-Command -Name "firebase"

$repoRoot = Split-Path -Parent $PSScriptRoot
$functionsDir = Join-Path $repoRoot "functions"
$envFile = Join-Path $functionsDir ".env.$ProjectId"

$fixedIpValue = if ($FixedIpRegistered) { "true" } else { "false" }
$liveCallsValue = if ($EnableLiveCalls) { "true" } else { "false" }
$envContent = @"
PAYUP_MERCHANT_ID=$MerchantId
PAYUP_ENVIRONMENT=$Environment
PAYUP_FIXED_IP_REGISTERED=$fixedIpValue
PAYUP_LIVE_CALLS_ENABLED=$liveCallsValue
"@

Set-Content -Path $envFile -Value $envContent -Encoding utf8
Write-Host "[완료] 비밀값이 아닌 PayUp 런타임 설정을 저장했습니다: $envFile" -ForegroundColor Green

if (-not $SkipSecrets) {
    Write-Host "[입력 필요] PAYUP_API_KEY를 Firebase Secret Manager에 등록합니다." -ForegroundColor Yellow
    & firebase functions:secrets:set PAYUP_API_KEY --project $ProjectId
    if ($LASTEXITCODE -ne 0) { throw "PAYUP_API_KEY 등록에 실패했습니다." }

    Write-Host "[입력 필요] PAYUP_API_CERT_KEY를 Firebase Secret Manager에 등록합니다." -ForegroundColor Yellow
    & firebase functions:secrets:set PAYUP_API_CERT_KEY --project $ProjectId
    if ($LASTEXITCODE -ne 0) { throw "PAYUP_API_CERT_KEY 등록에 실패했습니다." }
}

if ($Deploy) {
    $functionNames = @(
        "payupAdminHealth",
        "payupAdminFeatureFlags",
        "payupAdminSubmerchants",
        "payupAdminTransactions",
        "payupAdminSettlements",
        "payupAdminCancel",
        "payupAdminLogs",
        "payupPartnerActivity"
    )
    $only = ($functionNames | ForEach-Object { "functions:$($_)" }) -join ","

    Write-Host "[배포] PayUp 관리자·사업자 Functions를 배포합니다." -ForegroundColor Cyan
    & firebase deploy --project $ProjectId --only $only
    if ($LASTEXITCODE -ne 0) { throw "PayUp Functions 배포에 실패했습니다." }
}

Write-Host ""
Write-Host "PayUp Gateway 설정 결과" -ForegroundColor Cyan
Write-Host "- Firebase 프로젝트: $ProjectId"
Write-Host "- PayUp 환경: $Environment"
Write-Host "- merchantId: $MerchantId"
Write-Host "- 고정 IP 등록 확인: $fixedIpValue"
Write-Host "- 실제 PayUp 호출: $liveCallsValue"
Write-Host ""
Write-Host "주의: 실제 호출이 false인 경우 관리자 화면·대사 샌드박스는 사용할 수 있지만 PayUp 외부 API는 호출하지 않습니다." -ForegroundColor Yellow
