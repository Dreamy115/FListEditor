import { macroInlineNames } from './tags';
import { fontStyles, applyFont, compileCollapseTitle } from './fonts';
import { resolvedColor } from './colors';
import { safeUrl } from './urls';

import { decodeCharacterReference } from './entities';

export function literalBBContent(text: string) {
  // Split both forms: closers terminate the wrapper, while openers can make
  // the renderer consume the wrapper's closer as part of a nested literal tag.
  return text.replace(
    /\[\/?noparse\]/gi,
    (tag: string) => '[[/noparse]' + tag.slice(1) + '[noparse]',
  );
}

export function literalBBCode(text: string) {
  return '[noparse]' + literalBBContent(text) + '[/noparse]';
}

export function transformInlineLiterals(
  text: string,
  transform: (value: string, literal: string) => string,
) {
  let output = '';
  for (let i = 0; i < text.length;) {
    if (text[i] === '\\' && i + 1 < text.length) {
      output += text.slice(i, i + 2);
      i += 2;
      continue;
    }
    const macro = text.slice(i).match(/^\{noparse\|/i);
    if (macro) {
      let depth = 1,
        j = i + macro[0].length;
      for (; j < text.length && text[j] !== '\n' && depth; j++) {
        if (text[j] === '{' && text[j - 1] !== '\\') depth++;
        else if (text[j] === '}' && text[j - 1] !== '\\') depth--;
      }
      if (!depth) {
        output += transform(text.slice(i, j), text.slice(i + macro[0].length, j - 1));
        i = j;
        continue;
      }
    }
    if (text[i] === '`') {
      const run = text.slice(i).match(/^`+/)![0];
      let j = i + run.length,
        matched = false;
      while (j < text.length && text[j] !== '\n') {
        if (text[j] !== '`') {
          j++;
          continue;
        }
        const closing = text.slice(j).match(/^`+/)![0];
        if (closing.length === run.length && j > i + run.length) {
          const end = j + run.length;
          output += transform(text.slice(i, end), text.slice(i + run.length, j));
          i = end;
          matched = true;
          break;
        }
        j += closing.length;
      }
      if (matched) continue;
      output += run;
      i += run.length;
      continue;
    }
    output += text[i++];
  }
  return output;
}

export function inlineMarkdown(text: string, protectedParts: string[] = [], issues: string[] = []) {
  const warn = (message: string) => issues.push(message);
  const protect = (value: string) => {
    const id = protectedParts.length;
    protectedParts.push(value);
    return '\uE000' + id + '\uE001';
  };
  // Shield literal inline code before interpreting any BBCode or custom macros.
  text = transformInlineLiterals(text, (_, literal: string) => protect(literalBBCode(literal)));
  // Explicitly escaped bracket expressions stay literal even for known tags.
  text = text.replace(/(\\+)(\[[^\[\]\n]*\])/g, (_, slashes, literal: string) =>
    slashes.length % 2 ? slashes.slice(0, -1) + protect(literalBBCode(literal)) : slashes + literal,
  );
  // Support nested inline macros, e.g. {color:purple|**bright**}.
  let output = '';
  for (let i = 0; i < text.length;) {
    if (text[i] === '\\' && i + 1 < text.length && /[{}*_~+`\[\]\\#>\-]/.test(text[i + 1])) {
      output += protect(text[i + 1]);
      i += 2;
      continue;
    }
    if (text[i] !== '{') {
      output += text[i++];
      continue;
    }
    let depth = 1,
      j = i + 1;
    for (; j < text.length && depth; j++) {
      if (text[j] === '{' && text[j - 1] !== '\\') depth++;
      else if (text[j] === '}' && text[j - 1] !== '\\') depth--;
    }
    if (depth) {
      if (/^[a-z][a-z0-9_-]*(?=[:|}\s]|$)/i.test(text.slice(i + 1)))
        warn('Unclosed inline macro: ' + text.slice(i));
      output += text[i++];
      continue;
    }
    const expression = text.slice(i + 1, j - 1),
      m = expression.match(/^([a-z]+)(:([^|]*))?(?:\|([\s\S]*))?$/i);
    if (!m || !macroInlineNames.has(m[1].toLowerCase())) {
      warn('Invalid or unknown inline macro: ' + text.slice(i, j) + '; exported as literal text');
      output += text.slice(i, j);
      i = j;
      continue;
    }
    const name = m[1].toLowerCase(),
      arg = (m[3] || '').trim(),
      body = m[4];
    let compiled = null;
    if (name === 'br' && body === undefined && !arg) compiled = '\n';
    else if (name === 'hr' && body === undefined && !arg) compiled = '[hr]';
    else if (name === 'font' && body !== undefined && Object.hasOwn(fontStyles, arg.toLowerCase()))
      compiled = applyFont(inlineMarkdown(body, [], issues), arg.toLowerCase());
    else if (name === 'color' && body !== undefined) {
      const color = resolvedColor(arg);
      const content = inlineMarkdown(body, protectedParts, issues);
      compiled = color ? '[color=' + color + ']' + content + '[/color]' : content;
    } else if (
      [
        'b',
        'i',
        's',
        'big',
        'small',
        'u',
        'underline',
        'sup',
        'sub',
        'noparse',
        'heading',
        'center',
        'left',
        'right',
        'justify',
        'indent',
        'quote',
        'collapse',
      ].includes(name) &&
      body !== undefined
    ) {
      let tag = name === 'underline' ? 'u' : name;
      compiled =
        '[' +
        tag +
        (tag === 'collapse' && arg ? '=' + compileCollapseTitle(arg) : '') +
        ']' +
        (name === 'noparse'
          ? literalBBContent(body)
          : inlineMarkdown(body, protectedParts, issues)) +
        '[/' +
        tag +
        ']';
    } else if (
      ['user', 'icon', 'eicon'].includes(name) &&
      arg &&
      body === undefined &&
      !/[\[\]{}]/.test(arg)
    )
      compiled = '[' + name + ']' + arg + '[/' + name + ']';
    else if (['img', 'image'].includes(name) && arg) {
      if (/^\d+$/.test(arg))
        compiled = '[img=' + arg + ']' + (body === undefined ? '' : body) + '[/img]';
      else if (body === undefined && safeUrl(arg)) compiled = '[img]' + arg + '[/img]';
    } else if (name === 'link' && safeUrl(arg) && body !== undefined)
      compiled = '[url=' + arg + ']' + inlineMarkdown(body, protectedParts, issues) + '[/url]';
    if (compiled === null)
      warn('Invalid inline macro: ' + text.slice(i, j) + '; exported as literal text');
    output += compiled === null ? text.slice(i, j) : protect(compiled);
    i = j;
  }
  text = output;
  text = text.replace(/<(https?:\/\/[^<>\s]+)>/gi, (match, url) =>
    safeUrl(url) ? protect('[url]' + url + '[/url]') : match,
  );
  // Protect links and images, and ensure only valid http(s) URLs are exported.
  text = text.replace(/!?\[([^\]\n]*)\]\((https?:\/\/[^\s)]+)\)/gi, (match, label: string, url) => {
    if (!safeUrl(url)) return match;
    return protect(
      match.startsWith('!')
        ? '[img]' + url + '[/img]'
        : '[url=' + url + ']' + inlineMarkdown(label, protectedParts, issues) + '[/url]',
    );
  });
  // Decode once, after parsing syntax, so encoded delimiters remain literal.
  text = text.replace(/&(?:#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi, (reference) => {
    const char = decodeCharacterReference(reference);
    return char === null ? reference : protect(/[\[\]]/.test(char) ? literalBBCode(char) : char);
  });
  // Remaining bracket expressions are prose, not supported BBCode or links.
  text = text.replace(/\[[^\[\]\n]*\]/g, (literal: string) => protect(literalBBCode(literal)));
  text = text
    .replace(/\*\*\*([^*\n]+)\*\*\*/g, '[b][i]$1[/i][/b]')
    .replace(/\*\*([^*\n]+)\*\*/g, '[b]$1[/b]')
    .replace(/__([^_\n]+)__/g, '[b]$1[/b]')
    .replace(/~~([^~\n]+)~~/g, '[s]$1[/s]')
    .replace(/\+\+([^+\n]+)\+\+/g, '[u]$1[/u]')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '[i]$1[/i]')
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, '[i]$1[/i]');
  let revealed = text;
  for (let n = 0; n < 16 && revealed.includes('\uE000'); n++) {
    const next = revealed.replace(
      /\uE000(\d+)\uE001/g,
      (_, id: string) => protectedParts[+id] ?? '',
    );
    if (next === revealed) break;
    revealed = next;
  }
  return revealed;
}
