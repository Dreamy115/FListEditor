import type { ProfileRecord } from './types';
import { writeStoredData } from './storage';
import { $ } from './dom';
import { STORAGE, state } from './state';
import { templateDirty } from '../templates/templates';

export function persist() {
  try {
    if (
      !writeStoredData(
        STORAGE,
        JSON.stringify(
          state.templateSession
            ? { ...state.data, mixed: state.templateSession.returnContext.mixed }
            : state.data,
        ),
      )
    )
      throw Error('Storage write failed');
    $('saveStatus').textContent =
      state.templateSession && templateDirty() ? 'Template changes not saved' : '● Saved locally';
    return true;
  } catch (e) {
    $('saveStatus').textContent =
      '⚠ Not saved: local storage full or unavailable. Export your work.';
    return false;
  }
}

export function scheduleSave() {
  $('saveStatus').textContent = '◌ Saving…';
  clearTimeout(state.saveTimer ?? undefined);
  state.saveTimer = setTimeout(persist, 260);
}

export let pendingConfirm: (() => void) | null = null;

export function requestConfirmation(message: string, callback: () => void) {
  pendingConfirm = callback;
  $('confirmText').textContent = message;
  $('confirmBar').hidden = false;
}

export function clearConfirmation() {
  pendingConfirm = null;
  $('confirmBar').hidden = true;
}

export function toast(message: string) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(state.toastTimer ?? undefined);
  state.toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

export function bindConfirmationControls() {
  $('confirmYes').addEventListener('click', () => {
    const action = pendingConfirm;
    clearConfirmation();
    if (action) action();
  });

  $('confirmNo').addEventListener('click', clearConfirmation);
}

/** Save the complete prospective collection before changing the active editor. */
export function storeNewCharacter(character: ProfileRecord): boolean {
  const drafts = [character, ...state.data.drafts];
  const mixed =
    character.mixed ??
    (state.templateSession ? state.templateSession.returnContext.mixed : state.data.mixed);
  if (
    writeStoredData(STORAGE, JSON.stringify({ ...state.data, drafts, active: character.id, mixed }))
  ) {
    state.data.drafts = drafts;
    return true;
  }
  $('saveStatus').textContent = '⚠ Not saved: local storage full or unavailable. Export your work.';
  toast(
    'Cannot create character: local storage full or unavailable. Export data or delete unused drafts.',
  );
  return false;
}
