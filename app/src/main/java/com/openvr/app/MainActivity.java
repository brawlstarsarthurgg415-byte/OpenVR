package com.openvr.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Matrix;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.ComponentActivity;
import androidx.annotation.NonNull;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.framework.image.MPImage;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.vision.core.RunningMode;
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker;
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends ComponentActivity {
    private static final int CAMERA_PERMISSION = 41;
    private WebView webView;
    private WebViewAssetLoader assetLoader;
    private ExecutorService cameraExecutor;
    private ProcessCameraProvider cameraProvider;
    private ImageAnalysis imageAnalysis;
    private HandLandmarker handLandmarker;
    private final AtomicBoolean tracking = new AtomicBoolean(false);
    private long lastTimestamp = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        cameraExecutor = Executors.newSingleThreadExecutor();
        assetLoader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();

        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(true);
        webView.addJavascriptInterface(new OpenVRBridge(), "OpenVRNative");
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public android.webkit.WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });
        setContentView(webView);
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
    }

    private class OpenVRBridge {
        @JavascriptInterface public void startHandTracking() {
            runOnUiThread(() -> {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                    != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION);
                } else {
                    startCameraPipeline();
                }
            });
        }
        @JavascriptInterface public void stopHandTracking() {
            runOnUiThread(() -> stopCameraPipeline());
        }
        @JavascriptInterface public boolean isNativeAvailable() { return true; }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCameraPipeline();
            } else {
                sendStatus("permission_denied", "Permissão da câmera não concedida.");
            }
        }
    }

    private void startCameraPipeline() {
        if (tracking.get()) return;
        tracking.set(true);
        sendStatus("loading", "Preparando reconhecimento de mãos...");
        cameraExecutor.execute(() -> {
            try {
                if (handLandmarker == null) {
                    BaseOptions baseOptions = BaseOptions.builder()
                        .setModelAssetPath("hand_landmarker.task")
                        .build();
                    HandLandmarker.HandLandmarkerOptions options =
                        HandLandmarker.HandLandmarkerOptions.builder()
                            .setBaseOptions(baseOptions)
                            .setRunningMode(RunningMode.LIVE_STREAM)
                            .setNumHands(2)
                            .setMinHandDetectionConfidence(0.55f)
                            .setMinHandPresenceConfidence(0.5f)
                            .setMinTrackingConfidence(0.5f)
                            .setResultListener(this::onHandResult)
                            .setErrorListener(error -> sendStatus("error", error.getMessage()))
                            .build();
                    handLandmarker = HandLandmarker.createFromOptions(this, options);
                }
                ListenableFuture<ProcessCameraProvider> future = ProcessCameraProvider.getInstance(this);
                future.addListener(() -> {
                    try {
                        cameraProvider = future.get();
                        imageAnalysis = new ImageAnalysis.Builder()
                            .setTargetResolution(new android.util.Size(640, 480))
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                            .build();
                        imageAnalysis.setAnalyzer(cameraExecutor, this::analyzeFrame);
                        CameraSelector selector = CameraSelector.DEFAULT_FRONT_CAMERA;
                        cameraProvider.unbindAll();
                        cameraProvider.bindToLifecycle(MainActivity.this, selector, imageAnalysis);
                        sendStatus("active", "Câmera ativa — mostre sua mão.");
                    } catch (Exception e) {
                        tracking.set(false);
                        sendStatus("error", "Não foi possível iniciar a câmera: " + e.getMessage());
                    }
                }, ContextCompat.getMainExecutor(this));
            } catch (Exception e) {
                tracking.set(false);
                sendStatus("error", "Falha ao carregar o modelo de mãos: " + e.getMessage());
            }
        });
    }

    private void analyzeFrame(ImageProxy image) {
        try {
            if (!tracking.get() || handLandmarker == null) return;
            ImageProxy.PlaneProxy plane = image.getPlanes()[0];
            ByteBuffer buffer = plane.getBuffer();
            buffer.rewind();
            Bitmap raw = Bitmap.createBitmap(image.getWidth(), image.getHeight(), Bitmap.Config.ARGB_8888);
            raw.copyPixelsFromBuffer(buffer);
            Matrix matrix = new Matrix();
            matrix.postRotate(image.getImageInfo().getRotationDegrees());
            // Mirror the front-camera view so hand movement matches the on-screen cursor.
            matrix.postScale(-1f, 1f);
            Bitmap oriented = Bitmap.createBitmap(raw, 0, 0, raw.getWidth(), raw.getHeight(), matrix, true);
            raw.recycle();
            MPImage mpImage = new BitmapImageBuilder(oriented).build();
            long timestamp = Math.max(System.currentTimeMillis(), lastTimestamp + 1);
            lastTimestamp = timestamp;
            handLandmarker.detectAsync(mpImage, timestamp);
            image.close();
            oriented.recycle();
        } catch (Exception e) {
            image.close();
        }
    }

    private void onHandResult(HandLandmarkerResult result, MPImage input) {
        try {
            JSONArray hands = new JSONArray();
            for (int h = 0; h < result.landmarks().size(); h++) {
                JSONArray points = new JSONArray();
                for (int i = 0; i < result.landmarks().get(h).size(); i++) {
                    JSONObject point = new JSONObject();
                    point.put("x", result.landmarks().get(h).get(i).x());
                    point.put("y", result.landmarks().get(h).get(i).y());
                    point.put("z", result.landmarks().get(h).get(i).z());
                    points.put(point);
                }
                hands.put(points);
            }
            JSONObject payload = new JSONObject();
            payload.put("hands", hands);
            payload.put("timestamp", System.currentTimeMillis());
            String js = "window.OpenVR && window.OpenVR.onHandFrame(" + payload + ")";
            runOnUiThread(() -> { if (webView != null) webView.evaluateJavascript(js, null); });
        } catch (Exception ignored) { }
    }

    private void sendStatus(String state, String message) {
        try {
            JSONObject data = new JSONObject();
            data.put("state", state);
            data.put("message", message == null ? "" : message);
            String js = "window.OpenVR && window.OpenVR.onHandStatus(" + data + ")";
            runOnUiThread(() -> { if (webView != null) webView.evaluateJavascript(js, null); });
        } catch (Exception ignored) { }
    }

    private void stopCameraPipeline() {
        tracking.set(false);
        if (cameraProvider != null) cameraProvider.unbindAll();
        if (handLandmarker != null) {
            cameraExecutor.execute(() -> {
                try { handLandmarker.close(); } catch (Exception ignored) { }
                handLandmarker = null;
            });
        }
        sendStatus("stopped", "Reconhecimento de mãos desligado.");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        stopCameraPipeline();
        if (webView != null) webView.destroy();
        if (cameraExecutor != null) cameraExecutor.shutdown();
        super.onDestroy();
    }
}