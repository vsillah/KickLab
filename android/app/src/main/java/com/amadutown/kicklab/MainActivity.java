package com.amadutown.kicklab;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        webView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface public void setHomeVisible(boolean visible) {
                runOnUiThread(() -> {
                    if (webView.getUrl() != null && webView.getUrl().startsWith("https://localhost/")) {
                        webView.setLayerType(visible ? View.LAYER_TYPE_SOFTWARE : View.LAYER_TYPE_HARDWARE, null);
                    }
                });
            }
        }, "KickLabHomePresentation");
    }
}
