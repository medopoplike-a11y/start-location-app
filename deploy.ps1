# Start-OS Deployment Script for Windows
Write-Host "🚀 Starting Start-OS Deployment to GitHub..." -ForegroundColor Cyan

# Check if there are changes to add
$status = git status --porcelain
if ($status) {
    Write-Host "📦 Adding and committing changes..." -ForegroundColor Yellow
    git add .
    git commit -m "🚀 Start-OS v0.2.1: Unified Build Fix & Background GPS"
}

# Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment Successful! Check GitHub Actions for your APK build." -ForegroundColor Green
} else {
    Write-Host "❌ Deployment Failed. Please check your internet connection or GitHub permissions." -ForegroundColor Red
}
