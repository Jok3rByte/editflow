@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo   EditFlow - Publicar en Vercel (variables + deploy prod)
echo ============================================================
echo.

if not exist ".env.local" (
  echo [ERROR] No se encontro .env.local en la carpeta del proyecto.
  pause
  exit /b 1
)

set "BAT_PATH=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$marker = '###POWERSHELL_' + 'START###'; $parts = (Get-Content -Raw -LiteralPath $env:BAT_PATH -Encoding UTF8) -split $marker, 2; & ([scriptblock]::Create($parts[1]))"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] La publicacion termino con errores ^(codigo %EXIT_CODE%^).
  if not "%AUTO_MODE%"=="1" pause
  exit /b %EXIT_CODE%
)

if not "%AUTO_MODE%"=="1" pause
exit /b 0

###POWERSHELL_START###
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Read-EnvFile([string]$path) {
  $map = @{}
  foreach ($line in Get-Content $path -Encoding UTF8) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $idx = $trimmed.IndexOf("=")
    if ($idx -gt 0) {
      $k = $trimmed.Substring(0, $idx).Trim()
      $v = $trimmed.Substring($idx + 1).Trim()
      $map[$k] = $v
    }
  }
  return $map
}

function Set-VercelEnvVar([string]$projectId, [string]$orgId, [string]$token, [string]$key, [string]$value) {
  $headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json; charset=utf-8"
  }
  $teamSuffix = if ($orgId -and $orgId.StartsWith("team_")) { "&teamId=$orgId" } else { "" }
  $url = "https://api.vercel.com/v10/projects/$projectId/env?upsert=true$teamSuffix"
  $envType = if ($key.StartsWith("NEXT_PUBLIC_")) { "plain" } else { "encrypted" }
  $body = @{
    key    = $key
    value  = $value
    type   = $envType
    target = @("production", "preview")
  } | ConvertTo-Json -Depth 4
  Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body | Out-Null
}

function Get-VercelEnvValue([string]$projectId, [string]$orgId, [string]$token, [string]$key) {
  $headers = @{ "Authorization" = "Bearer $token" }
  $teamSuffix = if ($orgId -and $orgId.StartsWith("team_")) { "?teamId=$orgId" } else { "" }
  $url = "https://api.vercel.com/v10/projects/$projectId/env$teamSuffix"
  $resp = Invoke-RestMethod -Method Get -Uri $url -Headers $headers
  $match = $resp.envs | Where-Object { $_.key -eq $key -and ($_.target -contains "production") } | Select-Object -First 1
  if ($match) { return $match.value }
  return $null
}

$envMap = Read-EnvFile ".env.local"

$vercelToken = if ($env:VERCEL_TOKEN) { $env:VERCEL_TOKEN.Trim() } else { $envMap["VERCEL_TOKEN"] }
if (-not $vercelToken) {
  $vercelToken = (Read-Host "Pega tu Vercel Token (vcp_...)").Trim()
}
if (-not $vercelToken) {
  Write-Host "[ERROR] Falta VERCEL_TOKEN en .env.local o por teclado." -ForegroundColor Red
  exit 1
}

$sbToken = if ($env:SB_TOKEN) {
  $env:SB_TOKEN.Trim()
} elseif ($env:SUPABASE_ACCESS_TOKEN) {
  $env:SUPABASE_ACCESS_TOKEN.Trim()
} else {
  $envMap["SUPABASE_ACCESS_TOKEN"]
}
if (-not $sbToken -and $env:AUTO_MODE -ne "1") {
  $sbToken = (Read-Host "Opcional - Token sbp_... de Supabase para actualizar Redirect URLs (Enter para omitir)").Trim()
}

Write-Host "1/4 Enlazando proyecto en Vercel..." -ForegroundColor Cyan
if (-not (Test-Path ".vercel\project.json")) {
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & npx.cmd --yes vercel link --yes --token $vercelToken
  $linkExit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($linkExit -ne 0) { exit $linkExit }
}

$projMeta = Get-Content ".vercel\project.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$projectId = $projMeta.projectId
$orgId = $projMeta.orgId
if (-not $projectId) {
  Write-Host "[ERROR] No se pudo leer projectId desde .vercel\project.json." -ForegroundColor Red
  exit 1
}

$existingProdAppUrl = Get-VercelEnvValue $projectId $orgId $vercelToken "NEXT_PUBLIC_APP_URL"

