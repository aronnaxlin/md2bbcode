import MarkdownIt from 'markdown-it';
import { imageUploadBBCodeTags, preprocessImageUploadHtmlImage, renderImageUploadPhoto } from '../compatible/image_upload.js';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false
});

const markdownDetector = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: false,
  typographer: false
});

const protectableBBCodeTags = [
  'b',
  'i',
  'u',
  's',
  'url',
  'img',
  'quote',
  'code',
  'mask',
  'spoiler',
  'color',
  'size',
  'font',
  'align',
  'left',
  'center',
  'right',
  'list',
  'ul',
  'ol',
  'olist',
  ...imageUploadBBCodeTags
];

const knownBBCodeAttrTags = [
  'url',
  'img',
  'quote',
  'code',
  'color',
  'size',
  'align',
  ...imageUploadBBCodeTags
];

const unsafeProtocol = /^(?:javascript|vbscript|file|data):/i;
const safeImageDataProtocol = /^data:image\/(?:png|gif|jpeg|webp);/i;
const knownBBCodePattern = new RegExp(`\\[(?:\\/?(?:${protectableBBCodeTags.join('|')}|\\*)|(?:${knownBBCodeAttrTags.join('|')})=[^\\]]+)\\]`, 'i');
const knownBBCodeGlobalPattern = new RegExp(knownBBCodePattern.source, 'gi');
const inlineCodeSize = '12';

markdown.validateLink = url => !unsafeProtocol.test(url) || safeImageDataProtocol.test(url);
markdown.normalizeLink = url => url;

function attr(token, name) {
  const value = token.attrGet(name);
  return value == null ? '' : value;
}

function isSafeLink(url) {
  return !unsafeProtocol.test(url) || safeImageDataProtocol.test(url);
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

function parseHtmlAttribute(source, name) {
  const match = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))`, 'i').exec(source);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
}

function parseImageSizeAttr(value) {
  const match = /^\s*(\d+)\s*,\s*(\d+)\s*$/.exec(stripWrappingQuotes(value));
  if (!match) return null;

  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return null;

  return { width, height };
}

function protectPreprocessedBBCode(protectedSnippets, value) {
  protectedSnippets.push(value);
  return `MD2BBCODE_PLACEHOLDER_${protectedSnippets.length - 1}_TOKEN`;
}

function restorePreprocessedBBCode(value, protectedSnippets) {
  return String(value).replace(/MD2BBCODE_PLACEHOLDER_(\d+)_TOKEN/g, (_match, index) => protectedSnippets[Number(index)] || '');
}

function protectMarkdownCodeContents(source, protectedSnippets) {
  let result = String(source).replace(
    /(^|\n)([ \t]*)(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n\2\3[ \t]*(?=\n|$)/g,
    (_match, prefix, indent, fence, info, content) => `${prefix}${indent}${fence}${info}
