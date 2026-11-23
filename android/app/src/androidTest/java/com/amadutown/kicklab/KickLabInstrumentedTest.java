package com.amadutown.kicklab;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.webkit.WebView;
import android.view.View;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.TrafficStats;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.lifecycle.Lifecycle;

import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class KickLabInstrumentedTest {
    private static final long TIMEOUT_SECONDS = 20;

    private ActivityScenario<MainActivity> launchForegroundScenario() throws Exception {
        ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class);
        // On the physical Pixel, the instrumentation launch is immediately moved
        // behind Home. Explicitly foreground the existing singleTask activity.
        try (android.os.ParcelFileDescriptor command = InstrumentationRegistry.getInstrumentation()
            .getUiAutomation().executeShellCommand(
                "am start -W -n com.amadutown.kicklab/.MainActivity")) {
            assertTrue("Could not foreground the packaged activity", command != null);
        }
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(TIMEOUT_SECONDS);
        while (System.nanoTime() < deadline) {
            if (scenario.getState() == Lifecycle.State.RESUMED) return scenario;
            Thread.sleep(100);
        }
        scenario.close();
        throw new AssertionError("Packaged activity did not stay foreground after explicit launch");
    }

    private String evaluate(ActivityScenario<MainActivity> scenario, String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>("null");
        scenario.onActivity(activity -> {
            WebView webView = activity.getBridge().getWebView();
            webView.evaluateJavascript(script, value -> {
                result.set(value);
                latch.countDown();
            });
        });
        assertTrue("JavaScript result timed out", latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS));
        return result.get();
    }

    private String waitForKickLab(ActivityScenario<MainActivity> scenario) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(TIMEOUT_SECONDS);
        String result = "null";
        while (System.nanoTime() < deadline) {
            result = evaluate(scenario,
                "JSON.stringify({title:document.title,ready:!!(window.KickLabMobileLifecycle&&window.KickLabProfiles),artifact:document.querySelector('meta[name=kicklab-artifact]')?.content||''})");
            if (result.contains("\\\"ready\\\":true")) return result;
            Thread.sleep(150);
        }
        return result;
    }

    private void completeFirstRunIfNeeded(ActivityScenario<MainActivity> scenario) throws Exception {
        String state = evaluate(scenario,
            "(()=>{if(document.documentElement.dataset.kicklabIntro!=='first-run')return 'ready';" +
                "document.querySelector('#introContinue').click();" +
                "document.querySelector('#profileNickname').value='Native QA';" +
                "document.querySelector('#profileForm').requestSubmit();" +
                "document.querySelector('#profileClose').click();" +
                "return document.documentElement.dataset.kicklabIntro})()");
        assertTrue("First-run profile must complete before lab entry: " + state, state.contains("complete") || state.contains("ready"));
    }

    @Test
    public void settledOfflineHomeKeepsOneLayeredCardAndStandingsSection() throws Exception {
        try (ActivityScenario<MainActivity> scenario = launchForegroundScenario()) {
            waitForKickLab(scenario);
            String home = evaluate(scenario,
                "(()=>{const q=s=>document.querySelector(s).getBoundingClientRect();" +
                    "const cards=[...document.querySelectorAll('#modeHome .lab-showcase')].map(e=>e.getBoundingClientRect());" +
                    "const standings=q('#progressHud'),header=q('.home-hero');" +
                    "return JSON.stringify({sections:document.querySelectorAll('#modeHome').length," +
                    "standingsSections:document.querySelectorAll('#progressHud').length,cards:cards.length," +
                    "ordered:header.bottom<Math.min(...cards.map(r=>r.top))&&" +
                    "cards.every((r,i)=>cards.every((other,j)=>i===j||r.right<=other.left||other.right<=r.left||r.bottom<=other.top||other.bottom<=r.top))&&" +
                    "Math.max(...cards.map(r=>r.bottom))<standings.top," +
                    "local:location.origin==='https://localhost',native:typeof KickLabHomePresentation==='object'})})()");
            assertTrue(home, home.contains("\\\"sections\\\":1"));
            assertTrue(home, home.contains("\\\"standingsSections\\\":1"));
            assertTrue(home, home.contains("\\\"cards\\\":3"));
            assertTrue(home, home.contains("\\\"ordered\\\":true"));
            assertTrue(home, home.contains("\\\"local\\\":true"));
            assertTrue(home, home.contains("\\\"native\\\":true"));
            scenario.onActivity(activity -> assertTrue("Home must use the stable software paint layer",
                activity.getBridge().getWebView().getLayerType() == View.LAYER_TYPE_SOFTWARE));

            String ranked = evaluate(scenario,
                "(()=>{document.querySelector('[data-standing-rank=awards]').click();return document.querySelector('#homeStandingsRankStatus').textContent})()");
            assertTrue(ranked, ranked.contains("Ranked by Awards"));
            scenario.recreate();
            waitForKickLab(scenario);
            scenario.onActivity(activity -> assertTrue("Home layer must recover after recreation",
                activity.getBridge().getWebView().getLayerType() == View.LAYER_TYPE_SOFTWARE));
            completeFirstRunIfNeeded(scenario);
            assertTrue(evaluate(scenario, "(()=>{document.querySelector('#lab-tab-fight').click();return document.documentElement.dataset.kicklabView})()")
                .contains("game"));
            Thread.sleep(250);
            scenario.onActivity(activity -> assertTrue("Game play must use WebView's default accelerated compositor",
                activity.getBridge().getWebView().getLayerType() == View.LAYER_TYPE_NONE));
            evaluate(scenario, "document.querySelector('#modeHomeButton').click()");
            Thread.sleep(250);
            scenario.onActivity(activity -> assertTrue("Home must regain stable paint after game exit",
                activity.getBridge().getWebView().getLayerType() == View.LAYER_TYPE_SOFTWARE));
        }
    }

    @Test
    public void racePreflightPaintsOnScreenAfterHomeLayerTransition() throws Exception {
        rotateDisplay(0);
        Thread.sleep(350);
        Bitmap baseFrame = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertTrue("Base screen capture unavailable", baseFrame != null);
        boolean baseLandscape = baseFrame.getWidth() > baseFrame.getHeight();
        baseFrame.recycle();
        try (ActivityScenario<MainActivity> scenario = launchForegroundScenario()) {
            waitForKickLab(scenario);
            completeFirstRunIfNeeded(scenario);
            for (int entry = 0; entry < 2; entry++) {
                evaluate(scenario, "document.querySelector('#lab-tab-race').click()");
                String state = "null";
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(TIMEOUT_SECONDS);
                while (System.nanoTime() < deadline) {
                    state = evaluate(scenario,
                        "JSON.stringify({mode:document.documentElement.dataset.kicklabMode," +
                        "preflight:!document.querySelector('#racePreflight').hidden})");
                    if (state.contains("\\\"preflight\\\":true")) break;
                    Thread.sleep(150);
                }
                assertTrue(state, state.contains("\\\"mode\\\":\\\"race\\\""));
                assertTrue(state, state.contains("\\\"preflight\\\":true"));
                Thread.sleep(700);
                scenario.onActivity(activity -> assertTrue("Race must use normal WebView compositing",
                    activity.getBridge().getWebView().getLayerType() == View.LAYER_TYPE_NONE));
                assertRaceScreenPainted(scenario, baseLandscape);
                rotateDisplay(1);
                Thread.sleep(700);
                assertRaceScreenPainted(scenario, !baseLandscape);
                rotateDisplay(0);
                Thread.sleep(700);
                assertRaceScreenPainted(scenario, baseLandscape);
                evaluate(scenario, "document.querySelector('#modeHomeButton').click()");
                Thread.sleep(250);
                scenario.onActivity(activity -> assertTrue("Home must recover its software layer",
                    activity.getBridge().getWebView().getLayerType() == View.LAYER_TYPE_SOFTWARE));
            }
        } finally {
            InstrumentationRegistry.getInstrumentation().getUiAutomation()
                .executeShellCommand("wm user-rotation free").close();
        }
    }

    private void rotateDisplay(int rotation) throws Exception {
        InstrumentationRegistry.getInstrumentation().getUiAutomation()
            .executeShellCommand("wm user-rotation lock " + rotation).close();
    }

    @Test
    public void offlineRaceEntryKeepsProfileAndHasNoUidNetworkTraffic() throws Exception {
        try (ActivityScenario<MainActivity> scenario = launchForegroundScenario()) {
            waitForKickLab(scenario);
            completeFirstRunIfNeeded(scenario);
            String profile = evaluate(scenario,
                "JSON.stringify({id:KickLabProfiles.createManager(localStorage).active().id," +
                "xp:Number(KickLabProfiles.createManager(localStorage).active().progress.xp||0)})");
            int uid = InstrumentationRegistry.getInstrumentation().getTargetContext().getApplicationInfo().uid;
            long txBefore = TrafficStats.getUidTxBytes(uid), rxBefore = TrafficStats.getUidRxBytes(uid);
            assertTrue("Android UID traffic counters unavailable", txBefore >= 0 && rxBefore >= 0);
            try {
                scenario.onActivity(activity -> {
                    WebView webView = activity.getBridge().getWebView();
                    webView.setNetworkAvailable(false);
                });
                // Keep the already-loaded packaged document. A separate radio-off
                // cold launch covers reload without racing evaluateJavascript.
                String state = evaluate(scenario,
                    "JSON.stringify({online:navigator.onLine,local:location.origin==='https://localhost'," +
                    "id:KickLabProfiles.createManager(localStorage).active().id," +
                    "xp:Number(KickLabProfiles.createManager(localStorage).active().progress.xp||0)})");
                assertTrue("Packaged Race must load locally under offline WebView: " + state,
                    state.contains("\\\"online\\\":false") && state.contains("\\\"local\\\":true"));
                JSONObject beforeProfile = new JSONObject(new JSONArray("[" + profile + "]").getString(0));
                JSONObject afterProfile = new JSONObject(new JSONArray("[" + state + "]").getString(0));
                assertTrue("Offline mode changed active profile: " + state,
                    beforeProfile.getString("id").equals(afterProfile.getString("id")) &&
                    beforeProfile.getInt("xp") == afterProfile.getInt("xp"));
                evaluate(scenario, "document.querySelector('#lab-tab-race').click()");
                String entry = "null";
                String lastEntry = null;
                long entryDeadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(TIMEOUT_SECONDS);
                while (System.nanoTime() < entryDeadline) {
                    entry = evaluate(scenario,
                        "(()=>{try{const preflight=document.querySelector('#racePreflight')," +
                        "race3d=typeof RACE_3D==='undefined'?null:RACE_3D;" +
                        "return JSON.stringify({url:location.href,ready:document.readyState," +
                        "mode:document.documentElement.dataset.kicklabMode||''," +
                        "hasPreflight:!!preflight,open:!!preflight&&!preflight.hidden," +
                        "preflightFlag:document.documentElement.dataset.racePreflight||''," +
                        "venueFlag:typeof RACE_VENUE_PREFLIGHT_ACTIVE==='undefined'?null:RACE_VENUE_PREFLIGHT_ACTIVE," +
                        "preflightOn:typeof RACE_PREFLIGHT_ON==='undefined'?null:RACE_PREFLIGHT_ON," +
                        "raceState:typeof Race==='undefined'?null:Race.state," +
                        "profileReady:typeof profileManager==='undefined'?null:!profileManager.active().needsSetup," +
                        "cockpitHidden:document.querySelector('#game-cockpit')?.hidden??null," +
                        "dialogHidden:document.querySelector('#profileDialog')?.hidden??null," +
                        "paused:typeof PAUSE==='undefined'?null:PAUSE.on," +
                        "pacingVisible:!!document.querySelector('#gamePacingOverlay')&&!document.querySelector('#gamePacingOverlay').hidden," +
                        "race3d:race3d?{ready:race3d.ready,loading:race3d.loading,failed:race3d.failed," +
                        "orbit:race3d.orbit?.phase||'',orbitDone:race3d.orbit?.done??null," +
                        "error:globalThis.__KICKLAB_RACE_3D__?.error||''}:null," +
                        "notice:document.querySelector('#toasts')?.innerText?.slice(0,180)||''});" +
                        "}catch(error){return JSON.stringify({diagnosticError:String(error)," +
                        "url:location.href,ready:document.readyState})}})()");
                    if (!entry.equals(lastEntry)) {
                        System.out.println("Offline Race entry state: " + entry);
                        lastEntry = entry;
                    }
                    if (entry.contains("\\\"open\\\":true")) break;
                    Thread.sleep(150);
                }
                if ("null".equals(entry)) {
                    String documentProbe = evaluate(scenario,
                        "JSON.stringify({url:location.href,ready:document.readyState})");
                    entry = "probe returned null; document=" + documentProbe;
                }
                System.out.println("Offline Race entry diagnostic: " + entry);
                assertTrue("Offline Race preparation did not open: " + entry,
                    entry.contains("\\\"open\\\":true"));
                Thread.sleep(5000);
                String requests = evaluate(scenario,
                    "(()=>{const names=performance.getEntriesByType('resource').map(e=>e.name)," +
                    "origins=[...new Set(names.map(name=>new URL(name).origin))].sort()," +
                    "external=names.filter(name=>/^https?:/.test(name)&&new URL(name).origin!=='https://localhost').length;" +
                    "return JSON.stringify({origins,resources:names.length,external})})()");
                System.out.println("Offline Race resource origins: " + requests);
                assertTrue("Packaged offline Race requested an external origin: " + requests,
                    requests.contains("\\\"external\\\":0"));
                String profileAfter = evaluate(scenario,
                    "JSON.stringify({id:KickLabProfiles.createManager(localStorage).active().id," +
                    "xp:Number(KickLabProfiles.createManager(localStorage).active().progress.xp||0)})");
                JSONObject finalProfile = new JSONObject(new JSONArray("[" + profileAfter + "]").getString(0));
                assertTrue("Offline Race changed active profile after entry",
                    beforeProfile.getString("id").equals(finalProfile.getString("id")) &&
                    beforeProfile.getInt("xp") == finalProfile.getInt("xp"));
                System.out.println("Offline Race profile preserved: true");
                long txAfter = TrafficStats.getUidTxBytes(uid), rxAfter = TrafficStats.getUidRxBytes(uid);
                assertTrue("Packaged offline Race emitted UID network traffic: tx=" +
                    (txAfter - txBefore) + " rx=" + (rxAfter - rxBefore),
                    txAfter == txBefore && rxAfter == rxBefore);
            } finally {
                scenario.onActivity(activity -> activity.getBridge().getWebView().setNetworkAvailable(true));
            }
        }
    }

    @Test
    public void raceWebGlAndCanvasMeasurePhoneFrames() throws Exception {
        // Test-only CDP network trace; the packaged app APK is unchanged.
        WebView.setWebContentsDebuggingEnabled(true);
        try (ActivityScenario<MainActivity> scenario = launchForegroundScenario()) {
            waitForKickLab(scenario);
            completeFirstRunIfNeeded(scenario);
            long traceDeadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(TIMEOUT_SECONDS);
            while (System.nanoTime() < traceDeadline &&
                    !"true".equals(evaluate(scenario, "window.__kicklabNetworkTraceReady===true"))) {
                Thread.sleep(150);
            }
            assertTrue("CDP Network trace did not attach before packaged-page reload",
                "true".equals(evaluate(scenario, "window.__kicklabNetworkTraceReady===true")));
            Thread.sleep(2000); // Let pre-existing WebView requests settle before the bounded window.
            String originalGfx = evaluate(scenario,
                "KickLabProfiles.createManager(localStorage).active().progress.gfx||'3d'");
            try {
                evaluate(scenario, "(()=>{const manager=KickLabProfiles.createManager(localStorage),progress=manager.active().progress;progress.gfx='3d';manager.saveActiveProgress(progress)})()");
                int uid = InstrumentationRegistry.getInstrumentation().getTargetContext().getApplicationInfo().uid;
                long txBefore = TrafficStats.getUidTxBytes(uid), rxBefore = TrafficStats.getUidRxBytes(uid);
                evaluate(scenario, "console.info('KickLabTraceWindowStart')");
                scenario.onActivity(activity -> activity.getBridge().getWebView().reload());
                Thread.sleep(1000);
                assertTrue("Packaged Race document did not reload", waitForKickLab(scenario).contains("\\\"ready\\\":true"));
                evaluate(scenario, "document.querySelector('#lab-tab-race').click()");
                String webGl = "null";
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(TIMEOUT_SECONDS);
                while (System.nanoTime() < deadline) {
                    webGl = evaluate(scenario,
                        "JSON.stringify({gfx:KickLabProfiles.createManager(localStorage).active().progress.gfx," +
                        "status:window.__KICKLAB_RACE_3D__?.status||'waiting'," +
                        "canvas:!!document.querySelector('#race3')?.width&&!!document.querySelector('#race3')?.height})");
                    if (webGl.contains("\\\"status\\\":\\\"rendering\\\"") ||
                        webGl.contains("\\\"status\\\":\\\"canvas-fallback\\\"")) break;
                    Thread.sleep(250);
                }
                assertTrue("Pixel Race WebGL did not render: " + webGl,
                    webGl.contains("\\\"gfx\\\":\\\"3d\\\"") &&
                    webGl.contains("\\\"status\\\":\\\"rendering\\\"") &&
                    webGl.contains("\\\"canvas\\\":true"));
                evaluate(scenario,
                    "(()=>{const samples=[];let last=performance.now(),start=last;window.__racePacingQA={done:false};" +
                    "function tick(now){samples.push(now-last);last=now;if(now-start<20000)requestAnimationFrame(tick);" +
                    "else{const sorted=samples.slice(10).sort((a,b)=>a-b);window.__racePacingQA={done:true," +
                    "p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),count:sorted.length}}}" +
                    "requestAnimationFrame(tick)})()");
                Thread.sleep(23000);
                String pacing = evaluate(scenario, "JSON.stringify(window.__racePacingQA)");
                JSONObject frame = new JSONObject(new JSONArray("[" + pacing + "]").getString(0));
                assertTrue("Pixel Race WebGL frame sample incomplete: " + pacing, frame.getBoolean("done"));
                System.out.println("Race WebGL sustained pacing: " + pacing);
                evaluate(scenario, "(()=>{const manager=KickLabProfiles.createManager(localStorage),progress=manager.active().progress;progress.gfx='2d';manager.saveActiveProgress(progress)})()");
                scenario.onActivity(activity -> activity.getBridge().getWebView().reload());
                Thread.sleep(1000);
                assertTrue("Packaged Canvas document did not reload", waitForKickLab(scenario).contains("\\\"ready\\\":true"));
                evaluate(scenario, "document.querySelector('#lab-tab-race').click()");
                Thread.sleep(1000);
                String canvas = evaluate(scenario,
                    "JSON.stringify({gfx:KickLabProfiles.createManager(localStorage).active().progress.gfx," +
                    "webgl:!!document.querySelector('#race3')?.getClientRects().length," +
                    "canvas:document.querySelector('#cv').width>0&&document.querySelector('#cv').height>0})");
                assertTrue("Pixel Race Canvas fallback did not render: " + canvas,
                    canvas.contains("\\\"gfx\\\":\\\"2d\\\"") &&
                    canvas.contains("\\\"webgl\\\":false") &&
                    canvas.contains("\\\"canvas\\\":true"));
                evaluate(scenario,
                    "(()=>{const samples=[];let last=performance.now(),start=last;window.__racePacingQA={done:false};" +
                    "function tick(now){samples.push(now-last);last=now;if(now-start<10000)requestAnimationFrame(tick);" +
                    "else{const sorted=samples.slice(10).sort((a,b)=>a-b);window.__racePacingQA={done:true," +
                    "p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),count:sorted.length}}}" +
                    "requestAnimationFrame(tick)})()");
                Thread.sleep(13000);
                String canvasPacing = evaluate(scenario, "JSON.stringify(window.__racePacingQA)");
                JSONObject canvasFrame = new JSONObject(new JSONArray("[" + canvasPacing + "]").getString(0));
                assertTrue("Pixel Race Canvas frame sample incomplete: " + canvasPacing, canvasFrame.getBoolean("done"));
                System.out.println("Race Canvas sustained pacing: " + canvasPacing);
                long txAfter = TrafficStats.getUidTxBytes(uid), rxAfter = TrafficStats.getUidRxBytes(uid);
                System.out.println("Race renderer UID bytes: tx=" + (txAfter - txBefore) +
                    " rx=" + (rxAfter - rxBefore));
                assertTrue("Race renderer selection emitted UID network traffic: tx=" +
                    (txAfter - txBefore) + " rx=" + (rxAfter - rxBefore),
                    txAfter == txBefore && rxAfter == rxBefore);
            } finally {
                evaluate(scenario, "(()=>{const manager=KickLabProfiles.createManager(localStorage),progress=manager.active().progress;progress.gfx=" + originalGfx + ";manager.saveActiveProgress(progress)})()");
            }
        } finally {
            WebView.setWebContentsDebuggingEnabled(false);
        }
    }

    @Test
    public void racePreflightHeaderClearsPixelSystemBarsInEveryPhase() throws Exception {
        rotateDisplay(0);
        try (ActivityScenario<MainActivity> scenario = launchForegroundScenario()) {
            waitForKickLab(scenario);
            completeFirstRunIfNeeded(scenario);
            evaluate(scenario, "document.querySelector('#lab-tab-race').click()");
            long openDeadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(TIMEOUT_SECONDS);
            while (System.nanoTime() < openDeadline &&
                !"true".equals(evaluate(scenario, "!document.querySelector('#racePreflight').hidden"))) {
                Thread.sleep(150);
            }
            assertTrue("Race preparation did not open",
                "true".equals(evaluate(scenario, "!document.querySelector('#racePreflight').hidden")));
            for (int phase = 0; phase < 4; phase++) {
                if (phase == 1) {
                    evaluate(scenario, "document.querySelector('#racePreflightNext').click();document.querySelector('#racePreflightNext').click()");
                } else if (phase > 1) {
                    evaluate(scenario, "document.querySelector('#racePreflightNext').click()");
                }
                for (int rotation : new int[]{0, 1, 0}) {
                    rotateDisplay(rotation);
                    Thread.sleep(450);
                    String raw = evaluate(scenario,
                        "(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,right:r.right}};" +
                        "const inset=KickLabAndroidSafeArea.topInsetCssPx(),label=box('.race-preflight-header span')," +
                        "heading=box('#racePreflightTitle'),close=box('#racePreflightClose');" +
                        "return JSON.stringify({phase:Number(document.querySelector('[data-preflight-step][aria-current=step]').dataset.preflightStep),inset,label,heading,close," +
                        "height:innerHeight,width:innerWidth,padding:getComputedStyle(document.querySelector('.race-preflight-shell')).paddingTop})})()");
                    assertFalse("Race geometry JavaScript failed", "null".equals(raw));
                    JSONObject geometry = new JSONObject(new JSONArray("[" + raw + "]").getString(0));
                    double inset = geometry.getDouble("inset");
                    assertTrue("Android top inset must be available: " + geometry, inset > 0);
                    assertTrue("Wrong Race preparation phase: " + geometry, geometry.getInt("phase") == phase);
                    for (String key : new String[]{"label", "heading", "close"}) {
                        JSONObject box = geometry.getJSONObject(key);
                        assertTrue(key + " overlaps Android status bar: " + geometry, box.getDouble("top") >= inset + 4);
                        assertTrue(key + " clips viewport: " + geometry,
                            box.getDouble("bottom") <= geometry.getDouble("height") &&
                            box.getDouble("right") <= geometry.getDouble("width"));
                    }
                }
            }
        } finally {
            InstrumentationRegistry.getInstrumentation().getUiAutomation()
                .executeShellCommand("wm user-rotation free").close();
        }
    }

    private void assertRaceScreenPainted(ActivityScenario<MainActivity> scenario, boolean landscape) throws Exception {
        String geometry = evaluate(scenario,
            "(()=>{const b=document.querySelector('#racePreflightNext');const r=b.getBoundingClientRect();" +
            "return JSON.stringify({label:b.textContent.trim(),x:r.left,y:r.top,w:r.width,h:r.height," +
            "vw:innerWidth,vh:innerHeight})})()");
        JSONObject button = new JSONObject(new JSONArray("[" + geometry + "]").getString(0));
        assertTrue("Expected Race preparation action", button.getString("label").contains("See routes"));
        AtomicReference<int[]> webViewFrame = new AtomicReference<>();
        scenario.onActivity(activity -> {
            WebView view = activity.getBridge().getWebView();
            int[] origin = new int[2];
            view.getLocationOnScreen(origin);
            webViewFrame.set(new int[]{origin[0], origin[1], view.getWidth(), view.getHeight()});
        });
        Bitmap frame = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertTrue("Race screen capture unavailable", frame != null);
        assertTrue("Physical display did not rotate to the requested orientation",
            landscape ? frame.getWidth() > frame.getHeight() : frame.getHeight() > frame.getWidth());
        int[] view = webViewFrame.get();
        double scaleX = (double) view[2] / button.getDouble("vw");
        double scaleY = (double) view[3] / button.getDouble("vh");
        int raceGreenPixels = 0;
        for (double fy : new double[]{0.25, 0.5, 0.75}) {
            for (double fx : new double[]{0.15, 0.3, 0.45, 0.6, 0.75, 0.9}) {
                int x = view[0] + (int) Math.round((button.getDouble("x") + button.getDouble("w") * fx) * scaleX);
                int y = view[1] + (int) Math.round((button.getDouble("y") + button.getDouble("h") * fy) * scaleY);
                assertTrue("Race action must be inside screen capture", x >= 0 && y >= 0 && x < frame.getWidth() && y < frame.getHeight());
                int pixel = frame.getPixel(x, y);
                if (Color.green(pixel) > Color.red(pixel) + 18 &&
                    Color.green(pixel) > Color.blue(pixel) + 8 && Color.green(pixel) < 200) raceGreenPixels++;
            }
        }
        frame.recycle();
        assertTrue("Race action must paint at its actual screen position, not the launch splash", raceGreenPixels >= 4);
    }

    @Test
    public void packagedArtifactIsLocalOfflineAndResponsive() throws Exception {
        try (ActivityScenario<MainActivity> scenario = launchForegroundScenario()) {
            String ready = waitForKickLab(scenario);
            assertTrue(ready.contains("KickLab"));
            assertTrue(ready.contains("capacitor-local-v1"));

            String state = evaluate(scenario,
                "JSON.stringify({" +
                    "origin:location.origin," +
                    "csp:document.querySelector('meta[http-equiv=\\\"Content-Security-Policy\\\"]')?.content||''," +
                    "remote:performance.getEntriesByType('resource').map(e=>e.name).filter(name=>{try{const u=new URL(name,location.href);return !['data:','blob:'].includes(u.protocol)&&u.origin!==location.origin}catch(_){return true}})," +
                    "width:innerWidth,scrollWidth:document.documentElement.scrollWidth," +
                    "stage:!!document.querySelector('#cv'),controls:document.querySelectorAll('#pad button').length" +
                "})");
            assertTrue(state.contains("connect-src 'self' blob:"));
            assertTrue(state.contains("\\\"remote\\\":[]"));
            assertTrue(state.contains("\\\"stage\\\":true"));
            assertFalse(state.contains("\\\"controls\\\":0"));

            String layout = evaluate(scenario,
                "document.documentElement.scrollWidth<=innerWidth+1 && document.querySelector('#cv').getBoundingClientRect().right<=innerWidth+1");
            assertTrue("KickLab must not overflow the native viewport: " + state, "true".equals(layout));
        }
    }

    @Test
    public void localProfileAndLegacyKeysSurviveActivityRecreation() throws Exception {
        try (ActivityScenario<MainActivity> scenario = launchForegroundScenario()) {
            waitForKickLab(scenario);
            String saved = evaluate(scenario,
                "(()=>{const manager=KickLabProfiles.createManager(localStorage);" +
                    "const progress=manager.active().progress;progress.xp=731;manager.saveActiveProgress(progress);" +
                    "const envelope=JSON.parse(localStorage.getItem('kicklab.profiles.v1'));" +
                    "const active=envelope.profiles.find(profile=>profile.id===envelope.activeId);" +
                    "return JSON.stringify({" +
                    "legacyXp:JSON.parse(localStorage.getItem('impactlab.v1')).xp," +
                    "profileXp:active.progress.xp," +
                    "hasLegacyNickname:localStorage.getItem('impactlab.nick')!==null" +
                "})})()");
            assertTrue(saved.contains("\\\"legacyXp\\\":731"));
            assertTrue(saved.contains("\\\"profileXp\\\":731"));
            assertTrue(saved.contains("\\\"hasLegacyNickname\\\":true"));

            scenario.recreate();
            waitForKickLab(scenario);
            String restored = evaluate(scenario,
                "(()=>{const manager=KickLabProfiles.createManager(localStorage);return JSON.stringify({" +
                    "profileXp:manager.active().progress.xp," +
                    "legacyXp:JSON.parse(localStorage.getItem('impactlab.v1')).xp," +
                    "renderedXp:document.querySelector('#xpTxt')?.textContent||''" +
                "})})()");
            assertTrue(restored.contains("\\\"profileXp\\\":731"));
            assertTrue(restored.contains("\\\"legacyXp\\\":731"));
            assertTrue(restored.contains("731 /"));
        }
    }

    @Test
    public void lifecycleCancelsHeldInputAndForegroundStaysPaused() throws Exception {
        try (ActivityScenario<MainActivity> scenario = launchForegroundScenario()) {
            waitForKickLab(scenario);
            completeFirstRunIfNeeded(scenario);
            String state = evaluate(scenario,
                "(()=>{document.querySelector('#lab-tab-race').click();" +
                    "const gas=document.querySelector('#pad button[data-id=\\\"gas\\\"]');" +
                    "gas.dispatchEvent(new PointerEvent('pointerdown',{pointerId:7,bubbles:true}));" +
                    "const heldBeforeSuspend=gas.classList.contains('on');" +
                    "const suspended=KickLabMobileLifecycle.suspend('instrumentation');" +
                    "const foreground=KickLabMobileLifecycle.foreground('instrumentation');" +
                    "return JSON.stringify({heldBeforeSuspend,releasedAfterSuspend:!gas.classList.contains('on')," +
                    "suspendedActive:suspended.active,suspendedOwnsPause:suspended.ownsPause," +
                    "foregroundActive:foreground.active,foregroundOwnsPause:foreground.ownsPause," +
                    "dataset:document.documentElement.dataset.kicklabMobileLifecycle," +
                    "unknownHaptic:KickLabMobileLifecycle.haptic('unknown'),nativeHaptics:typeof Capacitor?.Plugins?.Haptics?.impact==='function'})})()");
            assertTrue(state.contains("\\\"heldBeforeSuspend\\\":true"));
            assertTrue(state.contains("\\\"releasedAfterSuspend\\\":true"));
            assertTrue(state.contains("\\\"suspendedActive\\\":false"));
            assertTrue(state.contains("\\\"suspendedOwnsPause\\\":true"));
            assertTrue(state.contains("\\\"foregroundActive\\\":true"));
            assertTrue(state.contains("\\\"foregroundOwnsPause\\\":true"));
            assertTrue(state.contains("\\\"dataset\\\":\\\"active\\\""));
            assertTrue(state.contains("\\\"unknownHaptic\\\":false"));
            assertTrue(state.contains("\\\"nativeHaptics\\\":true"));
        }
    }

    @Test
    public void backgroundedRacePreparationClosesHomeWithoutStartingAttempt() throws Exception {
        try (ActivityScenario<MainActivity> scenario = launchForegroundScenario()) {
            waitForKickLab(scenario);
            completeFirstRunIfNeeded(scenario);
            evaluate(scenario, "document.querySelector('#lab-tab-race').click()");
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(TIMEOUT_SECONDS);
            String before = "null";
            while (System.nanoTime() < deadline) {
                before = evaluate(scenario, "JSON.stringify({open:!document.querySelector('#racePreflight').hidden,phase:document.documentElement.dataset.racePhase})");
                if (before.contains("\\\"open\\\":true")) break;
                Thread.sleep(150);
            }
            assertTrue("Race preparation did not open: " + before, before.contains("\\\"open\\\":true"));
            assertTrue("Race attempt started before preparation closed: " + before, before.contains("\\\"phase\\\":\\\"grid\\\""));
            scenario.moveToState(Lifecycle.State.CREATED);
            scenario.moveToState(Lifecycle.State.RESUMED);
            String after = evaluate(scenario,
                "(()=>{document.querySelector('#racePreflightClose').click();return JSON.stringify({" +
                "home:!document.querySelector('#modeHome').hidden," +
                "preflightClosed:document.querySelector('#racePreflight').hidden," +
                "racePhase:document.documentElement.dataset.racePhase,result:!document.querySelector('#results').hidden," +
                "resultText:document.querySelector('#results').textContent.includes('TIME-OUT')})})()");
            assertTrue("Close must return to Home: " + after, after.contains("\\\"home\\\":true"));
            assertTrue("Preparation must close: " + after, after.contains("\\\"preflightClosed\\\":true"));
            assertTrue("Race must remain at grid: " + after, after.contains("\\\"racePhase\\\":\\\"grid\\\""));
            assertTrue("No Race result may appear: " + after, after.contains("\\\"result\\\":false"));
            assertTrue("TIME-OUT is a regression: " + after, after.contains("\\\"resultText\\\":false"));
            Thread.sleep(1200);
            String settled = evaluate(scenario,
                "JSON.stringify({home:!document.querySelector('#modeHome').hidden," +
                "phase:document.documentElement.dataset.racePhase," +
                "result:!document.querySelector('#results').hidden," +
                "timeOut:document.querySelector('#results').textContent.includes('TIME-OUT')})");
            assertTrue("Home must remain visible after lifecycle settles: " + settled, settled.contains("\\\"home\\\":true"));
            assertTrue("Race must not activate after Close: " + settled, settled.contains("\\\"phase\\\":\\\"grid\\\""));
            assertTrue("No delayed result may appear: " + settled, settled.contains("\\\"result\\\":false"));
            assertTrue("No delayed TIME-OUT may appear: " + settled, settled.contains("\\\"timeOut\\\":false"));
        }
    }

    @Test
    public void fightAndKickEnterFromThePackagedHome() throws Exception {
        try (ActivityScenario<MainActivity> scenario = launchForegroundScenario()) {
            waitForKickLab(scenario);
            completeFirstRunIfNeeded(scenario);
            for (String mode : new String[]{"fight", "kick"}) {
                String state = evaluate(scenario,
                    "(()=>{try{document.querySelector('#modeHomeButton').click();" +
                    "document.querySelector('#lab-tab-" + mode + "').click();" +
                    "return JSON.stringify({mode:document.documentElement.dataset.kicklabMode," +
                    "homeHidden:document.querySelector('#modeHome').hidden," +
                    "gameVisible:!document.querySelector('#game-cockpit').hidden," +
                    "stage:!!document.querySelector('#cv')})}catch(e){return 'ERROR: '+e.message}})()");
                assertTrue(mode + " did not enter its lab: " + state, state.contains("\\\"mode\\\":\\\"" + mode + "\\\""));
                assertTrue(state, state.contains("\\\"homeHidden\\\":true"));
                assertTrue(state, state.contains("\\\"gameVisible\\\":true"));
                assertTrue(state, state.contains("\\\"stage\\\":true"));
            }
        }
    }
}
