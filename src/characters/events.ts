import { storeNewCharacter } from '../app/notifications';
import { $ } from '../app/dom';
import { makeId, state } from '../app/state';
import { stashEditor, uniqueCharacterName, loadDraft, renderDrafts } from './characters';
import { toast, requestConfirmation } from '../app/notifications';

export function bindCharacterControls() {
  $('characterSearch').addEventListener('input', renderDrafts);
  $('characterSearch').addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.isComposing) return;
    event.preventDefault();
    $('characterSearch').value = '';
    renderDrafts();
  });

  $('profileName').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      $('profileName').blur();
    }
  });

  $('newDraft').addEventListener('click', () => {
    stashEditor();
    const d = {
      id: makeId(),
      name: uniqueCharacterName('Untitled character'),
      content: '',
      mixed: state.templateSession ? state.templateSession.returnContext.mixed : state.data.mixed,
    };
    if (!storeNewCharacter(d)) return;
    loadDraft(d.id);
    $('profileName').focus();
    $('profileName').select();
    toast('New character draft created');
  });

  $('deleteDraft').addEventListener('click', () =>
    requestConfirmation('Delete the current draft? This cannot be undone.', () => {
      state.data.drafts = state.data.drafts.filter((d) => d.id !== state.data.active);
      if (!state.data.drafts.length)
        state.data.drafts.push({ id: makeId(), name: 'New Character', content: '' });
      loadDraft(state.data.drafts[0].id);
      toast('Draft deleted');
    }),
  );
}