${protectPreprocessedBBCode(protectedSnippets, content)}
${indent}${fence}`
  );

  result = result.replace(/(^|[^`])(`+)([^`\n]*?)\2(?!`)/g, (_match, prefix, marker, content) => `${prefix}${marker}${protectPreprocessedBBCode(protectedSnippets, content)}${marker}`);
  return result;
}

function protectExistingBBCode(source, protectedSnippets) {
  const tagPattern = protectableBBCodeTags.join('|');
  const blockPattern = new RegExp(`\\[(${tagPattern})(?:=[^\\]]*)?\\][\\s\\S]*?\\[/\\1\\]`, 'gi');
  return source.replace(blockPattern, (match, tag) => {
    let cleaned = match;
    const normalizedTag = tag.toLowerCase();
    if (normalizedTag === 'quote' || normalizedTag === 'code') {
      cleaned = match.replace(new RegExp(`\\[${tag}=[^\\]]*\\]`, 'gi'), `[${tag}]`);
    }
    return protectPreprocessedBBCode(protectedSnippets, cleaned);
  });
}

function replaceInnermostTag(source, openTag, closeTag, processor) {
  let result = source;
  while (true) {
    let closeIndex = result.indexOf(closeTag);
    if (closeIndex === -1) break;

    // Find the nearest opening tag before this closing tag
    let openIndex = -1;
    let depth = 0;
    for (let i = closeIndex - 1; i >= 0; i -= 1) {
      if (result.startsWith(closeTag, i)) {
        depth += 1;
      } else if (result.startsWith(openTag, i)) {
        if (depth === 0) {
          openIndex = i;
          break;
        }
        depth -= 1;
      }
    }

    if (openIndex === -1) break;

    const fullMatch = result.slice(openIndex, closeIndex + closeTag.length);
    const replacement = processor(fullMatch, openIndex);
    if (replacement === fullMatch) break;

    result = result.slice(0, openIndex) + replacement + result.slice(closeIndex + closeTag.length);
  }
  return result;
}

function preprocessMarkdown(source) {
  const protectedSnippets = [];
  let result = protectMarkdownCodeContents(
    String(source).replace(/<!--[\s\S]*?-->/g, ''),
    protectedSnippets
  );

  result = result.replace(/<img\b[^>]*>/gi, fullMatch => {
    const imageUploadBBCode = preprocessImageUploadHtmlImage(fullMatch);
    if (imageUploadBBCode) {
      return protectPreprocessedBBCode(protectedSnippets, imageUploadBBCode);
    }

    const src = parseHtmlAttribute(fullMatch, 'src').trim();
    if (!src || !isSafeImage(src)) return fullMatch;

    const width = parseHtmlAttribute(fullMatch, 'width').trim();
    const height = parseHtmlAttribute(fullMatch, 'height').trim();
    if (/^\d+$/.test(width) && /^\d+$/.test(height)) {
      return protectPreprocessedBBCode(protectedSnippets, `[img=${width},${height}]${src}[/img]`);
    }

    return protectPreprocessedBBCode(protectedSnippets, `[img]${src}[/img]`);
  });

  result = protectExistingBBCode(result, protectedSnippets);

  // Process nested <details> from innermost to outermost
  result = replaceInnermostTag(result, '<details', '</details>', (fullMatch) => {
    const summaryMatch = fullMatch.match(/<details>\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*)<\/details>/i);
    if (summaryMatch) {
      const title = summaryMatch[1].trim();
      const content = compactDetailsBody(summaryMatch[2]);
      return title
        ? `\n[color=yellowgreen]${title}[/color] [mask]${content}[/mask]\n`
        : `\n[mask]${content}[/mask]\n`;
    }
    const noSummaryMatch = fullMatch.match(/<details>\s*([\s\S]*?)<\/details>/i);
    if (noSummaryMatch) {
      return `\n[mask]${compactDetailsBody(noSummaryMatch[1])}[/mask]\n`;
    }
    return fullMatch;
  });

  // Process nested <span style=...> from innermost to outermost
  result = replaceInnermostTag(result, '<span', '</span>', (fullMatch) => {
    const openMatch = fullMatch.match(/^<span\s+style=(["'])([^"']*?)\1\s*>([\s\S]*)<\/span>$/i);
    if (!openMatch) return fullMatch;
    const style = openMatch[2];
    const content = openMatch[3];

    const color = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim();
    const size = /(?:^|;)\s*font-size\s*:\s*([0-9.]+)(?:px)?/i.exec(style)?.[1]?.trim();
    let value = content;
    if (size) value = `[size=${size}]${value}[/size]`;
    if (color) value = `[color=${color}]${value}[/color]`;
    return value;
  });

  return {
    text: result
    .replace(/<div\s+align=(["']?)(left|center|right)\1\s*>([\s\S]*?)<\/div>/gi, '[$2]$3[/$2]')
    .replace(/<spoiler>([\s\S]*?)<\/spoiler>/gi, '[mask]$1[/mask]')
    .replace(/<mask>([\s\S]*?)<\/mask>/gi, '[mask]$1[/mask]')
    .replace(/<u>([\s\S]*?)<\/u>/gi, '[u]$1[/u]'),
    protectedSnippets
  };
}

markdown.renderer.rules.text = (tokens, index) => tokens[index].content;
markdown.renderer.rules.code_inline = (tokens, index) => `[size=${inlineCodeSize}]${tokens[index].content}[/size]`;
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

const bbcodeTagPattern = /\[(\/)?([a-z*]+)(?:=([^\]]*))?\]/gi;
const headingSizeRanges = [
  { min: 24, marker: '#' },
  { min: 22, marker: '##' },
  { min: 20, marker: '###' },
  { min: 18, marker: '####' },
  { min: 16, marker: '#####' }
];

function createRootNode() {
  return { type: 'root', children: [] };
}

function createTextNode(value) {
  return { type: 'text', value };
}

function createTagNode(name, attr, rawOpen) {
  return {
    type: 'tag',
    name: normalizeBBCodeTagName(name),
    attr,
    rawOpen,
    children: []
  };
}

function normalizeBBCodeTagName(name) {
  const normalized = String(name).toLowerCase();
  return normalized === '*' ? 'li' : normalized;
}

function serializeBBCodeNode(node) {
  if (node.type === 'text') return node.value;
  if (node.type === 'root') return node.children.map(serializeBBCodeNode).join('');
  if (node.name === 'li') return `[*]${node.children.map(serializeBBCodeNode).join('')}`;
  return `${node.rawOpen}${node.children.map(serializeBBCodeNode).join('')}[/${node.name}]`;
}

function parseBBCode(source) {
  const root = createRootNode();
  const stack = [root];
  let lastIndex = 0;
  let match;

  bbcodeTagPattern.lastIndex = 0;
  while ((match = bbcodeTagPattern.exec(source))) {
    if (match.index > lastIndex) {
      stack[stack.length - 1].children.push(createTextNode(source.slice(lastIndex, match.index)));
    }

    const [raw, closing, rawName, attr] = match;
    const name = normalizeBBCodeTagName(rawName);

    if (closing) {
      let openIndex = -1;
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].type === 'tag' && stack[index].name === name) {
          openIndex = index;
          break;
        }
      }

      while (openIndex > 0 && stack.length - 1 > openIndex && stack[stack.length - 1].name === 'li') {
        stack.pop();
      }

      if (openIndex === stack.length - 1) {
        stack.pop();
      } else {
        stack[stack.length - 1].children.push(createTextNode(raw));
      }
    } else {
      if (name === 'li' && stack[stack.length - 1].name === 'li') {
        stack.pop();
      }
      const node = createTagNode(name, attr ?? '', raw);
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < source.length) {
    stack[stack.length - 1].children.push(createTextNode(source.slice(lastIndex)));
  }

  while (stack.length > 1) {
    const dangling = stack.pop();
    const parent = stack[stack.length - 1];
    if (parent.children[parent.children.length - 1] === dangling) {
      parent.children.pop();
      parent.children.push(createTextNode(serializeBBCodeNode(dangling)));
    }
  }

  return root;
}

function renderChildrenAsMarkdown(children) {
  return children.map(renderBBCodeNodeAsMarkdown).join('');
}

function trimOuterBlankLines(value) {
  return value.replace(/^\n+|\n+$/g, '');
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function stripWrappingQuotes(value) {
  return String(value).trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
}

function escapeMarkdownLinkLabel(value) {
  return value.replace(/([\\\[\]])/g, '\\$1');
}

function formatMarkdownDestination(value) {
  const href = String(value).trim();
  if (!href) return '';
  return /[\s()<>]/.test(href) ? `<${href.replace(/>/g, '%3E')}>` : href;
}

function wrapMarkdown(value, marker) {
  if (!value) return '';
  const leading = /^\s*/.exec(value)[0];
  const trailing = /\s*$/.exec(value)[0];
  const core = value.slice(leading.length, value.length - trailing.length);
  return core ? `${leading}${marker}${core}${marker}${trailing}` : value;
}

function renderQuote(value, attr) {
  const content = value.trim();
  if (!content) return '';
  const cite = stripWrappingQuotes(attr);
  const quoteBody = cite ? `**${cite}:**\n${content}` : content;
  return quoteBody
    .split('\n')
    .map(line => `> ${line}`)
    .join('\n');
}

function renderCodeBlock(value, attr) {
  const content = trimOuterBlankLines(value);
  const language = stripWrappingQuotes(attr).replace(/[^a-z0-9_+.-]/gi, '');
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

function renderCodeNode(node) {
  return renderCodeBlock(node.children.map(serializeBBCodeNode).join(''), node.attr);
}

function renderUrl(value, attr) {
  const href = attr || value.trim();
  const destination = formatMarkdownDestination(href);
  return destination ? `[${escapeMarkdownLinkLabel(value)}](${destination})` : value;
}

function renderImage(node, value) {
  const src = value.trim();
  const destination = formatMarkdownDestination(src);
  if (!destination) return '';

  const size = parseImageSizeAttr(node.attr);
  if (!size) return `![](${destination})`;

  return `<img src="${escapeHtmlAttribute(src)}" width="${size.width}" height="${size.height}" />`;
}

function renderHeadingSize(node, value) {
  const numericSize = Number.parseFloat(stripWrappingQuotes(node.attr));
  const marker = Number.isFinite(numericSize)
    ? headingSizeRanges.find(range => numericSize >= range.min)?.marker
    : '';
  return marker ? `${marker} ${value.trim()}` : '';
}

function isInlineCodeColor(value) {
  const normalized = stripWrappingQuotes(value).toLowerCase();
  return normalized === '#333' || normalized === '#333333' || normalized === '#666' || normalized === '#666666';
}

function renderSize(node, value) {
  const size = stripWrappingQuotes(node.attr);
  if (size === inlineCodeSize) {
    if (node.children.length === 1 && node.children[0].type === 'tag' && node.children[0].name === 'color') {
      if (isInlineCodeColor(node.children[0].attr)) {
        return `\`${renderChildrenAsMarkdown(node.children[0].children)}\``;
      }
    }
    if (node.children.length === 1 && node.children[0].type === 'text') {
      return `\`${node.children[0].value}\``;
    }
  }

  return size ? `<span style="font-size: ${escapeHtmlAttribute(size)}px">${value}</span>` : value;
}

