import { createContext } from './helpers/typescript';
import assert from './helpers/assert';
import fs from 'node:fs';
import vm from 'node:vm';
import { parseHTML } from 'linkedom';

const { document, window } = parseHTML('<html><body></body></html>');
const context = createContext({ document, window, URL, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync('build/horizon-renderer.js', 'utf8'), context);
const render = (text) => context.FolioHorizon.render(text);
const profile = render(
  '[center][heading][color=cyan]Name[/color]\n[big]Subtitle[/big][/heading][/center][hr][img=4645005]meanstoanend[/img]',
);
assert.equal(profile.querySelector<HTMLElement>('.centerText h2 .cyanText').textContent, 'Name');
assert.equal(profile.querySelector<HTMLElement>('.bigText').textContent, 'Subtitle');
assert.equal(profile.querySelectorAll<HTMLElement>('hr').length, 1);
assert.match(
  profile.querySelector<HTMLElement>('.placeholder-image').textContent,
  /4645005.*meanstoanend/,
);
assert.equal(render('A\n\n B').textContent, 'A\n\n B');
assert.equal(render('[noparse][b]literal[/b]\n[/noparse]').textContent, '[b]literal[/b]\n');
const scientific = render('H[sup]2[/sup]O and x[sub]n[/sub]');
assert.equal(scientific.querySelector<HTMLElement>('sup').textContent, '2');
assert.equal(scientific.querySelector<HTMLElement>('sub').textContent, 'n');
assert.equal(render('<script>alert(1)</script>').querySelector<HTMLElement>('script'), null);
assert.equal(render('[url=javascript:alert(1)]bad[/url]').querySelector<HTMLElement>('a'), null);
assert.equal(
  render('[url=https://example.com]Visit[/url]')
    .querySelector<HTMLElement>('a')
    .getAttribute('rel'),
  'noopener noreferrer',
);
const labelledLink = render(
  '[url=https://scavprototype.wiki.gg/wiki/Casualties]Casualties: Unknown[/url]',
);
assert.equal(
  labelledLink.querySelector<HTMLElement>('.profile-url-link').textContent,
  'Casualties: Unknown',
);
assert.equal(
  labelledLink.querySelector<HTMLElement>('.link-domain').textContent,
  ' [scavprototype.wiki.gg]',
);
assert.equal(
  render('[url]https://www.example.com/path[/url]').querySelector<HTMLElement>(
    '.url-bare .link-domain',
  ).textContent,
  ' [example.com]',
);
const collapse = render('[collapse=Details]Body[/collapse]');
assert.equal(collapse.querySelector<HTMLElement>('.bbcode-collapse-body').style.height, '0');
collapse.querySelector<HTMLElement>('.bbcode-collapse-header').click();
assert.equal(
  collapse.querySelector<HTMLElement>('.bbcode-collapse').classList.contains('collapsed'),
  false,
);
assert.equal(
  render('[icon]Test Name[/icon]').querySelector<HTMLElement>('img').getAttribute('src'),
  'https://static.f-list.net/images/avatar/test%20name.png',
);
console.log('Horizon renderer DOM checks passed');
