import { $ } from '../app/dom';
import { makeId, state } from '../app/state';
import { stashEditor, uniqueCharacterName, loadDraft } from './characters';
import { toast, requestConfirmation } from '../app/notifications';

export function bindCharacterControls() {
  $('profileName').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      $('profileName').blur();
    }
  });

  $('newDraft').addEventListener('click', () => {
    if (state.data.drafts.length >= 80) {
      toast('Maximum 80 characters. Delete one before creating another.');
      return;
    }
    stashEditor();
    const d = { id: makeId(), name: uniqueCharacterName('Untitled character'), content: '' };
    state.data.drafts.unshift(d);
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
