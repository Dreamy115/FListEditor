import { decodeCharacterReference } from './entities';

export function escapePlainMarkdown(text: string) {
  return text
    .replace(/&(?:#(?:x[0-9a-f]+|[0-9]+)|[a-z][a-z0-9]+);/gi, (reference) =>
      decodeCharacterReference(reference) === null ? reference : '&#x26;' + reference.slice(1),
    )
    .replace(/([\\*_{}`~+])/g, '\\$1')
    .replace(
      /^(\s*)(#{1,6}\s|>\s|[-*+]\s|(?:-{3,}|\*{3,}|_{3,})\s*$)/gm,
      (_, indent, lead) => indent + '\\' + lead,
    );
}
