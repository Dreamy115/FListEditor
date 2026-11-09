import { $, source } from '../app/dom';
import { state } from '../app/state';
import { replaceRange } from './editing';

// Inline images use a picker; other insertion tools edit the source directly.
export const symbolPalette = $('symbolPalette');

export const symbolOptions = $('symbolOptions');

export const symbolSearch = $('symbolSearch');

/** A mode-specific insertion, including optional text to select after insertion. */
interface InsertionSpec {
  prefix: string;
  suffix: string;
  fallback: string;
  select?: string;
  block?: boolean;
}
export const insertionSpecs: Record<string, InsertionSpec> = {
  link: {
    prefix: '[url=https://example.com]',
    suffix: '[/url]',
    fallback: 'link text',
    select: 'https://example.com',
  },
  image: { prefix: '[img]', suffix: '[/img]', fallback: 'https://example.com/image.png' },
  inlineimg: { prefix: '[img=12345]', suffix: '[/img]', fallback: '', select: '12345' },
  collapse: {
    prefix: '[collapse=More details]\n',
    suffix: '\n[/collapse]',
    fallback: 'Write details here',
    select: 'More details',
  },
  user: { prefix: '[user]', suffix: '[/user]', fallback: 'Character Name' },
  icon: { prefix: '[icon]', suffix: '[/icon]', fallback: 'Character Name' },
  eicon: { prefix: '[eicon]', suffix: '[/eicon]', fallback: 'eicon-name' },
  noparse: { prefix: '[noparse]', suffix: '[/noparse]', fallback: 'literal **text**' },
};

export const markdownInsertionSpecs: Record<string, InsertionSpec> = {
  link: {
    prefix: '[',
    suffix: '](https://example.com)',
    fallback: 'link text',
    select: 'https://example.com',
  },
  image: { prefix: '![](', suffix: ')', fallback: 'https://example.com/image.png' },
  inlineimg: { prefix: '{img:12345', suffix: '}', fallback: '', select: '12345' },
  collapse: {
    prefix: ':::collapse More details\n',
    suffix: '\n:::',
    fallback: 'Write details here',
    select: 'More details',
    block: true,
  },
  user: { prefix: '{user:', suffix: '}', fallback: 'Character Name' },
  icon: { prefix: '{icon:', suffix: '}', fallback: 'Character Name' },
  eicon: { prefix: '{eicon:', suffix: '}', fallback: 'eicon-name' },
  noparse: { prefix: '`', suffix: '`', fallback: 'literal **text**' },
};

export function insertUnicodeSymbol(symbol: string) {
  const text =
    state.data.mixed && state.data.preferLiterals === false
      ? Array.from(
          symbol,
          (char: string) => '&#x' + char.codePointAt(0)!.toString(16).toUpperCase() + ';',
        ).join('')
      : symbol;
  replaceRange(text);
}

export function insertTag(type: string, imageId = '12345', alias = '') {
  let spec = (state.data.mixed ? markdownInsertionSpecs : insertionSpecs)[type];
  if (!spec) return;
  if (type === 'inlineimg')
    spec = {
      ...spec,
      prefix: spec.prefix.replace('12345', imageId),
      select: imageId,
      fallback: alias.replace(/[&\[\]{}|\r\n]/g, (char: string) => '&#' + char.charCodeAt(0) + ';'),
    };
  const s = source.selectionStart,
    e = source.selectionEnd,
    chosen = source.value.slice(s, e);
  if (state.data.mixed && type === 'inlineimg' && (chosen || spec.fallback))
    spec = { ...spec, prefix: spec.prefix + '|' };
  if (state.data.mixed && type === 'noparse') {
    if (chosen.includes('\n') || chosen.includes('`'))
      spec = chosen.includes('```')
        ? insertionSpecs.noparse
        : { prefix: '```\n', suffix: '\n```', fallback: 'literal text', block: true };
  }
  const lead = spec.block && s > 0 && source.value[s - 1] !== '\n' ? '\n' : '';
  const tail = spec.block && e < source.value.length && source.value[e] !== '\n' ? '\n' : '';
  const text = lead + spec.prefix + (chosen || spec.fallback) + spec.suffix + tail;
  const target = spec.select || (!chosen ? spec.fallback : null);
  const at = target ? text.indexOf(target) : -1;
  replaceRange(
    text,
    s,
    e,
    at < 0 ? s + text.length : s + at,
    at < 0 ? s + text.length : s + at + target!.length,
  );
}

