export function parsePreviewFontSize(value: unknown) {
  if (value == null) return null;
  const text = String(value ?? '')
    .trim()
    .toLowerCase();
  if (text === '' || text === 'site') return 'site';
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)(?:\s*px)?$/.test(text)) return null;
  const size = Number(text.replace(/\s*px$/, ''));
  return Number.isFinite(size) && size >= 1 && size <= 200 ? String(size) : null;
}
