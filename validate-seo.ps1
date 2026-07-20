$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PublicPages = [ordered]@{
  "index.html" = "https://www.rewardschool.com.au/"
  "advisor-product-flow.html" = "https://www.rewardschool.com.au/advisor-product-flow.html"
  "aeas.html" = "https://www.rewardschool.com.au/aeas.html"
  "aeas-study-resources.html" = "https://www.rewardschool.com.au/aeas-study-resources.html"
  "aeas-vocabulary.html" = "https://www.rewardschool.com.au/aeas-vocabulary.html"
  "aeas-english-bank.html" = "https://www.rewardschool.com.au/aeas-english-bank.html"
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

Get-ChildItem -LiteralPath (Join-Path $Root "schools") -Filter "*.html" -File | Sort-Object Name | ForEach-Object {
  $RelativePath = "schools/$($_.Name)"
  $PublicPages[$RelativePath] = "https://www.rewardschool.com.au/$RelativePath"
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
  Assert-SEOCondition ($Html -match '<html\s+lang="zh-CN"') "$($Entry.Key): expected zh-CN document language"
  Assert-SEOCondition ($Html -match '<meta\s+name="description"') "$($Entry.Key): missing meta description"
  Assert-SEOCondition ($Html -match '<meta\s+name="robots"\s+content="index, follow, max-image-preview:large"') "$($Entry.Key): invalid robots directive"
  Assert-SEOCondition ($Html -match $CanonicalPattern) "$($Entry.Key): missing or incorrect canonical"
  $HrefLangPattern = '<link\s+rel="alternate"\s+hreflang="zh-CN"\s+href="' + [regex]::Escape($Entry.Value) + '"\s*/?>'
  Assert-SEOCondition ($Html -match $HrefLangPattern) "$($Entry.Key): missing or incorrect zh-CN hreflang"
  Assert-SEOCondition ($Html -match '<meta\s+property="og:title"') "$($Entry.Key): missing Open Graph title"
  Assert-SEOCondition ($Html -match '<meta\s+name="twitter:card"') "$($Entry.Key): missing Twitter card"
  Assert-SEOCondition ($Html -match '<link\s+rel="(?:shortcut\s+)?icon"') "$($Entry.Key): missing favicon"
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
      $ResolvedTarget = if ($LocalTarget.StartsWith("/")) {
        Join-Path $Root $LocalTarget.TrimStart("/")
      } else {
        Join-Path (Split-Path -Parent $Path) $LocalTarget
      }
      Assert-SEOCondition (Test-Path -LiteralPath $ResolvedTarget) "$($Entry.Key): broken local link $Link"
    }
  }
}

$HomeHtml = Get-Content -LiteralPath (Join-Path $Root "index.html") -Raw -Encoding UTF8
Assert-SEOCondition ($HomeHtml -match '<meta\s+name="msvalidate\.01"\s+content="31CA48E882FD212F999EAF1B3437BF0A"\s*/?>') "index.html: missing Bing site verification tag"

$AdvisorProductHtml = Get-Content -LiteralPath (Join-Path $Root "advisor-product-flow.html") -Raw -Encoding UTF8
Assert-SEOCondition ($AdvisorProductHtml -match 'id="public-service-title"') "advisor-product-flow.html: missing crawlable public service content"

$AdvisorSchoolsHtml = Get-Content -LiteralPath (Join-Path $Root "advisor-schools.html") -Raw -Encoding UTF8
$StaticSchoolLinks = [regex]::Matches($AdvisorSchoolsHtml, 'href="schools/[^"#?]+\.html"', 'IgnoreCase')
$SchoolPageCount = @(Get-ChildItem -LiteralPath (Join-Path $Root "schools") -Filter "*.html" -File).Count
Assert-SEOCondition ($StaticSchoolLinks.Count -eq $SchoolPageCount) "advisor-schools.html: expected $SchoolPageCount crawlable school profile links, found $($StaticSchoolLinks.Count)"
Assert-SEOCondition ($AdvisorSchoolsHtml -match 'id="school-directory-title"') "advisor-schools.html: missing crawlable school directory content"

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

$BlockedMainlandDependencies = 'fonts\.googleapis\.com|fonts\.gstatic\.com|youtube\.com|youtu\.be|maps\.google\.|google\.com/recaptcha'
Assert-SEOCondition (-not (($PublicHtml -join "`n") -match $BlockedMainlandDependencies)) "Public pages contain a dependency commonly blocked in mainland China"

Write-Host "SEO validation passed for $($PublicPages.Count) public pages." -ForegroundColor Green
