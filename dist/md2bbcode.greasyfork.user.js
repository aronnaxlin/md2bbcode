// ==UserScript==
// @name         Bangumi Markdown 转 BBCode
// @namespace    bangumi.md2bbcode
// @version      0.0.1
// @description  为 Bangumi 编辑器添加 Markdown 转 BBCode
// @author       you
// @icon         https://bgm.tv/img/favicon.ico
// @match        http*://bgm.tv/*
// @match        http*://chii.in/*
// @match        http*://bangumi.tv/*
// @require      https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.js
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

const markdown = window.markdownit({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false
});

const unsafeProtocol = /^(?:javascript|vbscript|file|data):/i;
const safeImageDataProtocol = /^data:image\/(?:png|gif|jpeg|webp);/i;

markdown.validateLink = url => !unsafeProtocol.test(url) || safeImageDataProtocol.test(url);

function attr(token, name) {
  const value = token.attrGet(name);
  return value == null ? '' : value;
}

function isSafeLink(url) {
  return !unsafeProtocol.test(url);
}

function isSafeImage(url) {
  return !unsafeProtocol.test(url) || safeImageDataProtocol.test(url);
}

function headingSize(token) {
  const level = Number(String(token.tag || 'h1').replace('h', '')) || 1;
  return Math.max(16, 26 - level * 2);
}

function compactDetailsBody(value) {
  return value
    .replace(/[\t\r\f\v]+/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/ {2,}/g, '\n')
    .trim();
}

function preprocessMarkdown(source) {
  return String(source)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<details>\s*(?:<summary>([\s\S]*?)<\/summary>)?\s*([\s\S]*?)<\/details>/gi, (_match, summary = '', body = '') => {
      const title = summary.trim();
      const content = compactDetailsBody(body);
      return title
        ? `\n[color=yellowgreen]${title}[/color] [mask]${content}[/mask]\n`
        : `\n[mask]${content}[/mask]\n`;
    })
    .replace(/<mask>([\s\S]*?)<\/mask>/gi, '[mask]$1[/mask]')
    .replace(/<u>([\s\S]*?)<\/u>/gi, '[u]$1[/u]');
}

markdown.renderer.rules.text = (tokens, index) => tokens[index].content;
markdown.renderer.rules.code_inline = (tokens, index) => `[size=12][color=#666]${tokens[index].content}[/color][/size]`;
markdown.renderer.rules.code_block = (tokens, index) => `[code]${tokens[index].content.replace(/\n$/, '')}[/code]\n\n`;
markdown.renderer.rules.fence = markdown.renderer.rules.code_block;
markdown.renderer.rules.softbreak = () => '\n';
markdown.renderer.rules.hardbreak = () => '\n';

markdown.renderer.rules.strong_open = () => '[b]';
markdown.renderer.rules.strong_close = () => '[/b]';
markdown.renderer.rules.em_open = () => '[i]';
markdown.renderer.rules.em_close = () => '[/i]';
markdown.renderer.rules.s_open = () => '[s]';
markdown.renderer.rules.s_close = () => '[/s]';

markdown.renderer.rules.paragraph_open = () => '';
markdown.renderer.rules.paragraph_close = () => '\n\n';
markdown.renderer.rules.heading_open = (tokens, index) => `[b][size=${headingSize(tokens[index])}]`;
markdown.renderer.rules.heading_close = () => '[/size][/b]\n\n';

markdown.renderer.rules.link_open = (tokens, index) => {
  const href = attr(tokens[index], 'href');
  return isSafeLink(href) ? `[url=${href}]` : '';
};
markdown.renderer.rules.link_close = () => '[/url]';
markdown.renderer.rules.image = (tokens, index) => {
  const src = attr(tokens[index], 'src');
  return src && isSafeImage(src) ? `[img]${src}[/img]` : '';
};

markdown.renderer.rules.blockquote_open = () => '[quote]';
markdown.renderer.rules.blockquote_close = () => '[/quote]\n\n';

markdown.renderer.rules.bullet_list_open = (_tokens, _index, _options, env) => {
  env.listStack ??= [];
  env.listStack.push({ type: 'bullet' });
  return '';
};
markdown.renderer.rules.bullet_list_close = (_tokens, _index, _options, env) => {
  env.listStack.pop();
  return '\n';
};
markdown.renderer.rules.ordered_list_open = (tokens, index, _options, env) => {
  env.listStack ??= [];
  env.listStack.push({ type: 'ordered', next: Number(attr(tokens[index], 'start') || 1) });
  return '';
};
markdown.renderer.rules.ordered_list_close = (_tokens, _index, _options, env) => {
  env.listStack.pop();
  return '\n';
};
markdown.renderer.rules.list_item_open = (_tokens, _index, _options, env) => {
  const current = env.listStack?.[env.listStack.length - 1];
  if (!current || current.type === 'bullet') return '* ';
  const marker = `${current.next}. `;
  current.next += 1;
  return marker;
};
markdown.renderer.rules.list_item_close = () => '\n';

