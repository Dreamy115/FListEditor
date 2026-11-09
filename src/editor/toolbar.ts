import { addLine, wrapInline, replaceRange } from './editing';
import { $, source } from '../app/dom';
import { state } from '../app/state';
import { colorSafe, colorNames } from '../formatting/colors';
import { fontStyles, applyFont } from '../formatting/fonts';
import { rememberSelection, commitEdit } from './history';
import { convertEntityPreference } from '../formatting/entity-preference';
import { refresh } from '../preview/preview';
import { persist } from '../app/notifications';
import { syncHighlightScroll } from './view';

export const palette = $('colorPalette');

export function wrapColor(name: string) {
  if (!colorSafe(name)) return;
  if (!state.data.mixed) {
    wrapInline('color=' + name);
    return;
  }
  const s = source.selectionStart,
    e = source.selectionEnd,
    chosen = source.value.slice(s, e) || 'your text';
  const block = chosen.includes('\n');
  const lead = block && s > 0 && source.value[s - 1] !== '\n' ? '\n' : '';
  const tail = block && e < source.value.length && source.value[e] !== '\n' ? '\n' : '';
  const prefix = lead + (block ? ':::color ' + name + '\n' : '{color:' + name + '|'),
    suffix = block ? '\n:::' + tail : '}';
  replaceRange(
    prefix + chosen + suffix,
    s,
    e,
    s + prefix.length,
    s + prefix.length + chosen.length,
  );
}

export const colorHint = document.createElement('span');

export const quickColorKeys: Record<string, string> = {
  r: 'red',
  o: 'orange',
  y: 'yellow',
  g: 'green',
  c: 'cyan',
  b: 'blue',
  p: 'purple',
  i: 'pink',
  k: 'black',
  n: 'brown',
  w: 'white',
  a: 'gray',
};

export const quickColorPicker = document.createElement('div');

export const quickColorHint = document.createElement('div');

export let quickColorSelection: [number, number, 'forward' | 'backward' | 'none'] | null = null;

export function closeQuickColor(restore = false) {
  quickColorPicker.hidden = true;
  if (restore && quickColorSelection) {
    source.focus({ preventScroll: true });
    source.setSelectionRange(...quickColorSelection);
  }
  quickColorSelection = null;
}

export function applyQuickColor(name: string) {
  closeQuickColor(true);
  wrapColor(name);
}

export function positionQuickColor() {
  const bounds = source.getBoundingClientRect(),
    layer = $('sourceHighlight');
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
  let remaining =
      source.selectionDirection === 'backward' ? source.selectionStart : source.selectionEnd,
    node,
    anchor;
  while ((node = walker.nextNode())) {
    if (remaining > node.textContent!.length) {
      remaining -= node.textContent!.length;
      continue;
    }
    const range = document.createRange();
    range.setStart(node, remaining);
    range.collapse(true);
    anchor = range.getClientRects()[0];
    if (anchor) break;
  }
  const box = quickColorPicker.getBoundingClientRect(),
    margin = 8;
  const left = anchor ? anchor.left : bounds.left + 20,
    top = anchor ? anchor.bottom : bounds.top + 20;
  quickColorPicker.style.left =
    Math.max(margin, Math.min(left, window.innerWidth - box.width - margin)) + 'px';
  quickColorPicker.style.top =
    Math.max(margin, Math.min(top + 4, window.innerHeight - box.height - margin)) + 'px';
}

