# PowerShell Deployment Script for START Location - INSTANT LAUNCH
# Binary Option: Web + Local APK (No Google Play)

param(
    [string]$Target = "instant",  # instant, web-only, apk-only, both
    [switch]$Quick
)

# ==================== COLORS & LOGGING ====================
$colors = @{
    SUCCESS = "Green"
    ERROR = "Red"
    WARNING = "Yellow"
    INFO = "Cyan"
    STEP = "Blue"
}

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $color = $colors[$Type]
    Write-Host "`n▶ $Message" -ForegroundColor $color -BackgroundColor Black
}

function Write-Timer {
    param([string]$Label)
    $script:startTime = Get-Date
    Write-Host "⏱️  $Label started..." -ForegroundColor Cyan
}

function Stop-Timer {
    $elapsed = (Get-Date) - $script:startTime
    Write-Host "✅ Completed in $($elapsed.Minutes)m $($elapsed.Seconds)s" -ForegroundColor Green
}

# ==================== MAIN INSTANT LAUNCH ====================

Clear-Host
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 START LOCATION - INSTANT LAUNCH  ║" -ForegroundColor Cyan
Write-Host "║     No Google Play - Just Deploy      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan

# Check project structure
if (!(Test-Path "package.json")) {
    Write-Status "❌ package.json not found! Run from project root." "ERROR"
    exit 1
}

# ==================== Phase 1: INSTANT WEB DEPLOY ====================
if ($Target -eq "instant" -or $Target -eq "web-only" -or $Target -eq "both") {
    Write-Status "📦 Phase 1: Web Deployment" "STEP"
    
    try {
        Write-Timer "Web Build"
        npm run build
        Stop-Timer
        
        Write-Status "📤 Pushing to GitHub (Vercel will auto-deploy)" "INFO"
        git add .
        git commit -m "🚀 Instant Launch - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
        git push origin main
        
        Write-Status "✅ Web deployed to https://start-location-app.vercel.app" "SUCCESS"
    } catch {
        Write-Status "❌ Vercel push failed: $_" "ERROR"
        exit 1
    }
}

# ==================== Phase 2: INSTANT APK BUILD ====================
if ($Target -eq "instant" -or $Target -eq "apk-only" -or $Target -eq "both") {
    Write-Status "📱 Phase 2: APK Build" "STEP"
    
    try {
        Write-Timer "Mobile Build"
        npm run build:mobile
        Write-Status "📡 Syncing with Android..." "INFO"
        npx cap sync android
        Stop-Timer
        
        Write-Timer "Gradle Release Build"
        Push-Location "android"
        ./gradlew assembleRelease
        Pop-Location
        Stop-Timer
        
        $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
        if (Test-Path $apkPath) {
            $apkSize = (Get-Item $apkPath).Length / 1MB
            Write-Status "✅ APK Ready: $apkPath ($([Math]::Round($apkSize, 2)) MB)" "SUCCESS"
            
            # Copy to dist for easy access
            if (!(Test-Path "dist")) { New-Item -ItemType Directory -Path "dist" | Out-Null }
            Copy-Item $apkPath "dist\start-location-v0.2.2.apk" -Force
            Write-Status "📋 Also copied to: dist/start-location-v0.2.2.apk" "INFO"
        } else {
            Write-Status "❌ APK not found!" "ERROR"
        }
    } catch {
        Write-Status "❌ APK build failed: $_" "ERROR"
        if (!$Quick) { Read-Host "Press Enter..." }
    }
}

# ==================== FINAL SUMMARY ====================
Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         🎉 LAUNCH COMPLETE!           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n📊 Deployment Summary:" -ForegroundColor Yellow
Write-Host "├─ 🌐 Web: https://start-location-app.vercel.app" -ForegroundColor Green
Write-Host "├─ 📱 APK: dist/start-location-v0.2.2.apk" -ForegroundColor Green
Write-Host "├─ 💾 Git: Pushed to main" -ForegroundColor Green
Write-Host "└─ ⏰ Status: READY TO USE" -ForegroundColor Green

