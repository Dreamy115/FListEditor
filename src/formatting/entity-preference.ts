import { decodeCharacterReference } from './entities';
import { escapePlainMarkdown } from './escaping';
import { markdownToBB } from './markdown';

export function convertEntityPreference(text: string, preferLiterals: boolean) {
  const edits = [];
  for (const token of FolioSyntax.tokenize(text, true)) {
    // Syntax, link targets and literal code retain their original spelling.
    if (!FolioSyntax.isEntityTextToken(token)) continue;
    const pattern = preferLiterals
      ? /&(?:#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi
      : /[^\x00-\x7f]/gu;
    for (const match of token.text.matchAll(pattern)) {
      const decoded = preferLiterals ? decodeCharacterReference(match[0]) : null;
      const replacement = preferLiterals
        ? decoded === null
          ? match[0]
          : escapePlainMarkdown(decoded)
        : '&#x' + match[0].codePointAt(0)!.toString(16).toUpperCase() + ';';
      if (replacement !== match[0])
        edits.push({
          start: token.start + match.index,
          end: token.start + match.index + match[0].length,
          text: replacement,
        });
    }
  }
  const apply = (value: string, edit: { start: number; end: number; text: string }) =>
    value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  edits.sort((a, b) => b.start - a.start);
  const expected = markdownToBB(text),
    candidate = edits.reduce(apply, text);
  if (markdownToBB(candidate) === expected) return candidate;
  // Keep references that protect syntax or otherwise affect parsing unchanged.
  let result = text;
  for (const edit of edits) {
    const next = apply(result, edit);
    if (markdownToBB(next) === expected) result = next;
  }
  return result;
}
