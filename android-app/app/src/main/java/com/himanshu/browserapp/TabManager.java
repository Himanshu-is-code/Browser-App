package com.himanshu.browserapp;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import org.json.JSONObject;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** Owns the user-created website tabs rendered by Android WebView. */
public final class TabManager {
    private static final String TAG = "ColorOSBrowserTabs";
    private static TabManager instance;

    private final Activity activity;
    private final FrameLayout webHost;
    private final FrameLayout browserLayer;
    private final WebView shellWebView;
    private final CookieManager cookieManager;
    private final Map<String, BrowserTab> tabs = new LinkedHashMap<>();
    private String activeTabId;

    public static synchronized TabManager getInstance(
            Activity activity,
            FrameLayout webHost,
            FrameLayout browserLayer,
            WebView shellWebView) {
        if (instance == null) {
            instance = new TabManager(activity, webHost, browserLayer, shellWebView);
        }
        return instance;
    }

    private TabManager(Activity activity, FrameLayout webHost, FrameLayout browserLayer, WebView shellWebView) {
        this.activity = activity;
        this.webHost = webHost;
        this.browserLayer = browserLayer;
        this.shellWebView = shellWebView;
        cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
    }

    public boolean createTab(String id, String url, String title) {
        if (id == null || id.isEmpty() || !isHttpUrl(url)) return false;

        BrowserTab existing = tabs.get(id);
        if (existing != null) {
            existing.title = title == null ? existing.title : title;
            if (!url.equals(existing.url)) {
                existing.url = url;
                existing.lastScrollY = 0;
                if (existing.webView != null) existing.webView.loadUrl(url);
            }
            return true;
        }

        // Keep tab metadata only until the user selects it. WebViews are expensive
        // and are initialized on demand in switchToTab().
        tabs.put(id, new BrowserTab(id, title, url));
        return true;
    }