Write-Host "`n🔗 For local testing:" -ForegroundColor Cyan
Write-Host "   adb install -r android\app\build\outputs\apk\release\app-release.apk" -ForegroundColor Gray

Write-Host "`n✨ No Google Play deployment (as requested)" -ForegroundColor Yellow


# ==================== ENVIRONMENT SETUP ====================
$projectRoot = Split-Path -Parent $MyInvocation.MyCommandPath
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "$projectRoot\deployment_logs\deploy_$timestamp.log"

# Create logs directory
if (!(Test-Path "$projectRoot\deployment_logs")) {
    New-Item -ItemType Directory -Path "$projectRoot\deployment_logs" | Out-Null
}

Write-Status "🚀 START Location Deployment System" "STEP"
Write-Status "Target: $Target | Environment: $Environment | Channel: $Channel" "INFO"

# ==================== FUNCTIONS ====================

function Invoke-Step {
    param([string]$Description, [scriptblock]$ScriptBlock)
    Write-Status "▶ $Description" "STEP"
    try {
        & $ScriptBlock
        Write-Status "✅ $Description - Completed" "SUCCESS"
        Add-Content -Path $logFile -Value "[$(Get-Date)] ✅ $Description"
    } catch {
        Write-Status "❌ $Description - Failed: $_" "ERROR"
        Add-Content -Path $logFile -Value "[$(Get-Date)] ❌ $Description - Error: $_"
        throw
    }
}

function Update-Version {
    param([string]$Type = "patch")  # major, minor, patch
    
    Write-Status "Updating version ($Type)..." "STEP"
    
    $packageJson = Get-Content "$projectRoot\package.json" | ConvertFrom-Json
    $version = $packageJson.version -split '\.'
    
    switch ($Type) {
        "major" { $version[0]++ }
        "minor" { $version[1]++; $version[2] = 0 }
        "patch" { $version[2]++ }
    }
    
    $newVersion = $version -join '.'
    $packageJson.version = $newVersion
    
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "$projectRoot\package.json"
    Write-Status "Version updated to: $newVersion" "SUCCESS"
    
    return $newVersion
}

function Deploy-Web {
    Write-Status "🌐 Deploying to Vercel..." "STEP"
    
    Invoke-Step "Building Next.js for Web" {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "Build failed" }
    }
    
    Invoke-Step "Deploying to Vercel" {
        npx vercel deploy --prod
        if ($LASTEXITCODE -ne 0) { throw "Vercel deployment failed" }
    }
    
    Write-Status "✅ Web deployment completed!" "SUCCESS"
}

function Deploy-Mobile {
    param([string]$Version)
    
    Write-Status "📱 Building APK..." "STEP"
    
    Invoke-Step "Building for Mobile" {
        $env:BUILD_TYPE = 'static'
        npm run build:mobile
        if ($LASTEXITCODE -ne 0) { throw "Mobile build failed" }
    }
    
    Invoke-Step "Syncing with Android" {
        npx cap sync android
        if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed" }
    }
    
    Invoke-Step "Building Release APK" {
        Push-Location "$projectRoot\android"
        try {
            .\gradlew assembleRelease
            if ($LASTEXITCODE -ne 0) { throw "Gradle build failed" }
            
            $apkFile = "app\build\outputs\apk\release\app-release.apk"
            Copy-Item $apkFile "$projectRoot\dist\start-location-v$Version.apk"
        } finally {
            Pop-Location
        }
    }
    
    Write-Status "✅ APK build completed!" "SUCCESS"
    Write-Status "Location: $projectRoot\dist\start-location-v$Version.apk" "INFO"
}

function Deploy-Update {
    param([string]$Version)
    
    Write-Status "🔄 Preparing OTA Update..." "STEP"
    
    Invoke-Step "Building Update Bundle" {
        npm run bundle:ota
        if ($LASTEXITCODE -ne 0) { throw "Bundle creation failed" }
    }
    
    Invoke-Step "Uploading to Capgo" {
        Push-Location "$projectRoot\dist"
        try {
            # تحتاج إلى تثبيت Capgo CLI أولاً
            capgo bundle upload --app-id com.start.location --path update.zip
            if ($LASTEXITCODE -ne 0) { throw "Capgo upload failed" }
        } finally {
            Pop-Location
        }
    }
    
    Write-Status "✅ OTA update prepared!" "SUCCESS"
    Write-Status "Next: Run 'npm run update-config' to activate the update" "WARNING"
}

