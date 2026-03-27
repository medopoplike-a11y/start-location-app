# 🔗 Supabase + GitHub Actions Integration Guide

## 📊 Current Status

✅ **Supabase Project Created & Configured**
✅ **GitHub Actions Workflows Ready**
✅ **Vercel Deployment Ready**
⏳ **GitHub Secrets: NEED TO BE ADDED** (Last Step!)

---

## 🔐 How to Connect Supabase with GitHub Actions

### Step 1: Go to GitHub Secrets Page
👉 https://github.com/medopoplike-a11y/start/settings/secrets/actions

### Step 2: Add These 2 Secrets (Need Both!)

#### Secret #1: NEXT_PUBLIC_SUPABASE_URL
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://sdpjvorettivpdviytqo.supabase.co
```

#### Secret #2: NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkcGp2b3JldHRpdnBkdml5dHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODI2MDIsImV4cCI6MjA4OTQ1ODYwMn0.Ti0wZbQHBQwFCBZlCdSaar7JUZm7k7sYUbvr9H2MsZ4
```

### Step 3: Existing Secrets (Already Added)
These were added in previous step - should already exist:
- ✅ VERCEL_TOKEN
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID

---

## 🔄 How GitHub Actions Uses These Secrets

### 1. Build Workflow (.github/workflows/build.yml)
```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```
**Uses:** Building APK and Next.js app with Supabase configured

### 2. Deploy Workflow (.github/workflows/deploy.yml)
```yaml
- name: 🔗 Verify Supabase Connection
  env:
    SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
    SUPABASE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```
**Uses:** Verifies Supabase is connected before deploying to Vercel

---

## 📦 Supabase Project Details

| Detail | Value |
|--------|-------|
| **Project ID** | sdpjvorettivpdviytqo |
| **Region** | Middle East (Egypt) |
| **API URL** | https://sdpjvorettivpdviytqo.supabase.co |
| **Database Host** | aws-0-me-south-1.pooler.supabase.com |
| **Anon Key** | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... |

---

## 📁 Local Configuration (Already Set)

All these files already have Supabase configured:

### 1. .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://sdpjvorettivpdviytqo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. vercel.json
```json
"env": {
  "NEXT_PUBLIC_SUPABASE_URL": "https://sdpjvorettivpdviytqo.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. src/lib/supabaseClient.ts
```typescript
const supabaseUrl = 'https://sdpjvorettivpdviytqo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {...});
```

---

## 🚀 What Happens After Adding Secrets

### 1. When you `git push` to main:
```bash
git add .
git commit -m "your message"
git push origin main
```

### 2. GitHub Actions will automatically:
- ✅ Install dependencies
- ✅ **Verify Supabase credentials** (using secrets)
- ✅ Build Next.js with Supabase configured
- ✅ Build Android APK
- ✅ Upload APK as artifact
- ✅ Deploy to Vercel (with Supabase connected)

### 3. Result:
- 📱 Android APK available in GitHub Releases
- 🌐 Web app running on Vercel with Supabase connected
- 💾 Database ready to use
- 🔄 Real-time sync working

---

## 🔍 How to Check If Everything Works

### 1. After Adding Secrets, Push a Commit:
```bash
git add .
git commit -m "chore: Added Supabase to GitHub"
git push origin main
```

### 2. Go to Actions Page:
👉 https://github.com/medopoplike-a11y/start/actions

### 3. Check Workflow Status:
- Look for latest workflow run
- Check "Build APK & Deploy Web" and "Deploy - GitHub → Vercel → Supabase"
- Both should show ✅ green checkmarks

### 4. Verify Steps:
```
✅ Verify Supabase Connection
✅ Verify Vercel Connection
✅ Build Next.js App
✅ Sync to Capacitor
✅ Build APK
✅ Deploy to Vercel
```

---

## 📊 Complete Integration Flow

```
Your Code
    ↓ (git push)
GitHub Actions
    ↓
1. Verify Secrets (Supabase + Vercel)
2. Build APK (with Supabase connected)
3. Build Next.js (with Supabase configured)
    ↓
Vercel Deployment
    ↓ (with Supabase credentials)
Production URL
    ↓
✅ Supabase Database Connected
✅ Android APK Ready
✅ Web App Live
```

---

## 🎯 Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Supabase Created | ✅ | Ready to use |
| GitHub Workflows | ✅ | build.yml & deploy.yml ready |
| Vercel Project | ✅ | Linked and authenticated |
| Vercel Secrets | ✅ | VERCEL_TOKEN, ORG_ID, PROJECT_ID added |
| Supabase Secrets | ⏳ | **NEED TO ADD 2 SECRETS** |
| Local Config | ✅ | .env.local, vercel.json, supabaseClient.ts |
| CI/CD Pipeline | ⏳ | Waiting for Supabase secrets |

---

## 📍 Next Action

👉 Add the 2 Supabase secrets to GitHub:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Then everything will be fully connected and automated! 🚀

---

## 🆘 Troubleshooting

### If workflow fails:
1. Go to https://github.com/medopoplike-a11y/start/actions
2. Click failed workflow
3. Check error message
4. Most common issue: Secrets not added or incorrect value

### If Supabase doesn't connect:
1. Verify secrets were added to GitHub
2. Check secret values match exactly
3. Re-run workflow from Actions page

### If Vercel deployment fails:
1. Check VERCEL_TOKEN is still valid
2. Verify VERCEL_ORG_ID and VERCEL_PROJECT_ID match
3. Check Vercel project is linked

---

**Created:** March 27, 2026
**Status:** Ready for Supabase GitHub integration
**Last Updated:** v0.2.2
