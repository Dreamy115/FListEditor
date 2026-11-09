import { runBrowserFixture } from './helpers/browser-fixture';
await runBrowserFixture({
  script: 'diagnostics.browser.js',
  resultId: 'diagnostics-result',
  widths: [1440, 600],
});
