import { rememberSelection, commitEdit } from '../editor/history';
import { source } from '../app/dom';
import { state } from '../app/state';
import { markdownToBB } from '../formatting/markdown';
import { syncFromEditor } from '../editor/sync';
import { toast, requestConfirmation } from '../app/notifications';
import { renderTemplateTargets, loadTemplateForm } from './templates';
import { loadDraft } from '../characters/characters';
import { wrapInline } from '../editor/editing';

export function applyTemplate(content: string, name: string) {
  rememberSelection();
  source.value = state.data.mixed ? content : markdownToBB(content);
  source.focus();
  syncFromEditor();
  commitEdit('action');
  toast(name + ' template applied');
}

export function requestApplyTemplate(content: string, name: string, targetId: string) {
  const character = state.data.drafts.find((d) => d.id === targetId);
  if (!character) return;
  requestConfirmation(
    'Replace character "' +
      character.name +
      '" with template "' +
      name +
      '"? This replaces the profile description.',
    () => {
      if (!state.data.drafts.some((d) => d.id === targetId)) {
        renderTemplateTargets();
        toast('That character no longer exists');
        return;
      }
      loadDraft(targetId);
      applyTemplate(content, name);
    },
  );
}

export function bindFormattingControls() {
  document
    .querySelectorAll<HTMLElement>('[data-template]')
    .forEach((btn) =>
      btn.addEventListener('click', () => loadTemplateForm('builtin:' + btn.dataset.template)),
    );

  document
    .querySelectorAll<HTMLElement>('[data-wrap]')
    .forEach((btn) => btn.addEventListener('click', () => wrapInline(btn.dataset.wrap!)));
}
