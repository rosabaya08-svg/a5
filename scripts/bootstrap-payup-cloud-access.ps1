[CmdletBinding()]
param(
    [string]$A5ProjectId = "a5-closed-mall",
    [string]$A5lsProjectId = "lussoboutique",
    [string]$Region = "asia-northeast3",
    [string]$GitHubOwner = "rosabaya08-svg",
    [string]$A5Repository = "a5",
    [string]$A5lsRepository = "a5ls-lusso-boutique",
    [string]$EnvironmentName = "payup-test",
    [string]$A5PublicOrigin = "https://a5-closed-mall.pages.dev",
    [string]$A5lsPublicOrigin = "https://lussoboutique.co.kr",
    [string]$BootstrapAdminEmails = "rosabaya08@gmail.com",
    [string]$PayupMerchantId = "",
    [string]$PayupApiKey = "",
    [string]$PayupApiCertKey = "",
    [switch]$PayupFixedIpRegistered,
    [switch]$EnableLiveTestCalls,
    [switch]$SkipInfrastructure,
    [switch]$SkipApplicationDeploy,
    [switch]$SkipA5lsDeploy,
    [switch]$RotateInternalSecrets
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
    Write-Host "`n=== $Message ===" -ForegroundColor Cyan
}

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "필수 명령어 '$Name'을 찾을 수 없습니다. 먼저 설치한 뒤 다시 실행하세요."
    }
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command 실행 실패 (exit $LASTEXITCODE): $($Arguments -join ' ')"
    }
}

function Test-Native {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments
    )
    & $Command @Arguments *> $null
    return $LASTEXITCODE -eq 0
}

function New-RandomSecret([int]$Bytes = 48) {
    $buffer = New-Object byte[] $Bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
    return [Convert]::ToBase64String($buffer)
}

function Ensure-GitHubEnvironment([string]$Repository, [string]$Environment) {
    Invoke-Native gh api --method PUT "repos/$Repository/environments/$Environment" | Out-Null
}

function Set-GitHubEnvironmentSecret([string]$Repository, [string]$Environment, [string]$Name, [string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw "$Repository/$Environment Secret '$Name' 값이 비어 있습니다."
    }
    $Value | & gh secret set $Name --env $Environment --repo $Repository
    if ($LASTEXITCODE -ne 0) { throw "GitHub Secret 설정 실패: $Repository / $Name" }
}

function Set-GitHubEnvironmentVariable([string]$Repository, [string]$Environment, [string]$Name, [string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return }
    Invoke-Native gh variable set $Name --env $Environment --repo $Repository --body $Value | Out-Null
}

function Ensure-ServiceAccount([string]$ProjectId, [string]$AccountId, [string]$DisplayName) {
    $email = "$AccountId@$ProjectId.iam.gserviceaccount.com"
    if (-not (Test-Native gcloud iam service-accounts describe $email --project=$ProjectId)) {
        Invoke-Native gcloud iam service-accounts create $AccountId --project=$ProjectId --display-name=$DisplayName
    }
    return $email
}

function Grant-ProjectRoles([string]$ProjectId, [string]$ServiceAccountEmail, [string[]]$Roles) {
    foreach ($role in $Roles) {
        Invoke-Native gcloud projects add-iam-policy-binding $ProjectId `
            --member="serviceAccount:$ServiceAccountEmail" `
            --role=$role `
            --condition=None `
            --quiet | Out-Null
    }
}

function Ensure-ProjectApis([string]$ProjectId, [string[]]$Services) {
    Invoke-Native gcloud services enable @Services --project=$ProjectId --quiet
}

