param(
  [string]$RemoteHost = "47.239.62.81",
  [string]$RemoteUser = "root",
  [string]$RemoteWebDir = "/var/www/reward-school-web",
  [string]$PemFile = "C:\Users\mtsai\Desktop\workspace\MelAU-Website\rewardschoolsecret.pem"
)

$ErrorActionPreference = "Stop"

$FrontendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $FrontendDir
$TempDir = Join-Path $WorkspaceRoot "tmp"
$ArchivePath = Join-Path $TempDir "reward-school-code.zip"
$RemoteArchivePath = "/tmp/reward-school-code.zip"
$RemoteScriptUploadPath = "/tmp/reward-school-code-remote.sh"
$FrontendScriptPath = Join-Path $FrontendDir "script.js"

if (-not (Test-Path -LiteralPath $PemFile)) {
  throw "Cannot find SSH key: $PemFile"
}

if (-not (Test-Path -LiteralPath $TempDir)) {
  New-Item -ItemType Directory -Path $TempDir | Out-Null
}

$FrontendVersion = $null
if (Test-Path -LiteralPath $FrontendScriptPath) {
  $scriptContent = Get-Content -LiteralPath $FrontendScriptPath -Raw
  $versionMatch = [regex]::Match($scriptContent, 'REWARD_SCHOOL_FRONTEND_VERSION\s*=\s*"([^"]+)"')
  if ($versionMatch.Success) {
    $FrontendVersion = $versionMatch.Groups[1].Value
  }
}

Write-Host ""
Write-Host "Reward School frontend code deploy" -ForegroundColor Cyan
Write-Host "Frontend: $FrontendDir" -ForegroundColor Green
Write-Host "Server:   $RemoteUser@$RemoteHost" -ForegroundColor Green
Write-Host "Target:   $RemoteWebDir" -ForegroundColor Green
Write-Host ""

if (Test-Path -LiteralPath $ArchivePath) {
  Remove-Item -LiteralPath $ArchivePath -Force
}

$codeItems = Get-ChildItem -LiteralPath $FrontendDir -File -Force | Where-Object {
  $_.Extension -in @(".html", ".js", ".css") -or $_.Name -eq "CNAME"
}

if (-not $codeItems) {
  throw "No frontend code files found to deploy."
}

Write-Host "Packing frontend code files..." -ForegroundColor Cyan
Compress-Archive -LiteralPath $codeItems.FullName -DestinationPath $ArchivePath -Force

Write-Host "Uploading code archive..." -ForegroundColor Cyan
& scp -i $PemFile $ArchivePath "${RemoteUser}@${RemoteHost}:$RemoteArchivePath"
if ($LASTEXITCODE -ne 0) {
  throw "Upload failed."
}

$remoteScript = @"
set -e
echo "[1/3] Checking server frontend folder..."
WEB_DIR="$RemoteWebDir"
ARCHIVE="$RemoteArchivePath"

if [ ! -d "`$WEB_DIR" ]; then
  echo "Missing `$WEB_DIR. Create the frontend folder on the server before deploying."
  exit 20
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "Missing unzip. Run setup-frontend-server.bat once before deploying."
  exit 21
fi

echo "[2/3] Cleaning old root code files..."
find "`$WEB_DIR" -maxdepth 1 -type f \( -name "*.html" -o -name "*.js" -o -name "*.css" -o -name "CNAME" \) -delete

echo "[3/3] Unzipping frontend code archive..."
set +e
unzip -oq "`$ARCHIVE" -d "`$WEB_DIR"
UNZIP_CODE=`$?
set -e
if [ "`$UNZIP_CODE" -gt 1 ]; then
  echo "Unzip failed with code `$UNZIP_CODE."
  exit "`$UNZIP_CODE"
fi

test -f "`$WEB_DIR/aeas-mock.html"
echo "Frontend code files are ready in `$WEB_DIR"
"@

Write-Host "Deploying code on server..." -ForegroundColor Cyan
$RemoteScriptPath = Join-Path $TempDir "reward-school-code-remote.sh"
[System.IO.File]::WriteAllText($RemoteScriptPath, $remoteScript.TrimStart([char]0xFEFF), [System.Text.UTF8Encoding]::new($false))
& scp -i $PemFile $RemoteScriptPath "${RemoteUser}@${RemoteHost}:$RemoteScriptUploadPath"
if ($LASTEXITCODE -ne 0) {
  throw "Remote script upload failed."
}
& ssh -i $PemFile "${RemoteUser}@${RemoteHost}" "sudo bash $RemoteScriptUploadPath"
if ($LASTEXITCODE -ne 0) {
  throw "Remote deploy failed."
}

Write-Host ""
Write-Host "Frontend code deployed." -ForegroundColor Green
Write-Host "This was a code-only deploy. Assets were not uploaded by this script." -ForegroundColor Yellow
Write-Host "Run deploy-assets.bat when images/audio/assets need to be uploaded." -ForegroundColor Yellow
Write-Host "Open: http://$RemoteHost/aeas-mock.html?debug=1" -ForegroundColor Green
if ($FrontendVersion) {
  Write-Host "Frontend version: v$FrontendVersion" -ForegroundColor Green
}
