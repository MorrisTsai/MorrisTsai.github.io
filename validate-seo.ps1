$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PublicPages = [ordered]@{
  "index.html" = "https://www.rewardschool.com.au/"
  "advisor-product-flow.html" = "https://www.rewardschool.com.au/advisor-product-flow.html"
  "aeas.html" = "https://www.rewardschool.com.au/aeas.html"
  "aeas-mock.html" = "https://www.rewardschool.com.au/aeas-mock.html"
  "pte.html" = "https://www.rewardschool.com.au/pte.html"
  "camp.html" = "https://www.rewardschool.com.au/camp.html"
  "guides.html" = "https://www.rewardschool.com.au/guides.html"
  "aeas-exam-guide.html" = "https://www.rewardschool.com.au/aeas-exam-guide.html"
  "aeas-score-report.html" = "https://www.rewardschool.com.au/aeas-score-report.html"
  "year-11-application-timeline.html" = "https://www.rewardschool.com.au/year-11-application-timeline.html"
  "under-18-welfare-guide.html" = "https://www.rewardschool.com.au/under-18-welfare-guide.html"
  "advisor-schools.html" = "https://www.rewardschool.com.au/advisor-schools.html"
}

function Assert-SEOCondition {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

foreach ($Entry in $PublicPages.GetEnumerator()) {
  $Path = Join-Path $Root $Entry.Key
  $Html = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  $CanonicalPattern = '<link\s+rel="canonical"\s+href="' + [regex]::Escape($Entry.Value) + '"\s*/?>'

  Assert-SEOCondition ($Html -match '<title>[^<]+</title>') "$($Entry.Key): missing title"
  Assert-SEOCondition ($Html -match '<meta\s+name="description"') "$($Entry.Key): missing meta description"
  Assert-SEOCondition ($Html -match '<meta\s+name="robots"\s+content="index, follow, max-image-preview:large"') "$($Entry.Key): invalid robots directive"
  Assert-SEOCondition ($Html -match $CanonicalPattern) "$($Entry.Key): missing or incorrect canonical"
  Assert-SEOCondition ($Html -match '<meta\s+property="og:title"') "$($Entry.Key): missing Open Graph title"
  Assert-SEOCondition ($Html -match '<meta\s+name="twitter:card"') "$($Entry.Key): missing Twitter card"
  Assert-SEOCondition (([regex]::Matches($Html, '<h1(?:\s|>)', 'IgnoreCase')).Count -eq 1) "$($Entry.Key): expected exactly one static H1"

  $JsonLdBlocks = [regex]::Matches($Html, '<script\s+type="application/ld\+json">([\s\S]*?)</script>', 'IgnoreCase')
  Assert-SEOCondition ($JsonLdBlocks.Count -ge 1) "$($Entry.Key): missing JSON-LD"
  foreach ($Block in $JsonLdBlocks) {
    $null = $Block.Groups[1].Value | ConvertFrom-Json
  }

  $LocalLinks = [regex]::Matches($Html, 'href="([^"]+)"', 'IgnoreCase') | ForEach-Object {
    $_.Groups[1].Value
  } | Where-Object {
    $_ -and $_ -notmatch '^(?:https?:|mailto:|tel:|#|javascript:)'
  }
  foreach ($Link in $LocalLinks) {
    $LocalTarget = ($Link -split '[?#]')[0]
    if ($LocalTarget) {
      Assert-SEOCondition (Test-Path -LiteralPath (Join-Path $Root $LocalTarget)) "$($Entry.Key): broken local link $Link"
    }
  }
}

$PublicHtml = $PublicPages.Keys | ForEach-Object {
  Get-Content -LiteralPath (Join-Path $Root $_) -Raw -Encoding UTF8
}
$Titles = $PublicHtml | ForEach-Object { [regex]::Match($_, '<title>([^<]+)</title>').Groups[1].Value }
Assert-SEOCondition (($Titles | Select-Object -Unique).Count -eq $Titles.Count) "Public pages contain duplicate titles"
Assert-SEOCondition (-not (($PublicHtml -join "`n") -match 'Reward Education')) "Public pages contain the retired Reward Education brand name"

$AllHtml = Get-ChildItem -LiteralPath $Root -Filter "*.html" -File | ForEach-Object {
  Get-Content -LiteralPath $_.FullName -Raw -Encoding UTF8
}
Assert-SEOCondition (-not (($AllHtml -join "`n") -match 'images\.unsplash\.com')) "External Unsplash images remain in HTML"

[xml]$Sitemap = Get-Content -LiteralPath (Join-Path $Root "sitemap.xml") -Raw -Encoding UTF8
$SitemapUrls = @($Sitemap.urlset.url | ForEach-Object { [string]$_.loc })
$ExpectedUrls = @($PublicPages.Values)
Assert-SEOCondition ($SitemapUrls.Count -eq $ExpectedUrls.Count) "Sitemap URL count does not match public page count"
foreach ($Url in $ExpectedUrls) {
  Assert-SEOCondition ($SitemapUrls -contains $Url) "Sitemap is missing $Url"
}

$Robots = Get-Content -LiteralPath (Join-Path $Root "robots.txt") -Raw -Encoding UTF8
Assert-SEOCondition ($Robots -match 'Sitemap:\s+https://www\.rewardschool\.com\.au/sitemap\.xml') "robots.txt is missing the sitemap URL"

Write-Host "SEO validation passed for $($PublicPages.Count) public pages." -ForegroundColor Green
