import { runBrowserFixture } from './helpers/browser-fixture';
await runBrowserFixture({
  script: 'template-editor.browser.js',
  resultId: 'template-main-result',
  widths: [1440, 800, 600],
});
