import { $, source } from '../app/dom';
import { state } from '../app/state';
import { markdownToBB } from '../formatting/markdown';
import { replaceRange, getCompiled } from './editing';
import { toast } from '../app/notifications';

// A searchable reference that stays inside the editor rather than blocking it.
export const guideExamples = [
  [
    'Basics',
    'Bold and italics',
    'Mix emphasis in a sentence',
    '**Bold**, *italic*, and ***both***.',
  ],
  [
    'Basics',
    'Underline and strikethrough',
    'Underline uses a Folio extension',
    '++Underlined++ and ~~crossed out~~.',
  ],
  [
    'Basics',
    'Heading and divider',
    'Break your bio into readable sections',
    '# About me\nA curious traveller.\n\n---\n## Story hooks',
  ],
  [
    'Basics',
    'Heading levels',
    'One # adds heading + big; two or more # add a regular heading',
    '# Large heading\n## Standard heading\n### Smaller heading',
  ],
  ['Basics', 'Big text', 'Use the inline macro for F-List big text', '{big|Large text}'],
  [
    'Basics',
    'Unicode symbols',
    'HTML5 named, hexadecimal and decimal references become Unicode on export. Decompilation prefers readable text and font macros; code stays literal.',
    '&mdash; &diams; &starf; &#x25C6; &#9670;',
  ],
  [
    'Basics',
    'Links',
    'A link with human-friendly text',
    '[Visit my inspiration board](https://example.com)',
  ],
  ['Basics', 'Quotes', 'Standard Markdown blockquotes', '> “Everything has a price.”'],
  [
    'Basics',
    'Bullet list',
    'Plain text bullets compatible with F-List',
    '- Adventurous\n- Sarcastic\n- Fond of stargazing',
  ],
  [
    'Basics',
    'Numbered list',
    'Numbers remain readable',
    '1. First encounter\n2. Second chance\n3. Final chapter',
  ],
  [
    'Basics',
    'Nested lists',
    'Leading spaces and tabs survive BBCode conversion',
    '- Parent item\n  - Nested bullet\n    1. Nested numbered item\n    2. Another numbered item\n- Next parent',
  ],
  [
    'Basics',
    'Inline code',
    'Show syntax literally, without formatting',
    'Write `[b]bold[/b]` to display code.',
  ],
  [
    'Basics',
    'Literal block',
    'Triple backticks convert to noparse',
    '```\n[b]Printed literally[/b]\n```',
  ],
  [
    'Macros',
    'Color presets',
    'F-List supports red, orange, yellow, green, cyan, purple, blue, pink, black, brown, white and gray',
    '{color:purple|An important note} and {color:orange|a warm welcome}',
  ],
  [
    'Macros',
    'Colored Markdown',
    'Combine nested custom macros and bold',
    '{color:cyan|**Cyan and bold**}',
  ],
  [
    'Macros',
    'Every color',
    'All 12 native F-List color presets',
    '{color:red|Red} {color:orange|Orange} {color:yellow|Yellow} {color:green|Green} {color:cyan|Cyan} {color:purple|Purple} {color:blue|Blue} {color:pink|Pink} {color:black|Black} {color:brown|Brown} {color:white|White} {color:gray|Gray}',
  ],
  [
    'Macros',
    'Character mention',
    'Clickable F-List character name',
    'A friend: {user:Character Name}',
  ],
  ['Macros', 'Character avatar', 'Show another character’s icon', '{icon:Character Name}'],
  ['Macros', 'Eicon', 'Display an uploaded F-List eicon', '{eicon:eicon-name}'],
  [
    'Macros',
    'Small caps font',
    'Unicode letters; uppercase stays uppercase. x has no small-cap equivalent. Decompilation detects styled text, but cannot recover an invisible font choice.',
    '{font:smallcaps|ABCDabcd}',
  ],
  [
    'Macros',
    'Fancy fonts',
    'Unicode text fonts export without font tags. Use bold, doublestruck, italic, bolditalic, sans, sansbold, fraktur, monospace or fullwidth. Only visibly styled characters are recovered on conversion from BBCode.',
    '{font:bold|Bold 123} {font:doublestruck|Lucas} {font:monospace|Mono 123} {font:fullwidth|Wide 123}',
  ],
  [
    'Macros',
    'Multiline font',
    'Use a font block for multiple lines. Inline font macros stay on one line.',
    ':::font bold\nfirst line\nsecond line\n:::',
  ],
  [
    'Macros',
    'More Unicode fonts',
    'Italic, bold italic, sans serif, sans serif bold and Fraktur. Decompilation recovers styled characters and bridges unchanged characters between matching font runs.',
    '{font:italic|Elegant} {font:bolditalic|Emphasis} {font:sans|Modern 123} {font:sansbold|Strong 123} {font:fraktur|Gothic}',
  ],
  ['Macros', 'Uploaded profile image', 'Reference a numeric F-List image ID', '{img:12345}'],
  [
    'Macros',
    'Labeled profile image',
    'Preserve the text associated with an uploaded image',
    '{img:12345|Portrait label}',
  ],
  [
    'Macros',
    'Heading block',
    'Multiline headings use the same spacing rules as other block macros',
    ':::heading\n{color:cyan|Character name}\n{big|Subtitle}\n:::',
  ],
  ['Macros', 'Inline divider', 'Insert a horizontal rule between text', 'Before{hr}After'],
  ['Macros', 'Big and small', 'Use F-List native size tags', '{big|Shout!} and {small|a whisper.}'],
  [
    'Macros',
    'Superscript & subscript',
    'Text above or below the baseline',
    'H{sub|2}O and x{sup|2}',
  ],
  [
    'Macros',
    'Literal inline text',
    'Prevent formatting for a segment',
    '{noparse|**This is not bold**}',
  ],
  [
    'Macros',
    'Special link',
    'Macro alternative to Markdown links',
    '{link:https://example.com|Read more}',
  ],
  [
    'Layout',
    'Centered section',
    'Multiline macros begin with :::',
    ':::center\n# Welcome\n*“A line of flavour text.”*\n:::',
  ],
  [
    'Layout',
    'Collapsible biography',
    'Create a native F-List collapse',
    ':::collapse Hidden backstory\nA secret from long ago.\n\n- A clue\n- Another clue\n:::',
  ],
  [
    'Layout',
    'Right aligned caption',
    'Position a line to the right',
    ':::right\n{small|A quiet afterthought…}\n:::',
  ],
  [
    'Layout',
    'Indented passage',
    'Visually separate a story excerpt',
    ':::indent\nThe journal was found beneath the floorboards.\n:::',
  ],
  [
    'Layout',
    'Multiline quote',
    'Quote entire paragraphs together',
    ':::quote\n“Have you ever watched the stars go out?”\n\n“Not yet.”\n:::',
  ],
  [
    'Layout',
    'Justified layout',
    'Align text along both edges',
    ':::justify\nA longer paragraph of carefully considered prose belongs here.\n:::',
  ],
  [
    'Layout',
    'Colored panel content',
    'Color applies to the whole block',
    ':::color cyan\n# Cyan archive\n**Status:** Active\n:::',
  ],
  [
    'Macros',
    'Bold & italic containers',
    'Macros help when deeply nested emphasis cannot be written cleanly',
    '{b|Bold text with *italic* inside} and {i|italic with **bold** inside}',
  ],
  [
    'Macros',
    'Nested formatting',
    'Combine ordinary Markdown with a custom color macro',
    '{color:purple|**Bright**, *italic*, and ++underlined++ text}',
  ],
  [
    'Layout',
    'Nested sections',
    'A secret inside a colored centered section',
    ':::center\n:::color purple\n# Private notes\n**Status:** Hidden\n:::collapse More information\n*The full story goes here.*\n:::\n:::\n:::',
  ],
  [
    'Recipes',
    'Character card',
    'A ready-made compact profile',
    ':::center\n# ✦ Astra Vale ✦\n{color:purple|*An enigma in plain sight*}\n:::\n\n---\n**Species:** Unknown\n**Occupation:** Scout\n**Personality:** Clever, guarded, curious',
  ],
  [
    'Recipes',
    'Relationship section',
    'Character links plus an expandable roster',
    '# Connections\n- {user:First Companion}: Trusted friend\n- {user:Second Companion}: An old rival\n\n:::collapse More connections\n{icon:Another Character} A mysterious ally.\n:::',
  ],
  [
    'Recipes',
    'Roleplay hooks',
    'Small sections to inspire interaction',
    '## Roleplay hooks\n- You recognize the locket she wears.\n- She seems to be waiting for someone.\n- There is a bounty on her name.',
  ],
  [
    'Recipes',
    'Colored dossier',
    'Mix big headings, colors, and secrets',
    ':::center\n{color:red|{big|CLASSIFIED • FILE 07}}\n{small|AUTHORIZED EYES ONLY}\n:::\n\n**Name:** REDACTED\n**Status:** ACTIVE\n\n:::collapse Incident details\n*Report pending.*\n:::',
  ],
];

