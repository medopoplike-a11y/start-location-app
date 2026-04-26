# Requires GitHub CLI: https://cli.github.com/
# Run this from the project root: .\scripts\set-github-secrets.ps1

$ghExe = Get-Command gh -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue
if (-not $ghExe) {
    $fallback = 'C:\Program Files\GitHub CLI\gh.exe'
    if (Test-Path $fallback) {
        $ghExe = $fallback
    }
}

if (-not $ghExe) {
    Write-Error 'GitHub CLI not found. Please install gh and authenticate with gh auth login.'
    exit 1
}

$repo = Read-Host 'Enter GitHub repo slug (owner/repo)'

Write-Host 'Setting GitHub Actions secrets...'

$secrets = [ordered]@{
    NEXT_PUBLIC_SUPABASE_URL = Read-Host 'NEXT_PUBLIC_SUPABASE_URL'
    NEXT_PUBLIC_SUPABASE_ANON_KEY = Read-Host 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    SUPABASE_SERVICE_ROLE_KEY = Read-Host 'SUPABASE_SERVICE_ROLE_KEY'
    VERCEL_TOKEN = Read-Host 'VERCEL_TOKEN'
    VERCEL_ORG_ID = Read-Host 'VERCEL_ORG_ID'
    VERCEL_PROJECT_ID = Read-Host 'VERCEL_PROJECT_ID'
    RELEASE_STORE_PASSWORD = Read-Host 'RELEASE_STORE_PASSWORD'
    RELEASE_KEY_ALIAS = Read-Host 'RELEASE_KEY_ALIAS'
    RELEASE_KEY_PASSWORD = Read-Host 'RELEASE_KEY_PASSWORD'
}

foreach ($name in $secrets.Keys) {
    & $ghExe secret set $name --repo $repo --body $secrets[$name]
    Write-Host "Set secret: $name"
}

$keystorePath = "keystore.jks"
if (-Not (Test-Path $keystorePath)) {
    Write-Error "Keystore file not found at $keystorePath"
    exit 1
}

$keystoreValue = [Convert]::ToBase64String([IO.File]::ReadAllBytes($keystorePath))
& $ghExe secret set ANDROID_KEYSTORE_BASE64 --repo $repo --body $keystoreValue
Write-Host 'Set secret: ANDROID_KEYSTORE_BASE64'

Write-Host 'All GitHub secrets have been created successfully.'
