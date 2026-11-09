import { safeUrl } from './urls';
import { allowedTags } from './bbcode';
import { colorWarning, colorWarnings } from './colors';
import { markdownToBB } from './markdown';
import { macroBlockNames } from './tags';
import { fontStyles } from './fonts';
import { transformInlineLiterals } from './inline';

/** Compiler summaries need no source range; content issues retain the BBCode tag. */
type Summary = Pick<import('../app/types').Diagnostic, 'message' | 'severity'>;
type Diagnostic = import('../app/types').Diagnostic;
interface ContentIssue extends Summary {
  start: number;
  end: number;
  tag: string;
}
interface OpenTag {
  tag: string;
  param?: string;
  end: number;
  match: RegExpMatchArray & { index: number };
}
interface OpenMacro {
  name?: string;
  literal: boolean;
}
interface OpenBlock {
  name?: string;
  start: number;
  end: number;
  invalid: boolean;
}

export function countWarnings(compiled: string) {
  return compilerWarnings(compiled).map((issue) => issue.message);
}

// Severity is compiler data: error = invalid source, warning = F-List compatibility.
export function compilerWarnings(compiled: string) {
  const issues: Summary[] = [],
    stack: string[] = [];
  let literal = false;
  const add = (message: string, severity = 'error') => issues.push({ message, severity });
  for (const m of compiled.matchAll(/\[(\/?)([a-z][a-z0-9_-]*|\*)(?:=[^\]\n]*)?\]/gi)) {
    const tag = m[2].toLowerCase(),
      close = !!m[1];
    if (literal) {
      if (close && tag === 'noparse') {
        literal = false;
        stack.pop();
      }
      continue;
    }
    if (!allowedTags.has(tag)) {
      add('[' + tag + '] is not supported by F-List profiles', 'warning');
      continue;
    }
    if (tag === 'color' && !close) {
      const warning = colorWarning(m[0].match(/^\[color=([^\]]*)\]$/i)?.[1]);
      if (warning) add(warning, 'warning');
    }
    if (tag === 'hr') {
      if (close) add('Unmatched [/hr]');
      continue;
    }
    if (close) {
      const index = stack.lastIndexOf(tag);
      if (index < 0) add('Unmatched [/' + tag + ']');
      else {
        if (index !== stack.length - 1)
          add('Misnested [/' + tag + ']: close [' + stack.at(-1) + '] first');
        stack.splice(index, 1);
      }
    } else {
      stack.push(tag);
      if (tag === 'noparse') literal = true;
    }
  }
  for (const tag of stack) add('Unclosed [' + tag + ']');
  const parsedText = compiled.replace(/\[noparse\][\s\S]*?(?:\[\/noparse\]|$)/gi, '');
  if (/\[img\][\s\S]*?\[\/img\]|\[img=(?!\d+\])[^\]\n]*\]/i.test(parsedText))
    add(
      'External image URLs are not supported by F-List profiles; use an uploaded profile image ID such as [img=12345] instead',
      'warning',
    );
  if (/<\/?(?:div|span|table|p|br)\b/i.test(parsedText))
    add('HTML is not supported in descriptions', 'warning');
  return [
    ...new Map(
      [...issues, ...tagContentWarnings(compiled)].map((issue) => [issue.message, issue]),
    ).values(),
  ];
}

