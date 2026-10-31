// Browser services for Horizon's unmodified parser/core/standard modules.
// Included inside the generated renderer closure by scripts/build-renderer.cjs.
const Utils = {
  siteDomain: 'https://www.f-list.net/',
  staticDomain: 'https://static.f-list.net/',
  settings: {inlineDisplayMode: 0, animateEicons: false, smoothMosaics: false}
};
const InlineDisplayMode = {DISPLAY_ALL: 0, DISPLAY_SFW: 1, DISPLAY_NONE: 2};
const normalizeCharacterName = name => name.trim();
const core = {
  connection: {isOpen: false},
  state: {settings: {animatedEicons: true}},
  characters: {get: name => ({name})}
};
const setImmediate = callback => setTimeout(callback, 0);
function safeURL(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
class IconView {
  constructor({el, propsData}) {
    const name = propsData.character.name;
    const a = document.createElement('a');
    a.href = Utils.siteDomain + 'c/' + encodeURIComponent(name);
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    const img = document.createElement('img');
    img.className = 'character-avatar icon'; img.alt = name;
    img.src = Utils.staticDomain + 'images/avatar/' + encodeURIComponent(name.toLowerCase()) + '.png';
    a.appendChild(img); el.replaceChildren(a);
  }
  $destroy() {}
}
class UrlTagView {
  constructor({el, propsData}) {
    const url = safeURL(propsData.url);
    if (!url) { el.textContent = propsData.text; return; }
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = propsData.text; el.replaceChildren(a);
  }
  $destroy() {}
}
