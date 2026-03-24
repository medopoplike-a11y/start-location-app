package com.traestartzlum.app;

import android.os.Bundle;
import android.view.View;
import android.os.Build;
import com.google.firebase.FirebaseApp;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        
        // حل جذري: تهيئة Firebase يدوياً لمنع الانهيار الموضح في التقرير
        try {
            FirebaseApp.initializeApp(this);
        } catch (Exception e) {
            // في حال فشل التهيئة، لا تدع التطبيق ينهار
        }

        super.onCreate(savedInstanceState);
        
        // منع الانهيار عند إدخال البيانات (Autofill crash fix)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            }
        }
    }
}