function renderColor(node, value) {
  const color = stripWrappingQuotes(node.attr);
  if (isInlineCodeColor(color)) {
    return `\`${value}\``;
  }
  return color ? `<span style="color: ${escapeHtmlAttribute(color)}">${value}</span>` : value;
}

function renderAligned(attr, value) {
  const align = stripWrappingQuotes(attr).toLowerCase();
  return align ? `<div align="${escapeHtmlAttribute(align)}">${trimOuterBlankLines(value)}</div>` : value;
}

function renderStrong(node, value) {
  const onlyChild = node.children.length === 1 ? node.children[0] : null;
  if (onlyChild?.type === 'tag' && onlyChild.name === 'size') {
    const heading = renderHeadingSize(onlyChild, renderChildrenAsMarkdown(onlyChild.children));
    return heading || wrapMarkdown(renderSize(onlyChild, renderChildrenAsMarkdown(onlyChild.children)), '**');
  }
  return wrapMarkdown(value, '**');
}

function renderList(node, ordered) {
  let index = 1;
  const lines = [];

  for (const child of node.children) {
    if (child.type === 'text') {
      const text = child.value.trim();
      if (text) lines.push(text);
      continue;
    }

    if (child.type !== 'tag' || child.name !== 'li') {
      const value = renderBBCodeNodeAsMarkdown(child).trim();
      if (value) lines.push(value);
      continue;
    }

    const value = renderChildrenAsMarkdown(child.children)
      .trim()
      .replace(/\n/g, '\n  ');
    if (!value) continue;

    const marker = ordered ? `${index}. ` : '- ';
    lines.push(`${marker}${value}`);
    index += 1;
  }

  return lines.join('\n');
}

