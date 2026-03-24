package com.traestartzlum.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.os.Build;
import android.view.View;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();
            
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);
            }

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    // حقن CSS عصري لتحسين مظهر صفحة تسجيل الدخول
                    String css = "input { border-radius: 12px !important; padding: 12px !important; border: 1px solid #ddd !important; margin-bottom: 10px !important; width: 100% !important; box-sizing: border-box !important; font-family: sans-serif !important; }" +
                                 "button { background: linear-gradient(45deg, #2196F3, #21CBF3) !important; color: white !important; border-radius: 12px !important; padding: 15px !important; border: none !important; width: 100% !important; font-weight: bold !important; box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3) !important; cursor: pointer !important; transition: transform 0.2s !important; }" +
                                 "button:active { transform: scale(0.98) !important; }" +
                                 "body { background-color: #f8f9fa !important; padding: 20px !important; }";
                    
                    view.evaluateJavascript("var style = document.createElement('style'); style.innerHTML = '" + css + "'; document.head.appendChild(style);", null);
                }
            });
        }
    }
}
