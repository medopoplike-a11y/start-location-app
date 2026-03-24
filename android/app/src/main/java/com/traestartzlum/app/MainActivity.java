package com.traestartzlum.app;

import android.os.Bundle;
import android.view.View;
import android.os.Build;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
        
        // الحل الجذري لمنع الانهيار عند إدخال البيانات
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
            }
        }
    }
}
