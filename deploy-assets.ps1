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
$ArchivePath = Join-Path $TempDir "reward-school-assets.zip"
$RemoteArchivePath = "/tmp/reward-school-assets.zip"

if (-not (Test-Path -LiteralPath $PemFile)) {
  throw "Cannot find SSH key: $PemFile"
}

if (-not (Test-Path -LiteralPath $TempDir)) {
  New-Item -ItemType Directory -Path $TempDir | Out-Null
}

Write-Host ""
Write-Host "Reward School frontend asset deploy" -ForegroundColor Cyan
Write-Host "Frontend: $FrontendDir" -ForegroundColor Green
Write-Host "Server:   $RemoteUser@$RemoteHost" -ForegroundColor Green
Write-Host "Target:   $RemoteWebDir" -ForegroundColor Green
Write-Host ""

if (Test-Path -LiteralPath $ArchivePath) {
  Remove-Item -LiteralPath $ArchivePath -Force
}

$assetItems = @()
$assetsDir = Join-Path $FrontendDir "assets"
if (Test-Path -LiteralPath $assetsDir) {
  $assetItems += Get-Item -LiteralPath $assetsDir
}

$rootAssetExtensions = @(".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico", ".mp3", ".wav", ".m4a", ".ogg")
$assetItems += Get-ChildItem -LiteralPath $FrontendDir -File -Force | Where-Object {
  $_.Extension.ToLowerInvariant() -in $rootAssetExtensions
}

if (-not $assetItems) {
  throw "No frontend asset files found to deploy."
}

Write-Host "Packing frontend asset files..." -ForegroundColor Cyan
Compress-Archive -LiteralPath $assetItems.FullName -DestinationPath $ArchivePath -Force

Write-Host "Uploading asset archive..." -ForegroundColor Cyan
& scp -i $PemFile $ArchivePath "${RemoteUser}@${RemoteHost}:$RemoteArchivePath"
if ($LASTEXITCODE -ne 0) {
  throw "Upload failed."
}

$remoteScript = @"
set -e
echo "[1/4] Checking server frontend folder..."
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

echo "[2/4] Cleaning old asset files..."
rm -rf "`$WEB_DIR/assets"
find "`$WEB_DIR" -maxdepth 1 -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.webp" -o -iname "*.svg" -o -iname "*.ico" -o -iname "*.mp3" -o -iname "*.wav" -o -iname "*.m4a" -o -iname "*.ogg" \) -delete

echo "[3/4] Unzipping frontend asset archive..."
set +e
unzip -oq "`$ARCHIVE" -d "`$WEB_DIR"
UNZIP_CODE=`$?
set -e
if [ "`$UNZIP_CODE" -gt 1 ]; then
  echo "Unzip failed with code `$UNZIP_CODE."
  exit "`$UNZIP_CODE"
fi

echo "[4/4] Checking asset folder..."
test -d "`$WEB_DIR/assets"
echo "Frontend asset files are ready in `$WEB_DIR"
"@

Write-Host "Deploying assets on server..." -ForegroundColor Cyan
$remoteScript | & ssh -i $PemFile "${RemoteUser}@${RemoteHost}" "sudo bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Remote deploy failed."
}

Write-Host ""
Write-Host "Frontend assets deployed." -ForegroundColor Green
Write-Host "Code was not changed. Run deploy-code.bat when HTML/CSS/JS changes." -ForegroundColor Yellow
