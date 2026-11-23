package com.amadutown.kicklab;

import com.getcapacitor.BridgeActivity;
import android.content.res.Configuration;
import android.database.ContentObserver;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    private ContentObserver motionObserver;
    private Boolean lastReducedMotion;

    private boolean isReducedMotion() {
        return Settings.Global.getFloat(getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
            || Settings.Global.getFloat(getContentResolver(), Settings.Global.TRANSITION_ANIMATION_SCALE, 1f) == 0f
            || Settings.Global.getFloat(getContentResolver(), Settings.Global.WINDOW_ANIMATION_SCALE, 1f) == 0f;
    }

    private void syncReducedMotion(WebView webView) {
        boolean reduced = isReducedMotion();
        if (lastReducedMotion != null && lastReducedMotion == reduced) return;
        lastReducedMotion = reduced;
        if (webView.getUrl() != null && webView.getUrl().startsWith("https://localhost/")) {
            webView.evaluateJavascript("window.KickLabAndroidMotionChanged?.(" + reduced + ")", null);
        }
    }

    @Override public void onResume() {
        super.onResume();
        if (getBridge() != null) syncReducedMotion(getBridge().getWebView());
    }

    @Override public void onDestroy() {
        if (motionObserver != null) getContentResolver().unregisterContentObserver(motionObserver);
        super.onDestroy();
    }

    @Override public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // This activity retains its WebView across rotation. The configuration
        // callback precedes the resized view layout, so repaint after that size
        // change instead of invalidating the old surface synchronously.
        WebView webView = getBridge().getWebView();
        webView.addOnLayoutChangeListener(new View.OnLayoutChangeListener() {
            @Override public void onLayoutChange(View view, int left, int top, int right, int bottom,
                int oldLeft, int oldTop, int oldRight, int oldBottom) {
                if (right - left == oldRight - oldLeft && bottom - top == oldBottom - oldTop) return;
                view.removeOnLayoutChangeListener(this);
                webView.postVisualStateCallback(0, new WebView.VisualStateCallback() {
                    @Override public void onComplete(long requestId) {
                        webView.postInvalidateOnAnimation();
                    }
                });
            }
        });
    }

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public boolean isReducedMotion() { return MainActivity.this.isReducedMotion(); }
        }, "KickLabAndroidMotion");
        motionObserver = new ContentObserver(new Handler(Looper.getMainLooper())) {
            @Override public void onChange(boolean selfChange) { syncReducedMotion(webView); }
        };
        for (String key : new String[] { Settings.Global.ANIMATOR_DURATION_SCALE,
                Settings.Global.TRANSITION_ANIMATION_SCALE, Settings.Global.WINDOW_ANIMATION_SCALE }) {
            getContentResolver().registerContentObserver(Settings.Global.getUriFor(key), false, motionObserver);
        }
        syncReducedMotion(webView);
        webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void setHomeVisible(boolean visible) {
                runOnUiThread(() -> {
                    if (webView.getUrl() != null && webView.getUrl().startsWith("https://localhost/")) {
                        // A forced hardware View layer can leave WebView's compositor behind
                        // the launch splash when Race opens. NONE restores normal accelerated
                        // WebView drawing, including its WebGL canvas.
                        webView.setLayerType(visible ? View.LAYER_TYPE_SOFTWARE : View.LAYER_TYPE_NONE, null);
                    }
                });
            }
        }, "KickLabHomePresentation");
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public float topInsetCssPx() {
                WindowInsets insets = webView.getRootWindowInsets();
                if (insets == null) return 0;
                int top;
                if (android.os.Build.VERSION.SDK_INT >= 30) {
                    top = insets.getInsetsIgnoringVisibility(
                        WindowInsets.Type.statusBars() | WindowInsets.Type.displayCutout()).top;
                } else {
                    top = Math.max(insets.getStableInsetTop(), insets.getSystemWindowInsetTop());
                }
                return top / webView.getResources().getDisplayMetrics().density;
            }
        }, "KickLabAndroidSafeArea");
    }
}
