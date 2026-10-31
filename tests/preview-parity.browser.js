(() => {
  const failures = [];
  const check = (ok, label) => { if (!ok) failures.push(label); };
  const host = document.createElement('div');
  document.body.append(host);
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
      const css = selector => getComputedStyle(host.querySelector(selector));
      names.forEach((n,i) => {
        check(css('.'+n+'Text').color === rgb(colors[i]), scheme+' '+n);
        check(css('.'+n+'Text a').color === rgb(colors[i]), scheme+' '+n+' link');
      });
      check(css('.char-header').display === 'none', scheme+' header');
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
    for (const scheme of ['default','classic','noir']) {
      document.documentElement.dataset.flistScheme = scheme;
      host.className = 'previewpage' + (scheme === 'default' ? '' : ' '+scheme);
      host.innerHTML = '<div class="char-header">Header</div><div class="description"></div>';
      host.querySelector('.description').append(FolioHorizon.render('[heading]Section[/heading][quote]Text[/quote][collapse=Title]Body[collapse=Nested]Inner[/collapse][/collapse][icon]Example[/icon][hr]'));
      const css = selector => getComputedStyle(host.querySelector(selector));
      check(css('.description').fontSize === '16px' && css('.description').lineHeight === '24px', scheme+' Horizon typography');
      check(css('h2').fontSize === '18.72px' && css('h2').marginBottom === '8px', scheme+' Horizon heading');
      check(css('blockquote').borderLeftWidth === '0px' && css('blockquote').marginBottom === '16px', scheme+' Horizon quote');
      check(css('.bbcode-collapse-header').paddingLeft === '20px', scheme+' Horizon title padding');
      check(css('.bbcode-collapse-body').marginLeft === '8px' && css('.card-body').paddingLeft === '16px', scheme+' Horizon body inset');
      check(css('.bbcode-collapse-header').backgroundImage === 'none', scheme+' no site gradient');
      const background = css('.bbcode-collapse').backgroundColor;
      host.querySelector('.bbcode-collapse-header').click();
      check(css('.bbcode-collapse').backgroundColor === background, scheme+' stable open card background');
      check(css('.character-avatar.icon').width === '50px', scheme+' Horizon icon');
    }
  } catch (error) { failures.push(error.stack); }
  const result = document.createElement('pre');
  result.id = 'preview-parity-result';
  result.textContent = JSON.stringify({passed: !failures.length, failures});
  document.body.append(result);
})();
