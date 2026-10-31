(() => {
  const scheme = window.previewGalleryTheme;
  document.documentElement.dataset.flistScheme = scheme;
  document.body.style.cssText = 'margin:0;padding:24px;background:#171925';
  const title = document.createElement('p');
  title.textContent = {'flist-blue':'F-List Default (Blue)','flist-dark':'F-List Dark','flist-light':'F-List Light',default:'Horizon Default',classic:'Horizon Light',noir:'Horizon Dark','horizon-moon-prism':'Horizon Moon Prism'}[scheme];
  title.style.cssText = 'color:white;font:16px system-ui;margin:0 0 16px';
  const panel = document.createElement('div');
  panel.className = 'previewpage' + (scheme === 'default' ? '' : ' '+scheme);
  panel.style.minHeight = '0';
  panel.innerHTML = '<div class="description"></div>';
  panel.firstChild.append(FolioHorizon.render(window.horizonProfileFixture || '[heading]Character profile[/heading]Plain text, [b]bold[/b], [i]italic[/i], [big]big[/big], and [small]small[/small].\n[url=https://example.com]A profile link[/url]\n' +
    ['red','orange','yellow','green','cyan','purple','blue','pink','black','brown','white','gray'].map(n=>`[color=${n}]${n}[/color]`).join('  ') +
    '\n[quote]A quotation with [color=orange]colored text[/color].[/quote][collapse=Experiments]A species with a range of variants.\n\n[heading]SAW-01 [color=orange]Experiment[/color][/heading]The original variant with distinctive orange features.\n[heading]SAW-02 [color=red]Orange[/color][/heading]A second variant with a different temperament.\n[center][b][i]Plentiful, and expendable.[/i][/b][/center]\n[collapse=Build an experiment]Choose a variant.[/collapse][/collapse][collapse=Another section]More information.[/collapse]\n[indent]Indented text.[/indent][hr]After the rule.'));
  const header = [...panel.querySelectorAll('.bbcode-collapse-header')].find(el => el.textContent === 'Fortunate Souls') || panel.querySelector('.bbcode-collapse-header');
  header.click();
  document.body.replaceChildren(title,panel);
})();
