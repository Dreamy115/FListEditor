/* Capture a separate card so exporting never changes preview interaction state. */
(() => {
  function expandedCopy(card) {
    const copy = card.cloneNode(true);
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    Object.assign(copy.style, {
      position: 'absolute', left: '-100000px', top: '0',
      width: card.getBoundingClientRect().width + 'px', boxSizing: 'border-box',
      minHeight: '0', height: 'auto', maxHeight: 'none', overflow: 'visible',
      transition: 'none', boxShadow: 'none', margin: '0'
    });
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('.bbcode-collapse').forEach(section => section.classList.remove('collapsed'));
    copy.querySelectorAll('.bbcode-collapse-header').forEach(header => {
      header.classList.remove('bbcode-collapse-header-down');
      header.classList.add('bbcode-collapse-header-up');
      header.querySelectorAll('.fa-chevron-down').forEach(icon => {
        icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up');
      });
    });
    copy.querySelectorAll('.bbcode-collapse-body').forEach(body => {
      Object.assign(body.style, {height: 'auto', maxHeight: 'none', overflow: 'visible', transition: 'none'});
    });
    copy.querySelectorAll('details').forEach(details => { details.open = true; });
    return copy;
  }
  async function render(card) {
    const copy = expandedCopy(card);
    document.body.append(copy);
    try {
      await document.fonts.ready;
      return await html2canvas(copy, {
        backgroundColor: null, useCORS: true, logging: false,
        // Bound memory use for long profiles while preserving full card height.
        scale: Math.min(2, 16384 / Math.max(copy.scrollWidth, copy.scrollHeight),
          Math.sqrt(16777216 / (copy.scrollWidth * copy.scrollHeight)))
      });
    } finally {
      copy.remove();
    }
  }
  async function capture(card) {
    const canvas = await render(card);
    return new Promise((resolve, reject) => canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('PNG encoding failed')), 'image/png'));
  }
  async function html(card, title) {
    const output = document.implementation.createHTMLDocument(title);
    output.documentElement.lang = 'en';
    output.documentElement.dataset.flistScheme = document.documentElement.dataset.flistScheme;
    const charset = output.createElement('meta'); charset.setAttribute('charset','utf-8'); output.head.prepend(charset);
    const viewport = output.createElement('meta'); viewport.name = 'viewport'; viewport.content = 'width=device-width,initial-scale=1'; output.head.append(viewport);
    for (const sheet of document.styleSheets) {
      const style = output.createElement('style');
      let css = Array.from(sheet.cssRules, rule => rule.cssText).join('\n');
      // Embed the local theme artwork so downloaded HTML can be moved elsewhere.
      const urls = [...css.matchAll(/url\(["']?([^\s"')]+)["']?\)/g)];
      for (const match of urls) {
        if (match[1].startsWith('data:') || match[1].startsWith('#')) continue;
        const url = new URL(match[1], sheet.href || document.baseURI).href;
        let asset = url;
        try {
          const image = new Image(); image.src = url; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
          canvas.getContext('2d').drawImage(image,0,0); asset = canvas.toDataURL();
        } catch (_) { /* Keep remote URLs when embedding is unavailable. */ }
        css = css.replaceAll(match[0], 'url("' + asset + '")');
      }
      style.textContent = css; output.head.append(style);
    }
    const copy = expandedCopy(card);
    copy.removeAttribute('aria-hidden');
    Object.assign(copy.style, {position:'static', left:'auto', top:'auto', width:'100%', maxWidth:'none', minHeight:'100vh', margin:'0', border:'0', borderRadius:'0', paddingInline:'clamp(12px, calc((100vw - 1000px) / 2), 160px)'});
    copy.querySelectorAll('script').forEach(node => node.remove());
    copy.querySelectorAll('[data-local-inline-id]').forEach(node => {
      for (const name of ['data-local-inline-id', 'data-inline-alias', 'role', 'tabindex', 'aria-label', 'title']) node.removeAttribute(name);
    });
    [copy, ...copy.querySelectorAll('*')].forEach(node => {
      for (const attr of [...node.attributes]) if (/^on/i.test(attr.name)) node.removeAttribute(attr.name);
      if (node.hasAttribute('src')) node.setAttribute('src', new URL(node.getAttribute('src'), document.baseURI).href);
    });
    output.body.append(output.importNode(copy,true));
    const layout = output.createElement('style');
    layout.textContent = 'html,body{margin:0;padding:0;min-height:100%;background:transparent}body:before{display:none}.previewpage{width:100%;max-width:none;min-height:100vh;border:0;border-radius:0;box-shadow:none}.bbcode-collapse-body[hidden]{display:none!important}*{animation:none!important;transition:none!important}';
    output.head.append(layout);
    const interaction = output.createElement('script');
    interaction.textContent = '(' + function () {
      document.querySelectorAll('.bbcode-collapse').forEach((section, index) => {
        const header = [...section.children].find(node => node.classList.contains('bbcode-collapse-header'));
        const body = [...section.children].find(node => node.classList.contains('bbcode-collapse-body'));
        if (!header || !body) return;
        body.id = 'section-body-' + index;
        header.setAttribute('role', 'button');
        header.tabIndex = 0;
        header.setAttribute('aria-controls', body.id);
        function setOpen(open) {
          body.hidden = !open;
          section.classList.toggle('collapsed', !open);
          header.setAttribute('aria-expanded', String(open));
          header.classList.toggle('bbcode-collapse-header-up', open);
          header.classList.toggle('bbcode-collapse-header-down', !open);
          const icon = header.querySelector('.fa-chevron-up, .fa-chevron-down');
          if (icon) {
            icon.classList.toggle('fa-chevron-up', open);
            icon.classList.toggle('fa-chevron-down', !open);
          }
        }
        setOpen(false);
        header.addEventListener('click', event => {
          if (event.target.closest('a, button, input, select, textarea')) return;
          setOpen(body.hidden);
        });
        header.addEventListener('keydown', event => {
          if (event.target === header && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault(); setOpen(body.hidden);
          }
        });
      });
    }.toString() + ')();';
    output.body.append(interaction);
    return '<!DOCTYPE html>\n' + output.documentElement.outerHTML;
  }
  globalThis.FolioScreenshot = {capture, html};
})();
