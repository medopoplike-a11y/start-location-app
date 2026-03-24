package com.traestartzlum.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.os.Build;
import android.view.View;
import android.view.WindowManager;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        
        // ضمان استقرار لوحة المفاتيح عند إدخال الحساب
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            
            // تفعيل المزامنة الكاملة مع Vercel و Supabase
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            
            // حل مشكلة الانهيار عند إدخال البيانات (التعطيل النهائي للـ Autofill)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            }

            // تمكين تصحيح الأخطاء لضمان المزامنة
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
