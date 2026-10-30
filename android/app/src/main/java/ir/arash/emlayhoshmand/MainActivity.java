package ir.arash.emlayhoshmand;

import android.app.Activity;
import android.os.Bundle;
import android.content.Context;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;
import android.graphics.Color;
import android.os.Build;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import java.util.Locale;

public class MainActivity extends Activity {
    private WebView webView;
    private TextToSpeech textToSpeech;
    private boolean ttsReady = false;
    private String ttsLanguageMessage = "در حال آماده‌سازی صدای فارسی…";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(245, 247, 252));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        webView.addJavascriptInterface(new PrintBridge(), "AndroidPrint");
        webView.addJavascriptInterface(new SpeechBridge(), "AndroidTTS");
        initializeTextToSpeech();
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        setContentView(webView);
        if (savedInstanceState == null) {
            webView.loadUrl("file:///android_asset/www/index.html");
        } else {
            webView.restoreState(savedInstanceState);
        }
    }


    private void initializeTextToSpeech() {
        textToSpeech = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS || textToSpeech == null) {
                ttsReady = false;
                ttsLanguageMessage = "موتور گفتار گوشی در دسترس نیست.";
                return;
            }
            int language = textToSpeech.setLanguage(new Locale("fa", "IR"));
            if (language == TextToSpeech.LANG_MISSING_DATA || language == TextToSpeech.LANG_NOT_SUPPORTED)
                language = textToSpeech.setLanguage(new Locale("fa"));
            ttsReady = language != TextToSpeech.LANG_MISSING_DATA && language != TextToSpeech.LANG_NOT_SUPPORTED;
            ttsLanguageMessage = ttsReady ? "صدای فارسی آماده است." : "صدای فارسی روی گوشی نصب یا پشتیبانی نمی‌شود؛ از تنظیمات تبدیل متن به گفتار، صدای فارسی را نصب کنید.";
            textToSpeech.setSpeechRate(0.82f);
            textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { notifySpeech("start"); }
                @Override public void onDone(String id) { notifySpeech("done"); }
                @Override public void onError(String id) { notifySpeech("error"); }
            });
        });
    }
    private void notifySpeech(String event) {
        runOnUiThread(() -> {
            if (webView != null) webView.evaluateJavascript("window.EMLAY_NATIVE_SPEECH_EVENT && window.EMLAY_NATIVE_SPEECH_EVENT('" + event + "','')", null);
        });
    }
    public class SpeechBridge {
        @JavascriptInterface public boolean isReady() { return ttsReady; }
        @JavascriptInterface public String status() { return ttsLanguageMessage; }
        @JavascriptInterface public boolean speak(String text, float rate) {
            if (!ttsReady || textToSpeech == null || text == null || text.trim().isEmpty()) return false;
            runOnUiThread(() -> {
                if (textToSpeech != null) {
                    textToSpeech.stop();
                    textToSpeech.setSpeechRate(Math.max(0.55f, Math.min(1.15f, rate)));
                    textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "emlay-" + System.currentTimeMillis());
                }
            });
            return true;
        }
        @JavascriptInterface public void stop() { runOnUiThread(() -> { if (textToSpeech != null) textToSpeech.stop(); }); }
    }

    public class PrintBridge {
        @JavascriptInterface
        public void print() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT && webView != null) {
                    PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                    PrintDocumentAdapter adapter = webView.createPrintDocumentAdapter("گزارش پیشرفت املای هوشمند");
                    PrintAttributes attributes = new PrintAttributes.Builder()
                        .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                        .setResolution(new PrintAttributes.Resolution("report", "گزارش", 300, 300))
                        .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                        .build();
                    printManager.print("گزارش املای هوشمند", adapter, attributes);
                }
            });
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}