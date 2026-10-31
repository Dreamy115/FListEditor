// Generated from vendor/horizon and src/horizon-adapter.js. MPL-2.0.
// Source and notices: https://github.com/Dreamy115/FListEditor/tree/main/vendor/horizon
(() => {
"use strict";
// Browser services for Horizon's unmodified parser/core/standard modules.
// Included inside the generated renderer closure by scripts/build-renderer.cjs.
const Utils = {
  siteDomain: 'https://www.f-list.net/',
  staticDomain: 'https://static.f-list.net/',
  settings: {inlineDisplayMode: 0, animateEicons: false, smoothMosaics: false}
};
const InlineDisplayMode = {DISPLAY_ALL: 0, DISPLAY_SFW: 1, DISPLAY_NONE: 2};
const normalizeCharacterName = name => name.trim();
const core = {
  connection: {isOpen: false},
  state: {settings: {animatedEicons: true}},
  characters: {get: name => ({name})}
};
const setImmediate = callback => setTimeout(callback, 0);
function safeURL(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
class IconView {
  constructor({el, propsData}) {
    const name = propsData.character.name;
    const a = document.createElement('a');
    a.href = Utils.siteDomain + 'c/' + encodeURIComponent(name);
    a.target = '_blank'; a.rel = 'noopener noreferrer';
    const img = document.createElement('img');
    img.className = 'character-avatar icon'; img.alt = name;
    img.src = Utils.staticDomain + 'images/avatar/' + encodeURIComponent(name.toLowerCase()) + '.png';
    a.appendChild(img); el.replaceChildren(a);
  }
  $destroy() {}
}
class UrlTagView {
  constructor({el, propsData}) {
    const url = safeURL(propsData.url);
    if (!url) { el.textContent = propsData.text; return; }
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = propsData.text; el.replaceChildren(a);
  }
  $destroy() {}
}

class BBCodeTag {
    constructor(tag, tagList) {
        this.tag = tag;
        this.noClosingTag = false;
        if (tagList !== undefined)
            this.setAllowedTags(tagList);
    }
    isAllowed(tag) {
        return (this.allowedTags === undefined || this.allowedTags[tag] !== undefined);
    }
    setAllowedTags(allowed) {
        this.allowedTags = {};
        for (const tag of allowed)
            this.allowedTags[tag] = true;
    }
}
class BBCodeSimpleTag extends BBCodeTag {
    constructor(tag, elementName, classes, tagList) {
        super(tag, tagList);
        this.elementName = elementName;
        this.classes = classes;
    }
    createElement(parser, parent, param) {
        if (param.length > 0)
            parser.warning('Unexpected parameter');
        const el = parser.createElement(this.elementName);
        if (this.classes !== undefined && this.classes.length > 0)
            el.className = this.classes.join(' ');
        parent.appendChild(el);
        /*tslint:disable-next-line:no-unsafe-any*/ // false positive
        return el;
    }
}
class BBCodeCustomTag extends BBCodeTag {
    constructor(tag, customCreator, tagList) {
        super(tag, tagList);
        this.customCreator = customCreator;
    }
    createElement(parser, parent, param) {
        return this.customCreator(parser, parent, param);
    }
}
class BBCodeTextTag extends BBCodeTag {
    constructor(tag, customCreator) {
        super(tag, []);
        this.customCreator = customCreator;
    }
    createElement(parser, parent, param, content) {
        return this.customCreator(parser, parent, param, content);
    }
}
/* Function: Cut input to maxLength without leaving broken BBCode behind:
   severed tag tokens are dropped, text tags ([url], [icon], ...) whose raw
   content was sliced are removed entirely, remaining open tags are re-closed. */
function truncateBBCode(parser, input, maxLength) {
    if (input.length <= maxLength)
        return input;
    let cut = input.substring(0, maxLength);
    const open = [];
    const token = /\[(\/?)([^\[\]=]*)(?:=([^\]]*))?\]/g;
    let match;
    while ((match = token.exec(cut)) !== null) {
        const closing = match[1] === '/';
        const name = match[2].trim().toLowerCase();
        const top = open[open.length - 1];
        if (top !== undefined && top.isText) {
            if (closing && name === top.tag)
                open.pop();
            continue;
        }
        const tag = parser.getTag(name);
        if (tag === undefined)
            continue;
        if (closing) {
            if (top !== undefined && top.tag === name)
                open.pop();
        }
        else if (!tag.noClosingTag)
            open.push({
                tag: name,
                start: match.index,
                isText: tag instanceof BBCodeTextTag
            });
    }
    const innermost = open[open.length - 1];
    // ^ A text tag's content is raw -- a partial slice of it renders as
    // garbage, so drop the whole tag instead.
    if (innermost !== undefined && innermost.isText) {
        cut = cut.substring(0, innermost.start);
        open.pop();
    }
    const lastBracket = cut.lastIndexOf('[');
    if (lastBracket > cut.lastIndexOf(']'))
        cut = cut.substring(0, lastBracket);
    return (cut +
        '…' +
        open
            .reverse()
            .map(x => `[/${x.tag}]`)
            .join(''));
}
class BBCodeParser {
    constructor() {
        this._warnings = [];
        this._tags = {};
        this._line = -1;
        this._column = -1;
        this._storeWarnings = false;
    }
    parseEverything(input) {
        if (input.length === 0)
            return this.createElement('span');
        this._warnings = [];
        this._line = 1;
        this._column = 1;
        const parent = document.createElement('span');
        parent.className = 'bbcode';
        this._currentTag = { tag: '<root>', line: 1, column: 1 };
        this.parse(input, 0, undefined, parent, () => true, 0);
        //if(process.env.NODE_ENV !== 'production' && this._warnings.length > 0)
        //    console.log(this._warnings);
        return parent;
    }
    createElement(tag) {
        return document.createElement(tag);
    }
    addTag(impl) {
        this._tags[impl.tag] = impl;
    }
    getTag(tag) {
        return this._tags[tag];
    }
    removeTag(tag) {
        delete this._tags[tag];
    }
    get warnings() {
        return this._warnings;
    }
    set storeWarnings(store) {
        this._storeWarnings = store;
        if (!store)
            this._warnings = [];
    }
    warning(message) {
        if (!this._storeWarnings)
            return;
        const cur = this._currentTag;
        const newMessage = `Error on ${this._line}:${this._column} while inside tag [${cur.tag} @ ${cur.line}:${cur.column}]: ${message}`;
        this._warnings.push(newMessage);
    }
    parse(input, start, self, parent, isAllowed, depth) {
        let currentTag = this._currentTag;
        const selfAllowed = self !== undefined ? isAllowed(self.tag) : true;
        if (self !== undefined) {
            const parentAllowed = isAllowed;
            isAllowed = name => self.isAllowed(name) && parentAllowed(name);
            currentTag = this._currentTag = {
                tag: self.tag,
                line: this._line,
                column: this._column
            };
        }
        let tagStart = -1, paramStart = -1, mark = start, isInCollapseParam = false;
        for (let i = start; i < input.length; ++i) {
            const c = input[i];
            ++this._column;
            if (c === '\n') {
                ++this._line;
                this._column = 1;
            }
            if (c === '[' && !isInCollapseParam) {
                tagStart = i;
                paramStart = -1;
            }
            else if (c === '=' && paramStart === -1) {
                paramStart = i;
                const paramIndex = paramStart === -1 ? i : paramStart;
                let tagKey = input
                    .substring(tagStart + 1, paramIndex)
                    .trim()
                    .toLowerCase();
                if (tagKey == 'collapse')
                    isInCollapseParam = true;
            }
            else if (c === ']') {
                const paramIndex = paramStart === -1 ? i : paramStart;
                let tagKey = input
                    .substring(tagStart + 1, paramIndex)
                    .trim()
                    .toLowerCase();
                if (tagKey.length === 0) {
                    tagStart = -1;
                    continue;
                }
                const param = paramStart > tagStart
                    ? input.substring(paramStart + 1, i).trim()
                    : '';
                const close = tagKey[0] === '/';
                if (close)
                    tagKey = tagKey.substr(1).trim();
                if (this._tags[tagKey] === undefined) {
                    tagStart = -1;
                    continue;
                }
                if (isInCollapseParam) {
                    let fullTagKey = input
                        .substring(tagStart + 1, i + 1)
                        .trim()
                        .toLowerCase();
                    if (fullTagKey.endsWith('[hr]')) {
                        continue;
                    }
                }
                isInCollapseParam = false;
                if (!close) {
                    const tag = this._tags[tagKey];
                    const allowed = isAllowed(tagKey);
                    if (parent !== undefined) {
                        parent.appendChild(document.createTextNode(input.substring(mark, allowed ? tagStart : i + 1)));
                        mark = i + 1;
                    }
                    if (!allowed || parent === undefined || depth > 100) {
                        i = this.parse(input, i + 1, tag, parent, isAllowed, depth + 1);
                        mark = i + 1;
                        continue;
                    }
                    let element;
                    if (tag instanceof BBCodeTextTag) {
                        i = this.parse(input, i + 1, tag, undefined, isAllowed, depth + 1);
                        element = tag.createElement(this, parent, param, input.substring(mark, input.lastIndexOf('[', i)));
                        if (element === undefined)
                            parent.appendChild(document.createTextNode(input.substring(tagStart, i + 1)));
                    }
                    else {
                        element = tag.createElement(this, parent, param, '');
                        if (element === undefined)
                            parent.appendChild(document.createTextNode(input.substring(tagStart, i + 1)));
                        if (!tag.noClosingTag)
                            i = this.parse(input, i + 1, tag, element !== undefined ? element : parent, isAllowed, depth + 1);
                        if (element === undefined)
                            parent.appendChild(document.createTextNode(input.substring(input.lastIndexOf('[', i), i + 1)));
                    }
                    mark = i + 1;
                    this._currentTag = currentTag;
                    if (element === undefined)
                        continue;
                    element.bbcodeTag = tagKey;
                    if (param.length > 0)
                        element.bbcodeParam =
                            param;
                }
                else if (self !== undefined) {
                    //tslint:disable-line:curly
                    if (self.tag === tagKey) {
                        if (parent !== undefined)
                            parent.appendChild(document.createTextNode(input.substring(mark, selfAllowed ? tagStart : i + 1)));
                        return i;
                    }
                    if (!selfAllowed)
                        return mark - 1;
                    if (isAllowed(tagKey))
                        this.warning(`Unexpected closing ${tagKey} tag. Needed ${self} tag instead.`);
                }
                else if (isAllowed(tagKey))
                    this.warning(`Found closing ${tagKey} tag that was never opened.`);
            }
        }
        if (mark < input.length && parent !== undefined) {
            parent.appendChild(document.createTextNode(input.substring(mark)));
            mark = input.length;
        }
        if (self !== undefined)
            this.warning('Automatically closing tag at end of input.');
        return mark;
    }
}

const urlFormat = '((?:https?|ftps?|irc)://[^\\s/$.?#"\']+\\.[^\\s"]+)';
const findUrlRegex = new RegExp(`(\\[url[=\\]]\\s*)?${urlFormat}`, 'gi');
const urlRegex = new RegExp(`^${urlFormat}$`);
function domain(url) {
    const pieces = urlRegex.exec(url);
    if (pieces === null)
        return;
    const match = pieces[1].match(/(?:(https?|ftps?|irc):)?\/\/(?:www.)?([^\/]+)/);
    return match !== null ? match[2] : undefined;
}
function fixURL(url) {
    if (/^www\./.test(url))
        url = `https://${url}`;
    return url.replace(/ /g, '%20');
}
// tslint:disable-next-line: max-line-length
function analyzeUrlTag(parser, param, content) {
    let url, textContent = content;
    let success = true;
    if (param.length > 0) {
        url = param.trim();
        if (content.length === 0)
            textContent = param;
    }
    else if (content.length > 0) {
        const m = content.match(/^\[url=?](.+)\[\/url]$/i);
        url = m ? m[1] : content;
    }
    else {
        parser.warning('url tag contains no url.');
        textContent = '';
        success = false;
    }
    if (success && url) {
        // This fixes problems where content based urls are marked as invalid if they contain spaces.
        url = fixURL(url);
        if (!urlRegex.test(url)) {
            textContent = `[BAD URL] ${url}`;
            success = false;
        }
    }
    return {
        success,
        url,
        textContent,
        domain: url ? domain(url) : undefined
    };
}
class CoreBBCodeParser extends BBCodeParser {
    /*tslint:disable-next-line:typedef*/ //https://github.com/palantir/tslint/issues/711
    constructor(makeLinksClickable = true) {
        super();
        this.makeLinksClickable = makeLinksClickable;
        this.cleanup = [];
        this.addTag(new BBCodeSimpleTag('b', 'strong'));
        this.addTag(new BBCodeSimpleTag('i', 'em'));
        this.addTag(new BBCodeSimpleTag('u', 'u'));
        this.addTag(new BBCodeSimpleTag('s', 'del'));
        this.addTag(new BBCodeSimpleTag('noparse', 'span', [], []));
        this.addTag(new BBCodeTextTag('icon', (parser, parent, param, content) => {
            if (param.length > 0)
                parser.warning('Unexpected parameter on icon tag.');
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if (!uregex.test(content))
                return;
            const characterName = normalizeCharacterName(content);
            const root = parser.createElement('span');
            const el = parser.createElement('span');
            parent.appendChild(root);
            root.appendChild(el);
            const view = new IconView({
                el,
                propsData: {
                    character: core.characters.get(characterName)
                }
            });
            this.cleanup.push(view);
            return root;
        }));
        this.addTag(new BBCodeTextTag('eicon', (parser, parent, param, content) => {
            if (param.length > 0)
                parser.warning('Unexpected parameter on eicon tag.');
            const uregex = /^[a-zA-Z0-9_\-\s]+$/;
            if (!uregex.test(content))
                return;
            const extension = core.connection.isOpen && !core.state.settings.animatedEicons
                ? '.png'
                : '.gif';
            const img = parser.createElement('img');
            img.src = `https://static.f-list.net/images/eicon/${content.toLowerCase()}${extension}`;
            img.title = img.alt = content;
            img.className = 'character-avatar eicon';
            if (Utils.settings.animateEicons && Utils.settings.smoothMosaics) {
                img.classList.add('loading');
                const syncMosaic = () => {
                    // * Walk up to the .bbcode container so eicons sync together
                    // * even when nested inside different BBCode tags (e.g. [color], [b])
                    const container = img.closest('.bbcode') || img.parentElement;
                    if (!container)
                        return;
                    const eicons = container.querySelectorAll('img.eicon.loading');
                    for (const eicon of eicons) {
                        if (!eicon.complete)
                            return;
                    }
                    for (const eicon of eicons) {
                        eicon.classList.remove('loading');
                    }
                };
                img.addEventListener('load', syncMosaic);
                img.addEventListener('error', syncMosaic);
            }
            parent.appendChild(img);
            return img;
        }));
        this.addTag(new BBCodeTextTag('url', (parser, parent, _, content) => {
            const tagData = analyzeUrlTag(parser, _, content);
            const root = parser.createElement('span');
            parent.appendChild(root);
            if (!tagData.success) {
                root.textContent = tagData.textContent;
                return;
            }
            const view = new UrlTagView({
                el: root,
                propsData: {
                    url: tagData.url,
                    text: tagData.textContent,
                    domain: tagData.domain
                }
            });
            this.cleanup.push(view);
            return root;
        }));
        this.addTag(new BBCodeCustomTag('spoiler', (parser, parent) => {
            const link = parser.createElement('a');
            const content = parser.createElement('span');
            link.href = '#';
            link.className = 'spoiler-tag';
            link.onclick = e => {
                const target = e.target;
                target.parentElement.replaceChild(content, target);
                e.stopPropagation();
                return false;
            };
            link.appendChild(document.createTextNode('[click to show spoiler]'));
            parent.appendChild(link);
            return content;
        }));
    }
    parseEverything(input) {
        if (this.makeLinksClickable && input.length > 0)
            input = input.replace(findUrlRegex, (match, tag) => tag === undefined ? `[url]${match}[/url]` : match);
        return super.parseEverything(input);
    }
}

const usernameRegex = /^[a-zA-Z0-9_\-\s]+$/;
class StandardBBCodeParser extends CoreBBCodeParser {
    createInline(inline) {
        const p1 = inline.hash.substr(0, 2);
        const p2 = inline.hash.substr(2, 2);
        const outerEl = this.createElement('div');
        const el = this.createElement('img');
        el.className = 'inline-image';
        el.title = el.alt = inline.name;
        el.src = `${Utils.staticDomain}images/charinline/${p1}/${p2}/${inline.hash}.${inline.extension}`;
        outerEl.appendChild(el);
        return outerEl;
    }
    constructor() {
        super();
        this.cleanup = [];
        const hrTag = new BBCodeSimpleTag('hr', 'hr', [], [
            'url',
            'i',
            'b',
            'u',
            's',
            'color',
            'sub',
            'sup',
            'big',
            'small',
            'heading',
            'hr',
            'icon',
            'user',
            'img',
            'eicon',
            'quote',
            'collapse',
            'left',
            'center',
            'right',
            'justify',
            'indent',
            'noparse'
        ]);
        hrTag.noClosingTag = true;
        this.addTag(hrTag);
        this.addTag(new BBCodeCustomTag('quote', (parser, parent, param) => {
            if (param !== '')
                parser.warning('Unexpected paramter on quote tag.');
            const element = parser.createElement('blockquote');
            const innerElement = parser.createElement('div');
            innerElement.className = 'quoteHeader';
            innerElement.appendChild(document.createTextNode('Quote:'));
            element.appendChild(innerElement);
            parent.appendChild(element);
            return element;
        }));
        this.addTag(new BBCodeSimpleTag('left', 'span', ['leftText']));
        this.addTag(new BBCodeSimpleTag('right', 'span', ['rightText']));
        this.addTag(new BBCodeSimpleTag('center', 'span', ['centerText']));
        this.addTag(new BBCodeSimpleTag('justify', 'span', ['justifyText']));
        this.addTag(new BBCodeSimpleTag('sub', 'sub', [], ['i', 'u', 'b', 'hr']));
        this.addTag(new BBCodeSimpleTag('sup', 'sup', [], ['i', 'u', 'b', 'hr']));
        this.addTag(new BBCodeCustomTag('color', (parser, parent, param) => {
            const cregex = /^(red|blue|white|yellow|pink|gray|green|orange|purple|black|brown|cyan)$/;
            if (!cregex.test(param)) {
                parser.warning('Invalid color parameter provided.');
                const el = parser.createElement('span');
                el.className = `Text`;
                parent.appendChild(el);
                return el;
            }
            const el = parser.createElement('span');
            el.className = `${param}Text`;
            parent.appendChild(el);
            return el;
        }));
        this.addTag(new BBCodeSimpleTag('big', 'span', ['bigText'], ['url', 'i', 'u', 'b', 'color', 's', 'hr']));
        this.addTag(new BBCodeSimpleTag('small', 'span', ['smallText'], ['url', 'i', 'u', 'b', 'color', 's', 'hr']));
        this.addTag(new BBCodeSimpleTag('indent', 'div', ['indentText']));
        this.addTag(new BBCodeSimpleTag('heading', 'h2', [], [
            'url',
            'i',
            'b',
            'u',
            's',
            'color',
            'sub',
            'sup',
            'big',
            'small',
            'heading',
            'hr',
            'icon',
            'user',
            'img',
            'eicon',
            'quote',
            'collapse',
            'left',
            'center',
            'right',
            'justify',
            'indent',
            'noparse'
        ]));
        this.addTag(new BBCodeSimpleTag('row', 'div', ['row']));
        this.addTag(new BBCodeCustomTag('col', (parser, parent, param) => {
            const col = parser.createElement('div');
            col.className =
                param === '1'
                    ? 'col-lg-3 col-md-4 col-12'
                    : param === '2'
                        ? 'col-lg-4 col-md-6 col-12'
                        : param === '3'
                            ? 'col-lg-6 col-md-8 col-12'
                            : 'col-md';
            parent.appendChild(col);
            return col;
        }));
        this.addTag(new BBCodeCustomTag('collapse', (parser, parent, param) => {
            if (param === '') {
                //tslint:disable-line:curly
                parser.warning('title parameter is required.');
                // HACK: Compatability fix with old site. Titles are not trimmed on old site, so empty collapse titles need to be allowed.
                //return null;
            }
            const outer = parser.createElement('div');
            outer.className = 'card bg-light bbcode-collapse collapsed';
            const headerText = parser.createElement('div');
            headerText.className = 'card-header bbcode-collapse-header';
            const icon = parser.createElement('i');
            icon.className = 'fas fa-chevron-down';
            icon.style.marginRight = '10px';
            // HACK: to allow [hr] in header part
            if (param.startsWith('[hr]')) {
                headerText.appendChild(parser.createElement('hr'));
                param = param.slice(4);
            }
            headerText.appendChild(icon);
            const splitParam = param.split('[hr]');
            for (let iii = 0; iii < splitParam.length; iii++) {
                const element = splitParam[iii];
                headerText.appendChild(document.createTextNode(element));
                if (iii < splitParam.length - 1)
                    headerText.appendChild(parser.createElement('hr'));
            }
            outer.appendChild(headerText);
            const body = parser.createElement('div');
            body.className = 'bbcode-collapse-body';
            body.style.height = '0';
            outer.appendChild(body);
            const inner = parser.createElement('div');
            inner.className = 'card-body';
            body.appendChild(inner);
            let timeout;
            headerText.addEventListener('click', () => {
                //???
                const isCollapsed = parseInt(body.style.height, 10) === 0;
                if (isCollapsed)
                    timeout = window.setTimeout(() => (body.style.height = ''), 200);
                else {
                    clearTimeout(timeout);
                    body.style.transition = 'initial';
                    setImmediate(() => {
                        body.style.transition = '';
                        body.style.height = '0';
                    });
                }
                body.style.height = `${body.scrollHeight}px`;
                outer.className = `card bg-light bbcode-collapse ${!isCollapsed ? 'collapsed' : ''}`;
                headerText.className = `card-header bbcode-collapse-header bbcode-collapse-header-${isCollapsed ? 'up' : 'down'}`;
                icon.className = `fas fa-chevron-${isCollapsed ? 'up' : 'down'}`;
            });
            parent.appendChild(outer);
            return inner;
        }));
        this.addTag(new BBCodeTextTag('user', (parser, parent, param, content) => {
            if (param !== '')
                parser.warning('Unexpected parameter on user tag.');
            if (!usernameRegex.test(content))
                return;
            const a = parser.createElement('a');
            a.href = `${Utils.siteDomain}c/${content}`;
            a.target = '_blank';
            a.className = 'character-link';
            a.appendChild(document.createTextNode(content));
            parent.appendChild(a);
            return a;
        }));
        this.addTag(new BBCodeTextTag('img', (p, parent, param, content) => {
            const parser = p;
            if (typeof parser.inlines === 'undefined') {
                parser.warning('This page does not support inline images.');
                const el = parser.createElement('span');
                el.className = `Text`;
                el.innerText = ``;
                parent.appendChild(el);
                return el;
            }
            const displayMode = Utils.settings.inlineDisplayMode;
            if (!/^\d+$/.test(param)) {
                parser.warning('img tag parameters must be numbers.');
                const el = parser.createElement('span');
                el.className = `Text`;
                el.innerText = ``;
                parent.appendChild(el);
                return el;
            }
            const inline = parser.inlines[param];
            if (typeof inline !== 'object') {
                parser.warning(`Could not find an inline image with id ${param} It will not be visible.`);
                const el = parser.createElement('span');
                el.className = `Text`;
                el.innerText = ``;
                parent.appendChild(el);
                return el;
            }
            inline.name = content;
            let element;
            if (displayMode === InlineDisplayMode.DISPLAY_NONE ||
                (displayMode === InlineDisplayMode.DISPLAY_SFW && inline.nsfw)) {
                const el = (element = parser.createElement('a'));
                el.className = 'unloadedInline';
                el.href = '#';
                el.dataset.inlineId = param;
                el.onclick = () => {
                    (Array.prototype.slice.call(document.getElementsByClassName('unloadedInline'))).forEach(e => {
                        const showInline = parser.inlines[e.dataset.inlineId];
                        if (typeof showInline !== 'object')
                            return;
                        e.parentElement.replaceChild(parser.createInline(showInline), e);
                    });
                    return false;
                };
                const prefix = inline.nsfw ? '[NSFW Inline] ' : '[Inline] ';
                el.appendChild(document.createTextNode(prefix));
                parent.appendChild(el);
            }
            else
                parent.appendChild((element = parser.createInline(inline)));
            return element;
        }));
    }
    parseEverything(input) {
        const elm = super.parseEverything(input);
        if (this.cleanup.length > 0)
            elm.cleanup = ((cleanup) => () => {
                for (const component of cleanup)
                    component.$destroy();
            })(this.cleanup);
        this.cleanup = [];
        return elm;
    }
}

const parser = new StandardBBCodeParser();
// Standalone previews have no profile API response mapping IDs to image hashes.
const imageTag = parser.getTag('img');
parser.addTag(new BBCodeTextTag('img', (p, parent, param, content) => {
  if (parser.inlines?.[param]) return imageTag.createElement(p, parent, param, content);
  const url = safeURL(content);
  const el = document.createElement(!param && url ? 'img' : 'span');
  if (!param && url) { el.src = url; el.alt = 'Profile image'; el.className = 'profileimg'; }
  else { el.className = 'placeholder-image'; el.textContent = 'F-List image #' + param + (content ? ' · ' + content : '') + ' (metadata unavailable)'; }
  parent.appendChild(el);
  return el;
}));
globalThis.FolioHorizon = {render: input => parser.parseEverything(input)};
})();
