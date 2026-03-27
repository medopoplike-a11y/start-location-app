# 🎯 دليل البدء السريع - START Location

## ⚡ أوامر هامة (انسخ والصق مباشرة)

### 1. التثبيت والإعداد الأساسي (5 دقائق)
```powershell
# انتقل إلى المجلس
cd c:\Users\Admin\Documents\trae_projects\start

# تثبيت الاعتماديات
npm install --legacy-peer-deps

# مزامنة مع Android
npx cap sync android

# اختبار البناء
npm run build
```

### 2. تشغيل التطبيق محلياً (30 ثانية)
```powershell
# بدء تطبيق الويب
npm run dev

# افتح المتصفح: http://localhost:3000
```

### 3. بناء APK سريع (10 دقائق)
```powershell
# البناء للموبايل
npm run build:mobile

# مزامنة
npx cap sync android

# فتح Android Studio
npx cap open android

# ثم: Build > Build APK(s) > Release
```

### 4. النشر إلى GitHub (2 دقيقة)
```powershell
git add .
git commit -m "🚀 Release v0.2.2 - Description"
git push origin main
```

---

## 📋 جداول البيانات الأساسية

### جدول `profiles` (المستخدمون)
```
id (UUID)        - مفتاح أولي
email (string)   - البريد الإلكتروني
full_name        - الاسم الكامل
role             - admin | driver | vendor
phone            - رقم الهاتف
area             - المنطقة (للتوصيل)
```

### جدول `orders` (الطلبات)
```
id (UUID)        - مفتاح أولي
vendor_id        - هوية المطعم
driver_id        - هوية الطيار
status           - pending | assigned | in_transit | delivered
distance         - المسافة بالكم
customer_details - بيانات الزبون (JSON)
financials       - التفاصيل المالية (JSON)
```

### جدول `wallets` (المحافظ)
```
id (UUID)        - مفتاح أولي
user_id          - هوية المستخدم
balance          - الرصيد الحالي
debt             - المستحقات
total_earnings   - الأرباح الإجمالية
```

### جدول `app_config` (إعدادات التطبيق)
```
latest_version   - آخر إصدار (0.2.2)
bundle_url       - رابط التحديث
force_update     - إجباري أم لا
driver_commission - عمولة الطيار (15%)
vendor_commission - عمولة المطعم (20%)
```

---

## 🔑 متغيرات البيئة المهمة

### نسخ من `.env.example` إلى `.env.local` وأضف:

```env
# يجب أن تكون موجودة بالفعل:
NEXT_PUBLIC_SUPABASE_URL=....
NEXT_PUBLIC_SUPABASE_ANON_KEY=....

# أضف هذه:
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_ADMIN_EMAIL=medopoplike@gmail.com
ENCRYPTION_KEY=your-32-char-key-here
NEXT_PUBLIC_APP_VERSION=0.2.2
```

⚠️ **لا تضع أبداً في GitHub!**

---

## 🚀 الواجهات الأساسية (للاختبار)

### تسجيل الدخول:
```
URL: http://localhost:3000/login

حسابات اختبار (ستنشئها أنت):
├─ admin@company.com (دور: admin)
├─ driver1@company.com (دور: driver)
└─ vendor1@company.com (دور: vendor)
```

### بعد التسجيل:
```
Admin:  http://localhost:3000/admin   (لوحة التحكم)
Driver: http://localhost:3000/driver  (تطبيق الطيار)
Vendor: http://localhost:3000/vendor  (تطبيق المطعم)
```

---

## 📱 خطوات تثبيت APK على الجهاز

### على جهاز فعلي:
```powershell
# 1. وصل الجهاز عبر USB
# 2. فعّل وضع المطورين في الجهاز
# 3. وافق على التصحيح عبر USB

# 4. تثبيت APK:
adb install -r android\app\build\outputs\apk\release\app-release.apk

# 5. فتح التطبيق:
adb shell am start -n com.start.location/.MainActivity

# 6. عرض السجلات:
adb logcat | grep "Start Location"
```

### على محاكي:
```
1. افتح Android Studio
2. Device Manager > Create Device
3. اختر Pixel 8, Android 14+
4. شغل المحاكي
5. نفس أوامر adb أعلاه
```

---

## 🐛 حل المشاكل الشائعة جداً