function Ensure-WorkloadIdentityPool {
    param(
        [string]$ProjectId,
        [string]$PoolId,
        [string]$ProviderId,
        [string]$Owner,
        [string[]]$Repositories
    )
    if (-not (Test-Native gcloud iam workload-identity-pools describe $PoolId --location=global --project=$ProjectId)) {
        Invoke-Native gcloud iam workload-identity-pools create $PoolId `
            --location=global `
            --project=$ProjectId `
            --display-name="GitHub Actions"
    }

    $condition = ($Repositories | ForEach-Object { "assertion.repository=='$Owner/$_'" }) -join " || "
    if (-not (Test-Native gcloud iam workload-identity-pools providers describe $ProviderId --workload-identity-pool=$PoolId --location=global --project=$ProjectId)) {
        Invoke-Native gcloud iam workload-identity-pools providers create-oidc $ProviderId `
            --workload-identity-pool=$PoolId `
            --location=global `
            --project=$ProjectId `
            --display-name="GitHub OIDC" `
            --issuer-uri="https://token.actions.githubusercontent.com" `
            --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref" `
            --attribute-condition=$condition
    }

    return (& gcloud iam workload-identity-pools providers describe $ProviderId `
        --workload-identity-pool=$PoolId `
        --location=global `
        --project=$ProjectId `
        --format="value(name)").Trim()
}

function Grant-RepositoryImpersonation {
    param(
        [string]$ServiceAccountProject,
        [string]$ServiceAccountEmail,
        [string]$PoolProjectNumber,
        [string]$PoolId,
        [string]$Owner,
        [string]$Repository
    )
    $member = "principalSet://iam.googleapis.com/projects/$PoolProjectNumber/locations/global/workloadIdentityPools/$PoolId/attribute.repository/$Owner/$Repository"
    Invoke-Native gcloud iam service-accounts add-iam-policy-binding $ServiceAccountEmail `
        --project=$ServiceAccountProject `
        --role="roles/iam.workloadIdentityUser" `
        --member=$member `
        --quiet | Out-Null
}

function Get-LatestWorkflowRunId([string]$Repository, [string]$WorkflowFile) {
    $json = & gh run list --repo $Repository --workflow $WorkflowFile --limit 1 --json databaseId,createdAt,status,conclusion
    if ($LASTEXITCODE -ne 0) { throw "GitHub Actions 실행목록 조회 실패: $Repository / $WorkflowFile" }
    $rows = $json | ConvertFrom-Json
    if (-not $rows -or $rows.Count -lt 1) { throw "시작된 Workflow Run을 찾지 못했습니다." }
    return [string]$rows[0].databaseId
}

function Start-And-WatchWorkflow {
    param(
        [string]$Repository,
        [string]$WorkflowFile,
        [hashtable]$Inputs
    )
    $arguments = @("workflow", "run", $WorkflowFile, "--repo", $Repository, "--ref", "main")
    foreach ($entry in $Inputs.GetEnumerator()) {
        $arguments += @("-f", "$($entry.Key)=$($entry.Value.ToString().ToLowerInvariant())")
    }
    Invoke-Native gh @arguments
    Start-Sleep -Seconds 5
    $runId = Get-LatestWorkflowRunId -Repository $Repository -WorkflowFile $WorkflowFile
    Write-Host "GitHub Actions Run ID: $runId" -ForegroundColor Yellow
    Invoke-Native gh run watch $runId --repo $Repository --exit-status
    return $runId
}

function Download-FixedIpArtifact([string]$Repository, [string]$RunId) {
    $target = Join-Path $env:TEMP "payup-fixed-ip-$RunId"
    if (Test-Path $target) { Remove-Item $target -Recurse -Force }
    New-Item -ItemType Directory -Path $target | Out-Null
    Invoke-Native gh run download $RunId --repo $Repository --name="payup-fixed-ip-result-$RunId" --dir $target
    $file = Get-ChildItem -Path $target -Filter "payup-fixed-ip-result.json" -Recurse | Select-Object -First 1
    if (-not $file) { throw "고정 IP 결과 Artifact를 찾지 못했습니다." }
    return Get-Content $file.FullName -Raw | ConvertFrom-Json
}

Write-Step "사전 도구와 로그인 상태 확인"
Require-Command gcloud
Require-Command gh

if (-not (Test-Native gcloud auth list --filter=status:ACTIVE --format="value(account)")) {
    Invoke-Native gcloud auth login
}
if (-not (Test-Native gh auth status)) {
    Invoke-Native gh auth login --hostname github.com --git-protocol https --web
}

