package com.himanshu.browserapp;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.RectF;
import android.os.Build;
import android.os.Bundle;
import android.net.Uri;
import android.util.Log;
import android.view.HapticFeedbackConstants;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.widget.FrameLayout;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends Activity {
    static {
        System.loadLibrary("native-lib");
    }

    private OverlayTouchWebView shellWebView;
    private FrameLayout browserLayer;
    private TabManager tabManager;

    private native String nativeDispatchPayload(String json);

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
        );

        FrameLayout root = new FrameLayout(this);
        browserLayer = new FrameLayout(this);
        browserLayer.setBackgroundColor(Color.rgb(243, 245, 247));
        // Native pages sit below Android's status bar and above its gesture area;
        // the transparent React dock remains full-screen on top of this layer.
        browserLayer.setPadding(0, getStatusBarHeight(), 0, getNavigationBarHeight());
        browserLayer.setVisibility(View.GONE);
        FrameLayout browserWebHost = new FrameLayout(this);
        browserLayer.addView(browserWebHost, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        root.addView(browserLayer, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        shellWebView = new OverlayTouchWebView(this);
        shellWebView.setBackgroundColor(Color.rgb(243, 245, 247));
        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        shellWebView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return assetLoader.shouldInterceptRequest(Uri.parse(url));
            }
        });
        shellWebView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                Log.e("ShellWebView", message.message() + " (line " + message.lineNumber() + ")");
                return true;
            }
        });
        shellWebView.addJavascriptInterface(new CppEngineBridge(), "CppEngine");
        WebSettings settings = shellWebView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        root.addView(shellWebView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT));

        tabManager = TabManager.getInstance(this, browserWebHost, browserLayer, shellWebView);
        setContentView(root);
        shellWebView.loadUrl("https://appassets.androidplatform.net/index.html");
    }

    /** Called from JNI after the native router parses the requested action. */
    public boolean handleNativeCommand(
            String action, String tabId, String url, String title, String rawPayload) {
        if (action == null) return false;
        final String command = action.toUpperCase();
        final String id = tabId == null ? "" : tabId;
        final String targetUrl = url == null ? "" : url;
        final String tabTitle = title == null ? "" : title;
        final String payload = rawPayload == null ? "{}" : rawPayload;

        switch (command) {
            case "CREATE_TAB":
            case "SWITCH_TAB":
            case "RELOAD_TAB":
            case "CLOSE_TAB":
            case "UPDATE_TAB":
            case "INJECT_PROMPT":
            case "INJECT_DOM_PROMPT":
                CountDownLatch completed = new CountDownLatch(1);
                AtomicBoolean accepted = new AtomicBoolean(false);
                runOnUiThread(() -> {
                    try {
                        accepted.set(dispatchToTabManager(command, id, targetUrl, tabTitle, payload));
                    } finally {
                        completed.countDown();
                    }
                });
                try {
                    return completed.await(2, TimeUnit.SECONDS) && accepted.get();
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            default:
                return false;
        }
    }

    private boolean dispatchToTabManager(String action, String tabId, String url, String title, String rawPayload) {
        switch (action) {
            case "CREATE_TAB":
                return tabManager.createTab(tabId, url, title);
            case "SWITCH_TAB":
                return tabManager.switchToTab(tabId);
            case "RELOAD_TAB":
                return tabManager.reloadTab(tabId);
            case "CLOSE_TAB":
                return tabManager.closeTab(tabId);
            case "UPDATE_TAB":
                return tabManager.updateTab(tabId, url, title);
            case "INJECT_PROMPT":
            case "INJECT_DOM_PROMPT":
                String prompt = readPrompt(rawPayload);
                return tabManager.injectPromptToTab(tabId, prompt);
            default:
                return false;
        }
    }

    private String readPrompt(String rawPayload) {
        try {
            JSONObject request = new JSONObject(rawPayload);
            String prompt = request.optString("promptText", request.optString("prompt", ""));
            if (!prompt.isEmpty()) return prompt;
            JSONObject payload = request.optJSONObject("payload");
            return payload == null ? "" : payload.optString("promptText", payload.optString("prompt", ""));
        } catch (JSONException exception) {
            return "";
        }
    }

    @Override
    public void onBackPressed() {
        if (browserLayer != null && browserLayer.getVisibility() == View.VISIBLE) {
            WebView activePage = tabManager == null ? null : tabManager.getActiveWebView();
            if (activePage != null && activePage.canGoBack()) {
                activePage.goBack();
            } else if (tabManager != null) {
                tabManager.showShell();
            }
        } else if (shellWebView != null && shellWebView.canGoBack()) {
            shellWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        if (shellWebView != null) shellWebView.onPause();
        if (tabManager != null) tabManager.flushCookiesAndPause();
        // WebView's JavaScript timer pause is process-wide, so only use it while
        // the whole app is backgrounded (never while switching between tabs).
        if (shellWebView != null) shellWebView.pauseTimers();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (shellWebView != null) shellWebView.onResume();
        if (shellWebView != null) shellWebView.resumeTimers();
        if (tabManager != null) tabManager.resumeTabs();
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (tabManager != null) tabManager.trimMemory(level);
    }

    @Override
    public void onLowMemory() {
        super.onLowMemory();
        if (tabManager != null) {
            tabManager.trimMemory(android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL);
        }
    }

    @Override
    protected void onDestroy() {
        if (tabManager != null) tabManager.destroy();
        if (shellWebView != null) {
            shellWebView.stopLoading();
            shellWebView.removeJavascriptInterface("CppEngine");
            shellWebView.destroy();
        }
        super.onDestroy();
    }

    private int getBatteryLevel() {
        Intent battery = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        if (battery == null) return -1;
        int level = battery.getIntExtra("level", -1);
        int scale = battery.getIntExtra("scale", -1);
        if (level < 0 || scale <= 0) return -1;
        return Math.round(level * 100f / scale);
    }

    private int getStatusBarHeight() {
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        return resourceId > 0 ? getResources().getDimensionPixelSize(resourceId) : 0;
    }

    private int getNavigationBarHeight() {
        int resourceId = getResources().getIdentifier("navigation_bar_height", "dimen", "android");
        return resourceId > 0 ? getResources().getDimensionPixelSize(resourceId) : 0;
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private final class CppEngineBridge {
        @JavascriptInterface
        public String dispatch(String json) {
            return nativeDispatchPayload(json == null ? "{}" : json);
        }

        @JavascriptInterface
        public void showShellPage() {
            runOnUiThread(() -> {
                if (tabManager != null) tabManager.showShell();
            });
        }

        @JavascriptInterface
        public void setDockHitRegion(double left, double top, double right, double bottom, boolean passThroughOutside) {
            runOnUiThread(() -> shellWebView.setDockHitRegion(
                    (float) left, (float) top, (float) right, (float) bottom, passThroughOutside));
        }

        @JavascriptInterface
        public String executeIpcCommand(String command, String payloadJson) {
            try {
                JSONObject request = payloadJson == null ? new JSONObject() : new JSONObject(payloadJson);
                request.put("command", command);
                return nativeDispatchPayload(request.toString());
            } catch (JSONException exception) {
                return nativeDispatchPayload("{\"command\":\"" + command + "\"}");
            }
        }

        @JavascriptInterface
        public String getSystemTelemetry() {
            JSONObject telemetry = new JSONObject();
            try {
                telemetry.put("deviceModel", Build.MANUFACTURER + " " + Build.MODEL);
                telemetry.put("androidVersion", Build.VERSION.RELEASE);
                telemetry.put("refreshRate", getWindowManager().getDefaultDisplay().getRefreshRate());
                telemetry.put("screenResolution",
                        getResources().getDisplayMetrics().widthPixels + "x"
                                + getResources().getDisplayMetrics().heightPixels);
                telemetry.put("batteryLevel", getBatteryLevel());
                telemetry.put("isCharging", false);
                telemetry.put("networkStatus", "AVAILABLE");
                telemetry.put("thermalStatus", "UNKNOWN");
                telemetry.put("timestamp", System.currentTimeMillis());
            } catch (JSONException ignored) {
                // These constant keys are valid, so this is only a defensive fallback.
            }
            return telemetry.toString();
        }

        @JavascriptInterface
        public void performHapticFeedback(String pattern) {
            if (shellWebView != null) {
                shellWebView.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP);
            }
        }
    }

    /** Lets website gestures pass through the transparent shell except where its dock is drawn. */
    private final class OverlayTouchWebView extends WebView {
        private final RectF dockTouchRegion = new RectF();
        private boolean passThroughOutsideDock;

        OverlayTouchWebView(Context context) {
            super(context);
        }

        void setDockHitRegion(float left, float top, float right, float bottom, boolean passThroughOutside) {
            float density = getResources().getDisplayMetrics().density;
            float padding = dp(10);
            dockTouchRegion.set(
                    left * density - padding,
                    top * density - padding,
                    right * density + padding,
                    bottom * density + padding);
            passThroughOutsideDock = passThroughOutside;
        }

        @Override
        public boolean dispatchTouchEvent(MotionEvent event) {
            if (passThroughOutsideDock
                    && event.getActionMasked() == MotionEvent.ACTION_DOWN
                    && !dockTouchRegion.contains(event.getX(), event.getY())) {
                return false;
            }
            return super.dispatchTouchEvent(event);
        }
    }
}
