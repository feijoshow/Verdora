# Verdora - EAS preview APK build (run from frontend/)
# Requires: eas login (or EXPO_TOKEN env var)
# Usage: npm run eas:preview

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
Invoke-Eas env:delete preview --variable-name EXPO_PUBLIC_AI_API_URL --non-interactive

# Remove local native folders — EAS prebuilds on the server; uploading android/ breaks package name
Remove-Item -Recurse -Force (Join-Path $PWD "android") -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $PWD "ios") -ErrorAction SilentlyContinue

Write-Host "==> Starting Android preview APK build (remote)..."
Invoke-Eas build --platform android --profile preview --non-interactive --wait

Write-Host "==> Done. Download link is in the output above."
