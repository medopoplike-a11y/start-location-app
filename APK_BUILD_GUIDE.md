# APK Build & Signing Guide for START Location

## 📋 متطلبات ما قبل البناء

### الخطوة 1: إعداد Java (JDK 17+)
```bash
# تحقق من تثبيت Java
java -version

# يجب أن ترى: openjdk version 17 أو أعلى
```

### الطوة 2: إعداد Android SDK في Android Studio
- قم بتثبيت Android Studio
- من Tools > SDK Manager
- تأكد من تثبيت:
  - Android SDK Platform 34+
  - Android SDK Build Tools 34+
  - NDK (للمكتبات الأصلية اختياري)

### الخطوة 3: إنشاء Keystore (مرة واحدة فقط)

```bash
# انتقل إلى فولدر المشروع
cd c:\Users\Admin\Documents\trae_projects\start

# أنشئ Keystore للتوقيع
keytool -genkey -v -keystore keystore.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias release-key \
  -storepass "your-secure-password-here" \
  -keypass "your-key-password-here"

# أو على Windows (Batch):
keytool -genkey -v -keystore keystore.jks -keyalg RSA -keysize 2048 ^
  -validity 10000 -alias release-key -storepass "your-secure-password" ^
  -keypass "your-key-password"

# ⚠️ احفظ كلمات المرور في مكان آمن!!!
```

---

## 🏗️ المرحلة 1: بناء المشروع

### الخطوة 1: نظّف والإعدادات السابقة
```bash
cd c:\Users\Admin\Documents\trae_projects\start

# نظّف الملفات القديمة
npm run clean 2>/dev/null || true
rm -rf .next out android/app/build dist/

# تثبيت الاعتماديات
npm install --legacy-peer-deps
```

### الخطوة 2: بناء للويب (Static Export)
```bash
# تعيين متغيرات البيئة
$env:BUILD_TYPE = 'static'
$env:NEXT_PUBLIC_SUPABASE_URL = 'https://sdpjvorettivpdviytqo.supabase.co'
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

# بناء المشروع
npm run build:mobile

# يجب أن تحصل على: .next/out/ مع جميع الملفات الثابتة
```

### الخطوة 3: مزامنة مع Android
```bash
# مزامنة Capacitor
npx cap sync android

# هذا سينسخ الملفات إلى android/app/src/main/assets/public
```

---

## 🔐 المرحلة 2: إعدادات التوقيع

### ملف gradle.properties (في مجلد android/)
```properties
# android/gradle.properties

# تحديد إصدار Java
org.gradle.jvmargs=-Xmx4g -XX:+UseG1GC

# إعدادات التوقيع
RELEASE_STORE_FILE=../keystore.jks
RELEASE_STORE_PASSWORD=your-secure-password-here
RELEASE_KEY_ALIAS=release-key
RELEASE_KEY_PASSWORD=your-key-password-here
```

### تحديث build.gradle
```gradle
// android/app/build.gradle

apply plugin: 'com.android.application'

android {
    namespace = "com.start.location"
    compileSdk = rootProject.ext.compileSdkVersion

    signingConfigs {
        release {
            storeFile file(RELEASE_STORE_FILE)
            storePassword RELEASE_STORE_PASSWORD
            keyAlias RELEASE_KEY_ALIAS
            keyPassword RELEASE_KEY_PASSWORD
        }
    }

    defaultConfig {
        applicationId "com.start.location"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 5
        versionName "1.5"
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            signingConfig signingConfigs.debug
        }
    }

    splits {
        abi {
            enable true
            reset()
            include 'arm64-v8a'  # 64-bit فقط
            universalApk true
        }
    }
}
```

---

## 🛠️ المرحلة 3: بناء APK

### الخيار A: من داخل Android Studio (موصى به للمبتدئين)

```
1. افتح File > Open وحدد: c:\Users\Admin\Documents\trae_projects\start\android
2. انتظر انتهاء Gradle Sync
3. اختر Build > Build Bundle(s) / APK(s) > Build APK(s)
4. اختر Release variant
5. انتظر انتهاء البناء (~2-5 دقائق)
6. ستجد النتيجة في: android/app/build/outputs/apk/release/app-release.apk
```

### الخيار B: من خط الأوامر (PowerShell)

