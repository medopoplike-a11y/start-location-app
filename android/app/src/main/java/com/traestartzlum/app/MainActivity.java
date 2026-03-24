package com.traestartzlum.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.os.Build;
import android.view.View;
import android.view.WindowManager;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // 1. تثبيت الشاشة الافتتاحية
        SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        
        // 2. منع الانهيار بسبب لوحة المفاتيح وتحسين الرؤية
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            
            // 3. إعدادات الأمان والاستقرار (حل جذري للانهيار)
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setSupportMultipleWindows(false); // منع فتح نوافذ جديدة قد تسبب انهيارا
            settings.setAllowFileAccess(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            
            // تعطيل الملء التلقائي للنظام الذي يسبب كراش في بعض هواتف أندرويد 11+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            }

            // 4. تحسين الأداء الرسومي
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            
            // 5. حقن تصميم عصري (Glassmorphism UI)
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    
                    String modernCSS = 
                        "body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; min-height: 100vh !important; display: flex !important; align-items: center !important; justify-content: center !important; font-family: 'Segoe UI', Roboto, sans-serif !important; margin: 0 !important; }" +
                        "form, .login-container { background: rgba(255, 255, 255, 0.1) !important; backdrop-filter: blur(10px) !important; -webkit-backdrop-filter: blur(10px) !important; border-radius: 24px !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; padding: 40px !important; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37) !important; width: 85% !important; max-width: 400px !important; }" +
                        "input { background: rgba(255, 255, 255, 0.05) !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; border-radius: 12px !important; padding: 14px 20px !important; color: white !important; font-size: 16px !important; margin-bottom: 20px !important; width: 100% !important; box-sizing: border-box !important; transition: all 0.3s ease !important; outline: none !important; }" +
                        "input::placeholder { color: rgba(255, 255, 255, 0.6) !important; }" +
                        "input:focus { background: rgba(255, 255, 255, 0.1) !important; border-color: #fff !important; box-shadow: 0 0 15px rgba(255, 255, 255, 0.1) !important; }" +
                        "button { background: #fff !important; color: #764ba2 !important; border: none !important; border-radius: 12px !important; padding: 16px !important; width: 100% !important; font-size: 18px !important; font-weight: 700 !important; cursor: pointer !important; transition: all 0.3s ease !important; text-transform: uppercase !important; letter-spacing: 1px !important; margin-top: 10px !important; }" +
                        "button:active { transform: scale(0.95) !important; background: rgba(255, 255, 255, 0.9) !important; }";

                    view.evaluateJavascript("var style = document.createElement('style'); style.innerHTML = '" + modernCSS + "'; document.head.appendChild(style);", null);
                }
            });
        }
    }
}