function Deploy-PlayStore {
    param([string]$Version, [string]$Track = "internal")
    
    Write-Status "🎮 Submitting to Play Store..." "STEP"
    
    Invoke-Step "Building Play Store Bundle" {
        Push-Location "$projectRoot\android"
        try {
            .\gradlew bundleRelease
            if ($LASTEXITCODE -ne 0) { throw "Bundle creation failed" }
            
            $bundleFile = "app\build\outputs\bundle\release\app-release.aab"
            Copy-Item $bundleFile "$projectRoot\dist\start-location-v$Version.aab"
        } finally {
            Pop-Location
        }
    }
    
    Write-Status "Bundle created at: $projectRoot\dist\start-location-v$Version.aab" "INFO"
    Write-Status "Manual step required:" "WARNING"
    Write-Status "1. Go to https://play.google.com/console" "INFO"
    Write-Status "2. Upload to $Track track" "INFO"
    Write-Status "3. Add release notes" "INFO"
    Write-Status "4. Submit for review" "INFO"
}

function Git-Push {
    param([string]$Version)
    
    Write-Status "📤 Pushing to GitHub..." "STEP"
    
    Invoke-Step "Git add and commit" {
        git add .
        git commit -m "🚀 Release v$Version - Deployment $(Get-Date -Format 'yyyy-MM-dd')"
        if ($LASTEXITCODE -ne 0) { Write-Status "No changes to commit" "WARNING" }
    }
    
    Invoke-Step "Git push to main" {
        git push origin main
        if ($LASTEXITCODE -ne 0) { throw "Git push failed" }
    }
    
    Write-Status "✅ Pushed to GitHub!" "SUCCESS"
}

# ==================== MAIN DEPLOYMENT FLOW ====================

try {
    $version = Update-Version "patch"
    
    Write-Host "`n════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "📋 Deployment Plan:" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "Version: $version"
    Write-Host "Target: $Target"
    Write-Host "Environment: $Environment"
    Write-Host "────────────────────────────────────────" -ForegroundColor Cyan
    
    # Pre-deployment checks
    Write-Status "🔍 Running pre-deployment checks..." "STEP"
    
    if (-not (Test-Path "$projectRoot\package.json")) {
        throw "package.json not found!"
    }
    
    if (-not (Test-Path "$projectRoot\android")) {
        throw "Android project not found!"
    }
    
    # Execute deployment based on target
    switch ($Target) {
        "all" {
            Deploy-Web
            Deploy-Mobile -Version $version
            Deploy-PlayStore -Version $version -Track $Channel
            Deploy-Update -Version $version
            Git-Push -Version $version
        }
        "web" {
            Deploy-Web
            Git-Push -Version $version
        }
        "mobile" {
            Deploy-Mobile -Version $version
            Deploy-PlayStore -Version $version -Track $Channel
            Git-Push -Version $version
        }
        "bundle" {
            Deploy-Mobile -Version $version
            Deploy-Update -Version $version
        }
        "update" {
            Deploy-Update -Version $version
        }
        default {
            Write-Status "Unknown target: $Target" "ERROR"
            throw "Invalid target"
        }
    }
    
    Write-Host "`n════════════════════════════════════════" -ForegroundColor Green
    Write-Status "🎉 DEPLOYMENT SUCCESSFUL!" "SUCCESS"
    Write-Host "════════════════════════════════════════" -ForegroundColor Green
    Write-Status "Version: $version deployed to $Environment" "SUCCESS"
    Write-Status "Log file: $logFile" "INFO"
    
} catch {
    Write-Status "❌ DEPLOYMENT FAILED!" "ERROR"
    Write-Status "Error: $_" "ERROR"
    Add-Content -Path $logFile -Value "[$(Get-Date)] ❌ Deployment failed: $_"
    exit 1
}
