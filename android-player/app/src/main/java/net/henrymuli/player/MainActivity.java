package net.henrymuli.player;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import android.view.Gravity;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private FrameLayout root;
    private WebView webView;
    private LinearLayout pipPanel;
    private TextView trackLabel;
    private Button floatButton;
    private String currentTitle = "Project Henry Music";
    private String currentArtist = "Music Hub";
    private boolean pageReady = false;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(3, 5, 13));

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportMultipleWindows(false);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                pageReady = true;
                super.onPageFinished(view, url);
            }
        });
        webView.addJavascriptInterface(new NativeBridge(), "ProjectHenryNative");
        root.addView(webView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));

        floatButton = new Button(this);
        floatButton.setText("↗ FLOAT");
        floatButton.setTextColor(Color.WHITE);
        floatButton.setTextSize(12);
        floatButton.setAllCaps(false);
        floatButton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(27, 150, 185)));
        FrameLayout.LayoutParams floatParams = new FrameLayout.LayoutParams(
                dp(100), dp(48), Gravity.BOTTOM | Gravity.END);
        floatParams.setMargins(0, 0, dp(16), dp(24));
        root.addView(floatButton, floatParams);
        floatButton.setOnClickListener(v -> enterFloatingMode());

        pipPanel = buildPipPanel();
        pipPanel.setVisibility(View.GONE);
        FrameLayout.LayoutParams panelParams = new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT);
        root.addView(pipPanel, panelParams);
        setContentView(root);

        webView.loadUrl("https://henrymuli.pages.dev/music.html");
    }

    private LinearLayout buildPipPanel() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(12), dp(8), dp(12), dp(8));
        panel.setBackgroundColor(Color.rgb(4, 9, 24));
        panel.setElevation(dp(12));

        TextView brand = new TextView(this);
        brand.setText("PROJECT HENRY  •  MUSIC");
        brand.setTextColor(Color.rgb(82, 232, 255));
        brand.setTextSize(10);
        brand.setGravity(Gravity.CENTER);
        panel.addView(brand, new LinearLayout.LayoutParams(-1, dp(20)));

        trackLabel = new TextView(this);
        trackLabel.setText(currentTitle);
        trackLabel.setTextColor(Color.WHITE);
        trackLabel.setTextSize(13);
        trackLabel.setGravity(Gravity.CENTER);
        trackLabel.setMaxLines(2);
        panel.addView(trackLabel, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout controls = new LinearLayout(this);
        controls.setGravity(Gravity.CENTER);
        controls.setOrientation(LinearLayout.HORIZONTAL);
        Button previous = controlButton("⏮");
        Button play = controlButton("▶ / Ⅱ");
        Button next = controlButton("⏭");
        Button close = controlButton("×");
        controls.addView(previous, new LinearLayout.LayoutParams(0, dp(42), 1));
        controls.addView(play, new LinearLayout.LayoutParams(0, dp(42), 1.3f));
        controls.addView(next, new LinearLayout.LayoutParams(0, dp(42), 1));
        controls.addView(close, new LinearLayout.LayoutParams(0, dp(42), 0.8f));
        panel.addView(controls, new LinearLayout.LayoutParams(-1, dp(46)));

        previous.setOnClickListener(v -> runPlayerCommand("previous"));
        play.setOnClickListener(v -> runPlayerCommand("toggle"));
        next.setOnClickListener(v -> runPlayerCommand("next"));
        close.setOnClickListener(v -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode()) {
                finish();
            } else {
                pipPanel.setVisibility(View.GONE);
            }
        });
        return panel;
    }

    private Button controlButton(String label) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(Color.WHITE);
        button.setTextSize(12);
        button.setAllCaps(false);
        button.setPadding(dp(2), 0, dp(2), 0);
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(Color.rgb(18, 35, 65)));
        return button;
    }

    private void enterFloatingMode() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        pipPanel.setVisibility(View.VISIBLE);
        pipPanel.bringToFront();
        PictureInPictureParams params = new PictureInPictureParams.Builder()
                .setAspectRatio(new Rational(16, 9))
                .build();
        enterPictureInPictureMode(params);
    }

    private void runPlayerCommand(String command) {
        if (!pageReady || webView == null) return;
        webView.evaluateJavascript(
                "if(window.ProjectHenryPlayer && window.ProjectHenryPlayer['" + command + "'])" +
                "window.ProjectHenryPlayer['" + command + "']();", null);
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    @Override
    public void onPictureInPictureModeChanged(boolean inPip, Configuration newConfig) {
        super.onPictureInPictureModeChanged(inPip, newConfig);
        if (inPip) {
            pipPanel.setVisibility(View.VISIBLE);
            pipPanel.bringToFront();
            floatButton.setVisibility(View.GONE);
        } else {
            pipPanel.setVisibility(View.GONE);
            floatButton.setVisibility(View.VISIBLE);
        }
    }

    @Override
    public void onBackPressed() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode()) {
            finish();
            return;
        }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private class NativeBridge {
        @JavascriptInterface
        public void onTrackChanged(String title, String artist) {
            currentTitle = title == null ? "Project Henry Music" : title;
            currentArtist = artist == null ? "YouTube" : artist;
            runOnUiThread(() -> {
                if (trackLabel != null) trackLabel.setText(currentTitle + "\n" + currentArtist);
            });
        }
    }
}
