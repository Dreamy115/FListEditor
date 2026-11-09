import { runBrowserFixture } from './helpers/browser-fixture';
await runBrowserFixture({
  script: 'selection-caret.browser.js',
  resultId: 'selection-caret-result',
  widths: [1440, 600],
});
