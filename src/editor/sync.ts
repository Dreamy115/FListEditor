import { active } from '../app/active';
import { source, $ } from '../app/dom';
import { state } from '../app/state';
import { updateTemplateStatus } from '../templates/templates';
import { refresh } from '../preview/preview';
import { scheduleSave, toast } from '../app/notifications';
import { characterNameTaken, renderDrafts } from '../characters/characters';

export function syncFromEditor() {
  active().content = source.value;
  if (state.templateSession) updateTemplateStatus();
  refresh();
  scheduleSave();
}

export function syncName() {
  const input = $('profileName'),
    name =
      input.value.trim() || (state.templateSession ? 'Untitled template' : 'Untitled character');
  if (!state.templateSession && characterNameTaken(name, state.data.active)) {
    input.value = active().name;
    toast('A character with that name already exists. Choose a unique name.');
    return;
  }
  active().name = name;
  if (state.templateSession) updateTemplateStatus();
  renderDrafts();
  refresh();
  scheduleSave();
}