function renderBBCodeNodeAsMarkdown(node) {
  if (node.type === 'text') return node.value;
  if (node.type === 'root') return renderChildrenAsMarkdown(node.children);

  const value = renderChildrenAsMarkdown(node.children);

  switch (node.name) {
    case 'b':
      return renderStrong(node, value);
    case 'i':
      return wrapMarkdown(value, '*');
    case 'u':
      return `<u>${value}</u>`;
    case 's':
      return wrapMarkdown(value, '~~');
    case 'url':
      return renderUrl(value, node.attr);
    case 'email':
      return renderUrl(value, `mailto:${node.attr || value.trim()}`);
    case 'img':
      return renderImage(node, value);
    case 'photo':
      return renderImageUploadPhoto(node, value);
    case 'quote':
      return renderQuote(value, node.attr);
    case 'code':
      return renderCodeNode(node);
    case 'mask':
      return `<mask>${value}</mask>`;
    case 'spoiler':
      return `<spoiler>${value}</spoiler>`;
    case 'size':
      return renderSize(node, value);
    case 'color':
      return renderColor(node, value);
    case 'align':
      return renderAligned(node.attr, value);
    case 'left':
    case 'center':
    case 'right':
      return renderAligned(node.name, value);
    case 'list':
      return renderList(node, ['1', 'decimal', 'number', 'ordered', 'ol'].includes(stripWrappingQuotes(node.attr).toLowerCase()));
    case 'ul':
      return renderList(node, false);
    case 'ol':
      return renderList(node, true);
    case 'li':
      return `- ${value.trim()}`;
    default:
      return serializeBBCodeNode(node);
  }
}

