package com.traestartzlum.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // تحسين أداء الـ WebView لضمان سرعة التحميل من Vercel
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            
            // تفعيل التخزين المؤقت لسرعة فتح التطبيق في المرات القادمة
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptEnabled(true);
            
            // تحسين أداء الرسوميات
            settings.setLoadsImagesAutomatically(true);
            settings.setBlockNetworkImage(false);
            
            // دعم التحميل السريع (Hardware Acceleration مفعل افتراضياً في AndroidManifest)
        }
    }
}
