import { safeUrl } from './urls';
import { escapePlainMarkdown } from './escaping';

import { restoreBBCodeWhitespace, markdownToBBSource, markdownToBB } from './markdown';
import { normalizeColorTags, colorSafe } from './colors';
import { decompileFonts } from './fonts';

/** Lossless BBCode tree: text leaves are separate from root/tag containers. */
interface TextNode {
  text: string;
  tag?: never;
  children?: never;
}
interface TagNode {
  text?: never;
  tag: string | null;
  param?: string;
  children: BBNode[];
  open?: string;
  closed?: boolean;
  unclosed?: boolean;
}
type BBNode = TextNode | TagNode;

export const allowedTags = new Set([
  'b',
  'i',
  'u',
  's',
  'sup',
  'sub',
  'heading',
  'big',
  'small',
  'center',
  'right',
  'left',
  'justify',
  'indent',
  'quote',
  'color',
  'url',
  'collapse',
  'img',
  'user',
  'icon',
  'eicon',
  'noparse',
  'hr',
]);

// Convert a BBCode syntax tree to Extended Markdown. Keep constructs verbatim when
// their Markdown equivalent cannot be compiled back without semantic changes.
export const convertibleTags = new Set([
  'b',
  'i',
  'u',
  's',
  'sup',
  'sub',
  'heading',
  'big',
  'small',
  'center',
  'right',
  'left',
  'justify',
  'indent',
  'quote',
  'color',
  'url',
  'collapse',
  'img',
  'user',
  'icon',
  'eicon',
  'noparse',
  'hr',
]);

export function parseBBCode(input: string) {
  // The stack always retains this root; closing tags never pop its final entry.
  const root: TagNode = { tag: null, children: [] },
    stack = [root],
    token = /\[(\/?)(([a-z]+))(?:=([^\]\n]*))?\]/gi;
  let last = 0,
    m;
  const add = (text: string) => {
    if (text) stack.at(-1)!.children.push({ text });
  };
  while ((m = token.exec(input))) {
    const tag = m[2].toLowerCase(),
      param = m[4] || '',
      close = !!m[1];
    if (!convertibleTags.has(tag)) continue;
    if (stack.at(-1)!.tag === 'noparse' && !(close && tag === 'noparse')) continue;
    if (
      ['user', 'icon', 'eicon', 'img'].includes(stack.at(-1)!.tag ?? '') &&
      !(close && tag === stack.at(-1)!.tag)
    )
      continue;
    add(input.slice(last, m.index));
    last = token.lastIndex;
    if (tag === 'hr' && !close) {
      stack.at(-1)!.children.push({ tag: 'hr', children: [], open: '[hr]' });
      continue;
    }
    if (close) {
      if (stack.length > 1 && stack.at(-1)!.tag === tag) {
        stack.pop();
      } else add(m[0]); // Crossing/unmatched tags must never be silently moved.
    } else {
      const node: TagNode = { tag, param, children: [], open: m[0], closed: false };
      stack.at(-1)!.children.push(node);
      stack.push(node);
    }
  }
  add(input.slice(last));
  // Incomplete BBCode stays literal (including any nested content).
  function mark(node: BBNode): void {
    if (!node.children) return;
    node.children.forEach(mark);
    if (node.tag && stack.includes(node)) node.unclosed = true;
  }
  mark(root);
  return root;
}

export function bbcodeToMarkdown(input: string, escapePlain: boolean = true) {
  return bbcodeToMarkdownSource(restoreBBCodeWhitespace(input), escapePlain);
}

