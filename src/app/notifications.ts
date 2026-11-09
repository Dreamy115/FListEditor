import { $ } from './dom';
import { STORAGE, state } from './state';
import { templateDirty } from '../templates/templates';

export function persist() {
  try {
    localStorage.setItem(
      STORAGE,
      JSON.stringify(
        state.templateSession
          ? { ...state.data, mixed: state.templateSession.returnContext.mixed }
          : state.data,
      ),
    );
    $('saveStatus').textContent =
      state.templateSession && templateDirty() ? 'Template changes not saved' : '● Saved locally';
    return true;
  } catch (e) {
    $('saveStatus').textContent = '⚠ Storage unavailable';
    return false;
  }
}

export function scheduleSave() {
  $('saveStatus').textContent = '◌ Saving…';
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(persist, 260);
}

export let pendingConfirm = null;

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
  clearTimeout(state.toastTimer);
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
