package com.amadutown.kicklab;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.webkit.WebView;
import android.view.View;

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
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
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
            scenario.onActivity(activity -> assertTrue("Game play must regain hardware rendering",
                activity.getBridge().getWebView().getLayerType() == View.LAYER_TYPE_HARDWARE));
            evaluate(scenario, "document.querySelector('#modeHomeButton').click()");
            Thread.sleep(250);
            scenario.onActivity(activity -> assertTrue("Home must regain stable paint after game exit",
                activity.getBridge().getWebView().getLayerType() == View.LAYER_TYPE_SOFTWARE));
        }
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
    public void fightAndKickEnterFromThePackagedHome() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
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
