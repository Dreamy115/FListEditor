import { readFileSync } from 'node:fs';
import assert from './helpers/assert';
import { boot } from './helpers/browser';
import type { AppData } from '../src/app/types';

const appCode = readFileSync('build/app.js', 'utf8');
const initial = boot(appCode);
const seed = JSON.parse(initial.store.get('folio-f-list-studio-v1')!) as AppData;
seed.drafts = [
  { id: 'a', name: 'Bolt Thunderfeather', content: 'Bolt body' },
  { id: 'b', name: 'Lucas', content: 'Lucas body' },
  { id: 'c', name: 'Thunder', content: 'Thunder body' },
];
seed.active = 'b';
const browser = boot(appCode, seed);
const search = browser.$('characterSearch');
const Event = browser.document.defaultView!.Event;
function filter(value: string) {
  search.value = value;
  search.dispatchEvent(new Event('input'));
}
filter('  THUNDER  ');
assert.deepEqual(browser.snapshot().names, ['Bolt Thunderfeather', 'Thunder']);
assert.equal(browser.source.value, 'Lucas body');
assert.equal(browser.$('profileName').value, 'Lucas');
assert.equal(browser.$('characterSearchEmpty').hidden, true);
// Switching to a match retains the query and normal editor behavior.
(browser.$('draftList').children[0] as HTMLButtonElement).click();
assert.equal(browser.source.value, 'Bolt body');
assert.equal(search.value, '  THUNDER  ');
// Keyboard reordering uses matching neighbors, retaining focus on the moved row.
const down = new Event('keydown');
Object.assign(down, { key: 'ArrowDown', altKey: true });
browser.$('draftList').children[0].dispatchEvent(down);
assert.deepEqual(browser.snapshot().names, ['Thunder', 'Bolt Thunderfeather']);
assert.equal(browser.document.activeElement, browser.$('draftList').children[1]);
filter('no match');
assert.deepEqual(browser.snapshot().names, []);
assert.equal(browser.$('characterSearchEmpty').hidden, false);
const escape = new Event('keydown');
Object.assign(escape, { key: 'Escape' });
search.dispatchEvent(escape);
assert.equal(search.value, '');
assert.equal(browser.$('characterSearchEmpty').hidden, true);
assert.deepEqual(browser.snapshot().names, ['Lucas', 'Thunder', 'Bolt Thunderfeather']);
// Name edits rerender the results; search itself never changes persisted drafts.
filter('thunder');
browser.change('profileName', 'Renamed');
assert.deepEqual(browser.snapshot().names, ['Thunder']);
filter('');
assert.deepEqual(browser.snapshot().names, ['Lucas', 'Thunder', 'Renamed']);
console.log('Character search, editor preservation, and filtered reorder checks passed');
