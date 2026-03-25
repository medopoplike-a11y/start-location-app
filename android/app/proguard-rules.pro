# قواعد حماية الكود (ProGuard) لمشروع Start Location
# --------------------------------------------------

# حماية كلاسات Capacitor الأساسية لضمان عمل الجسر بين الويب والأندرويد
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.JSExport { *; }
-keep class com.getcapacitor.JSMethod { *; }
-keep class com.getcapacitor.NativePlugin { *; }
-keep class com.getcapacitor.Plugin { *; }
-keep class com.getcapacitor.PluginCall { *; }
-keep class com.getcapacitor.PluginMethod { *; }
-keep class com.getcapacitor.PluginRequestCodes { *; }
-keep class com.getcapacitor.PluginResult { *; }

# حماية واجهة WebView لضمان استقرار العرض
-keepclassmembers class fqcn.of.javascript.interface.for.webview {
   public *;
}

# حماية شاشة البداية (SplashScreen) الجديدة من أندرويد 12+
-keep class androidx.core.splashscreen.** { *; }
-keep class androidx.core.splashscreen.SplashScreen$Impl { *; }

# الحفاظ على معلومات أسطر الكود لتسهيل تتبع الأخطاء (Debugging)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# حماية موديلات البيانات الخاصة بـ Firebase (إذا تم استخدامها)
-keep class com.google.firebase.** { *; }

# منع حذف الدوال التي يتم استدعاؤها عبر التفكير (Reflection)
-keepattributes Signature
-keepattributes *Annotation*
