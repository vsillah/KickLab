// Which player avatar a portrait element shows.
//
// The product renders a portrait from its asset path until the image has loaded, then from a remembered data:image/webp copy
// (rememberProfilePortrait in src/game/49-profiles.js), so the src attribute alone is not a stable identity. This accepts both
// established forms and nothing else:
// - the exact asset path for one of the known avatars in this lab, or
// - a data:image/webp whose pixels match one avatar's asset clearly better than every other avatar's.
// Returns {id, form, scores?} on a match, or {id: null, reason, scores?}. Scores are mean absolute channel differences (0 to 255).
export async function portraitIdentity(page, selector, lab, ids) {
  return page.evaluate(async ({ selector, lab, ids }) => {
    const image = document.querySelector(selector);
    if (!image) return { id: null, reason: 'portrait element missing' };
    const src = image.getAttribute('src') || '', art = window.KickLabProfileAvatarArt;
    if (!art?.asset) return { id: null, reason: 'KickLabProfileAvatarArt unavailable' };
    for (const id of ids) if (src === art.asset(id, lab)) return { id, form: 'asset-path' };
    if (!src.startsWith('data:image/webp;')) return { id: null, reason: `unexpected src ${src.slice(0, 48)}` };
    const pixels = async source => { const img = new Image(); img.src = source; await img.decode(); const canvas = document.createElement('canvas'); canvas.width = canvas.height = 48; const g = canvas.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, 48, 48); return g.getImageData(0, 0, 48, 48).data; };
    try {
      const shown = await pixels(src), scores = {};
      for (const id of ids) { const reference = await pixels(art.asset(id, lab)); let sum = 0; for (let i = 0; i < reference.length; i++) sum += Math.abs(reference[i] - shown[i]); scores[id] = +(sum / reference.length).toFixed(2); }
      const ranked = Object.keys(scores).sort((a, b) => scores[a] - scores[b]), best = scores[ranked[0]], next = ranked.length > 1 ? scores[ranked[1]] : Infinity;
      return best <= 8 && next - best >= 4 ? { id: ranked[0], form: 'remembered-webp', scores } : { id: null, reason: 'no clear pixel match', scores };
    } catch (error) { return { id: null, reason: `portrait compare failed: ${error.message}` }; }
  }, { selector, lab, ids });
}
