import { literalBBContent, inlineMarkdown } from './inline';
import { fontStyles, applyFont, compileCollapseTitle } from './fonts';
import { macroBlockNames } from './tags';
import { resolvedColor } from './colors';

// Protect physical line-edge spaces without changing newlines or word spacing.
export function preserveBBCodeWhitespace(text: string) {
  return text.replace(/^[ \t\u00a0]+|[ \t\u00a0]+$/gm, (space: string) =>
    space.replace(/ /g, '\u00a0'),
  );
}

export function restoreBBCodeWhitespace(text: string) {
  return text.replace(/^[ \t\u00a0]+|[ \t\u00a0]+$/gm, (space: string) =>
    space.replace(/\u00a0/g, ' '),
  );
}

export function markdownToBB(input: string, issues: string[] = []) {
  return preserveBBCodeWhitespace(markdownToBBSource(input, issues));
}

export function markdownToBBSource(input: string, issues: string[] = []) {
  const lines = input.replace(/\r\n?/g, '\n').split('\n'),
    parts = [],
    stack: string[] = [];
  // Only content lines contribute breaks. Macro/fence delimiters attach to their
  // contents: pretty-printing BBCode tags would create visible F-List spacing.
  let pendingBreak = false,
    afterClose = false,
    trailingHeading = false;
  const beforeLine = () => {
    if (pendingBreak) parts.push('\n');
    pendingBreak = false;
  };
  const out = {
    push(value: string) {
      if (value === '' && afterClose) {
        parts.push('\n');
        return;
      }
      beforeLine();
      parts.push(value);
      pendingBreak = true;
      afterClose = false;
    },
    open(value: string) {
      pendingBreak = false;
      afterClose = false;
      parts.push(value);
    },
    close(value: string) {
      pendingBreak = false;
      afterClose = true;
      parts.push(value);
    },
    heading(value: string) {
      pendingBreak = false;
      afterClose = true;
      trailingHeading = true;
      parts.push(value);
    },
  };
  let inFence: number | false = false;
  for (let index = 0; index < lines.length; index++) {
    let line = lines[index];
    if (index === lines.length - 1 && line === '' && trailingHeading) continue;
    if (line !== '') trailingHeading = false;
    const soft =
      !inFence && index < lines.length - 1 && (line.match(/\\+$/) || [''])[0].length % 2 === 1;
    if (soft) line = line.slice(0, -1).replace(/[ \t]*$/, ' ');
    try {
      const trimmed = line.trim();
      // A fenced code block is literal text. F-List supports noparse, not Markdown fences.
      if (inFence && new RegExp('^`{' + inFence + ',}$').test(trimmed)) {
        out.close('[/noparse]');
        inFence = false;
        continue;
      }
      const fence: RegExpMatchArray | null | false = !inFence && trimmed.match(/^(`{3,})[^`]*$/);
      if (fence) {
        out.open('[noparse]');
        inFence = fence[1].length;
        continue;
      }
      if (inFence) {
        out.push(literalBBContent(line));
        continue;
      }
      if (trimmed === ':::') {
        if (stack.length) {
          const closing = stack.pop();
          if (closing) out.close('[/' + closing + ']');
          continue;
        }
        issues.push('Unmatched block macro closing marker: :::; exported as literal text');
        out.push(line);
        continue;
      }
      const block = line.match(/^\s*:::([a-z]+)(?:\s+(.+))?\s*$/i);
      if (block) {
        const tag = block[1].toLowerCase();
        let arg = (block[2] || '').trim();
        if (['left', 'right', 'center', 'justify'].includes(tag) && arg === '!') arg = '';
        if (tag === 'font' && Object.hasOwn(fontStyles, arg.toLowerCase())) {
          const body = [];
          let depth = 1,
            fenced: number | false = false;
          while (++index < lines.length) {
            const next = lines[index],
              marker = next.trim();
            const fenceOpen: RegExpMatchArray | null | false =
              !fenced && marker.match(/^(`{3,})[^`]*$/);
            if (fenceOpen) fenced = fenceOpen[1].length;
            else if (fenced && new RegExp('^`{' + fenced + ',}$').test(marker)) fenced = false;
            if (!fenced) {
              if (/^:::[a-z]/i.test(marker)) depth++;
              else if (marker === ':::' && --depth === 0) break;
            }
            body.push(next);
          }
          if (depth) issues.push('Unclosed block macro: :::font; closing marker added on export');
          out.open(applyFont(markdownToBBSource(body.join('\n'), issues), arg.toLowerCase()));
          out.close('');
          continue;
        }
        if (macroBlockNames.has(tag)) {
          if (tag === 'color' && !resolvedColor(arg)) {
            stack.push('');
            continue;
          }
          if (
            (tag === 'collapse' && arg && !/[\[\]]/.test(arg)) ||
            (tag === 'color' && resolvedColor(arg)) ||
            (!['collapse', 'color', 'font'].includes(tag) && !arg)
          ) {
            out.open(
              '[' +
                tag +
                (arg
                  ? '=' +
                    (tag === 'color'
                      ? resolvedColor(arg)
                      : tag === 'collapse'
                        ? compileCollapseTitle(arg)
                        : arg)
                  : '') +
                ']',
            );
            stack.push(tag);
            continue;
          }
        }
        issues.push('Invalid or unknown block macro: ' + trimmed + '; exported as literal text');
      } else if (trimmed.startsWith(':::'))
        issues.push('Malformed block macro: ' + trimmed + '; exported as literal text');
      const heading = line.match(/^[ \t]*(#{1,6})[ \t]+(.*)$/);
      if (heading) {
        const level = heading[1].length,
          rawHeading = heading[2].replace(/\s+#+\s*$/, '');
        const content = inlineMarkdown(
          soft ? rawHeading.replace(/[ \t]+$/, '') : rawHeading,
          [],
          issues,
        );
        // Heading lines are structural, like ::: boundaries and dividers.
        // Their editing newline must not become an extra F-List line break.
        out.heading(
          level === 1
            ? '[heading][big]' + content + '[/big][/heading]'
            : '[heading]' + content + '[/heading]',
        );
        if (soft) parts.push(' ');
        continue;
      }
      if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        out.close('[hr]');
        continue;
      }
      const quote = line.match(/^[ \t]*>[ \t]?(.*)$/);
      if (quote) {
        const body = [quote[1]];
        while (index + 1 < lines.length) {
          const next = lines[index + 1].match(/^[ \t]*>[ \t]?(.*)$/);
          if (!next) break;
          body.push(next[1]);
          index++;
        }
        out.push('[quote]' + markdownToBBSource(body.join('\n'), issues) + '[/quote]');
        continue;
      }
      const bullet = line.match(/^([ \t]*)([-*+])([ \t]+)(.*)$/);
      if (bullet) {
        out.push(
          bullet[1] +
            { '-': '-', '*': '•', '+': '▪' }[bullet[2]] +
            bullet[3] +
            inlineMarkdown(bullet[4], [], issues),
        );
        continue;
      }
      // Numbered lists are already readable as plain text on F-List.
      out.push(inlineMarkdown(line, [], issues));
    } finally {
      if (soft) pendingBreak = false;
    }
  }
  // Do not silently drop a missing closing ::: marker.
  while (stack.length) {
    const closing = stack.pop();
    issues.push(
      'Unclosed block macro' +
        (closing ? ': :::' + closing : '') +
        '; closing marker added on export',
    );
    if (closing) out.close('[/' + closing + ']');
  }
  if (inFence) out.close('[/noparse]');
  return parts.join('');
}
