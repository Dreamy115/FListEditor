(() => {
  'use strict';
  const examples = {
    font: '{font:smallcaps|text}', color: '{color:purple|text}', link: '{link:https://example.com|text}',
    img: '{img:12345|image label}', image: '{image:12345|image label}',
    user: '{user:Character Name}', icon: '{icon:Character Name}', eicon: '{eicon:name}',
    br: '{br}', hr: '{hr}', noparse: '{noparse|literal text}'
  };
  function nearest(value, names) {
    const distance = other => {
      let row = Array.from({length: other.length + 1}, (_, i) => i);
      for (let i = 0; i < value.length; i++) {
        const next = [i + 1];
        for (let j = 0; j < other.length; j++) next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (value[i] !== other[j])));
        row = next;
      }
      return row[other.length];
    };
    const ranked = [...names].map(name => ({name, score: distance(name)})).sort((a, b) => a.score - b.score);
    return ranked[0]?.score <= 2 && ranked[0]?.score !== ranked[1]?.score ? ranked[0].name : null;
  }
  function guidance(problem, text, config) {
    const fragment = text.slice(problem.start, problem.end), message = problem.message;
    const result = {help: '', example: '', fix: null};
    const fix = (label, replacement) => { result.fix = {label, start: problem.start, end: problem.end, text: replacement}; };
    if (message.startsWith('Color ')) {
      const value = message.slice(6, message.indexOf(' is not supported'));
      const suggestion = config.resolveColor(value) || nearest(value.toLowerCase(), config.colors);
      result.help = 'Use one of the 12 profile colors: ' + [...config.colors].join(', ') + '.';
      result.example = config.mixed ? '{color:purple|text}' : '[color=purple]text[/color]';
      if (suggestion) {
        const replacement = fragment.startsWith('[') ? '[color=' + suggestion + ']'
          : fragment.startsWith('{') ? '{color:' + suggestion + '|' : ':::color ' + suggestion;
        fix('Use ' + suggestion, replacement);
      }
    } else if (message.startsWith('Nested text alignment:')) {
      result.help = 'The innermost alignment takes precedence over its enclosing alignment. In Markdown+, add a bang (!) to the inner block opener, such as :::right !, to suppress this warning when the nesting is intentional.';
      result.example = config.mixed ? ':::center\nCentered text\n:::right !\nRight-aligned text\n:::\n:::' : '[center]Centered text[right]Right-aligned text[/right][/center]';
    } else if (message.startsWith('Nested font macros')) {
      result.help = 'Use one font per text span. Move the inner font macro outside the outer one, or remove one of the font wrappers.';
      result.example = '{font:smallcaps|First} {font:bold|Second}';
    } else if (message.includes('block macro')) {
      const parsed = fragment.trim().match(/^:+\s*([a-z]+)?/i), name = parsed?.[1]?.toLowerCase();
      if (message.includes('closing marker') && !name) {
        result.help = message.startsWith('Unmatched') ? 'Remove this extra closing marker, or add its opening block above it.' : 'A block closes with exactly three colons on their own line.';
        result.example = ':::center\ntext\n:::';
        fix(message.startsWith('Unmatched') ? 'Remove extra closing marker' : 'Use :::', message.startsWith('Unmatched') ? '' : ':::');
      } else if (message.startsWith('Unclosed')) {
        result.help = 'Add a line containing ::: after this block’s contents. Close inner blocks before outer blocks.';
        result.example = ':::' + name + '\ntext\n:::';
      } else {
        const suggestion = config.blockNames.has(name) ? name : name && nearest(name, config.blockNames);
        result.help = 'Open a block with :::name and close it with ::: on a separate line. Nest each block inside its parent.';
        if (suggestion) {
          result.example = ':::' + suggestion + (suggestion === 'font' ? ' bold' : suggestion === 'color' ? ' purple' : suggestion === 'collapse' ? ' More details' : '') + '\ntext\n:::';
          if (!['font', 'color', 'collapse'].includes(suggestion)) fix('Use :::' + suggestion, ':::' + suggestion);
        } else result.example = ':::center\ntext\n:::';
      }
    } else if (/inline macro/.test(message)) {
      const name = fragment.match(/^\{([a-z]+)/i)?.[1]?.toLowerCase();
      const suggestion = config.inlineNames.has(name) ? name : name && nearest(name, config.inlineNames);
      result.help = message.startsWith('Unclosed') ? 'Inline macros must fit on one line. For multiline fonts use :::font bold, the text on following lines, and a closing :::. Close each opening brace with }.'
        : 'Use {name|text} for formatting, or {name:argument} for a user, icon, or image. Links need a valid http(s) URL and a text body.';
      result.example = suggestion ? examples[suggestion] || '{' + suggestion + '|text}' : '{b|{i|text}}';
      if (suggestion && suggestion !== name) fix('Change macro to ' + suggestion, fragment.replace(/^\{[a-z]+/i, '{' + suggestion));
    } else if (message.startsWith('Misnested')) {
      result.help = 'Close the innermost tag first, then its parent.';
      result.example = '[b][i]text[/i][/b]';
    } else if (message.startsWith('Unclosed')) {
      result.help = 'Add the matching closing tag after the intended content.';
      result.example = fragment + 'text[/' + (fragment.match(/^\[([a-z]+)/i)?.[1] || 'b') + ']';
    } else if (message.startsWith('Unmatched')) {
      result.help = 'Remove this closing tag, or add its matching opening tag before the content.';
    } else {
      result.help = 'Replace this with supported profile formatting. Use the toolbar to insert a supported tag or macro.';
      result.example = config.mixed ? '{b|text}' : '[b]text[/b]';
    }
    return result;
  }
  function attach({source, layer, getConfig, applyFix}) {
    const popup = document.createElement('div');
    popup.id = 'sourceDiagnostic'; popup.className = 'source-diagnostic'; popup.hidden = true;
    popup.setAttribute('role', 'dialog'); popup.setAttribute('aria-label', 'Source warning and suggested fix');
    document.body.appendChild(popup);
    let showTimer, hideTimer, current = null;
    const hide = () => {
      clearTimeout(showTimer); clearTimeout(hideTimer); current = null; popup.hidden = true;
      source.removeAttribute('aria-describedby');
    };
    const laterHide = () => { clearTimeout(showTimer); clearTimeout(hideTimer); hideTimer = setTimeout(hide, 180); };
    function show(problem, rect) {
      clearTimeout(showTimer); clearTimeout(hideTimer);
      current = problem;
      const snapshot = source.value, advice = guidance(problem, snapshot, getConfig());
      const palette = getComputedStyle(source.closest('.editor-shell'));
      for (const name of ['--editor-bg', '--editor-text', '--editor-warning']) popup.style.setProperty(name, palette.getPropertyValue(name));
      const heading = document.createElement('strong'); heading.textContent = 'Warning · Line ' + problem.line;
      const message = document.createElement('p'); message.textContent = problem.message;
      const help = document.createElement('p'); help.className = 'diagnostic-help'; help.textContent = advice.help;
      popup.replaceChildren(heading, message, help);
      if (advice.example) { const code = document.createElement('pre'); code.textContent = advice.example; popup.appendChild(code); }
      if (advice.fix) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = advice.fix.label;
        button.addEventListener('click', () => {
          if (source.value !== snapshot) { hide(); return; }
          hide(); applyFix(advice.fix);
        });
        popup.appendChild(button);
      }
      const hint = document.createElement('small'); hint.textContent = 'Alt+Enter or Ctrl+. at a warning · Esc to dismiss'; popup.appendChild(hint);
      popup.hidden = false;
      const margin = 8, width = popup.getBoundingClientRect().width, height = popup.getBoundingClientRect().height;
      popup.style.left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)) + 'px';
      popup.style.top = Math.max(margin, rect.bottom + height + margin < window.innerHeight ? rect.bottom + 5 : rect.top - height - 5) + 'px';
      source.setAttribute('aria-describedby', popup.id);
    }
    source.addEventListener('pointermove', event => {
      if (event.buttons) { hide(); return; }
      const bounds = source.getBoundingClientRect();
      // The textarea covers the syntax layer: hit-test painted glyph rectangles
      // instead of intercepting pointer events needed for editing and selection.
      if (event.clientX >= bounds.right - (source.offsetWidth - source.clientWidth) || event.clientY >= bounds.bottom - (source.offsetHeight - source.clientHeight)) { laterHide(); return; }
      for (const span of layer.querySelectorAll('.syntax-warning')) for (const rect of span.getClientRects()) {
        if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom + 4) {
          const problem = span.warningProblems[0];
          clearTimeout(hideTimer);
          if (current !== problem) { clearTimeout(showTimer); showTimer = setTimeout(() => show(problem, rect), 250); }
          return;
        }
      }
      laterHide();
    });
    source.addEventListener('pointerleave', laterHide);
    popup.addEventListener('pointerenter', () => { clearTimeout(hideTimer); });
    popup.addEventListener('pointerleave', laterHide);
    popup.addEventListener('focusin', () => { clearTimeout(hideTimer); });
    popup.addEventListener('focusout', event => { if (!popup.contains(event.relatedTarget)) hide(); });
    source.addEventListener('keydown', event => {
      if ((event.altKey && event.key === 'Enter') || (event.ctrlKey && event.key === '.')) {
        const problem = (layer.syntaxProblems || []).find(item => item.start <= source.selectionStart && item.end >= source.selectionStart);
        if (!problem) return;
        event.preventDefault();
        const span = [...layer.querySelectorAll('.syntax-warning')].find(item => item.warningProblems.includes(problem));
        show(problem, span?.getBoundingClientRect() || source.getBoundingClientRect());
        popup.tabIndex = -1; (popup.querySelector('button') || popup).focus();
      } else hide();
    });
    popup.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); hide(); source.focus(); } });
    for (const event of ['input', 'scroll', 'pointerdown']) source.addEventListener(event, hide);
    window.addEventListener('resize', hide);
    window.addEventListener('scroll', event => { if (!popup.contains(event.target)) hide(); }, true);
    document.addEventListener('pointerdown', event => { if (event.target !== source && !popup.contains(event.target)) hide(); });
    return {hide, show, popup};
  }
  globalThis.FolioDiagnostics = {attach, guidance};
})();
