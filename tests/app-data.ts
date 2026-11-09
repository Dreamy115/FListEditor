import type { TestControl, TestHandler } from './helpers/types';
import { createContext } from './helpers/typescript';
import * as units from './helpers/typescript.ts';
import assert from './helpers/assert';

const handlers: Record<string, TestHandler> = {};
const elements = new Map<string, TestControl>();
const $ = (id: string) => {
  if (!elements.has(id))
    elements.set(id, {
      options: [{ value: 'flist-blue' }],
      addEventListener: (type: string, fn: TestHandler) => {
        handlers[id + ':' + type] = fn;
      },
    });
  return elements.get(id)!;
};
let stored: string | null = 'old';
// The click below must register this callback before the test invokes it.
let confirmation!: () => Promise<void>;
let applied!: import('../src/app/types').AppData;
const context = createContext({
  STORAGE: 'folio-f-list-studio-v1',
  $,
  parsePreviewFontSize: (v: unknown) => (v === '16' ? '16' : null),
  clearTimeout: () => {},
  saveTimer: 1,
  makeId: () => 'fresh',
  requestConfirmation: (_message: string, fn: () => Promise<void>) => {
    confirmation = fn;
  },
  localStorage: {
    removeItem: () => {
      stored = null;
    },
  },
  toast: () => {},
  replaceAppData: (next: import('../src/app/types').AppData) => {
    applied = next;
    stored = 'default';
  },
});
units.load(context, 'app/backups', { names: ['validateAppBackup'], effects: [] });
const backup = {
  format: 'folio-app',
  version: 1,
  data: {
    drafts: [{ id: 'one', name: 'One', content: '[b]Hello[/b]', mixed: false }],
    customTemplates: [{ id: 'custom', name: 'Template', content: '# Heading' }],
    active: 'one',
    mixed: false,
    previewNoteDismissed: true,
    editorTheme: 'forest',
    theme: 'flist-blue',
    previewFontSize: '16',
    splitRatio: 0.6,
  },
};
assert.equal(context.validateAppBackup(backup), backup.data);
const largeBackup = structuredClone(backup);
largeBackup.data.drafts = Array.from({ length: 90 }, (_, index) => ({
  ...backup.data.drafts[0],
  id: 'draft-' + index,
}));
largeBackup.data.active = largeBackup.data.drafts[0].id;
assert.equal(context.validateAppBackup(largeBackup).drafts.length, 90);

for (const modify of [
  (b: {
    version: number;
    data: {
      drafts: ({ id: string; name: string; content: string } | null)[];
      active: string;
      splitRatio: number;
      customTemplates: { content: string | number }[];
    };
  }) => (b.version = 2),
  (b: {
    version: number;
    data: {
      drafts: ({ id: string; name: string; content: string } | null)[];
      active: string;
      splitRatio: number;
      customTemplates: { content: string | number }[];
    };
  }) => b.data.drafts.push(b.data.drafts[0]),
  (b: {
    version: number;
    data: {
      drafts: ({ id: string; name: string; content: string } | null)[];
      active: string;
      splitRatio: number;
      customTemplates: { content: string | number }[];
    };
  }) => (b.data.drafts = [null]),
  (b: {
    version: number;
    data: {
      drafts: ({ id: string; name: string; content: string } | null)[];
      active: string;
      splitRatio: number;
      customTemplates: { content: string | number }[];
    };
  }) => (b.data.active = 'missing'),
  (b: {
    version: number;
    data: {
      drafts: ({ id: string; name: string; content: string } | null)[];
      active: string;
      splitRatio: number;
      customTemplates: { content: string | number }[];
    };
  }) => (b.data.splitRatio = 9),
  (b: {
    version: number;
    data: {
      drafts: ({ id: string; name: string; content: string } | null)[];
      active: string;
      splitRatio: number;
      customTemplates: { content: string | number }[];
    };
  }) => (b.data.customTemplates[0].content = 42),
]) {
  const invalid = structuredClone(backup);
  modify(invalid);
  assert.throws(() => context.validateAppBackup(invalid));
}
units.load(context, 'app/backups', { names: [], effects: ["$('purgeData')"] });
handlers['purgeData:click']();
assert.equal(stored, 'old');
assert.equal(applied, undefined);
let finishClearing!: () => void;
let reloads = 0;
context.FolioLocalImages = {
  clear: () =>
    new Promise<void>((resolve) => {
      finishClearing = resolve;
    }),
};
context.location = {
  reload: () => {
    reloads++;
  },
};
const purged = confirmation();
assert.equal(stored, null);
assert.equal(applied.drafts[0].content, '');
assert.equal(applied.customTemplates.length, 0);
assert.equal(applied.editorTheme, 'folio');
assert.equal(reloads, 0, 'Wait for image storage to clear before reloading');
finishClearing();
purged
  .then(() => {
    assert.equal(reloads, 1, 'Reload after confirmed purge finishes');
    console.log('Full-app backup validation and confirmed purge/reload checks passed');
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