export function bbcodeToMarkdownSource(input: string, escapePlain: boolean = true) {
  // Compare editable layouts before the final output whitespace encoding.
  const markdownToBB = markdownToBBSource;
  const normalized = normalizeColorTags(input),
    tree = parseBBCode(normalized);
  let preserveLayout = false,
    editableLayout = false;
  const blockTags = new Set(['center', 'left', 'right', 'justify', 'indent', 'quote', 'collapse']);
  const raw = (node: BBNode): string =>
    node.text !== undefined
      ? node.text
      : node.tag === 'hr'
        ? '[hr]'
        : node.open +
          node.children.map(raw).join('') +
          (node.unclosed ? '' : '[/' + node.tag + ']');
  const children = (node: TagNode): string => node.children.map(convert).join('');
  const hasBlocks = (node: TagNode): boolean =>
    node.children.some(
      (child) =>
        child.tag && (blockTags.has(child.tag) || child.tag === 'heading' || hasBlocks(child)),
    );
  const boundaries = (value: string) => '\uE006' + value + '\uE007';
  function block(tag: string, arg: string | undefined, body: string): string {
    if (editableLayout)
      return boundaries(':::' + tag + (arg ? ' ' + arg : '') + '\uE007' + body + '\uE006:::');
    return boundaries(':::' + tag + (arg ? ' ' + arg : '') + '\n' + body + '\n:::');
  }
  function convert(node: BBNode): string {
    if (node.text !== undefined) return decompileFonts(node.text, escapePlain);
    if (!node.tag) return children(node);
    if (node.unclosed) return raw(node);
    if (node.tag === 'noparse') {
      const literal = node.children.map(raw).join(''),
        candidate = escapePlainMarkdown(literal);
      if (markdownToBB(candidate) === raw(node)) return candidate;
    }
    const tag = node.tag,
      content = children(node),
      plain = node.children.map(raw).join('');
    const inline = !/[\r\n]/.test(content) && !hasBlocks(node);
    // Markdown block syntax needs its own lines. Keep BBCode wrappers when
    // those syntax boundaries would change significant whitespace on export.
    if (preserveLayout && tag !== 'noparse') {
      const body = content.replace(/\n/g, '{br}');
      if (tag === 'hr') return '{hr}';
      if (['b', 'i', 'u', 's', 'sup', 'sub', 'big', 'small', 'heading'].includes(tag))
        return '{' + tag + '|' + body + '}';
      if (tag === 'color') return '{color:' + node.param + '|' + body + '}';
      if (blockTags.has(tag))
        return (
          '{' +
          tag +
          (tag === 'collapse' ? ':' + decompileFonts(node.param ?? '', false) : '') +
          '|' +
          body +
          '}'
        );
    }
    if (tag === 'hr') return boundaries('---');
    if (tag === 'heading') {
      if (editableLayout || !inline) return block('heading', '', content);
      const large = node.children.length === 1 && node.children[0].tag === 'big';
      return boundaries(large ? '# ' + children(node.children[0] as TagNode) : '## ' + content);
    }
    if (tag === 'big' && inline && !editableLayout && !preserveLayout)
      return '{big|' + content + '}';
    if (['b', 'i', 'u', 's'].includes(tag)) {
      const marks: Record<string, string> = { b: '**', i: '*', u: '++', s: '~~' };
      if (!inline) return block(tag, '', content);
      // Nested emphasis with surrounding prose is ambiguous to the compact parser.
      const nestedEmphasis = node.children.some((c) => ['b', 'i'].includes(c.tag ?? ''));
      const simpleBoldItalic =
        tag === 'b' &&
        node.children.length === 1 &&
        node.children[0].tag === 'i' &&
        node.children[0].children.every((c) => c.text !== undefined);
      if (['b', 'i', 's'].includes(tag) && nestedEmphasis && !simpleBoldItalic)
        return '{' + tag + '|' + content + '}';
      return marks[tag] + content + marks[tag];
    }
    if (['sup', 'sub', 'big', 'small'].includes(tag))
      return inline ? '{' + tag + '|' + content + '}' : block(tag, '', content);
    if (tag === 'color') {
      const name = colorSafe(node.param);
      if (!name) return content;
      return inline ? '{color:' + name + '|' + content + '}' : block('color', name, content);
    }
    if (tag === 'quote' && !editableLayout)
      return boundaries(
        content
          .split('\n')
          .map((line) => '> ' + line)
          .join('\n'),
      );
    if (blockTags.has(tag)) {
      if (tag === 'collapse' && (!node.param || /[\[\]\n]/.test(node.param))) return raw(node);
      return block(tag, tag === 'collapse' ? decompileFonts(node.param ?? '', false) : '', content);
    }
    if (tag === 'url') {
      if (!node.param)
        return safeUrl(plain) && !/[<>\s]/.test(plain) ? '<' + plain + '>' : raw(node);
      if (!safeUrl(node.param)) return raw(node);
      if (inline && !/[\[\]]/.test(content)) return '[' + content + '](' + node.param + ')';
      if (inline && !/[{}]/.test(content)) return '{link:' + node.param + '|' + content + '}';
      return raw(node);
    }
    if (['user', 'icon', 'eicon'].includes(tag))
      return /^[^{}\[\]\n]+$/.test(plain) ? '{' + tag + ':' + plain + '}' : raw(node);
    if (tag === 'img') {
      if (node.param && /^\d+$/.test(node.param) && !/[{}\r\n]/.test(plain))
        return '{img:' + node.param + (plain ? '|' + plain : '') + '}';
      if (!node.param && safeUrl(plain) && !/[\s)]/.test(plain)) return '![](' + plain + ')';
      if (!node.param && plain === plain.trim() && safeUrl(plain)) return '{img:' + plain + '}';
      return raw(node);
    }
    if (tag === 'noparse') {
      const longest = Math.max(0, ...[...plain.matchAll(/`+/g)].map((match) => match[0].length));
      if (plain && !/[\r\n]/.test(plain) && !plain.startsWith('`') && !plain.endsWith('`')) {
        const ticks = '`'.repeat(longest + 1);
        return ticks + plain + ticks;
      }
      if (!/[{}\n]/.test(plain)) return '{noparse|' + plain + '}';
      const fence = '`'.repeat(Math.max(3, longest + 1));
      return boundaries(fence + '\n' + plain + '\n' + fence);
    }
    return raw(node);
  }
  const result = children(tree);
  const restoreHashBoundaryBreaks = (markdown: string, expected: string) => {
    for (const match of [...markdown.matchAll(/^#{1,6} [^\n]*(?:\n|$)/gm)].reverse()) {
      const line = match[0],
        start = match.index,
        end = start + line.length;
      const addBefore = start > 0 && markdown[start - 1] === '\n',
        atEnd = end === markdown.length,
        addAfter =
          (end < markdown.length && markdown[end - 1] === '\n') ||
          (atEnd && expected.endsWith('\n'));
      for (const before of addBefore ? [false, true] : [false])
        for (const after of addAfter ? [false, true] : [false]) {
          if (!before && !after) continue;
          const afterText = after
            ? atEnd
              ? '\n'.repeat((expected.match(/\n+$/) || [''])[0].length + 1)
              : '\n'
            : '';
          const candidate =
            markdown.slice(0, start) +
            (before ? '\n' : '') +
            line +
            afterText +
            markdown.slice(end);
          if (markdownToBB(candidate) === expected) return candidate;
        }
    }
    return markdown;
  };
  // Boundary sentinels ensure the Markdown syntax lands on its own line,
  // while reusing line breaks that were already present in the BBCode.
  let markdown = result
    .replace(/[\uE006\uE007\n]+/g, (part: string) =>
      '\n'.repeat(Math.max(1, (part.match(/\n/g) || []).length)),
    )
    .trim();
  const expected = normalized.replace(/\r\n?/g, '\n');
  if (markdownToBB(markdown) !== expected) markdown = restoreHashBoundaryBreaks(markdown, expected);
  if (markdownToBB(markdown) === expected) return preferStandardMarkdown(markdown);
  editableLayout = true;
  const structured = children(tree).replace(/^[\uE006\uE007]+|[\uE006\uE007]+$/g, '');
  let editable = structured.replace(/[\uE006\uE007\n]+/g, (part: string, offset: number) =>
    '\n'.repeat(
      (part.match(/\n/g) || []).length +
        (/[\uE006\uE007]/.test(part) && offset + part.length < structured.length ? 1 : 0),
    ),
  );
  if (markdownToBB(editable) !== expected) editable = restoreHashBoundaryBreaks(editable, expected);
  if (markdownToBB(editable) === expected) return preferStandardMarkdown(editable);
  editableLayout = false;
  preserveLayout = true;
  return preferStandardMarkdown(children(tree));
}

// Choose heading notation locally, so one tightly packed heading does not
// force every other heading in the profile back to explicit macros.
export function preferHashHeadings(markdown: string) {
  const expected = markdownToBB(markdown);
  const unwrapBig = (text: string) => {
    if (!text.startsWith('{big|') || !text.endsWith('}')) return null;
    let depth = 0;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\\') {
        i++;
        continue;
      }
      if (text[i] === '{') depth++;
      if (text[i] === '}' && --depth === 0 && i !== text.length - 1) return null;
    }
    return depth === 0 ? text.slice(5, -1) : null;
  };
  const candidates = [
    ...markdown.matchAll(/^:::heading\n([^\n]*)\n:::/gm).map((match) => {
      const large = unwrapBig(match[1]);
      return {
        start: match.index,
        length: match[0].length,
        replacement: large === null ? '## ' + match[1] : '# ' + large,
      };
    }),
  ];
  // Find balanced inline big macros too, including when the BBCode heading was
  // adjacent to prose and the editable fallback could not put the macro alone.
  for (
    let start = markdown.indexOf('{big|');
    start >= 0;
    start = markdown.indexOf('{big|', start + 1)
  ) {
    let depth = 0,
      end = -1;
    for (let i = start; i < markdown.length; i++) {
      if (markdown[i] === '\\') {
        i++;
        continue;
      }
      if (markdown[i] === '{') depth++;
      else if (markdown[i] === '}' && --depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end < 0) continue;
    const body = unwrapBig(markdown.slice(start, end));
    if (body !== null && start >= 3 && markdown.slice(start - 3, start) === '## ') {
      const headingStart = start - 3;
      candidates.push({
        start: headingStart,
        length: end - headingStart,
        replacement: '# ' + body,
      });
    }
  }
  // Work backwards to keep offsets stable after each accepted replacement.
  for (const candidate of candidates.sort((a, b) => b.start - a.start)) {
    const rewritten = standardMarkdownRewrite(
      markdown,
      candidate.start,
      candidate.length,
      candidate.replacement,
      expected,
    );
    if (rewritten !== null) markdown = rewritten;
  }
  return markdown;
}

export function standardMarkdownRewrite(
  markdown: string,
  start: number,
  length: number,
  replacement: string,
  expected: string,
) {
  const before = markdown.slice(0, start),
    after = markdown.slice(start + length);
  // Macro boundaries absorb a source newline; Markdown prose does not. Try
  // reusing that boundary before retaining an unnecessary visible blank line.
  const prefixes = [before, before.replace(/\n$/, '')],
    suffixes = [after, after.replace(/^\n/, '')];
  if (/^#{1,6} /.test(replacement)) {
    if (before && !before.endsWith('\n')) prefixes.push(before + '\n');
    if (before.endsWith('\n')) prefixes.push(before + '\n');
    if (after && !after.startsWith('\n')) suffixes.push('\n' + after);
    if (after.startsWith('\n') || after === '') suffixes.push('\n' + after);
  }
  for (const prefix of prefixes) {
    for (const suffix of suffixes) {
      const candidate = prefix + replacement + suffix;
      if (markdownToBB(candidate) === expected) return candidate;
    }
  }
  return null;
}

// Prefer standard notation locally; a packed quote must not force unrelated
// quotes back to macros. Validate every rewrite against significant whitespace.
export function preferStandardMarkdown(markdown: string) {
  markdown = preferHashHeadings(markdown);
  const expected = markdownToBB(markdown);
  // F-List lists are plain text bullets/numbers, not [list] tags. Recover the
  // Markdown bullet marker while keeping every indentation and separator byte.
  // Include quote prefixes so lists inside > blocks remain editable too.
  const bullets = /^((?:[ \t]*>[ \t]?)*[ \t]*)(–|•|▪|\\[-+])([ \t]+)/gm;
  for (const match of [...markdown.matchAll(bullets)].reverse()) {
    const candidate =
      markdown.slice(0, match.index) +
      match[1] +
      ({ '-': '-', '•': '*', '▪': '+' }[match[2]] || match[2].slice(1)) +
      match[3] +
      markdown.slice(match.index + match[0].length);
    if (markdownToBB(candidate) === expected) markdown = candidate;
  }
  let changed = true;
  while (changed) {
    changed = false;
    const lines = markdown.split('\n');
    let offset = 0;
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index],
        start = offset;
      offset += line.length + 1;
      if (line !== ':::quote') continue;
      let depth = 1,
        end = index + 1;
      for (; end < lines.length; end++) {
        if (lines[end] === ':::') {
          if (!--depth) break;
        } else if (/^:::[a-z]+(?:\s|$)/i.test(lines[end])) depth++;
      }
      if (depth) continue;
      const original = lines.slice(index, end + 1).join('\n');
      const content = preferStandardMarkdown(lines.slice(index + 1, end).join('\n'));
      const body = content
        .split('\n')
        .map((text: string) => '> ' + text)
        .join('\n');
      const candidate = standardMarkdownRewrite(markdown, start, original.length, body, expected);
      if (candidate !== null) {
        markdown = candidate;
        changed = true;
        break;
      }
    }
  }
  return markdown;
}