### المشكلة: `npm: command not found`
**الحل:**
```
تأكد من تثبيت Node.js من https://nodejs.org/
ثم أعد تشغيل PowerShell
```

### المشكلة: `Gradle sync failed`
**الحل:**
```powershell
cd android
./gradlew clean
./gradlew assembleDebug
cd ..
```

### المشكلة: `Build failed: missing dependenies`
**الحل:**
```powershell
npm install --legacy-peer-deps --force
npx cap sync android
```

### المشكلة: `APK crashes on startup`
**الحل:**
```powershell
# شغل السجلات
adb logcat > app-crash.log

# افتح الملف واحث عن الأخطاء
# الخطأ الشائع: مفاتيح Supabase خاطئة
```

### المشكلة: `الخريطة لا تظهر`
**الحل:**
```
تأكد من:
1. عدم قطع الإنترنت
2. تفعيل وصول GPS
3. الموقع فعّال في الإعدادات
```

---

## 📊 الملفات المهمة جداً (لا تحذف!)

```
🔒 keystore.jks              - للتوقيع (احفظه بأمان!)
📝 .env.local                - متغيرات البيئة الحقيقية
📦 android/gradle.properties - إعدادات البناء
🗂️ src/                      - الكود الرئيسي
💾 lib/db-setup-complete.sql - قاعدة البيانات
```

---

## 🎮 أوامر التطوير المفيدة

```powershell
# بدء حالة المراقبة
npm run dev -- --turbopack

# بناء بدون أخطاء (تجاهلها)
npm run build -- --force

# فحص الأخطاء والتحذيرات
npm run lint

# حذف الملفات المخزنة مؤقتاً
npm run clean  # إذا كان موجود
# أو يدويا:
rm -r .next out node_modules

# إعادة تثبيت كل شيء
npm install --legacy-peer-deps --force
```

---

## 📈 رصد الأداء

### قبل الإطلاق:
```bash
# حجم الـ Bundle:
npm run build -- --analyze

# السرعة:
# في Chrome DevTools (F12)
# Lighthouse > Generate Report
```

### بعد الإطلاق:
```bash
# في Play Console:
# - Android Vitals
# - Crashes & ANRs
# - Performance

# في Vercel Analytics:
# - CLS, LCP, FID
# - Response times
```

---

## 🔄 سير العمل اليومي

```
┌────────────────────────────┐
│  8:00 - جاهز للعمل        │
│  git pull origin main      │
│  npm run dev              │
└────────────────────────────┘
           ↓
┌────────────────────────────┐
│  التطوير والكود           │
│  كتابة features جديدة      │
│  اختبارات محلية           │
└────────────────────────────┘
           ↓
┌────────────────────────────┐
│  2:00 - الـ Commit        │
│  git add .                │
│  git commit -m "feature"  │
│  git push origin          │
└────────────────────────────┘
           ↓
┌────────────────────────────┐
│  3:00 - البناء والنشر      │
│  npm run build:mobile     │
│  اختبار APK              │
│  Push إلى Play Store      │
└────────────────────────────┘
```

---

## ✨ نصيحة ذهبية أخيرة

### قبل أي عملية نشر:
```bash
# تحقق ثلاث مرات من:
1. npm run lint       # لا توجد أخطاء
2. npm run build      # البناء ناجح
3. git status         # جميع الملفات مرفوعة

# ثم فقط:
4. git push origin main
```

### عند أول APK:
```
اختبرها على 3 أجهزة مختلفة على الأقل:
- جهاز قديم (Android 10)
- جهاز جديد (Android 14)
- محاكي واحد
```

### النشر الآمن:
```
1. Deploy إلى Staging أولاً
2. اختبر 24 ساعة
3. نشر إلى Beta (اختبار المستخدمين)
4. انتظر تقارير الأعطال
5. نشر إلى Production
```

---

## 📞 هل تحتاج مساعدة؟

```
اطلب مني:
✅ إصلاح أخطاء محددة
✅ إضافة مزايا جديدة
✅ تحسين الأداء
✅ شرح أي جزء من الكود
✅ استشارة معمارية

أنا متاح دائماً! 🚀
```

---

**تم الإعداد:** 2026-03-27  
**آخر فحص:** جاهز للاستخدام الفوري  
**الحالة:** 🟢 **GO LIVE** ✈️