function normalizeMarkdown(value) {
  return value
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function scoreMarkdownInlineChildren(children) {
  let score = 0;

  for (const child of children || []) {
    switch (child.type) {
      case 'image':
        score += 3;
        break;
      case 'link_open':
        score += 3;
        break;
      case 'code_inline':
        score += 2;
        break;
      case 'strong_open':
      case 's_open':
        score += 2;
        break;
      case 'em_open':
        score += 1;
        break;
      default:
        break;
    }
  }

  return score;
}

function removeKnownBBCodeForDetection(source) {
  const protectedSnippets = [];
  return protectExistingBBCode(String(source), protectedSnippets)
    .replace(knownBBCodeGlobalPattern, ' ')
    .replace(/MD2BBCODE_PLACEHOLDER_\d+_TOKEN/g, ' ');
}

export function looksLikeMarkdown(source) {
  const text = removeKnownBBCodeForDetection(source).trim();
  if (!text || text.length < 6) return false;

  const tokens = markdownDetector.parse(text, {});
  let score = 0;

  for (const token of tokens) {
    switch (token.type) {
      case 'heading_open':
      case 'fence':
      case 'code_block':
      case 'table_open':
        score += 3;
        break;
      case 'blockquote_open':
      case 'bullet_list_open':
      case 'ordered_list_open':
      case 'hr':
        score += 2;
        break;
      case 'inline':
        score += scoreMarkdownInlineChildren(token.children);
        break;
      default:
        break;
    }

    if (score >= 2) return true;
  }

  return false;
}

// ===== Chat (Re:Dollars) limited converter =====
// Re:Dollars only supports: [b], [i], [u], [s], [code], [url], [mask]

const chatMarkdown = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: false,
  typographer: false
});

chatMarkdown.validateLink = markdown.validateLink;
chatMarkdown.normalizeLink = markdown.normalizeLink;

// Copy all renderer rules from the full markdown instance
Object.assign(chatMarkdown.renderer.rules, markdown.renderer.rules);

