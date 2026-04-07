# GitHub Secrets المطلوبة لنشر التطبيق

## أسرار Supabase وVercel الأساسية

اضف هذه المتغيرات في `Settings > Secrets and variables > Actions` على GitHub:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## أسرار Android signing (لتوقيع APK في CI)

إذا تريد أن يبني GitHub Actions APK موقَّعًا، أضف أيضًا:

- `ANDROID_KEYSTORE_BASE64`
- `RELEASE_STORE_PASSWORD`
- `RELEASE_KEY_ALIAS`
- `RELEASE_KEY_PASSWORD`

## طريقة تحويل `keystore.jks` إلى Base64

على Windows PowerShell:

```powershell
cd C:\Users\Admin\Documents\trae_projects\start
[Convert]::ToBase64String([IO.File]::ReadAllBytes("keystore.jks")) | Out-File -Encoding ascii keystore-base64.txt
```

ثم افتح `keystore-base64.txt` وانسخ النص الناتج بالكامل إلى السر `ANDROID_KEYSTORE_BASE64`.

## إذا لم يكن لديك ملف keystore

- أنت بحاجة لإنشائه محليًا باستخدام `keytool`، أو استخدام ملف keystore موجود من بناء سابق.
- لا تضعه في المستودع العام. استخدم GitHub Secrets فقط.

## تذكير

- `start/.env.local` يستخدم للتشغيل المحلي فقط.
- أسرار GitHub ستستخدمها GitHub Actions أثناء النشر.

## أداة مساعدة لإضافة الأسرار تلقائيًا

يمكنك تشغيل السكربت التالي من داخل مجلد المشروع:

```powershell
cd C:\Users\Admin\Documents\trae_projects\start
.\scripts\set-github-secrets.ps1
```

السكربت يستخدم GitHub CLI (`gh`) لإضافة الأسرار المطلوبة بعد إدخال القيم.
