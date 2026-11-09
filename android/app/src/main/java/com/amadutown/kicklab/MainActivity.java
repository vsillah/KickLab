package com.amadutown.kicklab;

import com.getcapacitor.BridgeActivity;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
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
    }
}