markdown.renderer.rules.hr = () => '___________________________________________________________________________\n\n';
markdown.renderer.rules.html_block = () => '';
markdown.renderer.rules.html_inline = () => '';
markdown.renderer.rules.table_open = () => '';
markdown.renderer.rules.table_close = () => '\n';
markdown.renderer.rules.thead_open = () => '';
markdown.renderer.rules.thead_close = () => '';
markdown.renderer.rules.tbody_open = () => '';
markdown.renderer.rules.tbody_close = () => '';
markdown.renderer.rules.tr_open = () => '';
markdown.renderer.rules.tr_close = () => '\n';
markdown.renderer.rules.th_open = () => '';
markdown.renderer.rules.th_close = () => ' | ';
markdown.renderer.rules.td_open = () => '';
markdown.renderer.rules.td_close = () => ' | ';

function normalizeBBCode(value) {
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n+\[\/quote\]/g, '[/quote]')
    .replace(/\[quote\]\n+/g, '[quote]')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function markdownToBBCode(source) {
  if (!source) return '';
  return normalizeBBCode(markdown.render(preprocessMarkdown(source), { listStack: [] }));
}

const md2bbcode = {
  markdownToBBCode
};


const SCRIPT_CLASS = 'md2bbcode';

const markdownIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4.5 6.5h15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Zm0 1.8a.2.2 0 0 0-.2.2v7a.2.2 0 0 0 .2.2h15a.2.2 0 0 0 .2-.2v-7a.2.2 0 0 0-.2-.2h-15Z"/>
    <path d="M6.2 14.3V9.7h1.45l1.35 1.7 1.35-1.7h1.45v4.6h-1.35v-2.65L9 13.45l-1.45-1.8v2.65H6.2Zm9.55 0-2.45-2.45h1.55V9.7h1.8v2.15h1.55l-2.45 2.45Z"/>
  </svg>
`;

function dispatchEditorEvents(textarea) {
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
}

function convertSelection(textarea) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const hasSelection = start !== end;
  const source = hasSelection ? textarea.value.slice(start, end) : textarea.value;
  const converted = md2bbcode.markdownToBBCode(source);

  if (hasSelection) {
    textarea.setRangeText(converted, start, end, 'select');
  } else {
    textarea.value = converted;
    textarea.setSelectionRange(0, converted.length);
  }

  textarea.focus();
  dispatchEditorEvents(textarea);
}

function createToolbarButton(className, title, icon) {
  const li = document.createElement('li');
  li.className = `markItUpButton tool-ico ${className}`;

  const button = document.createElement('a');
  button.href = 'javascript:';
  button.title = title;
  button.setAttribute('aria-label', title);
  button.innerHTML = icon;

  li.append(button);
  return li;
}

function enhanceEditor(header) {
  if (header.querySelector(`.${SCRIPT_CLASS}ConvertBtn`)) return;

  const textarea = header.parentElement?.querySelector('textarea');
  const toolbar = header.firstElementChild;
  if (!textarea || !toolbar) return;

  const convertBtn = createToolbarButton(
    `${SCRIPT_CLASS}ConvertBtn`,
    'Markdown 转 BBCode（有选区时只转换选区）',
    markdownIcon
  );

  convertBtn.addEventListener('click', event => {
    event.preventDefault();
    convertSelection(textarea);
  });

  toolbar.append(convertBtn);
}

function enhanceAllEditors() {
  document.querySelectorAll('.markItUpHeader').forEach(enhanceEditor);
}

function injectStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .${SCRIPT_CLASS}ConvertBtn a {
      display: inline-flex !important;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      box-sizing: border-box;
      text-indent: 0 !important;
      background-image: none !important;
      color: currentColor;
      opacity: .72;
    }
    .${SCRIPT_CLASS}ConvertBtn a:hover {
      opacity: 1;
    }
    .${SCRIPT_CLASS}ConvertBtn svg {
      display: block;
      width: 21px;
      height: 21px;
      fill: currentColor;
      pointer-events: none;
    }
  `;
  document.head.append(style);
}

injectStyle();
enhanceAllEditors();

new MutationObserver(enhanceAllEditors).observe(document.body, { childList: true, subtree: true });

})();
