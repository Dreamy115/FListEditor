import { escapePlainMarkdown } from './escaping';

// Unicode alphabets export as ordinary text, without unsupported [font] tags.
export const fontAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function unicodeAlphabet(
  upper: number,
  lower: number,
  digits: number | null = null,
  exceptions: Record<string, string> = {},
) {
  return [...fontAlphabet].map(
    (char, index) =>
      exceptions[char] ||
      String.fromCodePoint(
        index < 26
          ? upper + index
          : index < 52
            ? lower + index - 26
            : digits === null
              ? char.codePointAt(0)
              : digits + index - 52,
      ),
  );
}

export const fontStyles = {
  smallcaps: {
    label: 'Small caps',
    chars: [
      ...('ABCDEFGHIJKLMNOPQRSTUVWXYZ\u1d00\u0299\u1d04\u1d05\u1d07\ua730\u0262\u029c\u026a\u1d0a\u1d0b\u029f\u1d0d\u0274\u1d0f\u1d18\ua7af\u0280\ua731\u1d1b\u1d1c\u1d20\u1d21x\u028f\u1d22' +
        '0123456789'),
    ],
  },
  bold: {
    label: 'Bold Unicode',
    chars: [
      ...Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x1d400 + i)),
      ...Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x1d41a + i)),
      ...Array.from({ length: 10 }, (_, i) => String.fromCodePoint(0x1d7ce + i)),
    ],
  },
  doublestruck: {
    label: 'Double-struck',
    chars: [
      ...Array.from(
        { length: 26 },
        (_, i) =>
          ({
            2: '\u2102',
            7: '\u210d',
            13: '\u2115',
            15: '\u2119',
            16: '\u211a',
            17: '\u211d',
            25: '\u2124',
          })[i] || String.fromCodePoint(0x1d538 + i),
      ),
      ...Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x1d552 + i)),
      ...Array.from({ length: 10 }, (_, i) => String.fromCodePoint(0x1d7d8 + i)),
    ],
  },
  italic: {
    label: 'Italic Unicode',
    chars: unicodeAlphabet(0x1d434, 0x1d44e, null, { h: '\u210e' }),
  },
  bolditalic: { label: 'Bold italic Unicode', chars: unicodeAlphabet(0x1d468, 0x1d482) },
  sans: { label: 'Sans serif', chars: unicodeAlphabet(0x1d5a0, 0x1d5ba, 0x1d7e2) },
  sansbold: { label: 'Sans serif bold', chars: unicodeAlphabet(0x1d5d4, 0x1d5ee, 0x1d7ec) },
  fraktur: {
    label: 'Fraktur',
    chars: unicodeAlphabet(0x1d504, 0x1d51e, null, {
      C: '\u212d',
      H: '\u210c',
      I: '\u2111',
      R: '\u211c',
      Z: '\u2128',
    }),
  },
  monospace: {
    label: 'Monospace',
    chars: [
      ...Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x1d670 + i)),
      ...Array.from({ length: 26 }, (_, i) => String.fromCodePoint(0x1d68a + i)),
      ...Array.from({ length: 10 }, (_, i) => String.fromCodePoint(0x1d7f6 + i)),
    ],
  },
  fullwidth: {
    label: 'Fullwidth',
    chars: [...fontAlphabet].map((c) => String.fromCodePoint(c.charCodeAt(0) + 0xfee0)),
  },
};

export function applyFont(text: string, name: string) {
  const style = fontStyles[name];
  if (!style) return text;
  // Preserve syntax, URLs, image labels and literal text; collapse titles are visible text.
  const transform = (value) =>
    [...value]
      .map((c) => {
        const index = fontAlphabet.indexOf(c);
        return index < 0 ? c : style.chars[index];
      })
      .join('');
  return text
    .split(
      /(\[noparse\][\s\S]*?\[\/noparse\]|\[(?:url|img|user|icon|eicon)(?:=[^\]]*)?\][\s\S]*?\[\/(?:url|img|user|icon|eicon)\]|\[[^\]\n]*\])/gi,
    )
    .map((part, i) =>
      i % 2
        ? part.replace(
            /^(\[collapse=)([^\]\n]*)(\])$/i,
            (_, open, title, close) => open + transform(title) + close,
          )
        : transform(part),
    )
    .join('');
}

export function compileCollapseTitle(title: string) {
  // Titles are BBCode parameters: convert Unicode fonts without emitting tags.
  return title.replace(/\{font:([a-z]+)\|([^{}]*)\}/gi, (macro, name, body) =>
    Object.hasOwn(fontStyles, name.toLowerCase()) ? applyFont(body, name.toLowerCase()) : macro,
  );
}

export function decompileFonts(text: string, escapePlain: boolean) {
  const plain = (value) => (escapePlain ? escapePlainMarkdown(value) : value);
  const reverse = new Map();
  for (const [name, style] of Object.entries(fontStyles))
    style.chars.forEach((char, i) => {
      if (char !== fontAlphabet[i]) reverse.set(char, { name, char: fontAlphabet[i] });
    });
  let result = '',
    buffer = '',
    style = null;
  const flush = () => {
    if (buffer) {
      // Spacing and symbols can bridge styled text, but are not trailing font text.
      const trailing = style ? buffer.match(/[\p{Z}\p{S}\t]+$/u)?.[0] || '' : '';
      const body = trailing ? buffer.slice(0, -trailing.length) : buffer;
      result += style && body ? '{font:' + style + '|' + plain(body) + '}' : plain(body);
      result += plain(trailing);
    }
    buffer = '';
  };
  const chars = [...text];
  const unchanged = (char, name) => {
    if (char === '\n' || char === '\r' || reverse.has(char)) return false;
    const index = fontAlphabet.indexOf(char);
    return index < 0 || fontStyles[name].chars[index] === char;
  };
  if (text.includes('\n')) {
    const names = new Set(chars.map((char) => reverse.get(char)?.name).filter(Boolean));
    const styledLines = text
      .split(/\r?\n/)
      .every((line) => !line.trim() || [...line].some((char) => reverse.has(char)));
    if (names.size === 1 && styledLines) {
      const name = [...names][0],
        decoded = chars.map((char) => reverse.get(char)?.char || char).join('');
      if (applyFont(decoded, name) === text)
        return '\uE006:::font ' + name + '\n' + plain(decoded) + '\n:::\uE007';
    }
  }
  for (const char of chars) {
    const entry = reverse.get(char);
    if (!entry && style && unchanged(char, style)) {
      buffer += char;
      continue;
    }
    const next = entry?.name || null;
    if (next !== style) {
      let prefix = '';
      // Greedily recover the unchanged suffix before a styled run, too.
      if (next && !style) {
        const previous = [...buffer];
        let start = previous.length;
        while (start > 0 && unchanged(previous[start - 1], next)) start--;
        // Leading spacing and symbols are decorations, not evidence of a font run.
        while (start < previous.length && /[\p{Z}\p{S}\t]/u.test(previous[start])) start++;
        prefix = previous.slice(start).join('');
        buffer = previous.slice(0, start).join('');
      }
      flush();
      style = next;
      buffer = prefix;
    }
    buffer += entry?.char || char;
  }
  flush();
  return result;
}
