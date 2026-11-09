import { parsePreviewFontSize } from './preferences';
import { source, $ } from '../app/dom';
import { state } from '../app/state';
import { persist, toast } from '../app/notifications';
import { download } from '../app/exports';

export function setEditorTheme() {
  document.documentElement.dataset.appTheme = state.data.editorTheme;
  source.parentElement!.dataset.editorTheme = state.data.editorTheme;
  $('editorTheme').value = state.data.editorTheme;
}

export const previewCssMenu = $('previewCssMenu');

export function setTheme() {
  try {
    FolioPreviewThemes.apply(state.data.theme, state.data.customPreviewCss);
  } catch (error) {
    FolioPreviewThemes.apply('default', '');
    toast('Could not load saved preview CSS. Load a valid CSS file.');
  }
  $('previewCssStatus').textContent = state.data.customPreviewCssName || 'No custom sheet';
  $('clearPreviewCss').disabled = !state.data.customPreviewCss;
  document.documentElement.dataset.flistScheme = state.data.theme;
  $('previewPage').className =
    'previewpage' + (state.data.theme === 'default' ? '' : ' ' + state.data.theme);
  $('theme').value = state.data.theme;
  setPreviewFontSize();
}

export function setPreviewFontSize() {
  $('previewPage').style.setProperty(
    '--horizon-rem',
    (state.data.previewFontSize === 'site' ? '16' : state.data.previewFontSize) + 'px',
  );
  $('preview').style.fontSize =
    state.data.previewFontSize === 'site' ? '' : state.data.previewFontSize + 'px';
  $('previewFontSize').value =
    state.data.previewFontSize === 'site' ? '' : state.data.previewFontSize;
  $('previewFontSize').removeAttribute('aria-invalid');
}

export function bindAppearanceControls() {
  $('editorTheme').addEventListener('change', (e) => {
    state.data.editorTheme = (e.target as HTMLInputElement).value;
    setEditorTheme();
    persist();
  });

  previewCssMenu.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('button')) previewCssMenu.open = false;
  });

  document.addEventListener('click', (event) => {
    if (!previewCssMenu.contains(event.target as Node)) previewCssMenu.open = false;
  });

  previewCssMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      previewCssMenu.open = false;
      previewCssMenu.querySelector<HTMLElement>('summary')!.focus();
      event.preventDefault();
    }
  });

  $('loadPreviewCss').addEventListener('click', () => $('previewCssFile').click());

  $('previewCssFile').addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.css') || file.size > 200000) {
      toast('Choose a .css file up to 200 KB.');
      return;
    }
    try {
      const css = await file.text();
      FolioPreviewThemes.compile(css);
      state.data.customPreviewCss = css;
      state.data.customPreviewCssName = file.name.slice(0, 100);
      state.data.theme = 'custom-css';
      setTheme();
      persist();
      toast('Custom preview CSS loaded');
    } catch (error) {
      toast('Could not load CSS. Include flat style rules, @media, or @supports.');
    }
  });

  $('downloadPreviewCss').addEventListener('click', () => {
    const theme = FolioPreviewThemes.themes[state.data.theme] ? state.data.theme : 'folio-midnight';
    download(FolioPreviewThemes.themes[theme], theme + '.css', 'text/css;charset=utf-8');
  });

  $('clearPreviewCss').addEventListener('click', () => {
    state.data.customPreviewCss = '';
    state.data.customPreviewCssName = '';
    if (state.data.theme === 'custom-css') state.data.theme = 'folio-midnight';
    setTheme();
    persist();
  });

  $('theme').addEventListener('change', (e) => {
    state.data.theme = (e.target as HTMLInputElement).value;
    setTheme();
    persist();
  });

  $('previewFontSize').addEventListener('input', (e) => {
    const size = parsePreviewFontSize((e.target as HTMLInputElement).value);
    if (!size) {
      (e.target as HTMLInputElement).setAttribute('aria-invalid', 'true');
      return;
    }
    (e.target as HTMLInputElement).removeAttribute('aria-invalid');
    state.data.previewFontSize = size;
    $('preview').style.fontSize = size === 'site' ? '' : size + 'px';
    $('previewPage').style.setProperty('--horizon-rem', (size === 'site' ? '16' : size) + 'px');
    persist();
  });

  $('previewFontSize').addEventListener('change', setPreviewFontSize);
}
