package com.amadutown.kicklab;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.webkit.WebView;

import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public class KickLabInstrumentedTest {
    private static final long TIMEOUT_SECONDS = 20;

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

    @Test
    public void packagedArtifactIsLocalOfflineAndResponsive() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
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
            assertTrue(state.contains("connect-src 'none'"));
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
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
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
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            waitForKickLab(scenario);
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
}
