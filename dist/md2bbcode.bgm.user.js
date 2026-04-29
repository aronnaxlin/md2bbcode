// ==UserScript==
// @name         Bangumi Markdown 转 BBCode
// @namespace    bangumi.md2bbcode
// @version      0.0.3
// @description  为 Bangumi 编辑器添加 Markdown 转 BBCode
// @author       aronnax
// @icon         https://bgm.tv/img/favicon.ico
// @match        *://bgm.tv/*
// @match        *://chii.in/*
// @match        *://bangumi.tv/*
// @gf
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const markdownItUrl = 'https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.js';
  let markdownItLoadPromise;

  function loadScript(src) {
    if (window.markdownit) return Promise.resolve();
    if (markdownItLoadPromise) return markdownItLoadPromise;

    markdownItLoadPromise = new Promise((resolve, reject) => {
      if (window.$ && typeof window.$.getScript === 'function') {
        const request = window.$.getScript(src, resolve);
        if (request && typeof request.done === 'function') {
          request.done(resolve);
        }
        if (request && typeof request.fail === 'function') {
          request.fail((_jqxhr, _settings, error) => {
            reject(error || new Error('failed to load ' + src));
          });
        }
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('failed to load ' + src));
      document.head.appendChild(script);
    });

    return markdownItLoadPromise;
  }

  loadScript(markdownItUrl).then(() => {
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
      let result = String(source)
        .replace(/<!--[\s\S]*?-->/g, '');
    
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
        const family = /(?:^|;)\s*font-family\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim();
    
        let value = content;
        if (family) value = `[font=${family.replace(/^["']|["']$/g, '')}]${value}[/font]`;
        if (size) value = `[size=${size}]${value}[/size]`;
        if (color) value = `[color=${color}]${value}[/color]`;
        return value;
      });
    
      return result
        .replace(/<div\s+align=(["']?)(left|center|right)\1\s*>([\s\S]*?)<\/div>/gi, '[$2]$3[/$2]')
        .replace(/<spoiler>([\s\S]*?)<\/spoiler>/gi, '[mask]$1[/mask]')
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
    
    function renderUrl(value, attr) {
      const href = attr || value.trim();
      const destination = formatMarkdownDestination(href);
      return destination ? `[${escapeMarkdownLinkLabel(value)}](${destination})` : value;
    }
    
    function renderImage(value) {
      const src = value.trim();
      const destination = formatMarkdownDestination(src);
      return destination ? `![](${destination})` : '';
    }
    
    function renderHeadingSize(node, value) {
      const numericSize = Number.parseFloat(stripWrappingQuotes(node.attr));
      const marker = Number.isFinite(numericSize)
        ? headingSizeRanges.find(range => numericSize >= range.min)?.marker
        : '';
      return marker ? `${marker} ${value.trim()}` : '';
    }
    
    function renderSize(node, value) {
      const size = stripWrappingQuotes(node.attr);
      if (size === '12' && node.children.length === 1 && node.children[0].type === 'tag' && node.children[0].name === 'color') {
        const color = stripWrappingQuotes(node.children[0].attr).toLowerCase();
        if (color === '#666' || color === '#666666') {
          return `\`${renderChildrenAsMarkdown(node.children[0].children)}\``;
        }
      }
    
      return size ? `<span style="font-size: ${escapeHtmlAttribute(size)}px">${value}</span>` : value;
    }
    
    function renderColor(node, value) {
      const color = stripWrappingQuotes(node.attr);
      const normalized = color.toLowerCase();
      if (normalized === '#666' || normalized === '#666666') {
        return `\`${value}\``;
      }
      return color ? `<span style="color: ${escapeHtmlAttribute(color)}">${value}</span>` : value;
    }
    
    function renderFont(node, value) {
      const family = stripWrappingQuotes(node.attr);
      return family ? `<span style="font-family: ${escapeHtmlAttribute(family)}">${value}</span>` : value;
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
          return renderImage(value);
        case 'quote':
          return renderQuote(value, node.attr);
        case 'code':
          return renderCodeBlock(value, node.attr);
        case 'mask':
          return `<mask>${value}</mask>`;
        case 'spoiler':
          return `<spoiler>${value}</spoiler>`;
        case 'size':
          return renderSize(node, value);
        case 'color':
          return renderColor(node, value);
        case 'font':
          return renderFont(node, value);
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
        case 'olist':
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
    
    // ===== Chat (Re:Dollars) limited converter =====
    // Re:Dollars only supports: [b], [i], [u], [s], [code], [url], [mask]
    
    const chatMarkdown = window.markdownit({
      html: false,
      linkify: false,
      breaks: false,
      typographer: false
    });
    
    chatMarkdown.validateLink = markdown.validateLink;
    
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
          return renderCodeBlock(value, node.attr);
        case 'mask':
          return `<mask>${value}</mask>`;
        case 'li':
          return `- ${value.trim()}`;
        default:
          return serializeBBCodeNode(node);
      }
    }
    
    function bbcodeToMarkdown(source) {
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
    
    function markdownToBBCode(source) {
      if (!source) return '';
      return normalizeBBCode(markdown.render(preprocessMarkdown(source), { listStack: [] }));
    }
    
    function bbcodeToMarkdownChat(source) {
      if (!source) return '';
      return normalizeMarkdown(renderBBCodeNodeAsMarkdownChat(parseBBCode(String(source))));
    }
    
    function markdownToBBCodeChat(source) {
      if (!source) return '';
      return normalizeBBCode(chatMarkdown.render(preprocessMarkdown(source)));
    }
    
    const md2bbcode = {
      markdownToBBCode,
      bbcodeToMarkdown,
      markdownToBBCodeChat,
      bbcodeToMarkdownChat
    };
    

    const SCRIPT_CLASS = 'md2bbcode';
    const STORAGE_KEY = 'md2bbcode_settings';
    const COOKIE_KEYS = {
      chatButtons: 'md2bbcode_chat',
      toolbarButtons: 'md2bbcode_toolbar'
    };
    
    function getLocalStorage() {
      try {
        return window.localStorage;
      } catch {
        return null;
      }
    }
    
    function getCookie(name) {
      try {
        if (window.$ && typeof window.$.cookie === 'function') {
          return window.$.cookie(name);
        }
      } catch {
        // Fall through to document.cookie.
      }
    
      try {
        const prefix = `${encodeURIComponent(name)}=`;
        const item = document.cookie.split('; ').find(cookie => cookie.startsWith(prefix));
        return item ? decodeURIComponent(item.slice(prefix.length)) : undefined;
      } catch {
        return undefined;
      }
    }
    
    function setCookie(name, value) {
      try {
        if (window.$ && typeof window.$.cookie === 'function') {
          window.$.cookie(name, value, { expires: 365, path: '/' });
          return;
        }
      } catch {
        // Fall through to document.cookie.
      }
    
      try {
        document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=31536000; path=/`;
      } catch {
        // Ignore unavailable cookie storage.
      }
    }
    
    function loadSettings() {
      const storage = getLocalStorage();
      if (!storage) return {};
    
      try {
        return JSON.parse(storage.getItem(STORAGE_KEY)) || {};
      } catch {
        return {};
      }
    }
    
    function saveSettings(settings) {
      const storage = getLocalStorage();
      if (!storage) return;
    
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Ignore unavailable localStorage in component sandboxes.
      }
    }
    
    function getSetting(key, defaultValue) {
      const cookieValue = getCookie(COOKIE_KEYS[key] || key);
      if (cookieValue != null && cookieValue !== '') return cookieValue;
      return loadSettings()[key] ?? defaultValue;
    }
    
    function setSetting(key, value) {
      setCookie(COOKIE_KEYS[key] || key, value);
    
      const settings = loadSettings();
      settings[key] = value;
      saveSettings(settings);
    }
    
    const markdownIcon = `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M3.2 4.6c0-.66.54-1.2 1.2-1.2h11.2c.66 0 1.2.54 1.2 1.2v10.8c0 .66-.54 1.2-1.2 1.2H4.4c-.66 0-1.2-.54-1.2-1.2V4.6Zm1.8.6v9.6h10V5.2H5Z"/>
        <path d="M6.1 13.1V6.9h1.75L10 9.62l2.15-2.72h1.75v6.2h-1.75V9.78L10 12.32 7.85 9.78v3.32H6.1Z"/>
      </svg>
    `;
    
    const bbcodeIcon = `
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        <path d="M3.2 4.6c0-.66.54-1.2 1.2-1.2h11.2c.66 0 1.2.54 1.2 1.2v10.8c0 .66-.54 1.2-1.2 1.2H4.4c-.66 0-1.2-.54-1.2-1.2V4.6Zm1.8.6v9.6h10V5.2H5Z"/>
        <path d="M6.2 12.9v-6h2.72c.65 0 1.16.15 1.52.45.37.29.55.7.55 1.22 0 .3-.08.57-.24.8-.16.22-.38.39-.65.5.36.09.65.26.86.52.21.25.32.56.32.93 0 .5-.18.89-.53 1.17-.35.27-.84.41-1.49.41H6.2Zm1.5-3.55h1.04c.49 0 .73-.22.73-.66 0-.41-.24-.62-.73-.62H7.7v1.28Zm0 2.38h1.28c.53 0 .8-.22.8-.67 0-.43-.27-.65-.8-.65H7.7v1.32Z"/>
      </svg>
    `;
    
    function dispatchEditorEvents(textarea) {
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    async function convertSelection(textarea, direction) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const hasSelection = start !== end;
      const source = hasSelection ? textarea.value.slice(start, end) : textarea.value;
      const converter = direction === 'bbcode-to-markdown'
        ? md2bbcode.bbcodeToMarkdown
        : md2bbcode.markdownToBBCode;
      const converted = await Promise.resolve(converter(source));
    
      if (hasSelection) {
        textarea.setRangeText(converted, start, end, 'select');
      } else {
        textarea.value = converted;
        textarea.setSelectionRange(0, converted.length);
      }
    
      textarea.focus();
      dispatchEditorEvents(textarea);
    }
    
    async function convertContentEditable(editor, direction, chatMode = false) {
      const selection = window.getSelection();
      let source = '';
      let hasSelection = false;
      let range = null;
    
      if (selection && selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
        // Only use selection if it's inside this editor
        if (editor.contains(range.commonAncestorContainer)) {
          hasSelection = !range.collapsed;
          if (hasSelection) {
            source = range.toString();
          }
        }
      }
    
      if (!hasSelection) {
        source = editor.innerText;
      }
    
      const converter = direction === 'bbcode-to-markdown'
        ? (chatMode ? md2bbcode.bbcodeToMarkdownChat : md2bbcode.bbcodeToMarkdown)
        : (chatMode ? md2bbcode.markdownToBBCodeChat : md2bbcode.markdownToBBCode);
      const converted = await Promise.resolve(converter(source));
    
      if (hasSelection && range) {
        range.deleteContents();
        range.insertNode(document.createTextNode(converted));
        // Collapse selection to end of inserted text
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        editor.innerText = converted;
      }
    
      editor.focus();
      // Trigger input event on the associated proxy textarea if any
      const proxy = editor.parentElement?.querySelector('.chat-textarea-proxy');
      if (proxy) {
        proxy.value = editor.innerText;
        dispatchEditorEvents(proxy);
      }
      // Also dispatch input on the editor itself for good measure
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    function createToolbarButton(className, title, icon) {
      const li = document.createElement('li');
      li.className = `markItUpButton tool_ico ${className}`;
      li.setAttribute('data-md2bbcode-toolbar', 'true');
    
      const button = document.createElement('a');
      button.href = '#';
      button.role = 'button';
      button.title = title;
      button.setAttribute('aria-label', title);
      button.innerHTML = icon;
    
      li.append(button);
      return li;
    }
    
    function createChatButton(className, title, icon) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `${SCRIPT_CLASS}ChatBtn ${className}`;
      button.title = title;
      button.setAttribute('aria-label', title);
      button.setAttribute('data-md2bbcode', 'true');
      button.innerHTML = icon;
      return button;
    }
    
    function bindConvertButton(button, textarea, direction) {
      button.addEventListener('click', async event => {
        event.preventDefault();
        if (button.classList.contains(`${SCRIPT_CLASS}Loading`)) return;
    
        button.classList.add(`${SCRIPT_CLASS}Loading`);
        try {
          await convertSelection(textarea, direction);
        } catch (error) {
          console.error('[md2bbcode] failed to convert text', error);
        } finally {
          button.classList.remove(`${SCRIPT_CLASS}Loading`);
        }
      });
    }
    
    
    function addConversionButtons(toolbar, textarea) {
      if (toolbar.querySelector('[data-md2bbcode-toolbar="true"]')) return;
    
      const mode = getSetting('toolbarButtons', 'both');
      if (mode === 'none') return;
    
      const convertBtn = createToolbarButton(
        `${SCRIPT_CLASS}ConvertBtn`,
        'Markdown 转 BBCode（有选区时只转换选区）',
        markdownIcon
      );
      bindConvertButton(convertBtn, textarea, 'markdown-to-bbcode');
    
      const cleanBtn = Array.from(toolbar.children).find(child => child.classList?.contains('tool_clean'));
      if (cleanBtn) {
        toolbar.insertBefore(convertBtn, cleanBtn);
      } else {
        toolbar.append(convertBtn);
      }
    
      if (mode === 'both') {
        const reverseBtn = createToolbarButton(
          `${SCRIPT_CLASS}ReverseBtn`,
          'BBCode 转 Markdown（有选区时只转换选区）',
          bbcodeIcon
        );
        bindConvertButton(reverseBtn, textarea, 'bbcode-to-markdown');
        toolbar.insertBefore(reverseBtn, convertBtn.nextSibling);
      }
    }
    
    function addChatConversionButtons(editor) {
      if (editor.dataset.md2bbcodeEnhanced === 'true') return;
    
      // Find the chat window header buttons area
      // The chat window wrapper is typically #dollars-chat-window or .dollars-chat-window
      // Note: closest() returns the nearest ancestor, so we walk up manually to ensure
      // we find the outer chat window rather than an inner container like #dollars-main-chat.
      let chatWindow = null;
      let el = editor;
      while (el) {
        if (el.matches?.('#dollars-chat-window, .dollars-chat-window')) {
          chatWindow = el;
          break;
        }
        el = el.parentElement;
      }
      if (!chatWindow) return;
    
      const headerButtons = chatWindow.querySelector('.header-buttons');
      if (!headerButtons) return;
    
      // Avoid duplicate buttons in the same chat window
      if (headerButtons.querySelector('[data-md2bbcode="true"]')) return;
    
      const mode = getSetting('chatButtons', 'both');
      if (mode === 'none') {
        editor.dataset.md2bbcodeEnhanced = 'true';
        return;
      }
    
      const convertBtn = createChatButton(
        `${SCRIPT_CLASS}ChatConvertBtn`,
        'Markdown 转 BBCode（有选区时只转换选区）',
        markdownIcon
      );
    
      function bindChatButton(button, direction) {
        button.addEventListener('click', async event => {
          event.preventDefault();
          event.stopPropagation();
          if (button.classList.contains(`${SCRIPT_CLASS}Loading`)) return;
    
          // Dynamically resolve the current editor to avoid stale references
          // when the chat window DOM is recreated.
          const currentEditor = chatWindow.querySelector('.chat-textarea.chat-rich-editor');
          if (!currentEditor) return;
    
          button.classList.add(`${SCRIPT_CLASS}Loading`);
          try {
            await convertContentEditable(currentEditor, direction, true);
          } catch (error) {
            console.error('[md2bbcode] failed to convert chat text', error);
          } finally {
            button.classList.remove(`${SCRIPT_CLASS}Loading`);
          }
        });
      }
    
      bindChatButton(convertBtn, 'markdown-to-bbcode');
    
      const searchBtn = headerButtons.querySelector('#dollars-search-btn');
      if (searchBtn) {
        headerButtons.insertBefore(convertBtn, searchBtn);
      } else {
        headerButtons.prepend(convertBtn);
      }
    
      if (mode === 'both') {
        const reverseBtn = createChatButton(
          `${SCRIPT_CLASS}ChatReverseBtn`,
          'BBCode 转 Markdown（有选区时只转换选区）',
          bbcodeIcon
        );
        bindChatButton(reverseBtn, 'bbcode-to-markdown');
        headerButtons.insertBefore(reverseBtn, searchBtn || convertBtn);
      }
    
      editor.dataset.md2bbcodeEnhanced = 'true';
    }
    
    // ===== 编辑器识别与定位 =====
    
    /**
     * 判断一个 textarea 是否处于需要 Markdown/BBCode 转换工具栏的编辑器上下文。
     * 用于区分 Bangumi 上真正需要增强的编辑框与搜索框、私信框等不需要的 textarea。
     */
    function isEditorTextarea(textarea) {
      if (!textarea || textarea.tagName !== 'TEXTAREA') return false;
    
      // 1. 排除搜索框
      if (textarea.id === 'search_text') return false;
      if (textarea.closest('#headerSearch')) return false;
    
      // 2. 排除主页 timeline 吐槽框（有 markItUp 但不支持完整 BBCode）
      if (textarea.id === 'SayInput') return false;
      if (textarea.getAttribute('name') === 'say_input') return false;
    
      // 4. 如果已经在 markItUp 容器内，说明是 Bangumi 的 BBCode 编辑器
      if (textarea.closest('.markItUp')) return true;
    
      // 4. 根据所在的已知编辑区域判断
      const editorArea = textarea.closest([
        '#comment_box',
        '.reply_box',
        '#post_new',
        '.topic_reply',
        '.reply_form',
        '#new_entry',
        '.edit_entry',
        '#entry_content',
        '.subject_tag_edit',
        '#subject_summary_form',
        '.grp_box',
        '#timeline_form',
        '.broad',
        '.blog_entry',
        '.review_form',
        '.status',
        '.tb',
        '.cmt_form',
        '#reply_wrapper'
      ].join(', '));
      if (editorArea) return true;
    
      // 5. 根据 name 属性判断常见编辑字段
      const name = textarea.getAttribute('name') || '';
      if (/^(content|msg|comment|reply|post|blog|topic|description|summary|text|body)$/i.test(name)) return true;
    
      return false;
    }
    
    /**
     * 增强已有的 markItUp 工具栏。
     * Bangumi 的编辑器在点击后才会动态生成 .markItUp 结构，
     * 因此通过 MutationObserver 在 .markItUpHeader 出现时调用本函数。
     */
    function enhanceMarkItUpHeader(header) {
      if (header.dataset.md2bbcodeEnhanced === 'true') return;
    
      const markItUp = header.closest('.markItUp');
      const textarea = markItUp?.querySelector('textarea') || header.parentElement?.querySelector('textarea');
      const toolbar = header.querySelector('ul') || header.firstElementChild;
    
      if (!textarea || !toolbar) return;
      if (!isEditorTextarea(textarea)) return;
    
      header.dataset.md2bbcodeEnhanced = 'true';
      addConversionButtons(toolbar, textarea);
    }
    
    /**
     * 为没有原生 markItUp 的 textarea 创建自定义工具栏。
     * 仅在确认该 textarea 确实需要工具栏、且不会被 Bangumi 动态初始化 markItUp 时使用。
     */
    function enhancePlainTextarea(textarea) {
      if (!textarea.isConnected) return;
      if (textarea.dataset.md2bbcodeEnhanced === 'true') return;
      if (textarea.closest('.markItUp')) return;
      if (!isEditorTextarea(textarea)) return;
    
      const header = document.createElement('div');
      header.className = `markItUpHeader ${SCRIPT_CLASS}PlainHeader`;
    
      const toolbar = document.createElement('ul');
      header.append(toolbar);
      textarea.before(header);
      textarea.dataset.md2bbcodeEnhanced = 'true';
    
      addConversionButtons(toolbar, textarea);
    }
    
    /**
     * 扫描并增强页面上所有已有的 markItUpHeader。
     */
    function enhanceAllEditors() {
      document.querySelectorAll('.markItUpHeader:not([data-md2bbcode-enhanced])').forEach(enhanceMarkItUpHeader);
    }
    
    function injectStyle() {
      const style = document.createElement('style');
      style.textContent = `
        .${SCRIPT_CLASS}ConvertBtn,
        .${SCRIPT_CLASS}ReverseBtn {
          width: 24px !important;
          height: 24px !important;
          overflow: visible !important;
          flex-shrink: 0;
        }
        .${SCRIPT_CLASS}ConvertBtn a,
        .${SCRIPT_CLASS}ReverseBtn a {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          width: 24px !important;
          height: 24px !important;
          box-sizing: border-box;
          padding: 0 !important;
          margin: 0 !important;
          line-height: 24px !important;
          overflow: visible !important;
          text-indent: 0 !important;
          background-image: none !important;
          opacity: 1;
        }
        .${SCRIPT_CLASS}ConvertBtn svg,
        .${SCRIPT_CLASS}ReverseBtn svg {
          display: block;
          width: 16px;
          height: 16px;
          pointer-events: none;
        }
        .${SCRIPT_CLASS}Loading a {
          opacity: .42;
        }
        .${SCRIPT_CLASS}PlainHeader {
          margin: 0 0 4px;
          min-height: 24px;
        }
        .${SCRIPT_CLASS}PlainHeader ul {
          display: flex;
          align-items: center;
          gap: 2px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .${SCRIPT_CLASS}ChatBtn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          padding: 0;
          margin: 0 2px 0 0;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          opacity: .75;
          flex-shrink: 0;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.15s ease;
        }
        .${SCRIPT_CLASS}ChatBtn:hover {
          opacity: 1;
          transform: scale(1.15);
        }
        .${SCRIPT_CLASS}ChatBtn svg {
          display: block;
          width: 16px;
          height: 16px;
          pointer-events: none;
          margin: auto;
          fill: currentColor;
        }
        .${SCRIPT_CLASS}ChatBtn.${SCRIPT_CLASS}Loading {
          opacity: .35;
          pointer-events: none;
        }
      `;
      document.head.append(style);
    }
    
    function registerConfigPanel() {
      const ukagaka = window.chiiLib?.ukagaka;
      if (!ukagaka?.addPanelTab) return false;
    
      ukagaka.removePanelTab?.('md2bbcode');
    
      ukagaka.addPanelTab({
        tab: 'md2bbcode',
        label: 'MD2BBCode',
        type: 'options',
        config: [
          {
            title: 'Re:Dollars 聊天按钮',
            name: 'md2bbcode_chat',
            type: 'radio',
            defaultValue: 'both',
            getCurrentValue: () => getSetting('chatButtons', 'both'),
            onChange: value => setSetting('chatButtons', value),
            options: [
              { value: 'both', label: '显示两个按钮' },
              { value: 'markdown-only', label: '只显示 Markdown→BBCode' },
              { value: 'none', label: '不显示' }
            ]
          },
          {
            title: '编辑器工具栏按钮',
            name: 'md2bbcode_toolbar',
            type: 'radio',
            defaultValue: 'both',
            getCurrentValue: () => getSetting('toolbarButtons', 'both'),
            onChange: value => setSetting('toolbarButtons', value),
            options: [
              { value: 'both', label: '显示两个按钮' },
              { value: 'markdown-only', label: '只显示 Markdown→BBCode' },
              { value: 'none', label: '不显示' }
            ]
          }
        ]
      });
    
      return true;
    }
    
    function registerConfigPanelWhenReady(retries = 20) {
      if (registerConfigPanel()) return;
      if (retries <= 0) return;
    
      setTimeout(() => registerConfigPanelWhenReady(retries - 1), 500);
    }
    
    injectStyle();
    registerConfigPanelWhenReady();
    enhanceAllEditors();
    
    // ===== MutationObserver：监听 markItUp 的动态生成 =====
    // Bangumi 很多编辑器（如回复框）是点击后才由 JS 初始化 markItUp 结构，
    // 因此需要监听新增节点，在 .markItUp / .markItUpHeader 出现时进行增强。
    const observer = new MutationObserver(mutations => {
      let hasNewEditor = false;
      let hasNewChat = false;
      for (const mutation of mutations) {
        if (mutation.type !== 'childList') continue;
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (
            node.matches?.('.markItUp, .markItUpHeader') ||
            node.querySelector?.('.markItUp, .markItUpHeader')
          ) {
            hasNewEditor = true;
          }
          if (
            node.matches?.('.chat-textarea.chat-rich-editor') ||
            node.querySelector?.('.chat-textarea.chat-rich-editor')
          ) {
            hasNewChat = true;
          }
          if (hasNewEditor && hasNewChat) break;
        }
        if (hasNewEditor && hasNewChat) break;
      }
      if (hasNewEditor) enhanceAllEditors();
      if (hasNewChat) {
        document.querySelectorAll('.chat-textarea.chat-rich-editor:not([data-md2bbcode-enhanced])')
          .forEach(addChatConversionButtons);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    // ===== focusin 事件：处理无原生 markItUp 的编辑器 =====
    // 对于某些不会自动生成 markItUp 但又需要工具栏的 textarea，
    // 在获得焦点后延迟检查；若 markItUp 仍未出现，则创建自定义工具栏。
    document.addEventListener('focusin', event => {
      const target = event.target;
    
      // Handle chat rich editor (contenteditable)
      if (target.matches?.('.chat-textarea.chat-rich-editor')) {
        addChatConversionButtons(target);
        return;
      }
    
      if (target.tagName !== 'TEXTAREA') return;
      const textarea = target;
      if (textarea.dataset.md2bbcodeEnhanced === 'true' || textarea.closest('.markItUp')) return;
    
      if (isEditorTextarea(textarea)) {
        // 给 Bangumi 的 markItUp 初始化留出时间窗口
        setTimeout(() => {
          if (!textarea.isConnected) return;
          if (!textarea.closest('.markItUp') && textarea.dataset.md2bbcodeEnhanced !== 'true') {
            enhancePlainTextarea(textarea);
          }
        }, 600);
      }
    });
    
  }).catch(error => {
    console.error('[md2bbcode] failed to initialize', error);
  });
})();
