// Horizon/Folio renderer bridge. MPL-2.0; upstream notices are in vendor/horizon.
import { StandardBBCodeParser, BBCodeTextTag, analyzeUrlTag } from '../build/horizon';
import { safeURL } from './horizon-adapter';

const parser = new StandardBBCodeParser();
// Standalone previews have no profile API response mapping IDs to image hashes.
const imageTag = parser.getTag('img');
parser.addTag(
  new BBCodeTextTag('img', (p, parent, param: string, content) => {
    const local = /^\d+$/.test(param) && globalThis.FolioLocalImages?.get(param);
    if (local) {
      const image = document.createElement('img');
      image.src = local.url;
      image.alt = content || local.alias || 'Local preview for F-List image #' + param;
      image.className = 'inline-image local-inline-image';
      image.dataset.localInlineId = param;
      image.dataset.inlineAlias = content;
      image.title =
        'Edit preview mapping for F-List image #' +
        param +
        '. Local preview only; final inlines may look different.';
      image.setAttribute('role', 'button');
      image.tabIndex = 0;
      image.setAttribute('aria-label', 'Edit image mapping for F-List image ' + param);
      const block = document.createElement('div');
      block.className = 'inline-image-block';
      block.appendChild(image);
      parent.appendChild(block);
      return block;
    }
    if (parser.inlines?.[param]) return imageTag!.createElement(p, parent, param, content);
    const url = safeURL(content);
    const el = document.createElement(!param && url ? 'img' : 'span');
    if (!param && url) {
      (el as HTMLImageElement).src = url;
      (el as HTMLImageElement).alt = 'Profile image';
      el.className = 'profileimg';
    } else {
      el.className = 'placeholder-image';
      el.textContent =
        'F-List image #' + param + (content ? ' · ' + content : '') + ' (metadata unavailable)';
    }
    if (/^\d+$/.test(param)) {
      el.dataset.localInlineId = param;
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.dataset.inlineAlias = content;
      el.title = 'Attach a preview image to F-List image #' + param;
      el.setAttribute('aria-label', 'Add image mapping for F-List image ' + param);
    }
    parent.appendChild(el);
    return el;
  }),
);
globalThis.FolioHorizon = {
  render: (input: string) => parser.parseEverything(input),
  allowsChild: (parent, child) => parser.getTag(parent)?.isAllowed(child) !== false,
  validURL: (value: string) => analyzeUrlTag(parser, value, '').success && !!safeURL(value),
};