export function tagContentWarnings(compiled: string) {
  const issues: ContentIssue[] = [],
    stack: OpenTag[] = [],
    opaque = new Set(['noparse', 'url', 'user', 'icon', 'eicon', 'img']);
  const add = (message: string, m: RegExpMatchArray & { index: number }, severity = 'error') =>
    issues.push({
      message,
      severity,
      start: m.index,
      end: m.index + m[0].length,
      tag: m[2].toLowerCase(),
    });
  for (const m of compiled.matchAll(/\[(\/?)([a-z][a-z0-9_-]*)(?:=([^\]\n]*))?\]/gi)) {
    const tag = m[2].toLowerCase(),
      close = !!m[1],
      parent = stack.at(-1);
    if (parent && opaque.has(parent.tag)) {
      if (close && tag === parent.tag) {
        const content = compiled.slice(parent.end, m.index);
        if (tag === 'url') {
          const value = (parent.param || content).trim();
          if (
            !safeUrl(value) ||
            (globalThis.FolioHorizon?.validURL && !globalThis.FolioHorizon.validURL(value))
          )
            add('Invalid URL in [url]: use a complete http(s) URL', parent.match);
          if (/\[(?:b|i|u|s|color|big|small|sup|sub|heading|noparse)(?:=[^\]]*)?\]/i.test(content))
            add(
              'Formatting inside link labels is not supported by F-List; use plain text for link labels',
              parent.match,
              'warning',
            );
        } else if (
          ['user', 'icon', 'eicon'].includes(tag) &&
          !(/^[a-zA-Z0-9_\-\s]+$/.test(content) && content.trim())
        )
          add(
            'Invalid name in [' + tag + ']: use letters, numbers, spaces, underscores or hyphens',
            parent.match,
          );
        stack.pop();
      }
      continue;
    }
    if (!allowedTags.has(tag)) continue;
    if (close) {
      const index = stack.map((item) => item.tag).lastIndexOf(tag);
      if (index >= 0) stack.splice(index);
      continue;
    }
    if (m[3] !== undefined && !['color', 'url', 'img', 'collapse'].includes(tag))
      add('Unexpected parameter on [' + tag + ']: this tag does not accept an argument', m);
    const restricted = stack.find(
      (item) => globalThis.FolioHorizon?.allowsChild(item.tag, tag) === false,
    );
    if (restricted)
      add(
        'Unsupported nesting: [' +
          tag +
          '] inside [' +
          restricted.tag +
          '] displays literal markup in preview',
        m,
        'warning',
      );
    // Blank collapse titles remain valid for legacy-site compatibility.
    if (tag !== 'hr') stack.push({ tag, param: m[3], end: m.index + m[0].length, match: m });
  }
  return issues;
}