export function initializeInsertionTools() {
  for (const [symbol, name] of [
    ['—', 'Em dash'],
    ['–', 'En dash'],
    ['…', 'Ellipsis'],
    ['•', 'Bullet'],
    ['·', 'Middle dot'],
    ['★', 'Black star'],
    ['☆', 'White star'],
    ['✦', 'Four pointed star'],
    ['✧', 'White four pointed star'],
    ['◆', 'Black diamond'],
    ['◇', 'White diamond'],
    ['♥', 'Heart'],
    ['♡', 'White heart'],
    ['♠', 'Spade'],
    ['♣', 'Club'],
    ['♦', 'Diamond suit'],
    ['♪', 'Music note'],
    ['♫', 'Music notes'],
    ['→', 'Right arrow'],
    ['←', 'Left arrow'],
    ['↑', 'Up arrow'],
    ['↓', 'Down arrow'],
    ['↔', 'Left right arrow'],
    ['↕', 'Up down arrow'],
    ['⇒', 'Right double arrow'],
    ['⇐', 'Left double arrow'],
    ['⇔', 'Left right double arrow'],
    ['█', 'Full block'],
    ['▓', 'Dark shade'],
    ['▒', 'Medium shade'],
    ['░', 'Light shade'],
    ['■', 'Black square'],
    ['□', 'White square'],
    ['▪', 'Black small square'],
    ['▫', 'White small square'],
    ['●', 'Black circle'],
    ['○', 'White circle'],
    ['◉', 'Fisheye'],
    ['◎', 'Bullseye'],
    ['▲', 'Black up triangle'],
    ['▼', 'Black down triangle'],
    ['►', 'Black right pointer'],
    ['◄', 'Black left pointer'],
    ['△', 'White up triangle'],
    ['▽', 'White down triangle'],
    ['▷', 'White right triangle'],
    ['◁', 'White left triangle'],
    ['✎', 'Pencil'],
    ['✏', 'Lower right pencil'],
    ['✂', 'Scissors'],
    ['✉', 'Envelope'],
    ['☀', 'Sun'],
    ['☁', 'Cloud'],
    ['☾', 'Moon'],
    ['☑', 'Checked ballot box'],
    ['☐', 'Ballot box'],
    ['✓', 'Check mark'],
    ['✗', 'Cross mark'],
    ['∞', 'Infinity'],
    ['±', 'Plus minus'],
    ['°', 'Degree'],
    ['×', 'Multiplication sign'],
    ['÷', 'Division sign'],
    ['≠', 'Not equal'],
    ['≤', 'Less than or equal'],
    ['≥', 'Greater than or equal'],
    ['©', 'Copyright'],
    ['®', 'Registered'],
    ['™', 'Trademark'],
    ['✿', 'Flower'],
    ['❀', 'White flower'],
    ['❁', 'Outlined flower'],
    ['✾', 'Rosette flower'],
    ['❃', 'Asterisk flower'],
    ['❦', 'Floral heart ornament'],
    ['❧', 'Floral flourish'],
    ['☙', 'Reversed floral flourish'],
    ['❥', 'Rotated heart'],
    ['❣', 'Heart exclamation'],
    ['ღ', 'Georgian heart decoration'],
    ['✶', 'Six pointed star'],
    ['✷', 'Eight pointed star'],
    ['✹', 'Twelve pointed star'],
    ['✺', 'Sunburst star'],
    ['✵', 'Pinwheel star'],
    ['※', 'Reference mark decoration'],
    ['⁂', 'Asterism stars'],
    ['⁎', 'Low asterisk'],
    ['◈', 'Diamond in diamond'],
    ['◊', 'Lozenge diamond'],
    ['❖', 'Diamond ornament'],
    ['❮', 'Left ornamental angle bracket'],
    ['❯', 'Right ornamental angle bracket'],
    ['«', 'Left double angle quote'],
    ['»', 'Right double angle quote'],
    ['‹', 'Left single angle quote'],
    ['›', 'Right single angle quote'],
    ['【', 'Left lenticular bracket'],
    ['】', 'Right lenticular bracket'],
    ['〔', 'Left tortoise shell bracket'],
    ['〕', 'Right tortoise shell bracket'],
    ['─', 'Horizontal divider line'],
    ['━', 'Heavy horizontal divider line'],
    ['│', 'Vertical divider line'],
    ['┃', 'Heavy vertical divider line'],
    ['╭', 'Rounded top left corner'],
    ['╮', 'Rounded top right corner'],
    ['╰', 'Rounded bottom left corner'],
    ['╯', 'Rounded bottom right corner'],
    ['═', 'Double horizontal divider line'],
    ['║', 'Double vertical divider line'],
    ['╬', 'Double line cross'],
    ['༺', 'Left decorative flourish'],
    ['༻', 'Right decorative flourish'],
    ['☽', 'First quarter moon'],
    ['☼', 'White sun'],
    ['✩', 'Outlined star'],
    ['✪', 'Circled star'],
    ['✫', 'Open center star'],
    ['✬', 'Black center star'],
    ['✻', 'Teardrop asterisk flower'],
    ['✼', 'Open center asterisk flower'],
    ['❋', 'Heavy asterisk flower'],
    ['✽', 'Heavy asterisk'],
    ['♔', 'White king crown'],
    ['♕', 'White queen crown'],
    ['♚', 'Black king crown'],
    ['♛', 'Black queen crown'],
    ['♀', 'Female gender Venus'],
    ['♂', 'Male gender Mars'],
    ['⚥', 'Male and female gender'],
    ['⚧', 'Transgender symbol'],
    ['⚲', 'Neuter gender'],
    ['⚜', 'Fleur de lis flower'],
    ['⚝', 'Outlined pentagram star'],
    ['☯', 'Yin yang'],
    ['☮', 'Peace symbol'],
    ['†', 'Dagger cross'],
    ['‡', 'Double dagger cross'],
    ['✝', 'Latin cross'],
    ['✠', 'Maltese cross'],
    ['↗', 'North east diagonal arrow'],
    ['↘', 'South east diagonal arrow'],
    ['↙', 'South west diagonal arrow'],
    ['↖', 'North west diagonal arrow'],
    ['↩', 'Left hooked return arrow'],
    ['↪', 'Right hooked arrow'],
    ['➜', 'Heavy right arrow'],
    ['➤', 'Right arrowhead'],
    ['➳', 'Feathered right arrow'],
    ['⌜', 'Top left corner bracket'],
    ['⌝', 'Top right corner bracket'],
    ['⌞', 'Bottom left corner bracket'],
    ['⌟', 'Bottom right corner bracket'],
    ['「', 'Left corner bracket'],
    ['」', 'Right corner bracket'],
    ['『', 'Left double corner bracket'],
    ['』', 'Right double corner bracket'],
    ['┌', 'Top left frame corner'],
    ['┐', 'Top right frame corner'],
    ['└', 'Bottom left frame corner'],
    ['┘', 'Bottom right frame corner'],
    ['╔', 'Double top left frame corner'],
    ['╗', 'Double top right frame corner'],
    ['╚', 'Double bottom left frame corner'],
    ['╝', 'Double bottom right frame corner'],
    ['├', 'Left frame junction'],
    ['┤', 'Right frame junction'],
    ['┬', 'Top frame junction'],
    ['┴', 'Bottom frame junction'],
    ['┼', 'Frame cross junction'],
    ['┄', 'Dashed horizontal divider line'],
    ['┈', 'Dotted horizontal divider line'],
    ['▬', 'Black rectangle divider'],
    ['▰', 'Black parallelogram'],
    ['▱', 'White parallelogram'],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'palette-option';
    button.textContent = symbol;
    button.title = name;
    button.setAttribute('aria-label', 'Insert ' + name.toLowerCase());
    button.addEventListener('click', () => insertUnicodeSymbol(symbol));
    symbolOptions.append(button);
  }

  symbolSearch.addEventListener('input', () => {
    const terms = symbolSearch.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const button of symbolOptions.children as HTMLCollectionOf<HTMLButtonElement>) {
      const text = (button.textContent + ' ' + button.title).toLowerCase();
      button.hidden = !terms.every((term) => text.includes(term));
      if (!button.hidden) visible++;
    }
    $('symbolEmpty').hidden = visible > 0;
  });

  $('symbolBtn').addEventListener('click', () => {
    symbolPalette.hidden = !symbolPalette.hidden;
    $('symbolBtn').setAttribute('aria-expanded', String(!symbolPalette.hidden));
    if (!symbolPalette.hidden) symbolSearch.focus();
  });

  symbolPalette.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      symbolPalette.hidden = true;
      $('symbolBtn').setAttribute('aria-expanded', 'false');
      $('symbolBtn').focus();
    }
  });

  document.querySelectorAll<HTMLElement>('[data-insert]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      if (btn.dataset.insert !== 'inlineimg') {
        insertTag(btn.dataset.insert!);
        return;
      }
      const start = source.selectionStart,
        end = source.selectionEnd;
      const id = await FolioLocalImages.pick();
      if (!id) return;
      source.setSelectionRange(start, end);
      insertTag('inlineimg', id, FolioLocalImages.get(id)?.alias || '');
    }),
  );
}
