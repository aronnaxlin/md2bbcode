import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({
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

export function markdownToBBCode(source) {
  if (!source) return '';
  return normalizeBBCode(markdown.render(preprocessMarkdown(source), { listStack: [] }));
}

export const md2bbcode = {
  markdownToBBCode
};
