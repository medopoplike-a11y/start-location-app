# 🚀 دليل الحصول على Vercel Keys

## ✅ Supabase Keys - موجودة بالفعل!

```
NEXT_PUBLIC_SUPABASE_URL ✅
NEXT_PUBLIC_SUPABASE_ANON_KEY ✅
```

---

## ❌ Vercel Keys - ناقصة (مطلوبة)

تحتاج إلى 3 مفاتيح من Vercel:
1. `VERCEL_TOKEN` - التوكن الخاص بك
2. `VERCEL_ORG_ID` - معرّف المنظمة
3. `VERCEL_PROJECT_ID` - معرّف المشروع

---

## 📋 الطريقة 1️⃣: استخدام Vercel CLI (الأسهل)

### **الخطوة 1: تثبيت Vercel CLI**
```bash
npm install -g vercel
```

### **الخطوة 2: تسجيل الدخول**
```bash
vercel login
```
سيفتح متصفح لتسجيل الدخول

### **الخطوة 3: ربط المشروع**
```bash
cd C:\Users\Admin\Documents\trae_projects\start
vercel link
```

**سيطلب منك:**
```
? Set up and deploy "start"? (Y/n) → Y

? Which scope should contain your project? 
→ اختر حسابك الشخصي

? Link to existing project? (y/N) 
→ اختر N للمشروع الجديد

? What's your project's name? 
→ start

? In which directory is your code? 
→ (اضغط Enter)

? Want to modify these settings? (y/N) 
→ N
```

جرب الآن في Terminal:
```bash
vercel link
```

---

## 📋 الطريقة 2️⃣: من Vercel Website (البديل)

### **الخطوة 1: الحصول على VERCEL_TOKEN**

1. اذهب إلى: https://vercel.com/account/tokens
2. اضغط زر "Create" (أزرق)
3. اختر:
   - Name: `github-actions`
   - Scope: `Full Account`
   - Expiration: `No Expiration` أو `30 days`
4. اضغط "Create Token"
5. **انسخ الـ Token (يظهر مرة واحدة فقط!)**
> تم ربط المشروع محلياً بالفعل. القيم التالية موجودة في `.vercel/project.json`:
>
> - `VERCEL_ORG_ID=team_h8cAsTEzj0nF90j8fRMmE69q`
> - `VERCEL_PROJECT_ID=prj_wGb2CYQP6R6fsk192liuzMzMDn2C`
>
> استخدمهم مباشرة عند إضافة GitHub Secrets.
### **الخطوة 2: الحصول على VERCEL_ORG_ID و VERCEL_PROJECT_ID**

**الطريقة A: من CLI (سهل)**
```bash
vercel projects list
```

هيعطيك:
```
Project ID: prj_xxx
Organization ID: team_xxx
```

**الطريقة B: من Dashboard**
1. اذهب إلى: https://vercel.com/dashboard
2. فتح المشروع
3. اذهب إلى: Settings → General
4. ابحث عن:
   - Project ID
   - Team ID

---

## 🔐 إضافة Keys إلى GitHub

### **الخطوة 1: افتح GitHub Secrets**
```
https://github.com/your-org/your-repo/settings/secrets/actions
```

### **الخطوة 2: أضف 3 Secrets:**

#### **Secret 1: VERCEL_TOKEN**
```
Name: VERCEL_TOKEN
Value: <الـ token من Vercel - vercel_xxx>
```

#### **Secret 2: VERCEL_ORG_ID**
```
Name: VERCEL_ORG_ID
Value: <Team ID من Vercel - team_xxx>
```

#### **Secret 3: VERCEL_PROJECT_ID**
```
Name: VERCEL_PROJECT_ID
Value: <Project ID من Vercel - prj_xxx>
```

---

## 🧪 اختبر الاتصال

```bash
# تحقق من أن CLI مرتبط
vercel projects list

# جرب deployment محلي
vercel deploy --preview
```

---

## ✅ بعد إضافة الـ 3 Secrets:

عند `git push` على `main`:

```
1. GitHub Actions تستقبل push
2. ✅ تتصل بـ Supabase (موجودة)
3. ✅ تتصل بـ Vercel (بعد الإضافة)
4. ✅ تبني التطبيق
5. ✅ تنشر تلقائياً على Vercel
```

---

## 📊 الملخص:

| الخطوة | الحالة |
|--------|--------|
| **Supabase Keys** | ✅ موجودة |
| **VERCEL_TOKEN** | ⏳ مطلوب |
| **VERCEL_ORG_ID** | ⏳ مطلوب |
| **VERCEL_PROJECT_ID** | ⏳ مطلوب |

---

## 🚀 اختر طريقة:

**الأسهل:** استخدم `vercel link` في Terminal
**الأسرع:** احصل على الـ tokens من Dashboard وأضفها مباشرة

اختر واحدة وأخبرني! 👇
