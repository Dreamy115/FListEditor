/** Lexical span before offsets and delimiter pairing are assigned. */
interface LexToken {
  text: string;
  kind: string;
  marker?: string;
  color?: string;
  format?: string;
  emphasisMarker?: boolean;
}
/** Source token offsets refer to the original editor text, never painted fragments. */
export interface SyntaxToken extends LexToken {
  start: number;
  end: number;
  partner?: number;
  depth?: number;
  pair?: number;
  unmatched?: boolean;
  collapseTitle?: boolean;
}
interface OpenDelimiter {
  name: string;
  token: SyntaxToken;
}
/** Non-editable paint layer metadata; source text remains in the textarea. */
interface SyntaxElement extends HTMLElement {
  syntaxTokens?: SyntaxToken[];
  syntaxText?: string;
  syntaxProblems?: FolioDiagnostic[];
  warningProblems?: FolioDiagnostic[];
}
(() => {
  'use strict';
  // Highlight source without parsing it into editable HTML or changing whitespace.
  function lex(text: string, mixed: boolean): LexToken[] {
    const pattern = mixed
      ? /^[ \t]*(`{3,})[^`\n]*(?:\n[\s\S]*?(?:\n[ \t]*\1`*[ \t]*(?=\n|$)|(?![\s\S])))?|\{noparse\|[^}\n]*\}|(`+)(?!`)[^\n]+?\2(?!`)|\\[^\n]|\\$|^[ \t]*>[^\n]*|^[ \t]*:::[^\n]*|^[ \t]*#{1,6}[ \t]+|^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$|^[ \t]*(?:>[ \t]?|[-*+][ \t]+|\d+\.[ \t]+)|!?\[[^\]\n]*\]\(https?:\/\/[^\s)]+\)|\[\/?[a-z]+(?:=[^\]\n]*)?\]|&(?:#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);|\{[a-z]+(?::[^|}\n]*)?(?:\||\})|\}|\*{1,3}[^*\n]+\*{1,3}|__[^_\n]+__|_[^_\n]+_|~~[^~\n]+~~|\+\+[^+\n]+\+\+/gim
      : /\[noparse\][\s\S]*?(?:\[\/noparse\]|(?![\s\S]))|\[\/?[a-z]+(?:=[^\]\n]*)?\]/gi;
    const tokens: LexToken[] = [];
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > last) tokens.push({ text: text.slice(last, match.index), kind: '' });
      const value = match[0];
      // Quote contents are Markdown too. Re-tokenize after one quote prefix so
      // nested markers and headings/macros inside quotes keep their own styles.
      const quote = mixed && value.match(/^([ \t]*>[ \t]?)([^\n]*)$/);
      if (quote) {
        tokens.push({ text: quote[1], kind: 'marker', marker: 'quote' });
        tokens.push(...lex(quote[2], mixed));
        last = match.index + value.length;
        continue;
      }
      // Emphasis is a container: its delimiters/body keep their base color,
      // while nested macros, tags, links, and literal text keep their own tokens.
      const emphasis = mixed && value.match(/^(\*{1,3}|__|_|~~|\+\+)([\s\S]+)\1$/);
      if (emphasis) {
        const mark = emphasis[1];
        const format = {
          '*': 'italic',
          _: 'italic',
          '**': 'bold',
          __: 'bold',
          '***': 'bold-italic',
          '~~': 'strike',
          '++': 'underline',
        }[mark];
        tokens.push({ text: mark, kind: 'emphasis', format, emphasisMarker: true });
        for (const token of lex(emphasis[2], mixed)) {
          tokens.push({
            ...token,
            kind: token.kind || 'emphasis',
            format: token.kind ? token.format : format,
          });
        }
        tokens.push({ text: mark, kind: 'emphasis', format, emphasisMarker: true });
        last = match.index + value.length;
        continue;
      }
      let kind = 'emphasis';
      if (/^(?:[ \t]*`|\[noparse\]|\{noparse\|)/i.test(value)) kind = 'literal';
      else if (value.startsWith('&')) kind = 'entity';
      else if (value.startsWith('\\')) kind = 'escape';
      else if (/^[ \t]*:::/.test(value)) kind = 'block';
      else if (value.startsWith('{') || value === '}') kind = 'macro';
      else if (/^!?\[.*\]\(https?:/i.test(value)) kind = 'link';
      else if (value.startsWith('[')) kind = mixed ? 'literal' : 'tag';
      else if (/^[ \t]*(?:#|>|[-*+]|\d+\.)/.test(value)) kind = 'marker';
      const marker =
        kind === 'marker'
          ? /^[ \t]*#/.test(value)
            ? 'heading'
            : /^[ \t]*>/.test(value)
              ? 'quote'
              : 'list'
          : undefined;
      const inlineColor = mixed && value.match(/^\{color:\s*([a-z]+)\s*\|$/i);
      const blockColor = mixed && value.match(/^[ \t]*:::color[ \t]+([a-z]+)[ \t]*$/i);
      const bbcodeColor = !mixed && value.match(/^\[color=\s*([a-z]+)\s*\]$/i);
      const colorMatch = inlineColor || blockColor || bbcodeColor;
      const color = colorMatch ? colorMatch[1].toLowerCase() : undefined;
      tokens.push({ text: value, kind, marker, color });
      last = match.index + value.length;
    }
    if (last < text.length) tokens.push({ text: text.slice(last), kind: '' });
    return tokens;
  }
  function tokenize(text: string, mixed: boolean) {
    const tokens: SyntaxToken[] = lex(text, mixed).map((token) => ({ ...token, start: 0, end: 0 }));
    const stacks: Record<string, OpenDelimiter[]> = { block: [], macro: [], tag: [] };
    let offset = 0;
    for (const token of tokens) {
      token.start = offset;
      offset += token.text.length;
      token.end = offset;
      const stack = stacks[token.kind];
      if (!stack) continue;
      let name = '',
        closing = false,
        single = false;
      if (token.kind === 'block') {
        const match = token.text
          .trim()
          .replace(/\\$/, '')
          .trim()
          .match(/^:::([a-z]+)?(?:\s|$)/i);
        if (!match) continue;
        name = (match[1] || '').toLowerCase();
        closing = !name;
      } else if (token.kind === 'macro') {
        closing = token.text === '}';
        single = !closing && token.text.endsWith('}');
      } else {
        const match = token.text.match(/^\[(\/?)([a-z]+)/i);
        if (!match) continue;
        name = match[2].toLowerCase();
        closing = !!match[1];
        single = name === 'hr';
      }
      token.depth = stack.length;
      if (single) continue;
      if (closing) {
        const open = stack.at(-1);
        if (!open || (token.kind === 'tag' && open.name !== name)) {
          token.unmatched = true;
          continue;
        }
        stack.pop();
        token.depth = open.token.depth;
        token.pair = open.token.pair = open.token.start;
        token.partner = open.token.start;
        open.token.partner = token.start;
      } else stack.push({ name, token });
    }
    for (const stack of Object.values(stacks))
      for (const open of stack) open.token.unmatched = true;
    if (!mixed) {
      const active: Record<string, number> = { b: 0, i: 0 };
      for (const token of tokens) {
        const tag = token.kind === 'tag' && token.text.match(/^\[(\/?)(b|i)\]$/i);
        const name = tag && tag[2].toLowerCase();
        const paired = tag && token.partner !== undefined;
        if (paired && !tag[1]) active[String(name)]++;
        if (token.kind !== 'tag' && (active.b || active.i))
          token.format = active.b && active.i ? 'bold-italic' : active.b ? 'bold' : 'italic';
        if (paired && tag[1]) active[String(name)]--;
      }
    }
    return tokens;
  }
  function isEntityTextToken(token: Pick<LexToken, 'kind'>) {
    return ['', 'entity', 'emphasis'].includes(token.kind);
  }
  function appendEntityGlyphs(parent: HTMLElement, text: string) {
    let last = 0;
    for (const match of text.matchAll(/[^\x00-\x7f]/gu)) {
      parent.appendChild(document.createTextNode(text.slice(last, match.index)));
      const glyph = document.createElement('span');
      glyph.className = 'syntax-entity-glyph';
      glyph.textContent = match[0];
      parent.appendChild(glyph);
      last = match.index + match[0].length;
    }
    parent.appendChild(document.createTextNode(text.slice(last)));
  }
  function highlight(
    element: SyntaxElement,
    text: string,
    mixed: boolean,
    problems?: FolioDiagnostic[],
    options: { preferLiterals?: boolean } = {},
  ) {
    const fragment = document.createDocumentFragment();
    const tokens = tokenize(text, mixed);
    // Split only the painted spans. Original tokens retain their pairing and
    // offsets for active-section highlighting and caret navigation.
    const paintTokens = tokens.flatMap((token) => {
      const collapse =
        token.kind === 'block' && token.text.match(/^([ \t]*:::collapse[ \t]+)([^\n]*)$/i);
      if (!collapse) return [token];
      const titleStart = token.start + collapse[1].length;
      // Keep structural pairing intact. Only font macros work in titles;
      // their bodies and every other syntax form remain plain title text.
      const paintedTitle: SyntaxToken[] = [{ ...token, text: collapse[1], end: titleStart }];
      const append = (value: string, offset: number, kind = 'block') => {
        if (value)
          paintedTitle.push({
            text: value,
            kind,
            collapseTitle: kind === 'block',
            start: titleStart + offset,
            end: titleStart + offset + value.length,
          });
      };
      let last = 0;
      for (const match of collapse[2].matchAll(/(\{font:[a-z]+\|)([^{}]*)(\})/gi)) {
        append(collapse[2].slice(last, match.index), last);
        append(match[1], match.index, 'macro');
        append(match[2], match.index + match[1].length);
        append(match[3], match.index + match[0].length - 1, 'macro');
        last = match.index + match[0].length;
      }
      append(collapse[2].slice(last), last);
      return paintedTitle;
    });
    const painted = paintTokens.flatMap((token) => {
      const collapse =
        token.kind === 'block' &&
        token.text.match(/^([ \t]*:::collapse[ \t]+)(\S[^\n]*?)([ \t]*)$/i);
      const titleStart = collapse ? token.start + collapse[1].length : token.end;
      const titleEnd = collapse ? titleStart + collapse[2].length : token.end;
      // Color values keep their explicit swatches instead of the generic tint.
      const macroValue =
        token.kind === 'macro' && !token.color && token.text.match(/^(\{[a-z]+:)([^|}\n]+)[|}]$/i);
      const valueStart = macroValue ? token.start + macroValue[1].length : token.end;
      const valueEnd = macroValue ? valueStart + macroValue[2].length : token.end;
      const overlapping = (problems || []).filter(
        (problem) => problem.start < token.end && problem.end > token.start,
      );
      const boundaries = [
        ...new Set([
          token.start,
          token.end,
          titleStart,
          titleEnd,
          valueStart,
          valueEnd,
          ...overlapping.flatMap((problem) => [
            Math.max(token.start, problem.start),
            Math.min(token.end, problem.end),
          ]),
        ]),
      ].sort((a, b) => a - b);
      return boundaries.slice(0, -1).map((start: number, i) => {
        const end = boundaries[i + 1];
        return {
          ...token,
          text: text.slice(start, end),
          collapseTitle:
            token.collapseTitle || (!!collapse && start >= titleStart && end <= titleEnd),
          macroValue: !!macroValue && start >= valueStart && end <= valueEnd,
          diagnostics: overlapping.filter((problem) => problem.start < end && problem.end > start),
        };
      });
    });
    let line = 1;
    const anchor = () => {
      const span = document.createElement('span');
      span.className = 'source-line-anchor';
      span.dataset.line = String(line++);
      fragment.appendChild(span);
    };
    anchor();
    for (const token of painted) {
      const pieces = token.text.split('\n');
      for (let i = 0; i < pieces.length; i++) {
        if (i) {
          fragment.appendChild(document.createTextNode('\n'));
          anchor();
        }
        if (!pieces[i]) continue;
        const markGlyphs =
          mixed &&
          options.preferLiterals &&
          isEntityTextToken(token) &&
          /[^\x00-\x7f]/u.test(pieces[i]);
        if (!markGlyphs && !token.kind && !token.format && !token.diagnostics.length) {
          fragment.appendChild(document.createTextNode(pieces[i]));
          continue;
        }
        const span = document.createElement('span');
        span.className = token.kind ? 'syntax-' + token.kind : '';
        if (token.marker) span.classList.add('syntax-marker-' + token.marker);
        if (token.format) span.classList.add('syntax-emphasis-' + token.format);
        if (token.emphasisMarker) span.classList.add('syntax-emphasis-marker');
        if (token.depth !== undefined) span.classList.add('syntax-depth-' + (token.depth % 5));
        if (token.unmatched && problems === undefined) {
          span.classList.add('syntax-unmatched');
          span.title = 'Unmatched delimiter';
        }
        if (token.diagnostics.length) {
          span.classList.add('syntax-warning');
          span.dataset.severity = token.diagnostics.some((problem) => problem.severity === 'error')
            ? 'error'
            : 'warning';
          span.title = [...new Set(token.diagnostics.map((problem) => problem.message))].join('\n');
          (span as SyntaxElement).warningProblems = token.diagnostics;
        }
        if (token.pair !== undefined) span.dataset.pair = String(token.pair);
        if (
          token.color &&
          /^(?:red|orange|yellow|green|cyan|purple|blue|pink|black|brown|white|gray)$/.test(
            token.color,
          )
        ) {
          const match =
            token.kind === 'macro'
              ? pieces[i].match(/^(\{color:\s*)([a-z]+)(\s*\|)$/i)
              : token.kind === 'block'
                ? pieces[i].match(/^([ \t]*:::color[ \t]+)([a-z]+)([ \t]*)$/i)
                : pieces[i].match(/^(\[color=\s*)([a-z]+)(\s*\])$/i);
          if (match && match[2].toLowerCase() === token.color) {
            span.appendChild(document.createTextNode(match[1]));
            const word = document.createElement('span');
            word.className = 'syntax-color-value';
            word.dataset.color = token.color;
            word.textContent = match[2];
            span.appendChild(word);
            span.appendChild(document.createTextNode(match[3]));
          } else span.textContent = pieces[i];
        } else if (token.kind === 'link') {
          const link = pieces[i].match(/^(!?\[)([^\]\n]*)(\]\()(https?:\/\/[^\s)]+)(\))$/i);
          if (link) {
            const label = document.createElement('span');
            label.className = 'syntax-link-label';
            const display = document.createElement('span');
            display.className = 'syntax-link-display';
            display.textContent = link[2];
            const target = document.createElement('span');
            target.className = 'syntax-link-target';
            const url = document.createElement('span');
            url.className = 'syntax-link-url';
            url.textContent = link[4];
            const punctuation = (text: string) => {
              const mark = document.createElement('span');
              mark.className = 'syntax-link-punctuation';
              mark.textContent = text;
              return mark;
            };
            label.appendChild(punctuation(link[1]));
            label.appendChild(display);
            label.appendChild(punctuation(']'));
            target.appendChild(punctuation('('));
            target.appendChild(url);
            target.appendChild(punctuation(link[5]));
            span.appendChild(label);
            span.appendChild(target);
          } else span.textContent = pieces[i];
        } else if (token.collapseTitle) {
          const title = document.createElement('span');
          title.className = 'syntax-collapse-title';
          title.textContent = pieces[i];
          span.appendChild(title);
        } else if (token.macroValue) {
          const value = document.createElement('span');
          value.className = 'syntax-macro-value';
          value.textContent = pieces[i];
          span.appendChild(value);
        } else if (markGlyphs) appendEntityGlyphs(span, pieces[i]);
        else span.textContent = pieces[i];
        fragment.appendChild(span);
      }
    }
    // A final empty line must occupy the same height as the textarea's caret line.
    fragment.appendChild(document.createTextNode('\n'));
    element.replaceChildren(fragment);
    element.syntaxTokens = tokens;
    element.syntaxText = text;
    element.syntaxProblems = problems || [];
  }
  function markActive(element: SyntaxElement, position: number) {
    const tokens = element.syntaxTokens || [];
    const byStart = new Map(tokens.map((token) => [token.start, token]));
    const sections = tokens
      .filter(
        (t): t is SyntaxToken & { partner: number } =>
          t.partner !== undefined && t.partner > t.start,
      )
      .map((open) => ({
        start: open.start,
        end: byStart.get(open.partner)!.end,
      }));
    const active = sections
      .filter((section) => position >= section.start && position < section.end)
      .at(-1);
    element.activeSyntaxRange = active || null;
    for (const span of element.querySelectorAll<HTMLElement>('[data-pair]')) {
      span.classList.toggle(
        'syntax-active-delimiter',
        !!active && span.dataset.pair === String(active.start),
      );
    }
    paintActive(element);
  }
  function paintActive(element: SyntaxElement) {
    const viewport = document.getElementById('sourceSectionTint');
    if (!viewport) return;
    const active = element.activeSyntaxRange;
    viewport.hidden = !active;
    if (!active) return;
    const text = element.syntaxText || '';
    const firstLine = text.slice(0, active.start).split('\n').length - 1;
    const lastLine = text.slice(0, Math.max(active.start, active.end - 1)).split('\n').length - 1;
    const anchors = element.querySelectorAll<HTMLElement>('.source-line-anchor');
    const first = anchors[firstLine],
      next = anchors[lastLine + 1];
    if (!first) {
      viewport.hidden = true;
      return;
    }
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
    const correction = (lineHeight - first.getBoundingClientRect().height) / 2;
    const top = first.offsetTop - correction;
    let bottom;
    if (next) bottom = next.offsetTop - correction;
    else {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = [...range.getClientRects()].filter((rect) => rect.height > 0);
      const glyphBottom = Math.max(...rects.map((rect) => rect.bottom));
      bottom = glyphBottom - element.getBoundingClientRect().top + element.scrollTop + correction;
    }
    const band = viewport.firstElementChild as HTMLElement;
    band.style.top = top - element.scrollTop - 1 + 'px';
    band.style.height = Math.max(lineHeight, bottom - top) + 'px';
  }

  globalThis.FolioSyntax = { tokenize, highlight, markActive, paintActive, isEntityTextToken };
})();

export {};
