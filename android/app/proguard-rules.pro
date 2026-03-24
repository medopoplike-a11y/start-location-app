# قواعد حماية Capacitor من الحذف العشوائي عند البناء
-keep class com.getcapacitor.** { *; }
-keep  class * extends com.getcapacitor.BridgeActivity
-keep  class * extends com.getcapacitor.Plugin
-keep  class * extends com.getcapacitor.annotation.CapacitorPlugin
-keep  class * extends com.getcapacitor.annotation.Permission

# حماية الـ WebView وواجهاته
-keepclassmembers class * {
  @android.webkit.JavascriptInterface <methods>;
}

# حماية مكتبة Splash Screen الجديدة
-keep class androidx.core.splashscreen.** { *; }
-dontwarn androidx.core.splashscreen.**
