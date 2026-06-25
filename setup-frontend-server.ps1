param(
  [string]$RemoteHost = "39.105.34.236",
  [string]$RemoteUser = "root",
  [string]$RemoteWebDir = "/var/www/reward-school-web",
  [string]$PemFile = "C:\Users\mtsai\Desktop\workspace\demo-server.pem"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $PemFile)) {
  throw "Cannot find SSH key: $PemFile"
}

Write-Host ""
Write-Host "Reward School frontend server setup" -ForegroundColor Cyan
Write-Host "Server: $RemoteUser@$RemoteHost" -ForegroundColor Green
Write-Host "Web dir: $RemoteWebDir" -ForegroundColor Green
Write-Host ""

$remoteScript = @"
set -e
echo "[1/5] Creating frontend folder..."
mkdir -p "$RemoteWebDir"

echo "[2/5] Installing required packages if missing..."
command -v unzip >/dev/null 2>&1 || dnf install -y unzip
command -v nginx >/dev/null 2>&1 || dnf install -y nginx

echo "[3/5] Writing nginx config..."
cat > /etc/nginx/conf.d/reward-school-api.conf <<'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/reward-school-web;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5132/api/;
        proxy_http_version 1.1;
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }

    location / {
        try_files `$uri `$uri/ /index.html;
    }
}
EOF

echo "[4/5] Testing nginx config..."
nginx -t

echo "[5/5] Enabling and restarting nginx..."
systemctl enable nginx
systemctl restart nginx
curl -s http://127.0.0.1:5132/api/health || true
"@

$remoteScript | & ssh -i $PemFile "${RemoteUser}@${RemoteHost}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Server setup failed."
}

Write-Host ""
Write-Host "Frontend server setup completed." -ForegroundColor Green
Write-Host "Now run deploy-code.bat and deploy-assets.bat to upload frontend files." -ForegroundColor Green
