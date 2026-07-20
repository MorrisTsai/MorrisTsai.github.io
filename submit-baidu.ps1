param(
  [Parameter(Mandatory = $true)]
  [string]$Endpoint,
  [string]$UrlCsv = ""
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SitemapPath = Join-Path $Root "sitemap.xml"
$ExpectedHost = "www.rewardschool.com.au"

if (-not (Test-Path -LiteralPath $SitemapPath)) {
  throw "Cannot find sitemap: $SitemapPath"
}

$EndpointUri = [Uri]$Endpoint
if ($EndpointUri.Host -ne "data.zz.baidu.com" -or -not $EndpointUri.Query.Contains("token=")) {
  throw "Use the API endpoint copied from Baidu Search Resource Platform."
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
  $Uri = [Uri]$Url
  if ($Uri.Scheme -ne "https" -or $Uri.Host -ne $ExpectedHost) {
    throw "Baidu URL is outside the canonical HTTPS host: $Url"
  }
}

$Body = ($SubmittedUrls -join "`n")
$Response = Invoke-RestMethod `
  -Uri $Endpoint `
  -Method Post `
  -ContentType "text/plain; charset=utf-8" `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($Body))

if ($Response.error) {
  throw "Baidu rejected the submission: $($Response.message) (error $($Response.error))"
}

Write-Host "Baidu accepted $($Response.success) URLs; remain: $($Response.remain)." -ForegroundColor Green
