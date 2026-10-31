(() => {
  const failures = [];
  const check = (ok, label) => { if (!ok) failures.push(label); };
  const host = document.createElement('div');
  document.body.append(host);
  host.style.transition = 'none';
  const palettes = {
    'flist-blue':['#f44','#ffa500','#ff0','#4f4','#0ff','#e2afff','#1e90ff','#ffcbdb','#000','#aa840c','#fff','#d3d3d3'],
    'flist-dark':['#f44','#ffa500','#ff0','#4f4','#0ff','#d0f','#1e90ff','#ffcbdb','#888','#aa840c','#fff','#d3d3d3'],
    'flist-light':['#f44','#f2951a','#dbb21a','#1fde30','#0cc','#d0f','#1e90ff','#ff89bf','#000','#967117','#aaa','#777']
  };
  const names = ['red','orange','yellow','green','cyan','purple','blue','pink','black','brown','white','gray'];
  const rgb = hex => {
    let h = hex.slice(1); if(h.length === 3) h = [...h].map(c=>c+c).join('');
    return `rgb(${[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)).join(', ')})`;
  };
  try {
    check(getComputedStyle(document.querySelector('#preview')).fontSize === '12px', 'initial site text size');
    for (const [scheme, colors] of Object.entries(palettes)) {
      document.documentElement.dataset.flistScheme = scheme;
      host.className = 'previewpage ' + scheme;
      host.innerHTML = '<div class="char-header">Header</div><div class="description"></div>';
      const description = host.querySelector('.description');
      description.append(FolioHorizon.render(names.map(n=>`[color=${n}][url=https://example.com]${n}[/url][/color]`).join(' ') + '[quote]Text[/quote][collapse=Title]Body[heading]Section[/heading][collapse=Nested]Inner[/collapse][/collapse][icon]Example[/icon][hr]'));
      description.append(FolioHorizon.render('[url=https://static.f-list.net/example.png]Horizon Portrait[/url]'));
      const css = selector => getComputedStyle(host.querySelector(selector));
      if (scheme === 'flist-blue') check(css('a[href="https://static.f-list.net/example.png"]').color === 'rgb(255, 255, 255)', 'blue uncolored URL link is white');
      names.forEach((n,i) => {
        check(css('.'+n+'Text').color === rgb(colors[i]), scheme+' '+n);
        check(css('.'+n+'Text a').color === rgb(colors[i]), scheme+' '+n+' link');
      });
      check(css('.char-header').display === 'none', scheme+' header');
      check(css('.profile-url-link').paddingLeft === '22px', scheme+' site link icon inset');
      check(css('.link-domain').fontSize === '9.6px', scheme+' site hostname size');
      check(css('blockquote').paddingTop === '10px' && css('blockquote').marginTop === '2px' && css('blockquote').fontStyle === 'italic' && css('blockquote').borderLeftWidth === '1px', scheme+' quote');
      check(css('.quoteHeader').fontWeight === '700', scheme+' quote title');
      check(css('.bbcode-collapse-header').fontSize === '14.4px', scheme+' collapse title size');
      check(css('.bbcode-collapse').paddingLeft === '25px', scheme+' shared collapse inset');
      check(css('.bbcode-collapse-header').backgroundImage === 'none', scheme+' unpainted title');
      check(Math.abs(parseFloat(css('h2').fontSize) - 14.04) < .02, scheme+' site heading size');
      check(css('h2').marginBottom === '10px', scheme+' heading spacing');
      check(css('.bbcode-collapse-body').fontSize === '12px', scheme+' collapse body size');
      check(css('.character-avatar.icon').width === '50px' && css('.character-avatar.icon').height === '50px', scheme+' icon display size');
      host.querySelector('.bbcode-collapse-header').click();
      check(!host.querySelector('.bbcode-collapse').classList.contains('collapsed'), scheme+' expansion');
      check(css('.bbcode-collapse').backgroundColor === rgb({'flist-blue':'#235a8f','flist-dark':'#4c4646','flist-light':'#fff'}[scheme]), scheme+' expanded panel background');
      if(scheme === 'flist-blue') {
        check(css('.bbcode-collapse-header').color === 'rgb(238, 238, 238)', 'expanded blue title');
        check(css('.bbcode-collapse .bbcode-collapse .bbcode-collapse-header').color === 'rgb(238, 238, 238)', 'nested blue title');
      }
      if(scheme === 'flist-light') check(css('.redText a').textShadow === 'none', 'light link shadow');
      if (window.siteReferenceCSS) {
        const frame = document.createElement('iframe');
        document.body.append(frame);
        const reference = frame.contentDocument;
        reference.open();
        reference.write('<style>' + siteReferenceCSS['common/default-0.0.10.css'] + siteReferenceCSS[{'flist-blue':'default.css','flist-dark':'dark.css','flist-light':'light.css'}[scheme]] + '</style><div class="MediumPanel"><div class="CollapseHeader ExpandedHeader"><div class="CollapseHeaderText"><span>Title</span></div><div class="CollapseBlock" style="display:block">Body<h3>Section</h3><div class="CollapseHeader"><div class="CollapseHeaderText"><span>Nested</span></div><div class="CollapseBlock">Inner</div></div></div></div></div>');
        reference.close();
        const compare = (local, remote, properties) => {
          const actual = css(local), expected = frame.contentWindow.getComputedStyle(reference.querySelector(remote));
          properties.forEach(p=>check(actual[p] === expected[p], scheme+' reference '+local+' '+p+': '+actual[p]+' vs '+expected[p]));
        };
        compare('.bbcode-collapse', '.CollapseHeader', ['backgroundColor','paddingLeft','paddingTop','paddingBottom','borderTopWidth','borderTopColor','borderRadius','fontSize','color']);
        compare('.bbcode-collapse-header','.CollapseHeaderText',['color','fontSize','fontWeight']);
        compare('h2','h3',['fontSize','fontWeight','marginTop','marginBottom','color','textShadow']);
        compare('.card-body','.CollapseBlock',['marginTop','marginRight','marginBottom','marginLeft','fontSize','fontWeight','color']);
        compare('.bbcode-collapse .bbcode-collapse','.CollapseBlock .CollapseHeader',['backgroundColor','color','borderRadius','fontSize']);
        reference.querySelector('.ExpandedHeader').classList.remove('ExpandedHeader');
        host.querySelector('.bbcode-collapse-header').click();
        compare('.bbcode-collapse', '.CollapseHeader', ['backgroundColor','color','textShadow']);
        compare('.bbcode-collapse-header', '.CollapseHeaderText', ['color','textShadow']);
        frame.remove();
      }
    }
    host.className = 'previewpage horizon-moon-prism';
    host.innerHTML = '<div class="description"></div>';
    host.querySelector('.description').append(FolioHorizon.render(horizonProfileFixture));
    const fortunate = [...host.querySelectorAll('.bbcode-collapse-header')].find(el=>el.textContent === 'Fortunate Souls');
    fortunate.click();
    fortunate.nextElementSibling.style.height = '';
    const css = selector => getComputedStyle(host.querySelector(selector));
    check(css('.orangeText').color === 'rgb(255, 183, 133)', 'Moon Prism reference orange');
    check(css('.blueText').color === 'rgb(76, 76, 255)', 'Moon Prism reference blue');
    check(css('.link-domain').color === 'rgb(90, 97, 184)', 'Moon Prism hostname');
    check(css('.blackText').color === 'rgb(184, 194, 224)', 'Moon Prism black text');
    check(host.querySelectorAll('.indentText').length === 6, 'six source indents retained');
    for (const size of [16,20,24]) {
      host.style.setProperty('--horizon-rem',size+'px');
      check(css('.description').fontSize === size+'px', 'Horizon body scales '+size);
      check(Math.abs(parseFloat(css('h2').fontSize)-size*1.17)<.02, 'Horizon heading scales '+size);
      check(css('.card-body').paddingLeft === size+'px', 'Horizon card scales '+size);
      if (window.horizonReferenceCSS) {
        const frame = document.createElement('iframe');
        frame.style.cssText = 'border:0;width:'+host.getBoundingClientRect().width+'px';
        document.body.append(frame);
        const reference = frame.contentDocument;
        reference.open();
        reference.write('<style>'+horizonReferenceCSS['moon-prism']+'</style><div class="modal-content">'+host.innerHTML+'</div>');
        reference.close();
        reference.documentElement.style.fontSize = size+'px';
        for (const selector of ['.description','h2','.grayText :is(i,em)','.card-body','.bbcode-collapse-header','.link-domain','.orangeText','.blueText','.blackText']) {
          const actual = css(selector), expected = frame.contentWindow.getComputedStyle(reference.querySelector(selector));
          for (const p of ['fontSize','lineHeight','color','fontStyle']) check(actual[p] === expected[p], 'source fixture '+size+' '+selector+' '+p+': '+actual[p]+' vs '+expected[p]);
        }
        frame.remove();
      }
    }
    host.style.removeProperty('--horizon-rem');
    for (const scheme of ['default','classic','noir','horizon-moon-prism']) {
      document.documentElement.dataset.flistScheme = scheme;
      host.className = 'previewpage' + (scheme === 'default' ? '' : ' '+scheme);
      host.innerHTML = '<div class="char-header">Header</div><div class="description"></div>';
      host.querySelector('.description').append(FolioHorizon.render('[heading]Section[/heading][quote]Text[/quote][collapse=Title]Body[collapse=Nested]Inner[/collapse][/collapse][icon]Example[/icon][hr]'));
      const css = selector => getComputedStyle(host.querySelector(selector));
      check(css('.description').fontSize === '16px' && css('.description').lineHeight === '24px', scheme+' Horizon typography');
      check(css('h2').fontSize === '18.72px' && css('h2').marginBottom === '8px', scheme+' Horizon heading');
      check(css('blockquote').borderLeftWidth === '0px' && css('blockquote').marginBottom === '16px', scheme+' Horizon quote');
      check(css('.bbcode-collapse-header').paddingLeft === '20px', scheme+' Horizon title padding');
      check(css('hr').marginTop === '5px' && css('hr').marginBottom === '5px', scheme+' compact Horizon separators');
      check(css('.bbcode-collapse-body').marginLeft === '8px' && css('.card-body').paddingLeft === '16px', scheme+' Horizon body inset');
      check(css('.bbcode-collapse-header').backgroundImage === 'none', scheme+' no site gradient');
      const background = css('.bbcode-collapse').backgroundColor;
      host.querySelector('.bbcode-collapse-header').click();
      check(css('.bbcode-collapse').backgroundColor === background, scheme+' stable open card background');
      check(css('.character-avatar.icon').width === '50px', scheme+' Horizon icon');
      check(css('.bbcode').hyphens === 'manual', scheme+' no added hyphenation');
      if (window.horizonReferenceCSS) {
        const frame = document.createElement('iframe'); document.body.append(frame);
        const reference = frame.contentDocument;
        const themeName = {default:'default',classic:'light',noir:'dark','horizon-moon-prism':'moon-prism'}[scheme];
        reference.open();
        reference.write('<style>' + horizonReferenceCSS[themeName] + '</style><div class="modal-content"><div class="description">' + host.querySelector('.description').innerHTML + '</div></div>');
        reference.close();
        const compare = (selector, properties) => {
          const actual = css(selector), expected = frame.contentWindow.getComputedStyle(reference.querySelector(selector));
          properties.forEach(p=>check(actual[p] === expected[p], scheme+' Horizon reference '+selector+' '+p+': '+actual[p]+' vs '+expected[p]));
        };
        compare('.description',['color','fontSize','lineHeight']);
        compare('h2',['color','fontSize','fontWeight','lineHeight','marginTop','marginBottom']);
        compare('.bbcode-collapse',['backgroundColor','borderTopColor','borderRadius','display']);
        compare('.bbcode-collapse-header',['backgroundColor','paddingTop','paddingBottom','paddingLeft','fontSize','lineHeight','borderBottomColor']);
        compare('.card-body',['paddingTop','paddingLeft','color']);
        compare('blockquote',['borderTopWidth','marginTop','marginBottom','fontStyle']);
        compare('hr',['marginTop','marginBottom','borderTopWidth','opacity']);
        frame.remove();
      }
    }
  } catch (error) { failures.push(error.stack); }
  const result = document.createElement('pre');
  result.id = 'preview-parity-result';
  result.textContent = JSON.stringify({passed: !failures.length, failures});
  document.body.append(result);
})();
