/** Preview sections are keyed by title, ancestry and sibling occurrence. */
type SectionPath = [string, number][];
interface PreviewState {
  top: number;
  left: number;
  sections: { key: string; open: boolean }[];
}
interface PreviewEntry {
  views: Map<string, PreviewState>;
  key?: string;
  code?: string;
  revision?: number;
}
(() => {
  'use strict';
  const previews = new WeakMap<HTMLElement, PreviewEntry>();
  function sections(preview: HTMLElement) {
    const paths = new Map<Element, SectionPath>(),
      counts = new Map<string, number>();
    return [...preview.querySelectorAll<HTMLElement>('.bbcode-collapse')].map((node) => {
      const parent = node.parentElement?.closest('.bbcode-collapse');
      const parentPath = (parent ? paths.get(parent) : undefined) || [];
      const title = node.querySelector('.bbcode-collapse-header')?.textContent || '';
      const group = JSON.stringify([parentPath, title]),
        occurrence = counts.get(group) || 0;
      counts.set(group, occurrence + 1);
      const path: SectionPath = [...parentPath, [title, occurrence]];
      paths.set(node, path);
      return { node, key: JSON.stringify(path) };
    });
  }
  function capture(preview: HTMLElement, frame: Element): PreviewState {
    return {
      top: frame.scrollTop,
      left: frame.scrollLeft,
      sections: sections(preview).map(({ node, key }) => ({
        key,
        open: !node.classList.contains('collapsed'),
      })),
    };
  }
  function restoreSections(preview: HTMLElement, state: PreviewState | undefined) {
    if (!state) return;
    const current = sections(preview),
      previous = new Map(state.sections.map((section) => [section.key, section.open]));
    const currentKeys = new Set(current.map((section) => section.key));
    current.forEach(({ node, key }, index) => {
      // Titles/ancestry survive insertions; position is a fallback for renamed
      // headers only when no insertion/removal has changed the section count.
      let open = previous.get(key);
      if (
        open === undefined &&
        current.length === state.sections.length &&
        !currentKeys.has(state.sections[index].key)
      )
        open = state.sections[index].open;
      if (open !== true) return;
      node.classList.remove('collapsed');
      const header = node.querySelector('.bbcode-collapse-header');
      const body = node.querySelector<HTMLElement>('.bbcode-collapse-body');
      if (body) body.style.height = '';
      if (header) {
        header.classList.remove('bbcode-collapse-header-down');
        header.classList.add('bbcode-collapse-header-up');
        const icon = header.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-chevron-down');
          icon.classList.add('fa-chevron-up');
        }
      }
    });
  }
  function update(
    preview: HTMLElement,
    frame: Element,
    code: string,
    render: (input: string) => HTMLElement,
    key: string,
    revision?: number,
  ) {
    let entry = previews.get(preview);
    if (!entry) {
      entry = { views: new Map() };
      previews.set(preview, entry);
    }
    if (entry.key !== undefined) entry.views.set(entry.key, capture(preview, frame));
    if (entry.key === key && entry.code === code && entry.revision === revision) return;
    const rendered = render(code);
    const state = entry.views.get(key);
    // Restore expanded content before mounting it so layout never sees the
    // temporarily collapsed document and clamps the preview's scroll range.
    const staging = preview.ownerDocument.createElement('div');
    staging.appendChild(rendered);
    restoreSections(staging, state);
    (preview.firstElementChild as HTMLElement | null)?.cleanup?.();
    preview.replaceChildren(...staging.childNodes);
    frame.scrollTop = state?.top || 0;
    frame.scrollLeft = state?.left || 0;
    entry.key = key;
    entry.code = code;
    entry.revision = revision;
  }
  globalThis.FolioPreview = { update };
})();

export {};