export function nestedFontWarnings(text: string) {
  const searchable = warningSource(text, true),
    stack: OpenMacro[] = [],
    blocks: string[] = [],
    issues: Diagnostic[] = [];
  const message = 'Nested font macros are not supported; use one font macro per text span';
  for (let index = 0; index < searchable.length; index++) {
    if (index === 0 || searchable[index - 1] === '\n') {
      const marker = searchable
        .slice(index)
        .match(/^[ \t]*:::(?:([a-z]+)(?:[ \t]+[^\n]*)?)?[ \t]*(?=\n|$)/i);
      if (marker) {
        const name = marker[1]?.toLowerCase();
        if (!name) blocks.pop();
        else {
          if (name === 'font' && blocks.includes('font'))
            issues.push({
              message,
              severity: 'error',
              start: index,
              end: index + marker[0].length,
              line: text.slice(0, index).split('\n').length,
            });
          blocks.push(name);
        }
        index += marker[0].length - 1;
        continue;
      }
    }
    if (searchable[index] === '\\') {
      index++;
      continue;
    }
    if (searchable[index] === '}') {
      stack.pop();
      continue;
    }
    if (searchable[index] !== '{') continue;
    const header = searchable.slice(index).match(/^\{([a-z]+)(?::[^|{}\n]*)?\|/i);
    const name = header?.[1].toLowerCase(),
      literal = stack.some((item) => item.literal) || name === 'noparse';
    if (
      name === 'font' &&
      !literal &&
      (blocks.includes('font') || stack.some((item) => item.name === 'font' && !item.literal))
    )
      issues.push({
        message,
        severity: 'error',
        start: index,
        end: index + header![0].length,
        line: text.slice(0, index).split('\n').length,
      });
    stack.push({ name, literal });
  }
  return issues;
}

export function macroWarnings(text: string) {
  const issues: string[] = [];
  markdownToBB(text, issues);
  return [
    ...new Set([
      ...issues.filter((message: string) => !message.includes('block macro')),
      ...blockMacroWarnings(text).map((issue) => issue.message),
      ...nestedFontWarnings(text).map((issue) => issue.message),
    ]),
  ];
}

export function blockMacroWarnings(text: string) {
  const searchable = warningSource(text, true),
    stack: OpenBlock[] = [],
    issues: Diagnostic[] = [];
  const report = (message: string, start: number, end: number, priority = 0) =>
    issues.push({
      message,
      severity: 'error',
      start,
      end,
      line: text.slice(0, start).split('\n').length,
      priority,
    });
  for (const match of searchable.matchAll(/^[ \t]*(?:>[ \t]*)*(:{2,}[^\n]*)/gm)) {
    const marker = match[1].trim(),
      start = match.index + match[0].indexOf(match[1]),
      end = start + marker.length;
    if (marker === ':::') {
      if (stack.length) stack.pop();
      else
        report(
          'Unmatched block macro closing marker: :::; remove this marker or add an opening macro',
          start,
          end,
          2,
        );
      continue;
    }
    if (/^:+$/.test(marker)) {
      report(
        'Malformed block macro closing marker: ' + marker + '; use ::: to close the block',
        start,
        end,
      );
      if (stack.length) stack.pop();
      continue;
    }
    const parsed = marker.match(/^:::([a-z]+)(?:[ \t]+(.+))?\s*$/i);
    const name = parsed?.[1].toLowerCase(),
      arg = (parsed?.[2] || '').trim();
    let error = '';
    if (!parsed) error = 'Malformed block macro: ' + marker + '; use :::name to open a block';
    else if (!macroBlockNames.has(name ?? ''))
      error = 'Unknown block macro: ' + marker + '; check the macro name';
    else if (name === 'collapse' && (!arg || /[\[\]]/.test(arg)))
      error =
        'Invalid block macro: ' + marker + '; collapse requires a title without square brackets';
    else if (name === 'font' && !Object.hasOwn(fontStyles, arg.toLowerCase()))
      error = 'Invalid block macro: ' + marker + '; choose a supported font';
    else if (
      !['collapse', 'color', 'font'].includes(name ?? '') &&
      arg &&
      !(['left', 'right', 'center', 'justify'].includes(name ?? '') && arg === '!')
    )
      error = 'Invalid block macro: ' + marker + '; ' + name + ' does not accept an argument';
    if (error) report(error, start, end);
    // Recover the intended nesting for diagnostics, even when compilation leaves
    // this opener literal. Its closing marker is a consequence, not a new error.
    stack.push({ name, start, end, invalid: !!error });
  }
  for (const open of stack)
    if (!open.invalid)
      report(
        'Unclosed block macro: :::' + open.name + '; add a closing ::: marker',
        open.start,
        open.end,
        1,
      );
  return issues;
}

// Preserve source offsets while excluding literal examples from diagnostic navigation.
export function warningSource(text: string, mixed: boolean) {
  const blank = (value: string) => value.replace(/[^\n]/g, ' ');
  if (!mixed)
    text = text.replace(
      /(\[noparse\])([\s\S]*?)(\[\/noparse\]|$)/gi,
      (_, open: boolean, body: string, close) => open + blank(body) + close,
    );
  if (mixed) {
    let fence = 0;
    text = text
      .split('\n')
      .map((line) => {
        const trimmed = line.trim(),
          open = !fence && trimmed.match(/^(`{3,})[^`]*$/);
        if (open) {
          fence = open[1].length;
          return blank(line);
        }
        if (fence) {
          if (new RegExp('^`{' + fence + ',}$').test(trimmed)) fence = 0;
          return blank(line);
        }
        return line;
      })
      .join('\n');
    text = transformInlineLiterals(text, blank).replace(/\\[{}]/g, blank);
  }
  return text;
}

export function locatedWarnings(text: string, mixed: boolean, compiled: string) {
  const searchable = warningSource(text, mixed),
    records: Diagnostic[] = [];
  const add = (message: string, start: number, end: number, severity = 'error') => {
    const line = text.slice(0, start).split('\n').length;
    if (!records.some((item) => item.message === message && item.start === start))
      records.push({ message, severity, start, end, line });
  };
  const contentIssues = tagContentWarnings(compiled),
    contentMessages = new Set(contentIssues.map((issue) => issue.message));
  for (const issue of contentIssues) {
    if (!mixed) {
      add(issue.message, issue.start, issue.end, issue.severity);
      continue;
    }
    const aliases: Record<string, string> = {
        url: 'link',
        img: '(?:img|image)',
        u: '(?:u|underline)',
      },
      name = aliases[issue.tag] || issue.tag;
    const shorthand: Record<string, string> = {
      big: '|^[ \\t]*#[ \\t]+',
      heading: '|^[ \\t]*#{1,6}[ \\t]+',
      b: '|\\*\\*|__',
      i: '|\\*|_',
      s: '|~~',
      u: '|\\+\\+',
      url: '|\\[(?=[^\\]\\n]*\\]\\(https?:)',
    };
    const candidates = [
      ...searchable.matchAll(
        new RegExp(
          '\\{' +
            name +
            '(?=[:|}])[^|}\\n]*(?:\\||\\})|^[ \\t]*:::' +
            name +
            '(?=[ \\t]|$)[^\\n]*' +
            (shorthand[issue.tag] || ''),
          'gmi',
        ),
      ),
    ];
    // Probe the compiler instead of counting tag names: headings also emit big,
    // and literal examples can contain matching macro spellings.
    let marker = 'FOLIOSOURCEPOSITION';
    while (text.includes(marker)) marker += 'X';
    for (const candidate of candidates) {
      let insertion = candidate.index + candidate[0].length;
      if (candidate[0].trimStart().startsWith(':::')) insertion += text[insertion] === '\r' ? 2 : 1;
      else if (['user', 'icon', 'eicon'].includes(issue.tag))
        insertion = candidate.index + candidate[0].indexOf(':') + 1;
      if (insertion > text.length) continue;
      const probe = markdownToBB(text.slice(0, insertion) + marker + text.slice(insertion));
      const position = probe.indexOf(marker);
      if (
        position < 0 ||
        probe.slice(0, position) + probe.slice(position + marker.length) !== compiled
      )
        continue;
      const opening = probe.lastIndexOf('[', position);
      if (
        opening === issue.start &&
        new RegExp('^\\[' + issue.tag + '(?:=[^\\]]*)?\\]$', 'i').test(
          probe.slice(opening, position),
        )
      ) {
        const label =
          issue.message.startsWith('Formatting inside link labels') &&
          text.slice(candidate.index).match(/^\[([^\]\n]*)\]\(https?:\/\/[^\s)]+\)/i);
        if (label)
          add(
            issue.message,
            candidate.index + 1,
            candidate.index + 1 + label[1].length,
            issue.severity,
          );
        else
          add(
            issue.message,
            candidate.index,
            candidate.index + candidate[0].length,
            issue.severity,
          );
        break;
      }
    }
  }
  const messages = [
    ...compilerWarnings(compiled),
    ...colorWarnings(text, mixed).map((message: string) => ({ message, severity: 'warning' })),
    ...(mixed
      ? macroWarnings(text)
          .filter(
            (message: string) =>
              !message.includes('block macro') && !message.startsWith('Nested font macros'),
          )
          .map((message: string) => ({ message, severity: 'error' }))
      : []),
  ];
  if (mixed) records.push(...blockMacroWarnings(text), ...nestedFontWarnings(text));
  for (const { message, severity } of messages) {
    if (contentMessages.has(message)) continue;
    let matches: { index: number; 0: string }[] = [];
    if (message.startsWith('Color ')) {
      const color = message.slice(6, message.indexOf(' is not supported'));
      const tokens =
        /\[color(?:=([^\]\n]*))?\]|\{color(?::([^|}\n]*))?\||^\s*:::color(?:[ \t]+([^\n]*))?$/gim;
      matches = [...searchable.matchAll(tokens)].filter(
        (m) =>
          (mixed || m[0].startsWith('[')) &&
          ((m[1] ?? m[2] ?? m[3] ?? '').trim() || '(missing value)') === color,
      );
    } else if (/^(?:Invalid|Malformed|Unclosed inline)/.test(message)) {
      const marker = message
        .slice(message.indexOf(': ') + 2)
        .replace(/; exported as literal text$/, '');
      let index = searchable.indexOf(marker);
      while (index >= 0) {
        matches.push({ index, 0: marker });
        index = searchable.indexOf(marker, index + marker.length);
      }
    } else if (message.startsWith('External image URLs ')) {
      matches = [
        ...searchable.matchAll(
          mixed
            ? /!\[[^\]\n]*\]\([^\n)]*\)|\{(?:img|image):https?:[^}\n]*\}|\[img\][\s\S]*?\[\/img\]|\[img=(?!\d+\])[^\]\n]*\]/gi
            : /\[img\][\s\S]*?\[\/img\]|\[img=(?!\d+\])[^\]\n]*\]/gi,
        ),
      ];
    } else if (message.startsWith('HTML '))
      matches = [...searchable.matchAll(/<\/?(?:div|span|table|p|br)\b[^>]*>/gi)];
    else {
      const tag = message.match(/\[(\/?[a-z0-9_*-]+)\]/i)?.[1];
      if (tag)
        matches = [...searchable.matchAll(/\[(\/?[a-z][a-z0-9_-]*|\*)(?:=[^\]\n]*)?\]/gi)].filter(
          (m) => m[1].toLowerCase() === tag.toLowerCase(),
        );
    }
    for (const match of matches) add(message, match.index, match.index + match[0].length, severity);
  }
  const priority = (issue: Diagnostic) =>
    issue.priority ??
    (/^(?:Invalid|Malformed|Unknown|Unclosed inline|Color )/.test(issue.message) ? 0 : 1);
  return records.sort((a, b) => priority(a) - priority(b) || a.start - b.start);
}
