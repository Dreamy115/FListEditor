(() => {
  'use strict';
  // Highlight source without parsing it into editable HTML or changing whitespace.
  function tokenize(text, mixed) {
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
        tokens.push({text: mark, kind: 'emphasis'});
        for (const token of tokenize(emphasis[2], mixed)) {
          tokens.push({text: token.text, kind: token.kind || 'emphasis'});
        }
        tokens.push({text: mark, kind: 'emphasis'});
        last = match.index + value.length;
        continue;
      }
      let kind = 'emphasis';
      if (/^(?:```|`|\[noparse\]|\{noparse\|)/i.test(value)) kind = 'literal';
      else if (value.startsWith('\\')) kind = 'escape';
      else if (/^[ \t]*:::/.test(value) || value.startsWith('{') || value === '}') kind = 'macro';
      else if (/^!?\[.*\]\(https?:/i.test(value)) kind = 'link';
      else if (value.startsWith('[')) kind = 'tag';
      else if (/^[ \t]*(?:#|>|[-*+]|\d+\.)/.test(value)) kind = 'marker';
      tokens.push({text: value, kind});
      last = match.index + value.length;
    }
    if (last < text.length) tokens.push({text: text.slice(last), kind: ''});
    return tokens;
  }
  function highlight(element, text, mixed) {
    const fragment = document.createDocumentFragment();
    for (const token of tokenize(text, mixed)) {
      if (!token.kind) { fragment.appendChild(document.createTextNode(token.text)); continue; }
      const span = document.createElement('span');
      span.className = 'syntax-' + token.kind;
      span.textContent = token.text;
      fragment.appendChild(span);
    }
    // A final empty line must occupy the same height as the textarea's caret line.
    fragment.appendChild(document.createTextNode('\n'));
    element.replaceChildren(fragment);
  }
  globalThis.FolioSyntax = {tokenize, highlight};
})();
