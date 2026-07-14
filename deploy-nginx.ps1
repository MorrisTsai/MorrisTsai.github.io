param(
  [string]$RemoteHost = "47.239.62.81",
  [string]$RemoteUser = "root",
  [string]$PemFile = "C:\Users\mtsai\Desktop\workspace\MelAU-Website\rewardschoolsecret.pem"
)

$ErrorActionPreference = "Stop"

$FrontendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $FrontendDir "nginx-reward-school.conf"
$RemoteConfig = "/etc/nginx/conf.d/reward-school.conf"
$RemoteUpload = "/tmp/reward-school.conf"

if (-not (Test-Path -LiteralPath $PemFile)) {
  throw "Cannot find SSH key: $PemFile"
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
  throw "Cannot find Nginx config: $ConfigPath"
}

Write-Host "Uploading Reward School Nginx configuration..." -ForegroundColor Cyan
& scp -i $PemFile $ConfigPath "${RemoteUser}@${RemoteHost}:$RemoteUpload"
if ($LASTEXITCODE -ne 0) {
  throw "Nginx configuration upload failed."
}

$RemoteCommand = @"
set -e
cp "$RemoteConfig" "$RemoteConfig.backup"
cp "$RemoteUpload" "$RemoteConfig"
if ! nginx -t; then
  cp "$RemoteConfig.backup" "$RemoteConfig"
  nginx -t
  exit 1
fi
systemctl reload nginx
"@

Write-Host "Testing and reloading Nginx..." -ForegroundColor Cyan
& ssh -i $PemFile "${RemoteUser}@${RemoteHost}" $RemoteCommand
if ($LASTEXITCODE -ne 0) {
  throw "Nginx deployment failed; the previous configuration was restored."
}

Write-Host "Nginx configuration deployed successfully." -ForegroundColor Green
