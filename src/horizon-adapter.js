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
    // A local fallback also works when the avatar server is unavailable.
    img.addEventListener('error', () => {
      img.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" rx="4" fill="#586575"/><circle cx="25" cy="18" r="9" fill="#d4dce5"/><path d="M8 47v-5a17 17 0 0 1 34 0v5" fill="#d4dce5"/></svg>');
    }, {once: true});
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
    a.className = 'profile-url-link user-link';
    a.textContent = propsData.text;
    el.classList.add('profile-url');
    // The site adds a hostname to labelled links, but not bare URLs.
    if (safeURL(propsData.text)) el.classList.add('url-bare');
    const suffix = document.createElement('span');
    suffix.className = 'link-domain bbcode-pseudo';
    suffix.textContent = ' [' + new URL(url).host.replace(/^www\./i, '') + ']';
    el.replaceChildren(a, suffix);
  }
  $destroy() {}
}
