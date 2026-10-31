(() => {
  'use strict';
  // Highlight source without parsing it into editable HTML or changing whitespace.
  function lex(text, mixed) {
    const pattern = mixed
      ? /```[^\n]*(?:\n[\s\S]*?(?:\n[ \t]*```[^\n]*|(?![\s\S])))?|\[noparse\][\s\S]*?(?:\[\/noparse\]|(?![\s\S]))|\{noparse\|[^}\n]*\}|`[^`\n]*`|\\[^\n]|\\$|^[ \t]*:::[^\n]*|^[ \t]*#{1,6}[ \t]+|^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$|^[ \t]*(?:>[ \t]?|[-*+][ \t]+|\d+\.[ \t]+)|!?\[[^\]\n]*\]\(https?:\/\/[^\s)]+\)|\[\/?[a-z]+(?:=[^\]\n]*)?\]|\{[a-z]+(?::[^|}\n]*)?(?:\||\})|\}|\*{1,3}[^*\n]+\*{1,3}|__[^_\n]+__|_[^_\n]+_|~~[^~\n]+~~|\+\+[^+\n]+\+\+/gim
      : /\[noparse\][\s\S]*?(?:\[\/noparse\]|(?![\s\S]))|\[\/?[a-z]+(?:=[^\]\n]*)?\]/gi;
    const tokens = [];
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > last) tokens.push({text: text.slice(last, match.index), kind: ''});
      const value = match[0];
      // Emphasis is a container: its delimiters/body keep their base color,
      // while nested macros, tags, links, and literal text keep their own tokens.
      const emphasis = mixed && value.match(/^(\*{1,3}|__|_|~~|\+\+)([\s\S]+)\1$/);
      if (emphasis) {
        const mark = emphasis[1];
        const format = {'*':'italic', '_':'italic', '**':'bold', '__':'bold', '***':'bold-italic', '~~':'strike', '++':'underline'}[mark];
        tokens.push({text: mark, kind: 'emphasis', format});
        for (const token of lex(emphasis[2], mixed)) {
          tokens.push({...token, kind: token.kind || 'emphasis', format: token.kind ? token.format : format});
        }
        tokens.push({text: mark, kind: 'emphasis', format});
        last = match.index + value.length;
        continue;
      }
      let kind = 'emphasis';
      if (/^(?:```|`|\[noparse\]|\{noparse\|)/i.test(value)) kind = 'literal';
      else if (value.startsWith('\\')) kind = 'escape';
      else if (/^[ \t]*:::/.test(value)) kind = 'block';
      else if (value.startsWith('{') || value === '}') kind = 'macro';
      else if (/^!?\[.*\]\(https?:/i.test(value)) kind = 'link';
      else if (value.startsWith('[')) kind = 'tag';
      else if (/^[ \t]*(?:#|>|[-*+]|\d+\.)/.test(value)) kind = 'marker';
      const marker = kind === 'marker' ? (/^[ \t]*#/.test(value) ? 'heading' : /^[ \t]*>/.test(value) ? 'quote' : 'list') : undefined;
      tokens.push({text: value, kind, marker});
      last = match.index + value.length;
    }
    if (last < text.length) tokens.push({text: text.slice(last), kind: ''});
    return tokens;
  }
  function tokenize(text, mixed) {
    const tokens = lex(text, mixed), stacks = {block: [], macro: [], tag: []};
    let offset = 0;
    for (const token of tokens) {
      token.start = offset; offset += token.text.length; token.end = offset;
      const stack = stacks[token.kind];
      if (!stack) continue;
      let name = '', closing = false, single = false;
      if (token.kind === 'block') {
        const match = token.text.trim().replace(/\\$/, '').trim().match(/^:::([a-z]+)?(?:\s|$)/i);
        if (!match) continue;
        name = (match[1] || '').toLowerCase(); closing = !name;
      } else if (token.kind === 'macro') {
        closing = token.text === '}'; single = !closing && token.text.endsWith('}');
      } else {
        const match = token.text.match(/^\[(\/?)([a-z]+)/i);
        if (!match) continue;
        name = match[2].toLowerCase(); closing = !!match[1]; single = name === 'hr';
      }
      token.depth = stack.length;
      if (single) continue;
      if (closing) {
        const open = stack.at(-1);
        if (!open || (token.kind === 'tag' && open.name !== name)) { token.unmatched = true; continue; }
        stack.pop(); token.depth = open.token.depth;
        token.pair = open.token.pair = open.token.start;
        token.partner = open.token.start; open.token.partner = token.start;
      } else stack.push({name, token});
    }
    for (const stack of Object.values(stacks)) for (const open of stack) open.token.unmatched = true;
    return tokens;
  }
  function highlight(element, text, mixed) {
    const fragment = document.createDocumentFragment();
    const tokens = tokenize(text, mixed);
    let line = 1;
    const anchor = () => {
      const span = document.createElement('span');
      span.className = 'source-line-anchor'; span.dataset.line = String(line++);
      fragment.appendChild(span);
    };
    anchor();
    for (const token of tokens) {
      const pieces = token.text.split('\n');
      for (let i = 0; i < pieces.length; i++) {
        if (i) { fragment.appendChild(document.createTextNode('\n')); anchor(); }
        if (!pieces[i]) continue;
        if (!token.kind) { fragment.appendChild(document.createTextNode(pieces[i])); continue; }
        const span = document.createElement('span');
        span.className = 'syntax-' + token.kind;
        if (token.marker) span.classList.add('syntax-marker-' + token.marker);
        if (token.format) span.classList.add('syntax-emphasis-' + token.format);
        if (token.depth !== undefined) span.classList.add('syntax-depth-' + token.depth % 5);
        if (token.unmatched) { span.classList.add('syntax-unmatched'); span.title = 'Unmatched delimiter'; }
        if (token.pair !== undefined) span.dataset.pair = String(token.pair);
        span.textContent = pieces[i]; fragment.appendChild(span);
      }
    }
    // A final empty line must occupy the same height as the textarea's caret line.
    fragment.appendChild(document.createTextNode('\n'));
    element.replaceChildren(fragment);
    element.syntaxTokens = tokens;
    element.syntaxText = text;
  }
  function markActive(element, position) {
    const tokens = element.syntaxTokens || [];
    const byStart = new Map(tokens.map(token => [token.start, token]));
    const sections = tokens.filter(t => t.partner > t.start).map(open => ({
      start: open.start, end: byStart.get(open.partner).end
    }));
    const active = sections.filter(section => position >= section.start && position < section.end).at(-1);
    element.activeSyntaxRange = active || null;
    for (const span of element.querySelectorAll('[data-pair]')) {
      span.classList.toggle('syntax-active-delimiter', !!active && span.dataset.pair === String(active.start));
    }
    paintActive(element);
  }
  function paintActive(element) {
    const viewport = document.getElementById('sourceSectionTint');
    if (!viewport) return;
    const active = element.activeSyntaxRange;
    viewport.hidden = !active;
    if (!active) return;
    const text = element.syntaxText || '';
    const firstLine = text.slice(0, active.start).split('\n').length - 1;
    const lastLine = text.slice(0, Math.max(active.start, active.end - 1)).split('\n').length - 1;
    const anchors = element.querySelectorAll('.source-line-anchor');
    const first = anchors[firstLine], next = anchors[lastLine + 1];
    if (!first) { viewport.hidden = true; return; }
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
    const correction = (lineHeight - first.getBoundingClientRect().height) / 2;
    const top = first.offsetTop - correction;
    let bottom;
    if (next) bottom = next.offsetTop - correction;
    else {
      const range = document.createRange(); range.selectNodeContents(element);
      const rects = [...range.getClientRects()].filter(rect => rect.height > 0);
      const glyphBottom = Math.max(...rects.map(rect => rect.bottom));
      bottom = glyphBottom - element.getBoundingClientRect().top + element.scrollTop + correction;
    }
    const band = viewport.firstElementChild;
    band.style.top = (top - element.scrollTop - 1) + 'px';
    band.style.height = Math.max(lineHeight, bottom - top) + 'px';
  }

  globalThis.FolioSyntax = {tokenize, highlight, markActive, paintActive};
})();