Write-Host "2/4 Subiendo variables de entorno desde .env.local a Vercel..." -ForegroundColor Cyan
$keysToSync = @(
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXT_PUBLIC_FACEBOOK_APP_ID",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "CRON_SECRET",
  "NEXT_PUBLIC_META_DOMAIN_VERIFICATION",
  "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION"
)

foreach ($k in $keysToSync) {
  $val = $envMap[$k]
  if ($val) {
    Set-VercelEnvVar $projectId $orgId $vercelToken $k $val
    Write-Host "  + $k"
  }
}

Write-Host "3/4 Compilando y publicando a produccion en Vercel..." -ForegroundColor Cyan
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$deployOutput = & npx.cmd --yes vercel deploy --prod --yes --token $vercelToken 2>&1 | ForEach-Object { "$_" }
$deployExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
$deployOutput | ForEach-Object { Write-Host $_ }
if ($deployExit -ne 0) { exit $deployExit }

$headers = @{ "Authorization" = "Bearer $vercelToken" }
$teamSuffix = if ($orgId -and $orgId.StartsWith("team_")) { "?teamId=$orgId" } else { "" }
$domainsInfo = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/$projectId/domains$teamSuffix" -Headers $headers
$customDomain = $domainsInfo.domains | Where-Object { $_.verified -and -not $_.redirect -and $_.name -notmatch '\.vercel\.app$' } | Select-Object -First 1 -ExpandProperty name
$projInfo = Invoke-RestMethod -Method Get -Uri "https://api.vercel.com/v9/projects/$projectId$teamSuffix" -Headers $headers

$prodDomain = $customDomain
if (-not $prodDomain -and $projInfo.targets -and $projInfo.targets.production -and $projInfo.targets.production.alias) {
  $prodDomain = $projInfo.targets.production.alias | Select-Object -First 1
}
$prodUrl = if ($prodDomain) {
  "https://$prodDomain"
} else {
  (($deployOutput | Select-String -Pattern "https://[^\s]+\.vercel\.app" | Select-Object -Last 1).Matches.Value)
}

if ($prodUrl -and $existingProdAppUrl -ne $prodUrl) {
  Write-Host "4/4 Fijando NEXT_PUBLIC_APP_URL=$prodUrl y refrescando build..." -ForegroundColor Cyan
  Set-VercelEnvVar $projectId $orgId $vercelToken "NEXT_PUBLIC_APP_URL" $prodUrl
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & npx.cmd --yes vercel deploy --prod --yes --token $vercelToken
  $redeployExit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($redeployExit -ne 0) { exit $redeployExit }
} else {
  Write-Host "4/4 NEXT_PUBLIC_APP_URL ya coincide con $prodUrl." -ForegroundColor Cyan
}

$supabaseUrl = $envMap["NEXT_PUBLIC_SUPABASE_URL"]
if ($sbToken -and $prodUrl -and $supabaseUrl -match "https://([^.]+)\.supabase\.co") {
  $sbRef = $Matches[1]
  Write-Host "Actualizando Redirect URLs en Supabase ($sbRef)..." -ForegroundColor Cyan
  $sbHeaders = @{
    "Authorization" = "Bearer $sbToken"
    "Content-Type"  = "application/json; charset=utf-8"
  }
  $sbApi = "https://api.supabase.com/v1/projects/$sbRef/config/auth"
  $sbCurrent = Invoke-RestMethod -Method Get -Uri $sbApi -Headers $sbHeaders
  $allow = @()
  if ($sbCurrent.uri_allow_list) {
    $allow = $sbCurrent.uri_allow_list -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ }
  }
  foreach ($u in @("http://localhost:3000/auth/callback", "$prodUrl/auth/callback", "$prodUrl/**")) {
    if ($allow -notcontains $u) { $allow += $u }
  }
  $sbBody = @{
    site_url       = $prodUrl
    uri_allow_list = (($allow | Select-Object -Unique) -join ",")
  } | ConvertTo-Json -Depth 4
  Invoke-RestMethod -Method Patch -Uri $sbApi -Headers $sbHeaders -Body $sbBody | Out-Null
}

Write-Host ""
Write-Host "=== PUBLICACION COMPLETA ===" -ForegroundColor Green
Write-Host "  URL publica:         $prodUrl"
Write-Host "  Privacidad:          $prodUrl/privacidad"
Write-Host "  Condiciones:         $prodUrl/terminos"
Write-Host "  Sitemap:             $prodUrl/sitemap.xml"
Write-Host "  Callback OAuth:      $supabaseUrl/auth/v1/callback"