export let guideCategory = 'All';

export const guidePanel = $('guidePanel');

export function renderGuide() {
  const tabs = $('guideTabs');
  tabs.replaceChildren();
  ['All', 'Basics', 'Macros', 'Layout', 'Recipes'].forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = category;
    button.className = guideCategory === category ? 'active' : '';
    button.setAttribute('aria-pressed', String(guideCategory === category));
    button.addEventListener('click', () => {
      guideCategory = category;
      renderGuide();
    });
    tabs.append(button);
  });
  const list = $('guideExamples');
  list.replaceChildren();
  const filter = $('guideSearch').value.toLowerCase().trim();
  for (const [category, title, desc, example] of guideExamples) {
    if (guideCategory !== 'All' && category !== guideCategory) continue;
    if (
      filter &&
      !(category + ' ' + title + ' ' + desc + ' ' + example).toLowerCase().includes(filter)
    )
      continue;
    const card = document.createElement('article');
    card.className = 'example-card';
    const heading = document.createElement('h4');
    heading.textContent = title;
    const sub = document.createElement('p');
    sub.textContent = desc;
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = example;
    pre.append(code);
    const foot = document.createElement('div');
    foot.className = 'example-footer';
    const label = document.createElement('span');
    label.textContent = category;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '＋ Insert';
    button.setAttribute('aria-label', 'Insert ' + title + ' example');
    button.addEventListener('click', () => {
      const start = source.selectionStart,
        end = source.selectionEnd;
      const snippet = state.data.mixed ? example : markdownToBB(example);
      replaceRange(snippet, start, end, start, start + snippet.length);
      toast(title + (state.data.mixed ? ' Markdown' : ' BBCode') + ' inserted');
    });
    foot.append(label, button);
    card.append(heading, sub, pre, foot);
    list.append(card);
  }
  if (!list.children.length) {
    const empty = document.createElement('p');
    empty.className = 'inline-tip';
    empty.textContent = 'No examples match that search.';
    list.append(empty);
  }
}

export function toggleGuide(force?: boolean) {
  const show = typeof force === 'boolean' ? force : guidePanel.hidden;
  guidePanel.hidden = !show;
  $('guideBtn').setAttribute('aria-expanded', String(show));
  if (show) renderGuide();
}

export async function copyCode() {
  const code = getCompiled();
  try {
    await navigator.clipboard.writeText(code);
    toast('BBCode copied. Paste into F-List!');
  } catch (e) {
    const box = document.createElement('textarea');
    box.value = code;
    box.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.append(box);
    box.select();
    try {
      document.execCommand('copy');
      toast('BBCode copied');
    } catch (error) {
      toast('Use Export .bbcode to save your code');
    }
    box.remove();
  }
}

export function initializeGuide() {
  $('guideSearch').addEventListener('input', renderGuide);

  $('guideBtn').addEventListener('click', () => toggleGuide());
  $('closeGuide').addEventListener('click', () => toggleGuide(false));

  $('copyCode').addEventListener('click', copyCode);
}
