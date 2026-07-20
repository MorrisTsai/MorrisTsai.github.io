$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Files = @(Get-ChildItem -LiteralPath $Root -Filter "*.html" -File) +
  @(Get-ChildItem -LiteralPath (Join-Path $Root "schools") -Filter "*.html" -File)
$Utf8 = [System.Text.UTF8Encoding]::new($false)
$Changed = 0

foreach ($File in $Files) {
  $Html = [System.IO.File]::ReadAllText($File.FullName, [System.Text.Encoding]::UTF8)
  $IsIndexable = $Html -match '<meta\s+name="robots"\s+content="index, follow, max-image-preview:large"'
  if (-not $IsIndexable -or $Html -match 'hreflang="zh-CN"') {
    continue
  }

  $Canonical = [regex]::Match($Html, '<link rel="canonical" href="([^"]+)" />')
  if (-not $Canonical.Success) {
    throw "Missing canonical in $($File.FullName)"
  }

  $LineStart = $Html.LastIndexOf("`n", $Canonical.Index)
  $Indent = if ($LineStart -ge 0) {
    [regex]::Match($Html.Substring($LineStart + 1, $Canonical.Index - $LineStart - 1), '^\s*').Value
  } else {
    ""
  }
  $Replacement = $Canonical.Value + "`r`n" + $Indent +
    '<link rel="alternate" hreflang="zh-CN" href="' + $Canonical.Groups[1].Value + '" />'
  $Html = $Html.Remove($Canonical.Index, $Canonical.Length).Insert($Canonical.Index, $Replacement)
  [System.IO.File]::WriteAllText($File.FullName, $Html, $Utf8)
  $Changed++
}

Write-Host "Added zh-CN hreflang to $Changed pages." -ForegroundColor Green
