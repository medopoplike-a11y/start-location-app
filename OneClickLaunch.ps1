# ⚡ OneClickLaunch.ps1 - Instant Deploy (No Google Play)
# Usage: .\OneClickLaunch.ps1 [instant|web|apk]

param(
    [string]$Target = "instant"  # instant: both web + apk, web: vercel only, apk: local only
)

$ErrorActionPreference = "Stop"

# ==================== COLORS ====================
$colors = @{
    S = "Green"      # Success
    E = "Red"        # Error
    W = "Yellow"     # Warning
    I = "Cyan"       # Info
    T = "Blue"       # Title
}

function Out {
    param([string]$M, [string]$C = "I")
    Write-Host $M -ForegroundColor $colors[$C]
}

function Timer {
    $script:t0 = Get-Date
}

function TimerEnd {
    $t1 = (Get-Date) - $script:t0
    return "$($t1.Minutes)m $($t1.Seconds)s"
}

# ==================== STARTUP ====================
Clear-Host
Out "╔══════════════════════════════════╗" T
Out "║   🚀 START LOCATION INSTANT      ║" T
Out "║   Launch (No Google Play)        ║" T
Out "╚══════════════════════════════════╝" T

if (!(Test-Path "package.json")) {
    Out "❌ Run from project root!" E
    exit 1
}

Out ""
Out "Target: $Target | Instant Deploy" I
Out ""

# ==================== WEB DEPLOY ====================
if ($Target -eq "instant" -or $Target -eq "web") {
    Out "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" T
    Out "📦 PHASE 1: WEB DEPLOYMENT" T
    Out "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" T
    
    try {
        Out "`n⏱️  Building..." I
        Timer
        npm run build 2>&1 | Out-Null
        Out "✅ Build OK ($$(TimerEnd))" S
        
        Out "`n⏱️  Pushing to GitHub..." I
        Timer
        git add .
        git commit -m "🚀 v0.2.2 $(Get-Date -Format 'MM-dd HH:mm')" 2>&1 | Out-Null
        git push origin main 2>&1 | Out-Null
        Out "✅ Pushed to GitHub ($$(TimerEnd))" S
        
        Out "`n🌐 Vercel Auto-Deploy Started!" W
        Out "   URL: https://traestartzlum.vercel.app" S
        
    } catch {
        Out "❌ Web Error: $_" E
        exit 1
    }
}

# ==================== APK BUILD ====================
if ($Target -eq "instant" -or $Target -eq "apk") {
    Out "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" T
    Out "📱 PHASE 2: APK BUILD" T
    Out "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" T
    
    try {
        Out "`n⏱️  Building (Mobile)..." I
        Timer
        npm run build:mobile 2>&1 | Out-Null
        Out "✅ Build OK ($$(TimerEnd))" S
        
        Out "`n⏱️  Syncing (Capacitor)..." I
        npx cap sync android 2>&1 | Out-Null
        Out "✅ Sync OK" S
        
        Out "`n⏱️  Compiling (Gradle)..." I
        Timer
        Push-Location "android"
        ./gradlew assembleRelease --quiet
        Pop-Location
        Out "✅ Gradle OK ($$(TimerEnd))" S
        
        $pkg = "com.start.location"
        $apk = "android\app\build\outputs\apk\release\app-release.apk"
        
        if (Test-Path $apk) {
            $sz = [Math]::Round((Get-Item $apk).Length / 1MB, 1)
            
            if (!(Test-Path "dist")) { mkdir "dist" | Out-Null }
            Copy-Item $apk "dist\start-location-v0.2.2.apk" -Force
            
            Out "`n✅ APK READY!" S
            Out "   File: dist/start-location-v0.2.2.apk" I
            Out "   Size: $sz MB" I
            Out "`n   📌 Install on device:" W
            Out "   adb install -r dist\start-location-v0.2.2.apk" I
        } else {
            Out "❌ APK not found!" E
            exit 1
        }
        
    } catch {
        Out "❌ APK Error: $_" E
        exit 1
    }
}

# ==================== SUMMARY ====================
Out "`n╔══════════════════════════════════╗" S
Out "║      🎉 LAUNCH COMPLETE!        ║" S
Out "╚══════════════════════════════════╝" S

if ($Target -eq "instant" -or $Target -eq "web") {
    Out "`n🌐 WEB: https://traestartzlum.vercel.app" S
}

if ($Target -eq "instant" -or $Target -eq "apk") {
    Out "`n📱 APK: ./dist/start-location-v0.2.2.apk" S
}

Out "`n✨ No Google Play (as requested)" W
Out "`n✅ Ready to use!" S
