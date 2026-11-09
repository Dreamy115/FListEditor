/** Refresh HTML5 entities from WHATWG, or a local copy of entities.json. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const source = process.argv[2];
const url = 'https://html.spec.whatwg.org/entities.json';
let records: Record<string, { characters: string }>;
if (source) records = JSON.parse(readFileSync(source, 'utf8'));
else {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok)
    throw Error(`Entity download failed: ${response.status} ${response.statusText}`);
  records = (await response.json()) as typeof records;
}
const entries = Object.entries(records)
  .filter(([key]) => key.startsWith('&') && key.endsWith(';'))
  .map(([key, record]) => {
    if (typeof record?.characters !== 'string') throw Error(`Invalid entity: ${key}`);
    return [key.slice(1, -1), record.characters] as const;
  })
  .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
if (entries.length < 2000)
  throw Error('Incomplete HTML5 entity table; existing data was not changed');
const output = fileURLToPath(new URL('../src/formatting/named-references.json', import.meta.url));
writeFileSync(output, JSON.stringify(Object.fromEntries(entries), null, 2) + '\n');
console.log(`Updated ${entries.length} HTML5 named references`);
