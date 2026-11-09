/* Original Folio preview themes and CSS import support. */
(() => {
  const example = (
    name,
    panel,
    text,
    card,
    accent,
    border,
    font,
  ) => `/* Folio ${name} — editable preview stylesheet.
 * Download with Example CSS, edit this file, then choose Load CSS.
 * .previewpage is the card root; .description contains rendered profile text.
 * Rules are automatically scoped to the card, including exported captures.
 * Use flat selectors; @media and @supports are supported. Imports, font-face,
 * keyframes and nested selectors are not loaded. Use installed system fonts.
 * Use absolute HTTPS or data: URLs for images; relative file paths cannot travel
 * with an imported sheet. Keep local image data in data: URLs for offline use.
 */
.previewpage {
  /* Change these colors to restyle the card, sections, links and dividers. */
  --horizon-panel: ${panel}; --horizon-text: ${text};
  --horizon-card: ${card}; --horizon-link: ${accent};
  --horizon-muted: ${accent}; --horizon-border: ${border};
  --horizon-cap: ${card};
  background: ${panel}; color: ${text};
  font-family: ${font};
  border: 1px solid ${border}; border-radius: 16px; padding: 28px;
}
/* Header: character name and avatar. */
.char-header { border-bottom: 2px solid ${accent}; padding-bottom: 20px; }
.char-header h3 { color: ${accent}; letter-spacing: .04em; }
.char-header small { color: ${text}; opacity: .7; }
.char-avatar { background: ${card}; color: ${accent}; border-color: ${border}; }
/* Profile body: keep font size inherited so the Text size control works. */
.description { line-height: 1.7; }
.description a { color: ${accent}; text-decoration: underline; }
.description blockquote { background: ${card}; border-left: 3px solid ${accent}; border-radius: 0 10px 10px 0; }
.description hr { border: 0; border-top: 1px solid ${border}; }
/* Collapsible sections: header, outer panel and content padding. */
.description .bbcode-collapse { background: ${card}; border: 1px solid ${border}; border-radius: 10px; }
.description .bbcode-collapse-header { background: ${card}; color: ${accent}; border-bottom: 1px solid ${border}; padding: .65em 1em; }
.description .card-body { padding: 1em; }
/* To change a named text color, add e.g. .description .cyanText {color:#58cfc5;}
 * This affects preview and visual exports; BBCode still exports the color name.
 */
`;
  const themes = {
    'folio-midnight': example(
      'Midnight',
      '#101f2b',
      '#dce8ec',
      '#192f3d',
      '#7edacb',
      '#355361',
      'system-ui, sans-serif',
    ),
    'folio-parchment': example(
      'Parchment',
      '#f6edda',
      '#3e3328',
      '#ede0c4',
      '#80502c',
      '#c8b38a',
      'Georgia, serif',
    ),
    'folio-classified': example(
      'Classified',
      '#eeece3',
      '#252724',
      '#f8f7ef',
      '#88372f',
      '#92948b',
      '"Courier New", monospace',
    ),
  };
  // Each downloadable example contains its own structural treatment as well as its palette.
  themes['folio-midnight'] += `
/* MIDNIGHT / instrument panels. Square frames, inset rails and luminous controls.
 * Borders and inset shadows build the shapes without changing profile markup.
 * Avoid fixed heights: long text and nested sections must remain free to grow.
 */
.previewpage { border-radius: 0; border-width: 1px 1px 1px 6px; padding: 24px; box-shadow: inset 0 6px 0 #192f3d; }
.char-header { flex-direction: row-reverse; justify-content: space-between; border: 1px solid #355361; border-left: 0; border-right: 0; padding: 18px 0; }
.char-avatar { border-radius: 0; transform: rotate(45deg); width: 40px; height: 40px; margin: 8px; }
.char-avatar svg { transform: rotate(-45deg); }
.char-header h3 { text-transform: none; letter-spacing: normal; font-size: 1.25em; }
/* Quotes become asymmetrical speech capsules with an inset illuminated rail. */
.description blockquote { border: 0; border-radius: 22px 22px 22px 2px; padding: 1.2em 1.4em; margin: 1em .25em 1.25em; background: #203b49; box-shadow: inset 4px 0 0 #7edacb, 5px 5px 0 #0a1720; }
.description .quoteHeader { border: 0; color: #7edacb; font-size: .68em; letter-spacing: .22em; margin-bottom: .7em; opacity: 1; }
/* Sections are open-frame instrument bays. The title is a solid control strip.
 * The body rail continues down nested content; no rounded Bootstrap-style card.
 */
.description .bbcode-collapse { border: 0; border-left: 2px solid #355361; border-radius: 0; background: transparent; margin: .8em 0; overflow: hidden; }
.description .bbcode-collapse-header { border: 0; border-radius: 0; background: #7edacb; color: #10252d; padding: .7em 1em; text-transform: none; font-variant: normal; letter-spacing: normal; font-size: .82em; }
.description .collapsed > .bbcode-collapse-header { border-radius: 0; background: #203b49; color: #a5efe1; }
.description .bbcode-collapse-body { margin-left: 0; background: #122631; }
.description .card-body { padding: 1.25em; }
/* Replace Horizon's chevron with a CSS plus/minus indicator using two gradients. */
.description .bbcode-collapse-header > .fas { mask: none; width: .85em; height: .85em; margin-right: .6em; background: linear-gradient(currentColor,currentColor) center / 100% 2px no-repeat; }
.description .collapsed > .bbcode-collapse-header > .fas { background: linear-gradient(currentColor,currentColor) center / 100% 2px no-repeat, linear-gradient(currentColor,currentColor) center / 2px 100% no-repeat; }
.description hr { height: 5px; border: 0; background: repeating-linear-gradient(90deg,#7edacb 0 18px,transparent 18px 25px); opacity: .7; margin: 1.5em 0; }
.description .bbcode h2 { color: #7edacb; letter-spacing: normal; text-transform: none; border-bottom: 1px solid #355361; padding-bottom: .4em; }
`;
  themes['folio-parchment'] += `
/* PARCHMENT / a bound commonplace book. A double-rule frame and centered masthead.
 * Change the inset shadow to move the binding; use em units for text ornaments.
 */
.previewpage { border: 6px double #b49a6b; border-radius: 3px 24px 24px 3px; padding: 30px 24px 30px 34px; box-shadow: inset 8px 0 0 #ded0b0; }
.char-header { flex-direction: column; text-align: center; border: 0; padding: 4px 0 24px; margin-bottom: 24px; }
.char-avatar { width: 58px; height: 58px; border-radius: 50%; background: transparent; border: 3px double #80502c; }
.char-header h3 { font-size: 1.7em; font-weight: normal; letter-spacing: normal; color: #503a23; }
.char-header small { font-variant: small-caps; letter-spacing: .14em; }
/* Quotes are unboxed literary extracts between double rules, with generous inset.
 * Nested extracts retain their own rules and fit within their parent's width.
 */
.description blockquote { border: 0; border-top: 3px double #b49a6b; border-bottom: 3px double #b49a6b; border-radius: 0; background: transparent; box-shadow: none; padding: 1em .7em; margin: 1.4em 6%; font-style: normal; }
.description .quoteHeader { border: 0; text-align: center; font-style: normal; font-variant: small-caps; text-transform: lowercase; letter-spacing: .18em; opacity: 1; color: #80502c; margin-bottom: .5em; }
/* Collapses resemble index tabs above loose manuscript pages. A stepped shadow
 * suggests stacked paper; the tab stays compact while its body spans the page.
 */
.description .bbcode-collapse { border: 0; border-radius: 0; background: transparent; box-shadow: none; margin: 1.2em 4px 1.5em 0; overflow: hidden; }
.description .bbcode-collapse-header { width: fit-content; max-width: 100%; border: 1px solid #b49a6b; border-bottom: 0; border-radius: 12px 24px 0 0; padding: .6em 1.25em; background: #ddc79d; color: #503a23; font-variant: normal; letter-spacing: normal; }
.description .collapsed > .bbcode-collapse-header { border-radius: 12px 24px 0 0; border-bottom: 3px double #80502c; }
.description .bbcode-collapse-body { margin-left: 0; background: #fff8e9; border-top: 2px solid #b49a6b; box-shadow: inset -3px 0 0 #e3d5b9, inset 0 -3px 0 #e3d5b9; }
.description .card-body { padding: 1.35em; }
/* The indicator becomes a small diamond seal; its fill shows open/closed state. */
.description .bbcode-collapse-header > .fas { mask: none; background: #80502c; width: .5em; height: .5em; border: 1px solid #80502c; transform: rotate(45deg); vertical-align: .08em; margin-right: .65em; }
.description .collapsed > .bbcode-collapse-header > .fas { background: transparent; }
.description hr { height: 7px; border: 0; border-top: 1px solid #b49a6b; border-bottom: 1px solid #b49a6b; background: transparent; width: 45%; margin: 1.8em auto; opacity: 1; }
.description .bbcode h2 { text-align: center; font-variant: normal; font-weight: normal; letter-spacing: normal; font-size: 1.5em; color: #80502c; }
@media(max-width:600px) { .previewpage { padding: 20px 14px 20px 24px; } .description blockquote { margin-left: 2%; margin-right: 2%; } }
`;
  themes['folio-midnight'] += `
/* SCI-FI / a shipboard display. Grid lines are CSS backgrounds, not text effects.
 * Large corner radii on opposite corners suggest machined panels. Avoid text
 * transforms and tracking here: Unicode font macros already supply their glyphs.
 */
.previewpage { background-color: #0a1824; background-image: linear-gradient(#7edacb08 1px,transparent 1px), linear-gradient(90deg,#7edacb08 1px,transparent 1px); background-size: 28px 28px; border: 1px solid #355361; border-top: 4px solid #7edacb; border-radius: 0 28px 0 0; box-shadow: inset 0 0 40px #050e18; }
.char-header { border-top: 0; border-bottom: 1px dashed #497380; }
.char-header h3 { font-variant: normal; }
.description blockquote { border: 1px solid #355361; border-left: 4px solid #7edacb; border-radius: 0 24px 0 0; background: linear-gradient(110deg,#173541,#102431); box-shadow: inset 0 -3px 0 #193b48; }
.description .bbcode-collapse { border-left: 0; border: 1px solid #355361; border-radius: 0 18px 0 0; }
.description .bbcode-collapse-header { border-left: 5px solid #7edacb; background: linear-gradient(90deg,#193b48,#17303e); color: #bcfff0; padding: .85em 1em; }
.description .collapsed > .bbcode-collapse-header { background: #102431; color: #9dcabe; border-left-color: #497380; }
.description .bbcode-collapse-body { background: #0e202de8; border-top: 1px dashed #355361; }
.description .bbcode h2 { border-bottom: 0; border-left: 4px solid #7edacb; background: linear-gradient(90deg,#193b48,transparent); padding: .55em .7em; }
`;
  themes['folio-parchment'] += `
/* FANTASY / an illuminated spellbook. Gold frames, jewel accents and a leather
 * binding create the ornament. Authored text keeps its casing and Unicode fonts.
 * Layered radial gradients are self-contained and work without external assets.
 */
.previewpage { background-color: #f5e8c9; background-image: radial-gradient(ellipse at top,#fff8df,transparent 65%); border: 7px double #94733d; border-left: 12px solid #513e30; border-radius: 8px 32px 32px 8px; box-shadow: inset 4px 0 0 #c5a45f,inset 0 0 45px #b38f4c45; }
.char-header { border-top: 3px double #94733d; border-bottom: 3px double #94733d; padding: 20px 0; }
.char-avatar { border: 4px double #a17c34; background: #254f48; color: #f4d58c; box-shadow: 0 0 0 4px #f3dfad,0 0 0 5px #94733d; }
.description blockquote { background: linear-gradient(120deg,#fff8df,#ecdbb6); border: 3px double #94733d; border-radius: 32px 4px 32px 4px; padding: 1.3em; box-shadow: 3px 3px 0 #cdb781; }
.description .quoteHeader { color: #36594d; }
.description .bbcode-collapse { border: 3px double #94733d; border-radius: 18px 3px 18px 3px; background: #fff4d6; }
.description .bbcode-collapse-header { width: 100%; border: 0; border-bottom: 1px solid #94733d; border-radius: 0; background: linear-gradient(90deg,#16392f,#1b4035,#16392f); color: #ffe6a7; padding: .8em 1em; }
.description .collapsed > .bbcode-collapse-header { border: 0; border-radius: 0; }
.description .bbcode-collapse-body { border-top: 0; background: #fff4d6; box-shadow: inset 0 0 20px #c5a45f35; }
.description .bbcode-collapse-header > .fas { background: #f4d58c; border-color: #f4d58c; }
.description .collapsed > .bbcode-collapse-header > .fas { background: transparent; }
.description hr { width: 65%; height: 9px; border: 3px double #94733d; border-radius: 50%; background: #c5a45f; }
.description .bbcode h2 { color: #315447; border-bottom: 3px double #94733d; padding-bottom: .5em; }
`;
  themes['folio-classified'] += `
/* CLASSIFIED / an archival case file. A stamped cover, typewriter text, squared
 * evidence boxes and dashed quotation boundaries. Content is never redacted.
 * The stamp is a tiny embedded SVG background; edit its word and color here.
 * Use monospace as a base only; Unicode font macros retain their original glyphs.
 */
.previewpage { padding: 76px 26px 28px; border: 1px solid #92948b; border-radius: 0; box-shadow: inset 7px 0 0 #d0d0c4; background-color: #eeece3; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='46' viewBox='0 0 200 46'%3E%3Cg transform='rotate(-3 100 23)' fill='none' stroke='%2388372f' stroke-width='2'%3E%3Crect x='3' y='5' width='194' height='36'/%3E%3C/g%3E%3Ctext x='100' y='30' text-anchor='middle' font-family='monospace' font-weight='bold' font-size='23' fill='%2388372f' transform='rotate(-3 100 23)'%3ECLASSIFIED%3C/text%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 22px top 16px; background-size: 200px 46px; }
.char-header { flex-direction: row; border-top: 3px solid #252724; border-bottom: 1px solid #252724; padding: 14px 0; }
.char-avatar { width: 46px; height: 54px; border: 1px solid #92948b; border-radius: 0; background: #ddddd2; color: #55584f; }
.char-header h3 { color: #252724; font-size: 1.2em; letter-spacing: normal; }
.char-header small { color: #55584f; opacity: 1; }
.description { line-height: 1.65; }
.description blockquote { margin: 1.2em 0; padding: 1em; border: 1px dashed #62675b; border-left: 5px solid #62675b; border-radius: 0; box-shadow: none; background: #e0e0d4; font-style: normal; }
.description .quoteHeader { border-bottom: 1px solid #92948b; color: #55584f; opacity: 1; letter-spacing: normal; }
.description .bbcode-collapse { margin: 1em 0; border: 1px solid #62675b; border-radius: 0; background: #f8f7ef; }
.description .bbcode-collapse-header { width: 100%; padding: .6em .8em; background: #343a34; color: #f8f7ef; border: 0; border-bottom: 1px solid #62675b; border-radius: 0; font-variant: normal; text-transform: none; letter-spacing: normal; }
.description .collapsed > .bbcode-collapse-header { border-radius: 0; background: #deded2; color: #252724; }
.description .bbcode-collapse-body { margin-left: 0; background: #f8f7ef; }
.description .card-body { padding: 1em; }
.description .bbcode-collapse-header > .fas { mask: none; width: .6em; height: .6em; border: 1px solid currentColor; background: currentColor; transform: none; vertical-align: .05em; margin-right: .6em; }
.description .collapsed > .bbcode-collapse-header > .fas { background: transparent; }
.description .bbcode h2 { color: #252724; border-bottom: 2px solid #88372f; padding-bottom: .4em; font-size: 1.2em; }
.description hr { opacity: 1; border: 0; border-top: 2px dashed #92948b; margin: 1.5em 0; }
@media(max-width:600px) { .previewpage { padding: 76px 16px 20px; } }
`;
  // Named colors are visual theme values; compiled BBCode keeps the original names.
  const lightColors = {
    red: '#b00020',
    orange: '#9d3600',
    yellow: '#715300',
    green: '#006b23',
    cyan: '#00656e',
    blue: '#064fc4',
    purple: '#7c19b5',
    pink: '#ad0064',
    black: '#111714',
    brown: '#854310',
    white: '#5b584b',
    gray: '#535950',
  };
  const darkColors = {
    red: '#ff8585',
    orange: '#ffac45',
    yellow: '#ffe34d',
    green: '#68ed87',
    cyan: '#40e5ed',
    blue: '#80b7ff',
    purple: '#ee80ee',
    pink: '#ff85bb',
    black: '#a0adb9',
    brown: '#dca46c',
    white: '#ffffff',
    gray: '#bbc6ce',
  };
  const colorVars = (palette) =>
    Object.entries(palette)
      .map(([name, value]) => `--folio-${name}: ${value};`)
      .join(' ');
  for (const name of Object.keys(themes)) {
    const dark = name === 'folio-midnight';
    themes[name] += `
/* Named text palette: darker inks on paper, lighter inks on dark surfaces.
 * White and black are adapted for legibility rather than literal RGB values.
 * Change these variables to tune individual named colors. Section headers use
 * their own light-ink palette because their backgrounds are dark, even on paper.
 * Keep at least 4.5:1 contrast on every surface when editing these values.
 */
.previewpage { ${colorVars(dark ? darkColors : lightColors)} }
`;
    if (!dark)
      themes[name] += `.description .bbcode-collapse-header { ${colorVars(darkColors)} }
`;
    if (name === 'folio-classified')
      themes[name] +=
        `.description .collapsed > .bbcode-collapse-header { ${colorVars(lightColors)} }
`;
    for (const color of Object.keys(lightColors)) {
      themes[name] +=
        `.description .${color}Text { color: var(--folio-${color}); text-shadow: none; }
`;
    }
  }
  function compile(css) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    const scope = (rules: CSSRuleList): string =>
      Array.from(rules, (rule) => {
        if (rule.type === 1) {
          // :is() preserves selector lists without incorrectly splitting their commas.
          const selector = `:is(.previewpage.previewpage.previewpage):is(${(rule as CSSStyleRule).selectorText}), :is(.previewpage.previewpage.previewpage) :is(${(rule as CSSStyleRule).selectorText})`;
          return `${selector}{${(rule as CSSStyleRule).style.cssText}}`;
        }
        if (rule.type === 4 || rule.type === 12) {
          const kind = rule.type === 4 ? 'media' : 'supports';
          return `@${kind} ${(rule as CSSConditionRule).conditionText}{${scope((rule as CSSConditionRule).cssRules)}}`;
        }
        return '';
      }).join('\n');
    const result = scope(sheet.cssRules);
    if (!result.trim()) throw Error('No supported CSS rules found');
    return result;
  }
  const style = document.createElement('style');
  style.id = 'folioPreviewCss';
  document.head.append(style);
  globalThis.FolioPreviewThemes = {
    themes,
    compile,
    apply(theme, custom) {
      style.textContent = themes[theme]
        ? compile(themes[theme])
        : theme === 'custom-css' && custom
          ? compile(custom)
          : '';
    },
  };
})();

export {};