$A5RepoFull = "$GitHubOwner/$A5Repository"
$A5lsRepoFull = "$GitHubOwner/$A5lsRepository"
$poolId = "github-actions"
$providerId = "github"

Write-Step "Google Cloud API 활성화"
$commonServices = @(
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "serviceusage.googleapis.com",
    "cloudfunctions.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "storage.googleapis.com",
    "firebase.googleapis.com",
    "firebaserules.googleapis.com",
    "firestore.googleapis.com"
)
Ensure-ProjectApis -ProjectId $A5ProjectId -Services ($commonServices + @("compute.googleapis.com", "vpcaccess.googleapis.com"))
Ensure-ProjectApis -ProjectId $A5lsProjectId -Services $commonServices

Write-Step "GitHub Actions 배포 서비스계정 생성"
$a5ServiceAccount = Ensure-ServiceAccount -ProjectId $A5ProjectId -AccountId "github-payup-deployer" -DisplayName "GitHub PayUp Deployer"
$a5lsServiceAccount = Ensure-ServiceAccount -ProjectId $A5lsProjectId -AccountId "github-a5ls-deployer" -DisplayName "GitHub A5LS Deployer"

$a5Roles = @(
    "roles/firebase.admin",
    "roles/cloudfunctions.admin",
    "roles/run.admin",
    "roles/cloudbuild.builds.editor",
    "roles/artifactregistry.admin",
    "roles/compute.networkAdmin",
    "roles/vpcaccess.admin",
    "roles/storage.admin",
    "roles/secretmanager.admin",
    "roles/iam.serviceAccountUser",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/datastore.owner"
)
$a5lsRoles = @(
    "roles/firebase.admin",
    "roles/cloudfunctions.admin",
    "roles/run.admin",
    "roles/cloudbuild.builds.editor",
    "roles/artifactregistry.admin",
    "roles/storage.admin",
    "roles/secretmanager.admin",
    "roles/iam.serviceAccountUser",
    "roles/serviceusage.serviceUsageAdmin",
    "roles/datastore.owner"
)
Grant-ProjectRoles -ProjectId $A5ProjectId -ServiceAccountEmail $a5ServiceAccount -Roles $a5Roles
Grant-ProjectRoles -ProjectId $A5lsProjectId -ServiceAccountEmail $a5lsServiceAccount -Roles $a5lsRoles