    private WebView createWebView(BrowserTab tab) {
        WebView webView = new WebView(activity);
        // Match the light shell while a newly loaded page paints its first frame.
        webView.setBackgroundColor(Color.rgb(243, 245, 247));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportMultipleWindows(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isHttpUrl(request.getUrl().toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String nextUrl) {
                return !isHttpUrl(nextUrl);
            }

            @Override
            public void onPageStarted(WebView view, String pageUrl, android.graphics.Bitmap favicon) {
                tab.loading = true;
                tab.url = pageUrl;
            }

            @Override
            public void onPageFinished(WebView view, String pageUrl) {
                tab.loading = false;
                tab.url = pageUrl;
                if (tab.lastScrollY > 0) {
                    int restoreScrollY = tab.lastScrollY;
                    webView.post(() -> webView.scrollTo(0, restoreScrollY));
                }
                String queuedPrompt = tab.pendingPrompt;
                if (queuedPrompt != null) {
                    tab.pendingPrompt = null;
                    injectPrompt(tab, queuedPrompt);
                }
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        tab.webView = webView;
        return webView;
    }

    public boolean updateTab(String id, String url, String title) {
        BrowserTab tab = tabs.get(id);
        if (tab == null) return false;
        if (title != null && !title.trim().isEmpty()) tab.title = title.trim();
        if (url == null || url.trim().isEmpty()) return true;
        String normalized = url.trim();
        if (!normalized.matches("(?i)^https?://.*")) normalized = "https://" + normalized;
        if (!isHttpUrl(normalized)) return false;
        tab.url = normalized;
        tab.lastScrollY = 0;
        if (tab.webView != null) tab.webView.loadUrl(normalized);
        return true;
    }

    public boolean switchToTab(String id) {
        BrowserTab tab = tabs.get(id);
        if (tab == null) return false;

        BrowserTab previous = findTab(activeTabId);
        if (previous != null && previous != tab) pauseTab(previous);

        WebView webView = tab.webView;
        if (webView == null) {
            webView = createWebView(tab);
            tab.loading = true;
            webView.loadUrl(tab.url);
        } else {
            webView.onResume();
        }

        activeTabId = id;
        webView.setVisibility(WebView.VISIBLE);
        ViewGroup parent = (ViewGroup) webView.getParent();
        if (parent == null) {
            webHost.addView(webView, new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT));
        }
        webView.bringToFront();
        shellWebView.setBackgroundColor(Color.TRANSPARENT);
        shellWebView.setVisibility(WebView.VISIBLE);
        shellWebView.evaluateJavascript(
                "window.dispatchEvent(new Event('browser:show-dock-overlay'));"
                        + "requestAnimationFrame(() => requestAnimationFrame(() => 'ready'))",
                result -> browserLayer.setVisibility(FrameLayout.VISIBLE));
        return true;
    }

    public boolean reloadTab(String id) {
        BrowserTab tab = findTab(id);
        if (tab == null) return false;
        if (tab.webView == null) return true;
        tab.webView.reload();
        return true;
    }

    public boolean closeTab(String id) {
        BrowserTab tab = tabs.remove(id);
        if (tab == null) return false;
        if (id.equals(activeTabId)) showShell();
        destroyWebView(tab);
        return true;
    }

    public boolean injectPromptToTab(String id, String prompt) {
        BrowserTab tab = findTab(id);
        if (tab == null || tab.webView == null || prompt == null || prompt.trim().isEmpty()
                || !supportsPromptInjection(tab.url)) {
            return false;
        }
        if (tab.loading || tab.webView.getProgress() < 100) {
            tab.pendingPrompt = prompt;
        } else {
            injectPrompt(tab, prompt);
        }
        return true;
    }

    private void injectPrompt(BrowserTab tab, String prompt) {
        String quoted = JSONObject.quote(prompt);
        String script = "(function(){"
                + "const text=" + quoted + ";"
                + "const visible=(e)=>!!(e&&e.getClientRects().length&&!e.disabled);"
                + "const selectors=['textarea','[contenteditable=true]','[role=textbox]'];"
                + "let input=null;for(const selector of selectors){input=[...document.querySelectorAll(selector)].find(visible);if(input)break;}"
                + "if(!input)return JSON.stringify({ok:false,reason:'prompt-field-not-found'});"
                + "input.focus();"
                + "if(input.isContentEditable||input.getAttribute('contenteditable')==='true'){input.textContent=text;}"
                + "else{const proto=input instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;"
                + "const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;if(setter)setter.call(input,text);else input.value=text;}"
                + "input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));"
                + "input.dispatchEvent(new Event('change',{bubbles:true}));"
                + "const buttons=[...document.querySelectorAll('button,[role=button]')];"
                + "const send=buttons.find(b=>visible(b)&&!b.disabled&&/send|submit/i.test((b.getAttribute('aria-label')||'')+' '+(b.getAttribute('data-testid')||'')+' '+(b.innerText||'')));"
                + "if(send){send.click();return JSON.stringify({ok:true,submitted:true});}"
                + "const form=input.closest('form');if(form){if(form.requestSubmit)form.requestSubmit();else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));return JSON.stringify({ok:true,submitted:true});}"
                + "input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));"
                + "return JSON.stringify({ok:true,submitted:false});})()";
        tab.webView.evaluateJavascript(script, result -> Log.d(TAG, "Prompt injection result: " + result));
    }

    public WebView getActiveWebView() {
        BrowserTab tab = findTab(activeTabId);
        return tab == null ? null : tab.webView;
    }

    public void showShell() {
        BrowserTab active = findTab(activeTabId);
        if (active != null) pauseTab(active);
        shellWebView.setVisibility(WebView.VISIBLE);
        shellWebView.setBackgroundColor(Color.rgb(243, 245, 247));
        shellWebView.evaluateJavascript(
                "window.dispatchEvent(new Event('browser:hide-dock-overlay'))", null);
        browserLayer.setVisibility(FrameLayout.GONE);
    }

    public void flushCookiesAndPause() {
        cookieManager.flush();
        for (BrowserTab tab : tabs.values()) pauseTab(tab);
    }

    public void resumeTabs() {
        BrowserTab active = findTab(activeTabId);
        for (BrowserTab tab : tabs.values()) {
            if (tab.webView == null) continue;
            if (tab == active && browserLayer.getVisibility() == FrameLayout.VISIBLE) {
                tab.webView.onResume();
                tab.webView.setVisibility(WebView.VISIBLE);
                tab.webView.bringToFront();
            } else {
                pauseTab(tab);
            }
        }
    }

    /** Release inactive renderer state when Android reports memory pressure. */
    public void trimMemory(int level) {
        if (level < android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW) return;
        for (BrowserTab tab : tabs.values()) {
            if (!tab.id.equals(activeTabId)) discardTabPage(tab);
        }
    }

    public void destroy() {
        for (BrowserTab tab : tabs.values()) {
            destroyWebView(tab);
        }
        tabs.clear();
        activeTabId = null;
        if (instance == this) instance = null;
    }

    private BrowserTab findTab(String id) {
        if (id != null && !id.isEmpty()) return tabs.get(id);
        return activeTabId == null ? null : tabs.get(activeTabId);
    }

    private void pauseTab(BrowserTab tab) {
        if (tab.webView == null) return;
        tab.lastScrollY = tab.webView.getScrollY();
        // Keep its measured surface attached so switching back to a cached page
        // does not detach and recreate its compositor layer.
        tab.webView.setVisibility(WebView.INVISIBLE);
        tab.webView.onPause();
    }

    private void discardTabPage(BrowserTab tab) {
        if (tab.webView == null) return;
        tab.lastScrollY = tab.webView.getScrollY();
        tab.url = tab.webView.getUrl() == null ? tab.url : tab.webView.getUrl();
        tab.pendingPrompt = null;
        destroyWebView(tab);
        tab.loading = false;
    }

    private void destroyWebView(BrowserTab tab) {
        WebView webView = tab.webView;
        if (webView == null) return;
        webView.stopLoading();
        webView.setWebViewClient(null);
        webView.setWebChromeClient(null);
        ViewGroup parent = (ViewGroup) webView.getParent();
        if (parent != null) parent.removeView(webView);
        webView.destroy();
        tab.webView = null;
    }

    private static boolean isHttpUrl(String value) {
        if (value == null) return false;
        try {
            String scheme = URI.create(value).getScheme();
            return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static boolean supportsPromptInjection(String value) {
        try {
            String host = URI.create(value).getHost();
            if (host == null) return false;
            host = host.toLowerCase(Locale.ROOT);
            return host.equals("gemini.google.com") || host.endsWith(".gemini.google.com")
                    || host.equals("chat.deepseek.com") || host.equals("deepseek.com") || host.endsWith(".deepseek.com")
                    || host.equals("chatgpt.com") || host.endsWith(".chatgpt.com")
                    || host.equals("chat.openai.com") || host.endsWith(".openai.com")
                    || host.equals("claude.ai") || host.endsWith(".claude.ai");
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static final class BrowserTab {
        final String id;
        String title;
        String url;
        WebView webView;
        boolean loading = true;
        String pendingPrompt;
        int lastScrollY;

        BrowserTab(String id, String title, String url) {
            this.id = id;
            this.title = title;
            this.url = url;
        }
    }
}
