# 🔐 GitHub Secrets Configuration Guide

## 🚀 Required Secrets for CI/CD

للتكامل الكامل بين GitHub Actions و Vercel و Supabase، تحتاج إلى إضافة الـ secrets التالية:

---

## 📋 Secrets المطلوبة

### **1. Supabase Secrets**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**من أين تأخذها:**
1. اذهب إلى: https://supabase.com
2. افتح project: `your-project-ref`
3. اذهب إلى: Settings → API
4. انسخ:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### **2. Vercel Secrets**

```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

**من أين تأخذها:**
1. اذهب إلى: https://vercel.com/account/tokens
2. اضغط "Create"
3. انسخ الـ token → `VERCEL_TOKEN`

للـ ORG ID و PROJECT ID:
```bash
vercel --version  # تأكد من تثبيت Vercel CLI
vercel link      # سيعطيك ORG ID و PROJECT ID
```

---

## 🔗 إضافة Secrets إلى GitHub

### **الطريقة:**

1. اذهب إلى: `https://github.com/your-org/your-repo/settings/secrets/actions`

2. اضغط "New repository secret"

3. أضف كل secret:
   - Name: `NEXT_PUBLIC_SUPABASE_URL`
   - Value: (URL من Supabase)
   - اضغط "Add secret"

4. كرر لـ جميع الـ 5 secrets

---

## ✅ Secrets المطلوب إضافتها

| Secret Name | Source | Priority |
|------------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Settings → API | ⭐⭐⭐ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Settings → API | ⭐⭐⭐ |
| `VERCEL_TOKEN` | Vercel Account → Tokens | ⭐⭐ |
| `VERCEL_ORG_ID` | Vercel via CLI | ⭐⭐ |
| `VERCEL_PROJECT_ID` | Vercel via CLI | ⭐⭐ |

---

## 🧪 التحقق من الاتصال

بعد إضافة الـ secrets:

1. اذهب إلى: https://github.com/your-org/your-repo/actions

2. شغّل workflow يدويا:
   - اضغط "Run workflow"
   - اختر "main" branch
   - اضغط "Run workflow"

3. راقب اللوقات:
   - ✅ "Supabase URL configured"
   - ✅ "Vercel token configured"
   - ✅ APK built successfully
   - ✅ Deployed to Vercel

---

## 📊 الحالة الحالية

```
Supabase: ✅ متصل (في .env.local)
Vercel:   ⏳ ينتظر Secrets
GitHub:   ✅ Workflow جاهز
```

---

## 🚀 بعد إضافة الـ Secrets

كل push على `main` سيقوم بـ:
1. ✅ Install dependencies
2. ✅ Connect to Supabase
3. ✅ Build Next.js app
4. ✅ Build Android APK
5. ✅ Deploy to Vercel
6. ✅ Upload Artifacts

---

## 💡 نصائح

- ✅ استخدم Supabase Public Keys (anon keys)
- ✅ لا تضع Private Keys في GitHub Secrets
- ✅ استخدم Environment Specific Secrets
- ✅ Rotate tokens بشكل دوري

---

**Status:** 📝 Waiting for Secrets Configuration  
**Next:** Add secrets to GitHub and trigger workflow again
