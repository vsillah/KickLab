// Packaged native shell only. WKWebView pans its visual viewport on keyboard focus,
// including when the document and Profile dialog are otherwise scroll locked.
(() => {
  // Android's Remove animations setting may change while WebView keeps its
  // original media-query result. The native value is authoritative in this shell.
  const androidMotion = window.KickLabAndroidMotion;
  if (androidMotion) {
    const motionRules=[];
    const collectMotionRules=rules=>{
      for(const rule of rules){
        if(rule.media && /prefers-reduced-motion/.test(rule.media.mediaText)){
          motionRules.push({rule,original:rule.media.mediaText});
        }else if(rule.cssRules)collectMotionRules(rule.cssRules);
      }
    };
    for(const sheet of document.styleSheets){
      try{collectMotionRules(sheet.cssRules);}catch(_){/* only local inline styles are controllable */}
    }
    const applyMotion = value => {
      if (typeof value !== 'boolean') return;
      document.documentElement.dataset.kicklabNativeReducedMotion = String(value);
      // A hot WebView can retain the opposite media-query result. Disable only
      // those stale motion media rules; packaged native CSS supplies the live state.
      const stale = window.matchMedia('(prefers-reduced-motion: reduce)').matches !== value;
      for(const {rule,original} of motionRules)rule.media.mediaText=stale?'not all':original;
      window.KickLabMotion?.setNativeReducedMotion(value);
    };
    window.KickLabAndroidMotionChanged = applyMotion;
    applyMotion(androidMotion.isReducedMotion());
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',
      () => applyMotion(androidMotion.isReducedMotion()));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) applyMotion(androidMotion.isReducedMotion());
    });
  }
  // Android WebView's accelerated Home paint can retain stale card layers.
  // Keep Home in a single software layer; return to hardware for 3D play.
  const homePresentation = window.KickLabHomePresentation;
  if (homePresentation) {
    const syncHomeLayer = () => homePresentation.setHomeVisible(document.documentElement.dataset.kicklabView !== 'game');
    new MutationObserver(syncHomeLayer).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-kicklab-view']
    });
    syncHomeLayer();
  }
  const viewport = window.visualViewport;
  if (!viewport) return;
  const dialog = document.getElementById('profileDialog');
  // The first-run form may focus before this packaged script executes.
  let returnScrollY = dialog?.hidden ? window.scrollY : 0;
  const sync = () => {
    const offset = Math.max(0, viewport.offsetTop || 0);
    document.documentElement.style.setProperty('--kicklab-native-viewport-offset-top', `${offset}px`);
    const androidTop = window.KickLabAndroidSafeArea?.topInsetCssPx();
    if (Number.isFinite(androidTop)) {
      document.documentElement.style.setProperty('--kicklab-android-race-top-inset', `${Math.max(0, androidTop)}px`);
    }
    if (!dialog?.hidden && document.activeElement?.id === 'profileNickname') {
      requestAnimationFrame(() => {
        const panel = dialog.querySelector('.profile-panel');
        const input = document.getElementById('profileNickname');
        const overlap = input.getBoundingClientRect().bottom - panel.getBoundingClientRect().bottom + 12;
        if (overlap > 0) panel.scrollTop += overlap;
      });
    }
  };
  viewport.addEventListener('resize', sync);
  viewport.addEventListener('scroll', sync);
  window.addEventListener('resize', sync);
  window.addEventListener('orientationchange', sync);
  if (dialog) {
    new MutationObserver(() => {
      if (dialog.hidden) {
        requestAnimationFrame(() => window.scrollTo(0, returnScrollY));
      } else {
        returnScrollY = window.scrollY;
      }
    }).observe(dialog, { attributes: true, attributeFilter: ['hidden'] });
  }
  sync();
})();
