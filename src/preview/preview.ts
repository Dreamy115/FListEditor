import { source, $ } from '../app/dom';
import { state } from '../app/state';
import { syncHighlightScroll, updateActiveSyntax, updateLineNumbers } from '../editor/view';
import { getCompiled } from '../editor/editing';
import { locatedWarnings } from '../formatting/warnings';

export function jumpToWarning(problem) {
  source.focus();
  source.setSelectionRange(problem.start, problem.end);
  const line = $('sourceLineNumbers').children[problem.line - 1];
  if (line)
    source.scrollTop = Math.max(0, (line as HTMLElement).offsetTop - source.clientHeight / 2);
  syncHighlightScroll();
  updateActiveSyntax();
  $('warningDetails').open = false;
}

export function updateWarnings(problems) {
  const count = $('warningCount'),
    details = $('warningDetails'),
    list = $('warningList');
  count.textContent = problems.length
    ? '\u26a0 ' + problems.length + ' potential issue' + (problems.length === 1 ? '' : 's')
    : 'No obvious issues';
  count.title = problems.length ? 'Show compiler warnings' : '';
  details.classList.toggle('has-issues', problems.length > 0);
  details.dataset.severity = problems.some((problem) => problem.severity === 'error')
    ? 'error'
    : 'warning';
  list.replaceChildren(
    ...problems.map((problem) => {
      const item = document.createElement('li');
      item.dataset.severity = problem.severity || 'warning';
      if (typeof problem === 'string') {
        item.textContent = problem;
        return item;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Line ' + problem.line + ': ' + problem.message;
      button.addEventListener('click', () => jumpToWarning(problem));
      item.appendChild(button);
      return item;
    }),
  );
  if (!problems.length) details.open = false;
}

export function refresh() {
  state.diagnosticHover?.hide();
  const bb = getCompiled(),
    problems = locatedWarnings(source.value, state.data.mixed, bb);
  FolioSyntax.highlight($('sourceHighlight'), source.value, state.data.mixed, problems, {
    preferLiterals: state.data.preferLiterals !== false,
  });
  updateLineNumbers();
  syncHighlightScroll();
  $('previewTitle').textContent = $('profileName').value.trim() || 'Untitled character';
  const preview = $('preview');
  try {
    FolioPreview.update(
      preview,
      preview.closest('.frame'),
      bb,
      renderBB,
      state.templateSession ? state.templateSession.historyId : 'character:' + state.data.active,
      globalThis.FolioLocalImages?.revision,
    );
  } catch (e) {
    preview.textContent = 'Preview error: ' + e.message;
  }
  const text = source.value;
  $('stats').textContent =
    (text.trim() ? text.trim().split(/\s+/).length : 0) +
    ' words · ' +
    text.length.toLocaleString() +
    ' characters';
  updateWarnings(problems);
}

export function bindPreviewEvents() {
  document.addEventListener('folio-images-changed', () => refresh());
}

export function renderBB(input: string) {
  return FolioHorizon.render(input);
}