```powershell
# انتقل إلى مجلد Android
cd c:\Users\Admin\Documents\trae_projects\start\android

# بناء APK Release
./gradlew assembleRelease

# أو على Linux/Mac:
# ./gradlew assembleRelease

# النتيجة:
# app/build/outputs/apk/release/app-release.apk
# app/build/outputs/apk/universal/release/app-universal-release.apk

# للتحقق من البناء:
./gradlew assembleRelease --info
```

### الخيار C: بناء Bundle (لـ Play Store)

```powershell
cd c:\Users\Admin\Documents\trae_projects\start\android

# بناء Bundle بدلاً من APK
./gradlew bundleRelease

# النتيجة:
# app/build/outputs/bundle/release/app-release.aab
```

---

## 📱 المرحلة 4: اختبار APK

### على جهاز فعلي:
```bash
# تثبيت APK على أول جهاز متصل
adb install app/build/outputs/apk/release/app-release.apk

# أو إذا كان مثبتاً بالفعل:
adb install -r app/build/outputs/apk/release/app-release.apk

# عرض السجلات:
adb logcat | grep "Start Location"

# فتح التطبيق:
adb shell am start -n com.start.location/.MainActivity
```

### على محاكي:
```
1. Android Studio > Device Manager > Create Virtual Device
2. اختر Pixel 8 أو أحدث
3. اختر Android 14+ API
4. تشغيل المحاكي
5. adb install -r app-release.apk
```

---

## 📦 المرحلة 5: نشر على Play Store

### الخطوة 1: إعداد Google Play Developer Account
- اذهب إلى: https://play.google.com/console
- اشترك كمطور ($25 مرة واحدة)
- أنشئ تطبيق جديد

### الخطوة 2: رفع APK/Bundle إلى Play Store

```
في Play Store Console:
1. Testing > Internal Testing > Upload Bundle/APK
2. رفع: app/build/outputs/bundle/release/app-release.aab
3. ملء التفاصيل:
   - App Name: START Location Delivery
   - Description: Fast and reliable delivery service
   - Screenshots: 3-5 صور
   - Icon: 512x512 PNG
   - مسلسل التصنيف: Delivery App
4. المراجعة والموافقة من Google
```

### الخطوة 3: نشر النسخة Beta أولاً
```
1. اختر Release > Create New Release
2. اختر: beta track
3. اختر الـ Bundle
4. أضف Release Notes
5. نشر للـ Beta (2-3 أيام للمراجعة)
6. اختبر النسخة β
7. نشر للـ Production
```

---

## 🔄 نظام التحديث التلقائي (OTA)

### إعداد Capgo للتحديثات التلقائية

```bash
# 1. تثبيت CLI
npm install -g @capgo/cli

# 2. تسجيل الدخول
capgo auth login

# 3. بعد البناء، رفع Bundle:
npm run bundle:ota

# 4. ثم:
capgo bundle upload --app-id com.start.location --path dist/update.zip

# 5. تحديث app_config في Supabase:
```

```sql
-- في Supabase SQL Editor
UPDATE app_config SET
  latest_version = '1.5',
  bundle_url = 'https://capgo.app/bundles/v1.5.zip',
  force_update = true,
  update_message = 'تحديثات جديدة متاحة! يرجى التحديث للحصول على أفضل أداء.'
WHERE id = 1;
```

---

## ✅ قائمة التحقق النهائية

- [ ] Keystore محفوظ بأمان
- [ ] جميع الأذونات مضافة في AndroidManifest.xml
- [ ] تحديث رقم الإصدار في package.json و versionCode
- [ ] البناء ناجح بدون أخطاء
- [ ] APK يعمل على جهاز اختبار
- [ ] جميع الواجهات الثلاثة تعمل (Admin, Driver, Vendor)
- [ ] نظام التحديث يعمل بشكل صحيح
- [ ] جاهز للنشر على Play Store

---

## 🐛 استكشاف الأخطاء الشائعة

| المشكلة | الحل |
|--------|------|
| `Error: Could not find gradle.properties` | تحقق من وجود `.env` وتشغيل `npm install` أولاً |
| `Keystore password is wrong` | استخدم نفس كلمة المرور المستخدمة عند الإنشاء |
| `APK كبير جداً (> 100MB)` | فعّل `minifyEnabled = true` و `shrinkResources = true` |
| `App crashes on launch` | شغّل `adb logcat` وتحقق من الأخطاء |
| `Permission denied on startup` | أضف `requestAllPermissions()` في AppWrapper |

---

**آخر تحديث:** 2026-03-27  
**الحالة:** ✅ جاهز للاستخدام الفوري
