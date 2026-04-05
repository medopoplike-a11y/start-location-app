# 🆘 دليل استكشاف الأخطاء الفوري

## ⚡ الخطوة الأولى (قبل أي شيء):

1. **افتح PowerShell كـ Administrator**
2. **انتقل للمجلد:**
   ```powershell
   cd c:\Users\Admin\Documents\trae_projects\start
   ```
3. **تحقق من التثبيت:**
   ```powershell
   npm --version
   node --version
   git --version
   ```

إذا ظهرت أرقام = ✅ كل شيء تمام

---

## 🚀 ابدأ الآن (اختر واحد):

### **الخيار 1: أسهل (نقرة واحدة)**
```powershell
.\OneClickLaunch.ps1 instant
```

### **الخيار 2: أمر واحد (copy-paste)**
```powershell
npm install --legacy-peer-deps && npm run build:mobile && npx cap sync android && cd android && ./gradlew assembleRelease && cd .. && git add . && git commit -m "🚀 Launch" && git push origin main
```

### **الخيار 3: خطوة بخطوة (تحكم كامل)**
```powershell
# 1
npm install --legacy-peer-deps

# 2
npm run build:mobile

# 3
npx cap sync android

# 4
cd android
./gradlew assembleRelease
cd ..

# 5
git add .
git commit -m "🚀 Launch"
git push origin main
```

---

## ❌ المشاكل الشائعة والحلول الفورية:

### مشكلة 1: `npm: command not found`

**السبب:** Node.js غير مثبت

**الحل:**
```
1. اذهب إلى https://nodejs.org/
2. حمّل و شغّل الإعداد
3. أعد تشغيل PowerShell
4. جرّب الأمر من جديد
```

---

### مشكلة 2: `Access Denied` أو خطأ تفويض

**السبب:** PowerShell بدون صلاحيات Admin

**الحل:**
```powershell
# اضغط Win+X واختر "Windows PowerShell (Admin)"
# أو شغّل: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### مشكلة 3: `npm install` بطيء جداً

**السبب:** الإنترنت أو npm بطيء

**الحل:**
```powershell
# استخدم نسخة أسرع:
npm install --legacy-peer-deps --prefer-offline --no-audit

# أو:
npm cache clean --force
npm install --legacy-peer-deps
```

---

### مشكلة 4: `./gradlew not found`

**السبب:** أنت لست في المجلد الصحيح

**الحل:**
```powershell
# تأكد من أنك هنا:
cd c:\Users\Admin\Documents\trae_projects\start\android

# ثم:
./gradlew assembleRelease
```

---

### مشكلة 5: `Gradle build failed`

**السبب:** عادة مشكلة في الذاكرة

**الحل:**
```powershell
cd android
./gradlew clean
./gradlew assembleRelease

# أو بسرعة أكبر:
./gradlew assembleRelease --no-daemon
```

---

### مشكلة 6: `Build takes too long (> 30 min)`

**السبب:** المرة الأولى دائماً تأخذ وقتاً

**الحل:**
```
✅ اترك الجهاز يعمل
✅ لا تغلق Terminal
✅ القهوة الآن تكون جاهزة! ☕
```

---

### مشكلة 7: Port 3000 مشغول

**السبب:** تطبيق آخر يستخدم الـ port

**الحل:**
```powershell
# استخدم port مختلف:
npm run dev -- -p 3001

# أو اقتل العملية على port 3000:
Get-NetTCPConnection -LocalPort 3000 | Stop-Process -Force
npm run dev
```

---

### مشكلة 8: Git authentication failed

**السبب:** مشكلة في بيانات GitHub

**الحل:**
```powershell
# إعادة تعيين GitHub:
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# أو استخدم token:
git remote set-url origin https://[TOKEN]@github.com/[USER]/[REPO].git
```

---

## ✅ علامات النجاح:

### عندما ترى هذه الرسائل = ✅

```
✅ > npm install success
✅ > next build success
✅ > Gradle build successful
✅ > On branch main
✅ > Your branch is up to date
```

---

## 📊 الخطيط الزمني المتوقع:

```
0-3 دقائق:  npm install
3-5 دقائق:  npm run build
5-7 دقائق:  npx cap sync
7-25 دقيقة: Gradle build (⏳ الانتظار!)
25-28 دقيقة: Git operations
28-30 دقيقة: ✅ DONE!
```

---

## 🆘 إذا لم ينجح شيء:

### الخطوة 1: نظّف وأعد المحاولة
```powershell
rm -r node_modules .next out android\app\build
npm install --legacy-peer-deps
npm run build:mobile
```

### الخطوة 2: تحقق من البيئة
```powershell
npm --version
node --version
java -version
```

يجب أن تكون:
- **npm:** v10+
- **node:** v20+
- **java:** 17+

### الخطوة 3: أعد تشغيل الجهاز
```powershell
# أحياناً الحل الأفضل:
Restart-Computer
```

---

## 🎯 النتائج النهائية (متى تعرف أن النجاح حدث):

### ✅ الويب يعمل:
- افتح: https://start-location-app.vercel.app
- تسجيل الدخول يعمل
- الثلاث واجهات تظهر

### ✅ APK جاهز:
- الملف موجود: `dist/start-location-v0.2.2.apk`
- الحجم: 50-80 MB
- يمكن تثبيته على جهاز

### ✅ Git محفوظ:
- أوامر: `git status` تظهر "working tree clean"
- `git log` يظهر commit جديد

---

## 💡 نصائح ذهبية:

| النصيحة | الفائدة |
|--------|--------|
| استخدم `--legacy-peer-deps` | تجنب مشاكل الاعتماديات |
| استخدم `--quiet` في Gradle | معلومات أقل = أسرع يظهر الخطأ |
| افتح 2 Terminal | واحد للـ dev، واحد للأوامر |
| لا تغلق Terminal أثناء البناء | قد توقف العملية |
| استخدم Task Manager | شاهد الـ CPU/RAM أثناء البناء |

---

## 📞 آخر كلمة:

إذا **فشل أي شيء**:

1. قراءة الخطأ بعناية
2. تجربة الحل من الجدول أعلاه
3. إذا استمر الفشل: نظّف وأعد المحاولة من البداية

**99% من الـ errors حلولها في هذا الملف!** ✨

---

**استعد للنجاح! 🚀**  
**الوقت: 20-30 دقيقة**  
**النتيجة: تطبيق متكامل**
