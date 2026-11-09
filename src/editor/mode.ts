import { source, $ } from '../app/dom';
import { state } from '../app/state';
import { rememberSelection, commitEdit } from './history';
import { convertEntityPreference } from '../formatting/entity-preference';

import { bbcodeToMarkdown } from '../formatting/bbcode';
import { normalizeColorTags } from '../formatting/colors';
import { markdownToBB } from '../formatting/markdown';
import { active } from '../app/active';
import { updateMode } from '../characters/characters';
import { scheduleSave, toast } from '../app/notifications';

export function switchMode(toMixed: boolean) {
  if (state.data.mixed === toMixed) return;
  rememberSelection();
  const oldLength = source.value.length;
  const oldStart = source.selectionStart,
    oldEnd = source.selectionEnd;
  const oldScroll = source.scrollTop;
  const converted = toMixed
    ? convertEntityPreference(
        bbcodeToMarkdown(source.value, true),
        state.data.preferLiterals !== false,
      )
    : normalizeColorTags(markdownToBB(source.value));
  state.data.mixed = toMixed;
  source.value = converted;
  // Preserve the editing position approximately after a full-source transformation.
  const start = oldLength ? Math.round((oldStart / oldLength) * converted.length) : 0;
  const end = oldLength ? Math.round((oldEnd / oldLength) * converted.length) : 0;
  source.setSelectionRange(start, end);
  source.scrollTop = oldScroll;
  active().content = converted;
  updateMode();
  source.focus();
  commitEdit('action');
  scheduleSave();
  toast(toMixed ? 'Converted BBCode to Markdown+' : 'Compiled Markdown+ to BBCode');
}

export function bindModeControls() {
  $('mixedMode').addEventListener('click', () => switchMode(true));

  $('bbMode').addEventListener('click', () => switchMode(false));
}
