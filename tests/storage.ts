import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { storageBytes, updateStorageUsage, writeStoredData } from '../src/app/storage';

const { document } = parseHTML('<button id="storageUsage"></button>');
const entries = new Map<string, string>([['unrelated', '😀']]);
let quota = 8192;
let blocked = false;
const storage = {
  get length() {
    return entries.size;
  },
  key: (index: number) => [...entries.keys()][index] ?? null,
  getItem: (key: string) => entries.get(key) ?? null,
  removeItem: (key: string) => {
    entries.delete(key);
  },
  setItem(key: string, value: string) {
    if (blocked) throw Object.assign(new Error('Denied'), { name: 'SecurityError' });
    const next = new Map(entries).set(key, value);
    const size = [...next].reduce((sum, [k, v]) => sum + 2 * (k.length + v.length), 0);
    if (size > quota) throw Object.assign(new Error('Full'), { name: 'QuotaExceededError' });
    entries.set(key, value);
  },
};
Object.assign(globalThis, { document, localStorage: storage });
assert.equal(storageBytes(), 22, 'Counts all keys and UTF-16 surrogate pairs');
updateStorageUsage(true);
assert.match(
  document.getElementById('storageUsage')!.textContent!,
  /22 B used · 8,170 B remaining/,
);
assert.equal(entries.size, 1, 'Probe is removed');
assert.equal(writeStoredData('draft', 'old'), true);
const saved = new Map(entries);
assert.equal(writeStoredData('draft', 'x'.repeat(quota)), false);
assert.deepEqual(entries, saved, 'Quota failure preserves all saved values');
quota *= 2;
updateStorageUsage(true);
assert.match(document.getElementById('storageUsage')!.textContent!, /16,346 B remaining/);
blocked = true;
assert.equal(writeStoredData('draft', 'new'), false);
assert.deepEqual(entries, saved);
assert.equal(
  document.getElementById('storageUsage')!.textContent,
  'Local storage usage unavailable',
);
console.log('Storage accounting, quota refresh, atomic failures and unavailable storage passed');
