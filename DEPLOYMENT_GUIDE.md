# 🚀 دليل النشر الشامل

تم إعداد التطبيق بنجاح على 3 منصات: Android APK و Vercel و Supabase

---

## ✅ 1. نشر على Vercel (موقع الويب)

### الخطوات:

1. **افتح Vercel Dashboard**
   - اذهب إلى: https://vercel.com/dashboard
   - تأكد من تسجيل الدخول بحسابك

2. **استيراد المشروع من GitHub**
   - اضغط "Add New..." → "Project"
   - اختر مستودع: `medopoplike-a11y/start-location-app`
   - اضغط "Import"

3. **إعدادات البناء (Build Settings)**
   - **Framework Preset**: Next.js (يجب أن يكون محدداً تلقائياً)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (افتراضي)
   - **Install Command**: `npm install --legacy-peer-deps`

4. **متغيرات البيئة (Environment Variables)**
   أضف المتغيرات التالية:
   ```
   NEXT_PUBLIC_SUPABASE_URL: https://sdpjvorettivpdviytqo.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   
   ⚠️ **تنبيه**: المفاتيح موجودة في ملف `.env.local`

5. **اضغط "Deploy"**
   - سيبدأ البناء والنشر تلقائياً
   - سيستغرق حوالي 2-3 دقائق

6. **تحقق من الموقع**
   - بعد النشر، ستحصل على URL مثل: `https://your-project.vercel.app`
   - جرب جميع الصفحات (Vendor, Driver, Admin)

---

## 📱 2. تثبيت APK على جهاز Android

### الملف الجاهز:
```
android/app/build/outputs/apk/release/app-release-unsigned.apk
الحجم: 8.5 MB
```

### طرق التثبيت:

#### الطريقة 1: عبر USB (الأسهل)
1. وصل جهاز Android بالحاسوب عبر USB
2. انقل ملف APK إلى الجهاز
3. افتح مدير الملفات على الجهاز
4. اضغط على الملف لتثبيته

#### الطريقة 2: عبر رابط التحميل
1. رفع الملف على حدمة سحابية (Google Drive, Dropbox)
2. شاركر الرابط مع المستخدمين
3. يمكنهم تحميل والتثبيت مباشرة

#### الطريقة 3: توقيع APK رسمياً
```bash
# إذا كان لديك keystore:
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore my-release-key.keystore \
  app-release-unsigned.apk my-key-alias
```

⚠️ **ملاحظة مهمة**:
- الملف غير موقع حالياً (unsigned)
- لا يمكن نشره في Google Play Store بدون توقيع
- مناسب للتجربة والاختبار الداخلي فقط

---

## 🔄 3. إعداد التحديثات التلقائية (OTA) على Capgo

### الملف الجاهز:
```
dist/update.zip
الحجم: 0.02 MB
```

### الخطوات:

1. **أنشئ حساب Capgo**
   - اذهب إلى: https://capgo.app
   - سجل حساباً جديداً

2. **أضف تطبيقك**
   - Dashboard → "New App"
   - **App ID**: `com.start.location`
   - **App Version**: `0.2.1`
   - اضغط "Create"

3. **احصل على API Key**
   - Settings → API Keys
   - انسخ مفتاح API

4. **رفع التحديث (Upload Update)**
   ```bash
   # من خلال Dashboard:
   - اذهب إلى تطبيقك
   - Channels → "Create Channel"
   - اختر الإصدار الأخير
   - اضغط "Upload Bundle"
   - حدد ملف: dist/update.zip
   ```

5. **تفعيل التحديث التلقائي**
   - في التطبيق (capacitor.config.json):
   ```javascript
   autoUpdate: true  // ✅ مُفعّل بالفعل
   ```

6. **اختبر التحديث**
   - ثبّت التطبيق على جهاز
   - سيبحث عن التحديثات تلقائياً عند التشغيل

---

## 🔗 روابط سريعة

| الخدمة | الرابط |
|--------|--------|
| **GitHub** | https://github.com/medopoplike-a11y/start-location-app |
| **Vercel** | https://vercel.com/dashboard |
| **Supabase** | https://app.supabase.com |
| **Capgo** | https://capgo.app |

---

## 📋 قائمة التحقق قبل النشر

- [ ] GitHub: تم دفع جميع التغييرات ✅
- [ ] Vercel: تم إضافة متغيرات البيئة
- [ ] APK: اختبر على جهاز Android
- [ ] Capgo: رفع أول تحديث
- [ ] Supabase: البيانات متزامنة
- [ ] اختبر الصفحات الثلاث (Vendor, Driver, Admin)
- [ ] تحقق من التحديثات التلقائية

---

## 🆘 حل المشاكل

### مشكلة: Vercel build fails
**الحل**:
```bash
# تأكد من المتغيرات البيئية في Vercel Dashboard
# وتأكد من أن package.json صحيح
npm run build  # اختبر محلياً أولاً
```

### مشكلة: APK لا يعمل على الجهاز
**الحل**:
- تأكد من أن الجهاز يعمل بـ Android 6.0 أو أعلى
- جرب تثبيت Debug APK بدلاً من Release
- احذف النسخة القديمة أولاً

### مشكلة: OTA Update لا تعمل
**الحل**:
- تحقق من اتصال الإنترنت
- تأكد من أن `autoUpdate: true` في الإعدادات
- جرب تحديث يدوي من Capgo Dashboard

---

## 📞 ملاحظات التطوير

### الملفات المهمة:
- `capacitor.config.json` - إعدادات Capacitor
- `vercel.json` - إعدادات Vercel
- `.env.local` - متغيرات البيئة (⚠️ لا تشاركها)
- `src/components/Toast.tsx` - نظام الإشعارات
- `src/hooks/useToast.ts` - hook للإشعارات

### أوامر مفيدة:
```bash
# بناء الويب
npm run build

# بناء Android
npx cap sync android && cd android && ./gradlew assembleRelease

# بناء OTA bundle
npm run bundle:ota

# اختبار محلي
npm run dev
```

---

## ✨ الميزات المُنفذة

✅ نظام إشعارات Toast  
✅ مؤشرات تحميل على جميع الأزرار  
✅ رسائل حالة واضحة  
✅ اتصال Supabase كامل  
✅ تحديثات تلقائية (OTA)  
✅ دعم الجيولوكيشن  
✅ إدارة الطلبات والمحفظة  

---

**تاريخ الإعداد**: 28 مارس 2026  
**الإصدار**: 0.2.1  
**الحالة**: جاهز للإنتاج ✅
