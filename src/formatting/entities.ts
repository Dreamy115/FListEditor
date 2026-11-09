import namedCharacterReferences from './named-references.json';

export function numericCharacterReference(reference: string) {
  const match = reference.match(/^&#(?:x([0-9a-f]+)|([0-9]+));$/i);
  if (!match) return null;
  const code = parseInt(match[1] || match[2], match[1] ? 16 : 10);
  if (
    !Number.isSafeInteger(code) ||
    code < 0x20 ||
    code > 0x10ffff ||
    (code >= 0x7f && code <= 0x9f) ||
    (code >= 0xd800 && code <= 0xdfff)
  )
    return null;
  return String.fromCodePoint(code);
}

export function decodeCharacterReference(reference: string) {
  if (reference.startsWith('&#')) return numericCharacterReference(reference);
  const name = reference.slice(1, -1);
  return Object.hasOwn(namedCharacterReferences, name)
    ? (namedCharacterReferences as Record<string, string>)[name]
    : null;
}
