import { source } from '../app/dom';
import { state } from '../app/state';
import { markdownToBB } from '../formatting/markdown';
import { rememberSelection, commitEdit } from './history';
import { syncFromEditor } from './sync';
import { normalizeColorTags } from '../formatting/colors';

export function wrapInline(tag: string, placeholder = 'your text') {
  const s = source.selectionStart,
    e = source.selectionEnd,
    selected = source.value.slice(s, e) || placeholder;
  if (['b', 'i', 'u', 's'].includes(tag) && s !== e) {
    const wrappers = state.data.mixed
      ? [
          ...({ b: ['**', '__'], i: ['*', '_'], u: ['++'], s: ['~~'] } as Record<string, string[]>)[
            tag
          ].map((mark) => [mark, mark]),
          ['{' + tag + '|', '}'],
          ...(tag === 'u' ? [['{underline|', '}']] : []),
          [':::' + tag + '\n', '\n:::'],
        ]
      : [['[' + tag + ']', '[/' + tag + ']']];
    for (const [open, close] of wrappers) {
      for (const included of [true, false]) {
        const from = included ? s : s - open.length,
          to = included ? e : e + close.length;
        if (from < 0 || to > source.value.length) continue;
        const wrapped = source.value.slice(from, to);
        const same = (a: string, b: string) =>
          state.data.mixed ? a === b : a.toLowerCase() === b.toLowerCase();
        if (
          !same(wrapped.slice(0, open.length), open) ||
          !same(wrapped.slice(-close.length), close) ||
          wrapped.length < open.length + close.length
        )
          continue;
        // A single marker inside a two-marker bold delimiter is not italic.
        if (state.data.mixed && tag === 'i' && (open === '*' || open === '_')) {
          let left = from,
            right = from;
          while (left > 0 && source.value[left - 1] === open) left--;
          while (right < source.value.length && source.value[right] === open) right++;
          if ((right - left) % 2 === 0) continue;
        }
        const body = wrapped.slice(open.length, -close.length);
        // Reject adjacent wrappers, escaped markers and incomplete nested containers.
        const compiled = state.data.mixed ? markdownToBB(wrapped) : wrapped.toLowerCase();
        const expected =
          '[' +
          tag +
          ']' +
          (state.data.mixed ? markdownToBB(body) : body.toLowerCase()) +
          '[/' +
          tag +
          ']';
        const combined =
          state.data.mixed && ['b', 'i'].includes(tag) && /^([*]{3}|_{3})[\s\S]+\1$/.test(wrapped);
        if (compiled !== expected && !combined) continue;
        replaceRange(body, from, to, from, from + body.length);
        return;
      }
    }
  }
  let prefix = '[' + tag + ']',
    suffix = '[/' + tag.split('=')[0] + ']',
    block = false;
  if (tag === 'heading2') {
    prefix = '[heading]';
    suffix = '[/heading]';
  }
  if (tag === 'heading') {
    prefix = '[heading][big]';
    suffix = '[/big][/heading]';
  }
  if (state.data.mixed) {
    if (tag === 'quote') {
      const lead = s > 0 && source.value[s - 1] !== '\n' ? '\n' : '';
      const tail = e < source.value.length && source.value[e] !== '\n' ? '\n' : '';
      const quoted = selected
        .split('\n')
        .map((line) => '> ' + line)
        .join('\n');
      replaceRange(
        lead + quoted + tail,
        s,
        e,
        s + lead.length + 2,
        s + lead.length + quoted.length,
      );
      return;
    }
    const marks: Record<string, string> = { b: '**', i: '*', u: '++', s: '~~' };
    if (marks[tag] && !selected.includes('\n')) {
      prefix = marks[tag];
      suffix = marks[tag];
    } else if (tag === 'heading2' && !selected.includes('\n')) {
      prefix = '## ';
      suffix = '';
      block = true;
    } else if (tag === 'heading2') {
      prefix = ':::heading\n';
      suffix = '\n:::';
      block = true;
    } else if (tag === 'heading' && !selected.includes('\n')) {
      prefix = '# ';
      suffix = '';
      block = true;
    } else if (tag === 'big' && !selected.includes('\n')) {
      prefix = '{big|';
      suffix = '}';
    } else if (tag === 'heading') {
      prefix = ':::heading\n:::big\n';
      suffix = '\n:::\n:::';
      block = true;
    } else if (['center', 'right', 'justify'].includes(tag) || selected.includes('\n')) {
      prefix = ':::' + tag + '\n';
      suffix = '\n:::';
      block = true;
    } else {
      prefix = '{' + tag + '|';
      suffix = '}';
    }
  }
  const lead = block && s > 0 && source.value[s - 1] !== '\n' ? '\n' : '';
  const tail = block && e < source.value.length && source.value[e] !== '\n' ? '\n' : '';
  replaceRange(
    lead + prefix + selected + suffix + tail,
    s,
    e,
    s + lead.length + prefix.length,
    s + lead.length + prefix.length + selected.length,
  );
}

export function replaceRange(
  text: string,
  s = source.selectionStart,
  e = source.selectionEnd,
  selStart = s + text.length,
  selEnd = selStart,
) {
  rememberSelection();
  source.focus();
  source.setRangeText(text, s, e, 'end');
  source.setSelectionRange(selStart, selEnd);
  syncFromEditor();
  commitEdit('action');
}

export function addLine(text: string) {
  const s = source.selectionStart,
    e = source.selectionEnd,
    lead = s > 0 && source.value[s - 1] !== '\n' ? '\n' : '',
    tail = e < source.value.length && source.value[e] !== '\n' ? '\n' : '';
  replaceRange(
    lead + text + tail,
    s,
    e,
    s + lead.length + text.length,
    s + lead.length + text.length,
  );
}

export function getCompiled() {
  return normalizeColorTags(state.data.mixed ? markdownToBB(source.value) : source.value);
}