export function selectedColorBody(text: string) {
  const opening = state.data.mixed
    ? text.match(/^\{color:[^|{}\n]+\|/i)
    : text.match(/^\[color=[^\]\n]+\]/i);
  if (opening) {
    if (state.data.mixed) {
      let depth = 1;
      for (let i = opening[0].length; i < text.length; i++) {
        if (text[i] === '\\') {
          i++;
          continue;
        }
        if (text[i] === '{') depth++;
        if (text[i] === '}' && !--depth)
          return i === text.length - 1 ? text.slice(opening[0].length, i) : null;
      }
    } else {
      let depth = 1;
      const tags = /\[color=[^\]\n]+\]|\[\/color\]|\[noparse\][\s\S]*?\[\/noparse\]/gi;
      tags.lastIndex = opening[0].length;
      let match;
      while ((match = tags.exec(text))) {
        if (/^\[noparse\]/i.test(match[0])) continue;
        if (/^\[color=/i.test(match[0])) depth++;
        else if (!--depth)
          return tags.lastIndex === text.length ? text.slice(opening[0].length, match.index) : null;
      }
    }
  }
  if (state.data.mixed) {
    const block = text.match(/^:::color[ \t]+[^\n]+\n([\s\S]*)\n:::$/i);
    if (block) {
      let depth = 1;
      for (const line of block[1].split('\n')) {
        if (/^:::[ \t]*$/.test(line)) {
          if (!--depth) return null;
        } else if (/^:::[a-z]/i.test(line)) depth++;
      }
      if (depth === 1) return block[1];
    }
  }
  return null;
}

export function unwrapSelectedColor() {
  const start = source.selectionStart,
    end = source.selectionEnd;
  if (start === end) return false;
  let from = start,
    to = end,
    body = selectedColorBody(source.value.slice(from, to));
  // Also toggle a wrapper when just its entire body is selected, as after insertion.
  if (body === null) {
    const before = source.value.slice(0, start),
      after = source.value.slice(end);
    const opening = state.data.mixed
      ? before.match(/\{color:[^|{}\n]+\|$/i)
      : before.match(/\[color=[^\]\n]+\]$/i);
    const closing = state.data.mixed ? after.match(/^\}/) : after.match(/^\[\/color\]/i);
    const blockOpening = state.data.mixed && before.match(/(?:^|\n)(:::color[^\n]+\n)$/i);
    const blockClosing = state.data.mixed && after.match(/^\n:::(?=\n|$)/);
    if (opening && closing) {
      from -= opening[0].length;
      to += closing[0].length;
    } else if (blockOpening && blockClosing) {
      from -= blockOpening[1].length;
      to += blockClosing[0].length;
    } else return false;
    body = selectedColorBody(source.value.slice(from, to));
  }
  if (body === null) return false;
  replaceRange(body, from, to, from, from + body.length);
  return true;
}

export function openQuickColor() {
  if (unwrapSelectedColor()) return;
  state.diagnosticHover?.hide();
  quickColorSelection = [source.selectionStart, source.selectionEnd, source.selectionDirection];
  quickColorPicker.hidden = false;
  positionQuickColor();
  quickColorPicker.querySelector('button')!.focus({ preventScroll: true });
}

export const fontPalette = $('fontPalette');

export function wrapFont(name: string) {
  if (!Object.hasOwn(fontStyles, name)) return;
  const start = source.selectionStart,
    end = source.selectionEnd,
    chosen = source.value.slice(start, end) || 'your text';
  const multiline = chosen.includes('\n'),
    prefix = multiline ? ':::font ' + name + '\n' : '{font:' + name + '|',
    suffix = multiline ? '\n:::' : '}',
    text = state.data.mixed ? prefix + chosen + suffix : applyFont(chosen, name);
  replaceRange(
    text,
    start,
    end,
    state.data.mixed ? start + prefix.length : start,
    state.data.mixed ? start + prefix.length + chosen.length : start + text.length,
  );
}

