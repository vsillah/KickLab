// Packaged native shell only. WKWebView pans its visual viewport on keyboard focus,
// including when the document and Profile dialog are otherwise scroll locked.
(() => {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const dialog = document.getElementById('profileDialog');
  // The first-run form may focus before this packaged script executes.
  let returnScrollY = dialog?.hidden ? window.scrollY : 0;
  const sync = () => {
    const offset = Math.max(0, viewport.offsetTop || 0);
    document.documentElement.style.setProperty('--kicklab-native-viewport-offset-top', `${offset}px`);
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
