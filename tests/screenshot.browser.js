(async () => {
  const result = document.createElement('pre'); result.id = 'screenshot-result';
  document.body.append(result);
  const assert = (condition, message) => { if (!condition) throw Error(message); };
  try {
    document.getElementById('bbMode').click();
    const source = document.getElementById('source');
    source.value = '[collapse=Outer]Visible body\n[collapse=Inner]' + 'Long profile line\n'.repeat(90) + '[/collapse][/collapse]';
    source.dispatchEvent(new Event('input', {bubbles:true}));
    await new Promise(resolve => setTimeout(resolve, 400));
    const card = document.getElementById('previewPage');
    const original = card.innerHTML;
    const frame = card.parentElement; frame.scrollTop = 12;
    const scroll = frame.scrollTop;
    const render = window.html2canvas;
    let expandedHeight;
    window.html2canvas = (copy, options) => {
      assert(copy.querySelectorAll('.collapsed').length === 0, 'Nested sections must expand');
      assert([...copy.querySelectorAll('.bbcode-collapse-body')].every(body => body.clientHeight > 0), 'Bodies must be visible');
      expandedHeight = copy.getBoundingClientRect().height;
      assert(expandedHeight > frame.clientHeight, 'Capture must include content below viewport');
      assert(Math.abs(copy.getBoundingClientRect().width - card.getBoundingClientRect().width) < 1, 'Preserve card width');
      return render(copy, options);
    };
    for (const theme of ['flist-blue', 'classic']) {
      const select = document.getElementById('theme');
      select.value = theme; select.dispatchEvent(new Event('change', {bubbles:true}));
      const png = await FolioScreenshot.capture(card);
      assert(png.type === 'image/png' && png.size > 1000, 'PNG must contain rendered content');
      const bitmap = await createImageBitmap(png);
      assert(bitmap.height >= expandedHeight - 2, 'PNG must include full card height'); bitmap.close();
      assert(card.innerHTML === original && frame.scrollTop === scroll, 'Preview state must stay unchanged');
    }
    window.html2canvas = () => Promise.reject(Error('Simulated renderer failure'));
    try { await FolioScreenshot.capture(card); } catch (_) {}
    assert(!document.querySelector('[aria-hidden="true"].previewpage'), 'Failed capture must remove its clone');
    window.html2canvas = render;
    result.textContent = JSON.stringify({passed:true});
  } catch (error) { result.textContent = JSON.stringify({passed:false,error:error.stack}); }
})();
