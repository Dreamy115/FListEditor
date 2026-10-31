(() => {
  'use strict';
  const previews = new WeakMap();
  function sections(preview) {
    const paths = new Map(), counts = new Map();
    return [...preview.querySelectorAll('.bbcode-collapse')].map(node => {
      const parent = node.parentElement?.closest('.bbcode-collapse');
      const parentPath = paths.get(parent) || [];
      const title = node.querySelector('.bbcode-collapse-header')?.textContent || '';
      const group = JSON.stringify([parentPath, title]), occurrence = counts.get(group) || 0;
      counts.set(group, occurrence + 1);
      const path = [...parentPath, [title, occurrence]]; paths.set(node, path);
      return {node, key: JSON.stringify(path)};
    });
  }
  function capture(preview, frame) {
    return {top: frame.scrollTop, left: frame.scrollLeft,
      sections: sections(preview).map(({node, key}) => ({key, open: !node.classList.contains('collapsed')}))};
  }
  function restore(preview, frame, state) {
    if (!state) { frame.scrollTop = 0; frame.scrollLeft = 0; return; }
    const current = sections(preview), previous = new Map(state.sections.map(section => [section.key, section.open]));
    const currentKeys = new Set(current.map(section => section.key));
    current.forEach(({node, key}, index) => {
      // Titles/ancestry survive insertions; position is a fallback for renamed
      // headers only when no insertion/removal has changed the section count.
      let open = previous.get(key);
      if (open === undefined && current.length === state.sections.length && !currentKeys.has(state.sections[index].key)) open = state.sections[index].open;
      if (open !== true) return;
      node.classList.remove('collapsed');
      const header = node.querySelector('.bbcode-collapse-header');
      const body = node.querySelector('.bbcode-collapse-body');
      if (body) body.style.height = '';
      if (header) {
        header.classList.remove('bbcode-collapse-header-down'); header.classList.add('bbcode-collapse-header-up');
        const icon = header.querySelector('i');
        if (icon) { icon.classList.remove('fa-chevron-down'); icon.classList.add('fa-chevron-up'); }
      }
    });
    frame.scrollTop = state.top; frame.scrollLeft = state.left;
  }
  function update(preview, frame, code, render, key, revision) {
    let entry = previews.get(preview);
    if (!entry) { entry = {views: new Map()}; previews.set(preview, entry); }
    if (entry.key !== undefined) entry.views.set(entry.key, capture(preview, frame));
    if (entry.key === key && entry.code === code && entry.revision === revision) return;
    const rendered = render(code);
    preview.firstElementChild?.cleanup?.();
    preview.replaceChildren(rendered);
    restore(preview, frame, entry.views.get(key));
    entry.key = key; entry.code = code; entry.revision = revision;
  }
  globalThis.FolioPreview = {update};
})();
