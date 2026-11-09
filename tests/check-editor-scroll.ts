import { runBrowserFixture } from './helpers/browser-fixture';
await runBrowserFixture({
  script: 'editor-scroll.browser.js',
  resultId: 'editor-scroll-result',
  widths: [1440, 600],
});
