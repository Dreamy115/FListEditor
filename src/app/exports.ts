import { $, source } from './dom';
import { state } from './state';
import { refresh } from '../preview/preview';
import { toast } from './notifications';
import { active } from './active';
import { getCompiled } from '../editor/editing';
import { convertEntityPreference } from '../formatting/entity-preference';

import { bbcodeToMarkdown } from '../formatting/bbcode';

export function download(
  text: string | Blob,
  file: string,
  type: string = 'text/plain;charset=utf-8',
) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([text], { type }));
  link.download = file;
  document.body.append(link);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  link.remove();
}

export function showScreenshotPermission(png: Blob) {
  const dialog = document.createElement('dialog');
  dialog.className = 'clipboard-dialog';
  dialog.setAttribute('aria-labelledby', 'clipboardPermissionTitle');
  dialog.innerHTML = `<h2 id="clipboardPermissionTitle">Allow clipboard access</h2><p>Allow clipboard access in your browser's permission prompt. If access is blocked, open the site permissions beside the address bar and allow Clipboard, then retry.</p><p role="status"></p><div class="clipboard-actions"><button type="button">Retry copy</button><button type="button">Export screenshot (.png)</button><button type="button">Cancel</button></div>`;
  const [retry, exportButton, cancel] = dialog.querySelectorAll('button'),
    status = dialog.querySelector('[role="status"]');
  retry.addEventListener('click', async () => {
    retry.disabled = true;
    status.textContent = 'Requesting clipboard access?';
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      dialog.close();
      toast('Screenshot copied. Paste it into another app!');
    } catch (error) {
      status.textContent =
        'Clipboard access is still blocked. Allow Clipboard in browser site permissions, then retry, or export the PNG.';
    } finally {
      retry.disabled = false;
    }
  });
  exportButton.addEventListener('click', () => {
    download(png, slug() + '.png', 'image/png');
    dialog.close();
    toast('Screenshot exported');
  });
  cancel.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    dialog.remove();
    $('copyScreenshot').focus();
  });
  document.body.append(dialog);
  dialog.showModal();
}

export const slug = () =>
  (active().name || 'character')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'character';

export function bindExportControls() {
  $('exportScreenshot').addEventListener('click', async () => {
    const button = $('exportScreenshot'),
      label = button.textContent,
      filename = slug() + '.png';
    button.disabled = true;
    button.textContent = 'Exporting screenshot…';
    button.setAttribute('aria-busy', 'true');
    try {
      refresh();
      const png = await FolioScreenshot.capture($('previewPage'));
      download(png, filename, 'image/png');
      toast('Screenshot exported');
    } catch (error) {
      console.error('Screenshot export failed', error);
      toast('Screenshot export failed. Please try again.');
    } finally {
      button.disabled = false;
      button.textContent = label;
      button.removeAttribute('aria-busy');
    }
  });

  $('copyScreenshot').addEventListener('click', async () => {
    const button = $('copyScreenshot'),
      label = button.textContent;
    if (
      !navigator.clipboard?.write ||
      typeof ClipboardItem === 'undefined' ||
      (ClipboardItem.supports && !ClipboardItem.supports('image/png'))
    ) {
      toast('Image clipboard is unavailable in this browser. Use Export screenshot (.png).');
      return;
    }
    button.disabled = true;
    button.textContent = 'Copying screenshot…';
    button.setAttribute('aria-busy', 'true');
    let png;
    try {
      refresh();
      png = FolioScreenshot.capture($('previewPage'));
      // Start the clipboard write during the click gesture while rendering finishes.
      png.catch(() => {});
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
      toast('Screenshot copied. Paste it into another app!');
    } catch (error) {
      console.error('Screenshot copy failed', error);
      try {
        showScreenshotPermission(await png);
      } catch (captureError) {
        toast('Screenshot capture failed. Please try again.');
      }
    } finally {
      button.disabled = false;
      button.textContent = label;
      button.removeAttribute('aria-busy');
    }
  });

  for (const [id, format, type] of [['exportHtml', 'html', 'text/html;charset=utf-8']] as const) {
    $(id).addEventListener('click', async () => {
      const button = $(id),
        label = button.textContent,
        filename = slug() + '.' + format,
        title = $('profileName').value.trim() || 'Untitled character';
      button.disabled = true;
      button.textContent = 'Exporting…';
      button.setAttribute('aria-busy', 'true');
      try {
        refresh();
        const result = await FolioScreenshot[format]($('previewPage'), title);
        download(result, filename, type);
        toast(format.toUpperCase() + ' exported');
      } catch (error) {
        console.error(format + ' export failed', error);
        toast(format.toUpperCase() + ' export failed. Please try again.');
      } finally {
        button.disabled = false;
        button.textContent = label;
        button.removeAttribute('aria-busy');
      }
    });
  }

  $('downloadCode').addEventListener('click', () => {
    download(getCompiled(), slug() + '.bbcode');
    toast('BBCode exported');
  });

  $('downloadMarkdown').addEventListener('click', () => {
    download(
      state.data.mixed
        ? source.value
        : convertEntityPreference(
            bbcodeToMarkdown(source.value, true),
            state.data.preferLiterals !== false,
          ),
      slug() + '.md',
      'text/markdown;charset=utf-8',
    );
    toast('Markdown source exported');
  });
}
