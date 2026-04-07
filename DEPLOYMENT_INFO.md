# 📋 معلومات النشر

## 🌐 Vercel Deployment

**الـ Config**: ✅ `vercel.json` موجود

```json
{
  "framework": "nextjs",
  "installCommand": "npm install --legacy-peer-deps",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev"
}
```

### متغيرات البيئة المطلوبة:
```
NEXT_PUBLIC_SUPABASE_URL=https://sdpjvorettivpdviytqo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📱 Android APK

| المعلومة | القيمة |
|-----------|--------|
| **App ID** | `com.start.location` |
| **App Name** | Start Location |
| **ملف APK** | `app-release-unsigned.apk` |
| **الحجم** | 8.5 MB |
| **الموقع** | `android/app/build/outputs/apk/release/` |
| **حالة التوقيع** | غير موقع (Unsigned) |
| **حالة البناء** | ✅ نجح |

### المتطلبات:
- Android 6.0 أو أعلى
- صلاحيات Location و Camera و Push Notifications

---

## 🔄 OTA Updates (Capgo)

| المعلومة | القيمة |
|-----------|--------|
| **حزمة التحديثات** | `update.zip` |
| **الحجم** | 0.02 MB |
| **الموقع** | `dist/update.zip` |
| **حالة البناء** | ✅ جاهزة |
| **Plugin** | `@capgo/capacitor-updater@8.43.11` |
| **autoUpdate** | ✅ مُفعّل |

### الخطوات:
1. أنشئ حساب على https://capgo.app
2. أضف التطبيق: `com.start.location`
3. رفع الحزمة: `update.zip`
4. اختبر التحديث

---

## 📦 Supabase

| المعلومة | القيمة |
|-----------|--------|
| **Project URL** | https://sdpjvorettivpdviytqo.supabase.co |
| **Auth** | ✅ مفعل |
| **Database** | ✅ PostgreSQL |
| **Client** | ✅ متصل |

### الملف الرئيسي:
```
src/lib/supabaseClient.ts
```

---

## 🔗 GitHub

| المعلومة | القيمة |
|-----------|--------|
| **المستودع** | `medopoplike-a11y/start-location-app` |
| **الـ Branch** | `main` |
| **آخر Commit** | ✅ دُفع الآن |
| **الحالة** | محدث وجاهز |

---

## 🛠️ البناء والنشر

### أوامر Vercel:
```bash
installCommand: npm install --legacy-peer-deps
buildCommand: npm run build
devCommand: npm run dev
```

### أوامر ملحوظة:
```bash
# بناء الويب
npm run build

# بناء OTA
npm run bundle:ota

# بناء Android
npx cap sync android
cd android && ./gradlew assembleRelease

# بناء mobile كامل
npm run build:mobile
```

---

## 📊 ملخص الحالة

| المنصة | الحالة | التاريخ |
|--------|--------|--------|
| **GitHub** | ✅ محدث | 28/3/2026 |
| **Vercel** | 🔘 معلق على الاتصال | - |
| **APK** | ✅ جاهز | 28/3/2026 |
| **Capgo OTA** | ✅ جاهز | 28/3/2026 |
| **Supabase** | ✅ متصل | مستمر |

---

## 🎯 الأولويات

1. **الآن**: اتصل بـ Vercel وابدأ النشر
2. **اليوم**: اختبر APK على جهاز Android
3. **غداً**: أتمم إعداد Capgo
4. **طالما**: راقب الأداء والأخطاء

---

**آخر تحديث**: 28 مارس 2026  
**الإصدار**: 0.2.1
