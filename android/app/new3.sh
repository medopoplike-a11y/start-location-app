sh
# 1. العودة للمجلد الرئيسي (إذا كنت لا تزال في android/app)
cd ../..

# 2. إضافة كافة الإصلاحات البرمجية الجديدة
git add .

# 3. الرفع لـ GitHub لبدء البناء التلقائي
git commit -m "🛠️ إ
صلاح أخطاء البناء وتفعيل الـ Static Export بنجاح"
git push origin mainsh
# 1. إضافة ملف الأتمتة المحدث
git add .github/workflows/android.yml

# 2. رفع كافة التعديلات لـ GitHubgit commit -m "🚀 تفعيل الأتمتة وبناء APK المتصل بـ Supabase"
git push origin main