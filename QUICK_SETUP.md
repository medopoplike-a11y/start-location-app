# 🔗 ربط GitHub مع Vercel و Supabase - دليل سريع

## المشكلة الحالية:
```
❌ GitHub Actions لا تتصل بـ Vercel
❌ GitHub Actions لا تتصل بـ Supabase
⚠️ الـ Secrets لم تُضاف بعد
```

---

## ✅ الحل: إضافة Secrets إلى GitHub

### **الخطوة 1: افتح GitHub Settings**

```
https://github.com/medopoplike-a11y/start/settings/secrets/actions
```

---

### **الخطوة 2: احصل على Supabase Keys**

1. اذهب إلى: https://supabase.com
2. اختر project: `sdpjvorettivpdviytqo`
3. انقر على: Settings → API
4. انسخ:
   ```
   URL → NEXT_PUBLIC_SUPABASE_URL
   anon key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

---

### **الخطوة 3: احصل على Vercel Token**

```bash
# الطريقة 1: من Vercel Dashboard
https://vercel.com/account/tokens
→ اضغط Create
→ انسخ الـ token

# الطريقة 2: عبر CLI
vercel --version
vercel link
```

---

### **الخطوة 4: أضف 5 Secrets إلى GitHub**

افتح: https://github.com/medopoplike-a11y/start/settings/secrets/actions

اضغط "New repository secret" لكل واحد:

#### **Secret 1: Supabase URL**
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://sdpjvorettivpdviytqo.supabase.co
```

#### **Secret 2: Supabase Key**
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...
```

#### **Secret 3: Vercel Token**
```
Name: VERCEL_TOKEN
Value: <vercel_token_من_dashboard>
```

#### **Secret 4: Vercel Org ID**
```
Name: VERCEL_ORG_ID
Value: <من_vercel_link>
```

#### **Secret 5: Vercel Project ID**
```
Name: VERCEL_PROJECT_ID
Value: <من_vercel_link>
```

---

## 🧪 اختبر الاتصال

بعد إضافة الـ 5 secrets:

1. اذهب إلى: https://github.com/medopoplike-a11y/start/actions

2. اضغط "Run workflow" (الزر الأزرق على اليمين)

3. اختر "main" branch

4. اضغط "Run workflow"

---

## ✅ يجب أن تجد:

```
✅ Supabase URL configured
✅ Vercel token configured
✅ APK built successfully
✅ Deployed to Vercel
```

---

## 📊 الحالة بعد الإعداد:

| الخدمة | الحالة | الـ Action |
|--------|--------|----------|
| **GitHub** | ✅ Connected | No action needed |
| **Supabase** | ⏳ Waiting for secret | Add NEXT_PUBLIC_SUPABASE_* |
| **Vercel** | ⏳ Waiting for secrets | Add VERCEL_* |
| **Workflow** | ✅ Ready | Just add secrets |

---

## 🚀 بعد الإعداد:

كل push على `main` سيقوم بـ:
```
1. ✅ جلب الـ commits من GitHub
2. ✅ الاتصال بـ Supabase
3. ✅ بناء Next.js مع Supabase
4. ✅ بناء Android APK
5. ✅ Deploy إلى Vercel تلقائي
6. ✅ حفظ APK كـ artifact
```

---

## 🆘 إذا حدثت مشكلة:

1. افتح الـ workflow logs
2. ابحث عن: "Warning" أو "Error"
3. تحقق من الـ secrets الصحيحة

---

**⏱️ الوقت المتوقع:** 5 دقائق لإضافة الـ secrets
**🎯 النتيجة:** GitHub ✓ Vercel ✓ Supabase ✓ جميعاً متصلة