export function initializeToolbar() {
  document.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) =>
    btn.addEventListener('click', () => {
      switch (btn.dataset.action) {
        case 'divider':
          addLine(state.data.mixed ? '---' : '[hr]');
          break;
        case 'details':
          addLine(state.data.mixed ? '**Field:** Details' : '[b]Field:[/b] Details');
          break;
      }
    }),
  );

  colorNames.forEach((name: string) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'palette-option';
    btn.title = 'Apply F-List ' + name;
    btn.setAttribute('aria-label', 'Apply ' + name + ' text color');
    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.setProperty('--swatch', 'var(--flist-' + name + ')');
    btn.append(swatch, document.createTextNode(name));
    btn.addEventListener('click', () => {
      wrapColor(name);
      palette.hidden = true;
      $('colorBtn').setAttribute('aria-expanded', 'false');
    });
    palette.append(btn);
  });
  colorHint.className = 'palette-hint';
  colorHint.textContent = 'F-List named presets only';
  palette.append(colorHint);

  $('colorBtn').addEventListener('click', () => {
    palette.hidden = !palette.hidden;
    $('colorBtn').setAttribute('aria-expanded', String(!palette.hidden));
  });

  quickColorPicker.className = 'quick-color-picker';
  quickColorPicker.hidden = true;

  quickColorPicker.setAttribute('role', 'dialog');
  quickColorPicker.setAttribute('aria-label', 'Quick color picker');
  quickColorHint.className = 'quick-color-hint';
  quickColorHint.textContent = 'Press a letter to apply · Esc to cancel';
  quickColorPicker.append(quickColorHint);

  for (const [key, name] of Object.entries(quickColorKeys)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-option';
    const swatch = document.createElement('span');
    swatch.className = 'color-swatch';
    swatch.style.setProperty('--swatch', 'var(--flist-' + name + ')');
    const label = document.createElement('span');
    label.textContent = key.toUpperCase() + ' · ' + name;
    button.append(swatch, label);
    button.addEventListener('click', () => applyQuickColor(name));
    quickColorPicker.append(button);
  }

  document.body.append(quickColorPicker);

  quickColorPicker.addEventListener('keydown', (event) => {
    if (event.isComposing) return;
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeQuickColor(true);
      return;
    }
    const color = quickColorKeys[event.key.toLowerCase()];
    if (color && !event.altKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      applyQuickColor(color);
      return;
    }
    if (event.key === 'Tab') closeQuickColor();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!quickColorPicker.hidden && !quickColorPicker.contains(event.target as Node))
      closeQuickColor();
  });

  document.addEventListener('focusin', (event) => {
    if (!quickColorPicker.hidden && !quickColorPicker.contains(event.target as Node))
      closeQuickColor();
  });

  source.addEventListener('scroll', () => closeQuickColor());

  window.addEventListener('resize', () => closeQuickColor(true));

  for (const [name, style] of Object.entries(fontStyles)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-option';
    button.textContent = applyFont(style.label, name);
    button.setAttribute('aria-label', 'Apply ' + style.label + ' font');
    button.addEventListener('click', () => {
      wrapFont(name);
      fontPalette.hidden = true;
      $('fontBtn').setAttribute('aria-expanded', 'false');
    });
    fontPalette.append(button);
  }

  $('fontBtn').addEventListener('click', () => {
    fontPalette.hidden = !fontPalette.hidden;
    $('fontBtn').setAttribute('aria-expanded', String(!fontPalette.hidden));
  });

  $('preferLiterals').addEventListener('change', (event) => {
    rememberSelection();
    const scrollTop = source.scrollTop,
      scrollLeft = source.scrollLeft;
    state.data.preferLiterals = (event.target as HTMLInputElement).checked;
    if (state.data.mixed) {
      const converted = convertEntityPreference(source.value, state.data.preferLiterals);
      if (converted !== source.value)
        replaceRange(
          converted,
          0,
          source.value.length,
          Math.min(source.selectionStart, converted.length),
          Math.min(source.selectionEnd, converted.length),
        );
    }
    commitEdit('action');
    refresh();
    persist();
    const value = source.value,
      start = source.selectionStart,
      end = source.selectionEnd;
    const restoreScroll = () => {
      source.scrollTop = scrollTop;
      source.scrollLeft = scrollLeft;
      syncHighlightScroll();
    };
    restoreScroll();
    // Browsers may reveal the caret after the focused textarea is rewritten.
    requestAnimationFrame(() => {
      if (source.value === value && source.selectionStart === start && source.selectionEnd === end)
        restoreScroll();
    });
  });
}
