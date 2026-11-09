import { source, $ } from './dom';
import { state } from './state';
import { persist } from './notifications';
import { macroInlineNames, macroBlockNames } from '../formatting/tags';
import { colorNames, resolvedColor } from '../formatting/colors';
import { replaceRange } from '../editor/editing';
import { setEditorTheme, setTheme } from '../preview/appearance';
import { loadDraft, updateMode } from '../characters/characters';
import { refreshUndoButtons } from '../editor/history';

export const paneDivider = $('paneDivider');

export function applyPaneSplit() {
  const app = document.querySelector<HTMLElement>('.app')!;
  app.style.setProperty('--editor-share', state.data.splitRatio + 'fr');
  app.style.setProperty('--preview-share', 1 - state.data.splitRatio + 'fr');
  paneDivider.setAttribute('aria-valuenow', String(Math.round(state.data.splitRatio * 100)));
  paneDivider.setAttribute('aria-valuetext', Math.round(state.data.splitRatio * 100) + '% source');
}

export function movePaneDivider(clientX: number) {
  const editor = $('sourcePane').getBoundingClientRect(),
    preview = $('previewPane').getBoundingClientRect();
  const width = preview.right - editor.left - paneDivider.offsetWidth;
  if (width > 0) {
    state.data.splitRatio = Math.max(
      0.25,
      Math.min(0.75, (clientX - editor.left - paneDivider.offsetWidth / 2) / width),
    );
    applyPaneSplit();
  }
}

export function finishPaneResize() {
  document.body.classList.remove('resizing-panes');
  persist();
}

export function initializeLayout() {
  paneDivider.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    paneDivider.focus();
    paneDivider.setPointerCapture(e.pointerId);
    document.body.classList.add('resizing-panes');
    movePaneDivider(e.clientX);
  });

  paneDivider.addEventListener('pointermove', (e) => {
    if (paneDivider.hasPointerCapture(e.pointerId)) movePaneDivider(e.clientX);
  });

  for (const event of ['pointerup', 'pointercancel'] as const)
    paneDivider.addEventListener(event, (e) => {
      if (paneDivider.hasPointerCapture(e.pointerId))
        paneDivider.releasePointerCapture(e.pointerId);
      finishPaneResize();
    });

  paneDivider.addEventListener('lostpointercapture', finishPaneResize);

  paneDivider.addEventListener('dblclick', () => {
    state.data.splitRatio = 0.524;
    applyPaneSplit();
    persist();
  });

  paneDivider.addEventListener('keydown', (e) => {
    const steps: Record<string, number> = { ArrowLeft: -0.02, ArrowRight: 0.02 };
    if (e.key in steps)
      state.data.splitRatio = Math.max(
        0.25,
        Math.min(0.75, state.data.splitRatio + steps[e.key] * (e.shiftKey ? 5 : 1)),
      );
    else if (e.key === 'Home') state.data.splitRatio = 0.25;
    else if (e.key === 'End') state.data.splitRatio = 0.75;
    else return;
    e.preventDefault();
    applyPaneSplit();
    persist();
  });

  $('previewNote').hidden = state.data.previewNoteDismissed;

  $('dismissPreviewNote').addEventListener('click', () => {
    state.data.previewNoteDismissed = true;
    $('previewNote').hidden = true;
    $('theme').focus();
    persist();
  });

  applyPaneSplit();

  state.diagnosticHover = FolioDiagnostics.attach({
    source,
    layer: $('sourceHighlight'),
    getConfig: () => ({
      mixed: state.data.mixed,
      inlineNames: macroInlineNames,
      blockNames: macroBlockNames,
      colors: colorNames,
      resolveColor: resolvedColor,
    }),
    applyFix: (fix) => replaceRange(fix.text, fix.start, fix.end),
  });

  setEditorTheme();
  setTheme();
  loadDraft(state.data.active);
  updateMode();
  refreshUndoButtons();
}