Write-Step "GitHub OIDC Workload Identity Federation 구성"
$providerName = Ensure-WorkloadIdentityPool `
    -ProjectId $A5ProjectId `
    -PoolId $poolId `
    -ProviderId $providerId `
    -Owner $GitHubOwner `
    -Repositories @($A5Repository, $A5lsRepository)
$poolProjectNumber = (& gcloud projects describe $A5ProjectId --format="value(projectNumber)").Trim()
if (-not $poolProjectNumber) { throw "GCP 프로젝트 번호를 확인하지 못했습니다." }
Grant-RepositoryImpersonation -ServiceAccountProject $A5ProjectId -ServiceAccountEmail $a5ServiceAccount -PoolProjectNumber $poolProjectNumber -PoolId $poolId -Owner $GitHubOwner -Repository $A5Repository
Grant-RepositoryImpersonation -ServiceAccountProject $A5lsProjectId -ServiceAccountEmail $a5lsServiceAccount -PoolProjectNumber $poolProjectNumber -PoolId $poolId -Owner $GitHubOwner -Repository $A5lsRepository

Write-Step "GitHub Environment와 배포 자격증명 등록"
Ensure-GitHubEnvironment -Repository $A5RepoFull -Environment $EnvironmentName
Ensure-GitHubEnvironment -Repository $A5lsRepoFull -Environment $EnvironmentName
Set-GitHubEnvironmentSecret -Repository $A5RepoFull -Environment $EnvironmentName -Name "GCP_WORKLOAD_IDENTITY_PROVIDER" -Value $providerName
Set-GitHubEnvironmentSecret -Repository $A5RepoFull -Environment $EnvironmentName -Name "GCP_SERVICE_ACCOUNT" -Value $a5ServiceAccount
Set-GitHubEnvironmentSecret -Repository $A5lsRepoFull -Environment $EnvironmentName -Name "GCP_WORKLOAD_IDENTITY_PROVIDER_A5LS" -Value $providerName
Set-GitHubEnvironmentSecret -Repository $A5lsRepoFull -Environment $EnvironmentName -Name "GCP_SERVICE_ACCOUNT_A5LS" -Value $a5lsServiceAccount

Set-GitHubEnvironmentVariable -Repository $A5RepoFull -Environment $EnvironmentName -Name "GCP_PROJECT_ID" -Value $A5ProjectId
Set-GitHubEnvironmentVariable -Repository $A5RepoFull -Environment $EnvironmentName -Name "GCP_REGION" -Value $Region
Set-GitHubEnvironmentVariable -Repository $A5RepoFull -Environment $EnvironmentName -Name "A5_PUBLIC_WEB_ORIGIN" -Value $A5PublicOrigin
Set-GitHubEnvironmentVariable -Repository $A5RepoFull -Environment $EnvironmentName -Name "A5_BOOTSTRAP_SUPER_ADMIN_EMAILS" -Value $BootstrapAdminEmails
Set-GitHubEnvironmentVariable -Repository $A5lsRepoFull -Environment $EnvironmentName -Name "A5LS_GCP_PROJECT_ID" -Value $A5lsProjectId
Set-GitHubEnvironmentVariable -Repository $A5lsRepoFull -Environment $EnvironmentName -Name "GCP_REGION" -Value $Region
Set-GitHubEnvironmentVariable -Repository $A5lsRepoFull -Environment $EnvironmentName -Name "A5S_PAYUP_GATEWAY_BASE_URL" -Value "https://$Region-$A5ProjectId.cloudfunctions.net"
Set-GitHubEnvironmentVariable -Repository $A5lsRepoFull -Environment $EnvironmentName -Name "A5_PUBLIC_WEB_ORIGIN" -Value $A5PublicOrigin
Set-GitHubEnvironmentVariable -Repository $A5lsRepoFull -Environment $EnvironmentName -Name "A5LS_PUBLIC_BASE_URL" -Value $A5lsPublicOrigin

$needInternalSecrets = $RotateInternalSecrets -or -not (Test-Path (Join-Path $PSScriptRoot ".payup-internal-secrets.initialized"))
if ($needInternalSecrets) {
    Write-Step "내부 암호화·채널 HMAC Secret 생성"
    $piiSecret = New-RandomSecret
    $hmacSecret = New-RandomSecret
    Set-GitHubEnvironmentSecret -Repository $A5RepoFull -Environment $EnvironmentName -Name "A5_ORDER_PII_ENCRYPTION_KEY" -Value $piiSecret
    Set-GitHubEnvironmentSecret -Repository $A5RepoFull -Environment $EnvironmentName -Name "A5LS_GATEWAY_HMAC_SECRET" -Value $hmacSecret
    Set-GitHubEnvironmentSecret -Repository $A5lsRepoFull -Environment $EnvironmentName -Name "A5LS_GATEWAY_HMAC_SECRET" -Value $hmacSecret
    Set-Content -Path (Join-Path $PSScriptRoot ".payup-internal-secrets.initialized") -Value (Get-Date).ToString("o") -Encoding UTF8
}

if ($PayupMerchantId) {
    Set-GitHubEnvironmentVariable -Repository $A5RepoFull -Environment $EnvironmentName -Name "PAYUP_TEST_MERCHANT_ID" -Value $PayupMerchantId
}
if ($PayupApiKey) {
    Set-GitHubEnvironmentSecret -Repository $A5RepoFull -Environment $EnvironmentName -Name "PAYUP_API_KEY_REISSUED" -Value $PayupApiKey
}
if ($PayupApiCertKey) {
    Set-GitHubEnvironmentSecret -Repository $A5RepoFull -Environment $EnvironmentName -Name "PAYUP_API_CERT_KEY_REISSUED" -Value $PayupApiCertKey
}

$fixedIpResult = $null
if (-not $SkipInfrastructure) {
    Write-Step "고정 NAT IP와 VPC Connector 실제 생성"
    $infraRun = Start-And-WatchWorkflow -Repository $A5RepoFull -WorkflowFile "payup-test-deploy.yml" -Inputs @{
        apply_infrastructure = $true
        deploy_application = $false
        fixed_ip_registered_with_payup = $false
        enable_payup_live_test_calls = $false
    }
    $fixedIpResult = Download-FixedIpArtifact -Repository $A5RepoFull -RunId $infraRun
    Set-GitHubEnvironmentVariable -Repository $A5RepoFull -Environment $EnvironmentName -Name "PAYUP_VPC_CONNECTOR" -Value $fixedIpResult.vpcConnector
    Set-GitHubEnvironmentVariable -Repository $A5RepoFull -Environment $EnvironmentName -Name "PAYUP_FIXED_EGRESS_IP" -Value $fixedIpResult.fixedEgressIp
    Write-Host "PayUp 등록 요청용 고정 공인 IP: $($fixedIpResult.fixedEgressIp)" -ForegroundColor Green
}

$havePayupCredentials = -not [string]::IsNullOrWhiteSpace($PayupMerchantId) -and -not [string]::IsNullOrWhiteSpace($PayupApiKey) -and -not [string]::IsNullOrWhiteSpace($PayupApiCertKey)
if (-not $SkipApplicationDeploy -and $havePayupCredentials) {
    if ($EnableLiveTestCalls -and -not $PayupFixedIpRegistered) {
        throw "-EnableLiveTestCalls에는 PayUp의 고정 IP 등록 완료 후 -PayupFixedIpRegistered가 필요합니다."
    }
    Write-Step "A5 PayUp Firebase Functions·Rules 배포"
    $applicationRun = Start-And-WatchWorkflow -Repository $A5RepoFull -WorkflowFile "payup-test-deploy.yml" -Inputs @{
        apply_infrastructure = $false
        deploy_application = $true
        fixed_ip_registered_with_payup = [bool]$PayupFixedIpRegistered
        enable_payup_live_test_calls = [bool]$EnableLiveTestCalls
    }
    Write-Host "A5 배포 Run ID: $applicationRun" -ForegroundColor Green

    if (-not $SkipA5lsDeploy) {
        Write-Step "A5LS 중앙 PayUp Gateway Functions 배포"
        $a5lsRun = Start-And-WatchWorkflow -Repository $A5lsRepoFull -WorkflowFile "a5ls-payup-deploy.yml" -Inputs @{ deploy_functions = $true }
        Write-Host "A5LS 배포 Run ID: $a5lsRun" -ForegroundColor Green
    }
} elseif (-not $SkipApplicationDeploy) {
    Write-Warning "PayUp 신규 merchantId/apiKey/apiCertKey가 아직 없어 Functions 실연동 배포는 건너뜁니다. 고정 IP 생성은 완료할 수 있습니다."
}

$result = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    a5ProjectId = $A5ProjectId
    a5lsProjectId = $A5lsProjectId
    workloadIdentityProvider = $providerName
    a5ServiceAccount = $a5ServiceAccount
    a5lsServiceAccount = $a5lsServiceAccount
    fixedEgressIp = if ($fixedIpResult) { $fixedIpResult.fixedEgressIp } else { "" }
    vpcConnector = if ($fixedIpResult) { $fixedIpResult.vpcConnector } else { "" }
    payupCredentialsConfigured = $havePayupCredentials
    fixedIpRegisteredWithPayup = [bool]$PayupFixedIpRegistered
    liveTestCallsRequested = [bool]$EnableLiveTestCalls
}
$resultPath = Join-Path (Get-Location) "PayUpCloudAccessBootstrapResult.json"
$result | ConvertTo-Json -Depth 5 | Set-Content -Path $resultPath -Encoding UTF8

Write-Step "완료"
Write-Host "결과 파일: $resultPath" -ForegroundColor Green
if ($fixedIpResult -and -not $PayupFixedIpRegistered) {
    Write-Host "다음 필수 단계: 고정 IP $($fixedIpResult.fixedEgressIp)를 PayUp에 등록하고 신규 테스트 인증정보를 수령하세요." -ForegroundColor Yellow
}
