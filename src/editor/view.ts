import { source, $ } from '../app/dom';
import { state } from '../app/state';
import { syncFromEditor, syncName } from './sync';
import { commitEdit, undoEdit, redoEdit } from './history';

export const selectionCaret = document.createElement('div');

export let selectionCaretPosition = '';

export function updateSelectionCaret() {
  selectionCaret.hidden = document.activeElement !== source;
  if (selectionCaret.hidden) {
    selectionCaretPosition = '';
    return;
  }
  selectionCaret.classList.toggle('is-insertion', source.selectionStart === source.selectionEnd);
  const layer = $('sourceHighlight'),
    walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  const offset =
    source.selectionDirection === 'backward' ? source.selectionStart : source.selectionEnd;
  let remaining = offset,
    node;
  while ((node = walker.nextNode())) {
    if (remaining >= node.length) {
      remaining -= node.length;
      continue;
    }
    // A collapsed DOM range can resolve to the preceding visual row at a soft
    // wrap. Measure the following glyph so the caret marks where typing inserts.
    const range = document.createRange();
    range.setStart(node, remaining);
    range.setEnd(node, remaining + 1);
    const rect = range.getClientRects()[0];
    if (!rect) {
      selectionCaret.hidden = true;
      return;
    }
    range.collapse(true);
    const boundary = range.getClientRects()[0];
    // Preserve the leading edge of right-to-left runs when the boundary belongs
    // to this glyph, but reject the preceding-row position at a soft wrap.
    const left =
      boundary &&
      Math.abs(boundary.top - rect.top) < 1 &&
      boundary.left >= rect.left - 1 &&
      boundary.left <= rect.right + 1
        ? boundary.left
        : rect.left;
    const box = selectionCaret.getBoundingClientRect(),
      bar = selectionCaret.firstElementChild as HTMLElement;
    bar.style.left = left - box.left + 'px';
    bar.style.top = rect.top - box.top + 'px';
    bar.style.height = rect.height + 'px';
    const position = [offset, left, rect.top, source.selectionStart, source.selectionEnd].join(':');
    if (position !== selectionCaretPosition) {
      selectionCaretPosition = position;
      for (const animation of bar.getAnimations()) animation.currentTime = 0;
    }
    return;
  }
  selectionCaret.hidden = true;
}

export function updateActiveSyntax() {
  updateSelectionCaret();
  FolioSyntax.markActive($('sourceHighlight'), source.selectionStart);
  const line = source.value.slice(0, source.selectionStart).split('\n').length;
  for (const number of $('sourceLineNumbers').children)
    number.classList.toggle('active', Number((number as HTMLElement).dataset.line) === line);
}

export function updateLineNumbers() {
  const layer = $('sourceHighlight'),
    numbers = $('sourceLineNumbers');
  const anchors = layer.querySelectorAll<HTMLElement>('.source-line-anchor');
  layer.style.paddingBottom = getComputedStyle(source).paddingBottom;
  source.parentElement.style.setProperty(
    '--gutter-width',
    Math.max(36, String(anchors.length).length * 7 + 15) + 'px',
  );
  layer.style.width = source.clientWidth + 2 + 'px';
  const fragment = document.createDocumentFragment();
  for (const anchor of anchors) {
    const number = document.createElement('span');
    number.className = 'source-line-number';
    number.textContent = anchor.dataset.line;
    (number as HTMLElement).dataset.line = anchor.dataset.line;
    number.style.top = anchor.offsetTop + 'px';
    fragment.appendChild(number);
  }
  numbers.replaceChildren(fragment);
  numbers.style.top = '0px';
  // Content changes and rewrapping can clamp the textarea's scroll position.
  // Synchronize both layers before measuring the gutter's baseline.
  syncHighlightScroll();
  // Align glyph bottoms, then lift the smaller digits for optical alignment.
  if (anchors.length && numbers.firstChild) {
    const range = document.createRange();
    range.selectNodeContents(numbers.firstChild);
    const delta = range.getBoundingClientRect().bottom - anchors[0].getBoundingClientRect().bottom;
    numbers.style.top = -delta - 1 + 'px';
  }
  updateActiveSyntax();
}

export function syncHighlightScroll() {
  const layer = $('sourceHighlight');
  layer.style.width = source.clientWidth + 2 + 'px';
  // The textarea and pre can differ by a final line box after wrapping or
  // browser layout rounding. Give the overlay enough scroll range at EOF.
  const missing = source.scrollTop - (layer.scrollHeight - layer.clientHeight);
  if (missing > 0)
    layer.style.paddingBottom =
      parseFloat(getComputedStyle(layer).paddingBottom) + missing + 1 + 'px';
  layer.scrollTop = source.scrollTop;
  layer.scrollLeft = source.scrollLeft;
  FolioSyntax.paintActive(layer);
  $('sourceLineNumbers').style.transform = 'translateY(' + -layer.scrollTop + 'px)';
  updateSelectionCaret();
}

export function initializeEditorView() {
  selectionCaret.className = 'source-selection-caret';
  selectionCaret.setAttribute('aria-hidden', 'true');

  selectionCaret.hidden = true;
  source.parentElement.appendChild(selectionCaret);

  selectionCaret.appendChild(document.createElement('span'));

  document.addEventListener('selectionchange', updateSelectionCaret);

  source.addEventListener('focus', updateSelectionCaret);

  source.addEventListener('blur', updateSelectionCaret);

  source.addEventListener('scroll', syncHighlightScroll);

  source.addEventListener('select', updateActiveSyntax);

  source.addEventListener('keyup', updateActiveSyntax);

  source.addEventListener('click', updateActiveSyntax);

  new ResizeObserver(() => {
    updateLineNumbers();
    syncHighlightScroll();
  }).observe(source);

  source.addEventListener('input', (e) => {
    syncFromEditor();
    commitEdit('typing', (e as InputEvent).inputType || 'input');
  });

  // Some browsers dispatch historyUndo/historyRedo beforeinput rather than keydown.
  source.addEventListener('beforeinput', (e) => {
    if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
      e.preventDefault();
      (e.inputType === 'historyUndo' ? undoEdit : redoEdit)();
    }
  });

  $('profileName').addEventListener('input', () => {
    if (state.templateSession) syncName();
  });

  $('profileName').addEventListener('change', () => {
    if (!state.templateSession) syncName();
  });
}
