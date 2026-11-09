// F-List accepts exactly these twelve named colors, not arbitrary CSS hex codes.
export const presetColors: Record<string, string> = {
  red: '#f00',
  orange: '#f60',
  yellow: '#ff0',
  green: '#0f0',
  cyan: '#0ff',
  purple: '#93f',
  blue: '#06f',
  pink: '#f9c',
  black: '#000',
  brown: '#8a6d3b',
  white: '#fff',
  gray: '#ccc',
};

export const colorNames = Object.keys(presetColors);

export function colorSafe(param: string | undefined) {
  const name = String(param || '')
    .trim()
    .toLowerCase();
  return Object.hasOwn(presetColors, name) ? name : null;
}

export function hexRGB(hex: string) {
  const raw = String(hex || '')
    .trim()
    .replace(/^#/, '');
  if (!/^(?:[a-f0-9]{3}|[a-f0-9]{6})$/i.test(raw)) return null;
  const h = raw.length === 3 ? [...raw].map((c) => c + c).join('') : raw;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export function closestPreset(hex: string) {
  const rgb = hexRGB(hex);
  if (!rgb) return null;
  let best = null,
    dist = Infinity;
  for (const name of colorNames) {
    const candidate = hexRGB(presetColors[name])!;
    const d = rgb.reduce((sum, part: number, i) => sum + Math.pow(part - candidate[i], 2), 0);
    if (d < dist) {
      dist = d;
      best = name;
    }
  }
  return best;
}

export function resolvedColor(value: string) {
  return colorSafe(value) || closestPreset(value ?? '');
}

// Existing drafts may contain old hex colors or arbitrary [color=...] tags.
// Normalize on output without changing the original text until a mode switch.
export function normalizeColorTags(text: string) {
  const re = /\[(\/)?(color|noparse)(?:=([^\]\n]*))?\]/gi;
  let out = '',
    last = 0,
    insideLiteral = false;
  const stack = [];
  let m;
  while ((m = re.exec(text))) {
    out += text.slice(last, m.index);
    last = re.lastIndex;
    const close = !!m[1],
      tag = m[2].toLowerCase();
    if (tag === 'noparse') {
      out += m[0];
      insideLiteral = !close;
      continue;
    }
    if (insideLiteral) {
      out += m[0];
      continue;
    }
    if (close) {
      out += stack.length ? (stack.pop() ? '[/color]' : '') : '';
      continue;
    }
    const name = resolvedColor(m[3]);
    stack.push(!!name);
    out += name ? '[color=' + name + ']' : '';
  }
  return out + text.slice(last);
}

export function colorWarning(value: string | undefined) {
  if (colorSafe(value)) return null;
  const label = String(value || '').trim() || '(missing value)',
    preset = closestPreset(value ?? '');
  return preset
    ? 'Color ' + label + ' is not supported by F-List profiles; exported as ' + preset
    : 'Color ' + label + ' is not supported by F-List profiles; formatting is stripped on export';
}

export function colorWarnings(text: string, mixed: boolean = true) {
  const issues: string[] = [];
  // Literal examples are not color definitions.
  if (!mixed) text = text.replace(/\[noparse\][\s\S]*?(?:\[\/noparse\]|$)/gi, '');
  if (mixed)
    text = text
      .replace(/^\s*```[^\n]*\n[\s\S]*?(?:^\s*```[^\n]*(?:\n|$)|(?![\s\S]))/gm, '')
      .replace(/`[^`\n]+`/g, '');
  const check = (value: string) => {
    const warning = colorWarning(value);
    if (warning) issues.push(warning);
  };
  if (!mixed) for (const m of text.matchAll(/\[color(?:=([^\]\n]*))?\]/gi)) check(m[1]);
  if (mixed) {
    for (const m of text.matchAll(/\{color(?::([^|}\n]*))?\|/gi)) check(m[1]);
    for (const m of text.matchAll(/^\s*:::color(?:[ \t]+([^\n]*))?$/gim)) check(m[1]);
  }
  return [...new Set(issues)];
}