// Override block-level rules: unsupported formats degrade to plain text
chatMarkdown.renderer.rules.paragraph_open = () => '';
chatMarkdown.renderer.rules.paragraph_close = () => '\n';
chatMarkdown.renderer.rules.heading_open = () => '';
chatMarkdown.renderer.rules.heading_close = () => '\n';
chatMarkdown.renderer.rules.blockquote_open = () => '';
chatMarkdown.renderer.rules.blockquote_close = () => '\n';
chatMarkdown.renderer.rules.bullet_list_open = () => '';
chatMarkdown.renderer.rules.bullet_list_close = () => '';
chatMarkdown.renderer.rules.ordered_list_open = () => '';
chatMarkdown.renderer.rules.ordered_list_close = () => '';
chatMarkdown.renderer.rules.list_item_open = () => '';
chatMarkdown.renderer.rules.list_item_close = () => '\n';
chatMarkdown.renderer.rules.hr = () => '';
chatMarkdown.renderer.rules.html_block = () => '';
chatMarkdown.renderer.rules.html_inline = () => '';
chatMarkdown.renderer.rules.image = (tokens, index) => {
  const src = attr(tokens[index], 'src');
  const destination = formatMarkdownDestination(src);
  return destination ? `![${escapeMarkdownLinkLabel(tokens[index].content || '')}](${destination})` : '';
};
chatMarkdown.renderer.rules.table_open = () => '';
chatMarkdown.renderer.rules.table_close = () => '';
chatMarkdown.renderer.rules.thead_open = () => '';
chatMarkdown.renderer.rules.thead_close = () => '';
chatMarkdown.renderer.rules.tbody_open = () => '';
chatMarkdown.renderer.rules.tbody_close = () => '';
chatMarkdown.renderer.rules.tr_open = () => '';
chatMarkdown.renderer.rules.tr_close = () => '';
chatMarkdown.renderer.rules.th_open = () => '';
chatMarkdown.renderer.rules.th_close = () => '';
chatMarkdown.renderer.rules.td_open = () => '';
chatMarkdown.renderer.rules.td_close = () => '';

// Inline code -> [code]
chatMarkdown.renderer.rules.code_inline = (tokens, index) => `[code]${tokens[index].content}[/code]`;

function renderBBCodeNodeAsMarkdownChat(node) {
  if (node.type === 'text') return node.value;
  if (node.type === 'root') return node.children.map(renderBBCodeNodeAsMarkdownChat).join('');

  const value = node.children.map(renderBBCodeNodeAsMarkdownChat).join('');

  switch (node.name) {
    case 'b':
      return wrapMarkdown(value, '**');
    case 'i':
      return wrapMarkdown(value, '*');
    case 'u':
      return `<u>${value}</u>`;
    case 's':
      return wrapMarkdown(value, '~~');
    case 'url':
      return renderUrl(value, node.attr);
    case 'code':
      return renderCodeNode(node);
    case 'mask':
      return `<mask>${value}</mask>`;
    case 'li':
      return `- ${value.trim()}`;
    default:
      return serializeBBCodeNode(node);
  }
}

export function bbcodeToMarkdown(source) {
  if (!source) return '';
  // Protect Markdown link syntax [text](url) so the BBCode parser doesn't
  // misidentify [text] as a BBCode tag.
  const protectedLinks = [];
  const protectedSource = String(source).replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match) => {
    protectedLinks.push(match);
    return `\x00LINK${protectedLinks.length - 1}\x00`;
  });
  const converted = normalizeMarkdown(renderBBCodeNodeAsMarkdown(parseBBCode(protectedSource)));
  return converted.replace(/\x00LINK(\d+)\x00/g, (_m, index) => protectedLinks[Number(index)]);
}

export function markdownToBBCode(source) {
  if (!source) return '';
  const preprocessed = preprocessMarkdown(source);
  const rendered = markdown.render(preprocessed.text, { listStack: [] });
  return normalizeBBCode(restorePreprocessedBBCode(rendered, preprocessed.protectedSnippets));
}

export function bbcodeToMarkdownChat(source) {
  if (!source) return '';
  return normalizeMarkdown(renderBBCodeNodeAsMarkdownChat(parseBBCode(String(source))));
}

export function markdownToBBCodeChat(source) {
  if (!source) return '';
  const preprocessed = preprocessMarkdown(source);
  const rendered = chatMarkdown.render(preprocessed.text);
  return normalizeBBCode(restorePreprocessedBBCode(rendered, preprocessed.protectedSnippets));
}

export const md2bbcode = {
  markdownToBBCode,
  bbcodeToMarkdown,
  markdownToBBCodeChat,
  bbcodeToMarkdownChat,
  looksLikeMarkdown
};
