# Verdora - EAS preview APK build (run from frontend/)
# Requires: eas login (or EXPO_TOKEN env var)
# Usage: npm run eas:preview
#
# Set VERDORA_API_URL to your Render service URL, or copy .env.production.example → .env.production

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

function Invoke-Eas {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & npx eas-cli @Args 2>&1 | ForEach-Object { Write-Host $_; $_ }
  $code = $LASTEXITCODE
  $ErrorActionPreference = $prev
  if ($code -ne 0) { throw "eas-cli failed: eas $($Args -join ' ')" }
}

function Read-DotEnvValue {
  param([string]$Path, [string]$Key)
  if (-not (Test-Path $Path)) { return $null }
  foreach ($line in Get-Content $Path) {
    if ($line -match "^\s*#") { continue }
    if ($line -match "^\s*$Key\s*=\s*(.*)\s*$") {
      return $matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return $null
}

function Resolve-ProductionApiUrl {
  if ($env:VERDORA_API_URL) { return $env:VERDORA_API_URL.TrimEnd('/') }
  $fromFile = Read-DotEnvValue -Path (Join-Path $PWD ".env.production") -Key "EXPO_PUBLIC_AI_API_URL"
  if ($fromFile -and $fromFile -notmatch 'localhost|127\.0\.0\.1') {
    return $fromFile.TrimEnd('/')
  }
  return $null
}

Write-Host "==> Checking EAS login..."
$ErrorActionPreference = "Continue"
$whoamiOut = & npx eas-cli whoami 2>&1
$whoamiCode = $LASTEXITCODE
$ErrorActionPreference = "Stop"
$whoamiOut | ForEach-Object { Write-Host $_ }

if ($whoamiCode -ne 0) {
  Write-Host ""
  Write-Host "Not logged in. Run:  npx eas-cli login"
  Write-Host "Or set EXPO_TOKEN from https://expo.dev/settings/access-tokens"
  exit 1
}

Write-Host "==> Linking EAS project (eas init)..."
Invoke-Eas init --non-interactive --force

Write-Host "==> Configuring Android build..."
Invoke-Eas build:configure --platform android

Write-Host "==> Pushing .env to EAS preview environment..."
Invoke-Eas env:push preview --path .env --force

Write-Host "==> Removing localhost AI proxy from preview (not usable on phones)..."
Invoke-Eas env:delete preview --variable-name EXPO_PUBLIC_AI_API_URL --non-interactive 2>$null

$productionApi = Resolve-ProductionApiUrl
if ($productionApi) {
  Write-Host "==> Setting EXPO_PUBLIC_AI_API_URL for preview APK: $productionApi"
  Invoke-Eas env:create preview --name EXPO_PUBLIC_AI_API_URL --value $productionApi --force --visibility plaintext --non-interactive
} else {
  Write-Host "==> No production API URL — preview APK will use direct EXPO_PUBLIC_ZAI_API_KEY if set."
  Write-Host "    Set VERDORA_API_URL or create frontend/.env.production from .env.production.example"
}

Remove-Item -Recurse -Force (Join-Path $PWD "android") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $PWD "ios") -ErrorAction SilentlyContinue

Write-Host "==> Starting Android preview APK build (remote)..."
Invoke-Eas build --platform android --profile preview --non-interactive --wait

Write-Host "==> Done. Download link is in the output above."
