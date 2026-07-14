param(
  [string]$HostName = "www.rewardschool.com.au",
  [string]$Key = "a91e9d07b963401f9dfb895f2199d11d",
  [string]$UrlCsv = ""
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SitemapPath = Join-Path $Root "sitemap.xml"
$KeyPath = Join-Path $Root "$Key.txt"

if (-not (Test-Path -LiteralPath $SitemapPath)) {
  throw "Cannot find sitemap: $SitemapPath"
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "Cannot find IndexNow key file: $KeyPath"
}

$SubmittedUrls = if ($UrlCsv) { @($UrlCsv.Split(",", [System.StringSplitOptions]::RemoveEmptyEntries)) } else { @() }
if (-not $SubmittedUrls.Count) {
  [xml]$Sitemap = Get-Content -LiteralPath $SitemapPath -Raw -Encoding UTF8
  $SubmittedUrls = @($Sitemap.urlset.url | ForEach-Object { [string]$_.loc })
}

if (-not $SubmittedUrls.Count) {
  throw "The sitemap contains no URLs."
}

foreach ($Url in $SubmittedUrls) {
  if (-not $Url.StartsWith("https://$HostName/")) {
    throw "IndexNow URL is outside the configured host: $Url"
  }
}

$Payload = @{
  host = $HostName
  key = $Key
  keyLocation = "https://$HostName/$Key.txt"
  urlList = $SubmittedUrls
} | ConvertTo-Json -Depth 4

$Response = Invoke-WebRequest `
  -Uri "https://api.indexnow.org/indexnow" `
  -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($Payload)) `
  -UseBasicParsing

if ($Response.StatusCode -notin @(200, 202)) {
  throw "IndexNow returned HTTP $($Response.StatusCode)."
}

Write-Host "IndexNow accepted $($SubmittedUrls.Count) URLs with HTTP $($Response.StatusCode)." -ForegroundColor Green
