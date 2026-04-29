// ==UserScript==
// @name         Bangumi Markdown 转 BBCode
// @namespace    bangumi.md2bbcode
// @version      0.0.2
// @description  为 Bangumi 编辑器添加 Markdown 转 BBCode
// @author       you
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
  let markdownToBBCodePromise;

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

  function ensureMarkdownToBBCode() {
    if (markdownToBBCodePromise) return markdownToBBCodePromise;

    markdownToBBCodePromise = loadScript(markdownItUrl).then(() => {
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
          .replace(/<span\s+style=(["'])([^"']*?)\1\s*>([\s\S]*?)<\/span>/gi, (_match, _quote, style, content) => {
            const color = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim();
            const size = /(?:^|;)\s*font-size\s*:\s*([0-9.]+)(?:px)?/i.exec(style)?.[1]?.trim();
            const family = /(?:^|;)\s*font-family\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim();
      
            let value = content;
            if (family) value = `[font=${family.replace(/^["']|["']$/g, '')}]${value}[/font]`;
            if (size) value = `[size=${size}]${value}[/size]`;
            if (color) value = `[color=${color}]${value}[/color]`;
            return value;
          })
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
      
      
      function markdownToBBCode(source) {
        if (!source) return '';
        return normalizeBBCode(markdown.render(preprocessMarkdown(source), { listStack: [] }));
      }
      
      
      

      return markdownToBBCode;
    });

    return markdownToBBCodePromise;
  }

  const md2bbcode = {
    markdownToBBCode(source) {
      return ensureMarkdownToBBCode().then(markdownToBBCode => markdownToBBCode(source));
    },
    bbcodeToMarkdown(source) {
      return bbcodeToMarkdown(source);
    }
  };

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
    
    function bbcodeToMarkdown(source) {
      if (!source) return '';
      return normalizeMarkdown(renderBBCodeNodeAsMarkdown(parseBBCode(String(source))));
    }
    
    

    const SCRIPT_CLASS = 'md2bbcode';
    
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
    
    async function convertContentEditable(editor, direction) {
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
        ? md2bbcode.bbcodeToMarkdown
        : md2bbcode.markdownToBBCode;
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
      button.innerHTML = icon;
      return button;
    }
    
    function addConversionButtons(toolbar, textarea) {
      if (toolbar.querySelector(`.${SCRIPT_CLASS}ConvertBtn`)) return;
    
      const convertBtn = createToolbarButton(
        `${SCRIPT_CLASS}ConvertBtn`,
        'Markdown 转 BBCode（有选区时只转换选区）',
        markdownIcon
      );
      const reverseBtn = createToolbarButton(
        `${SCRIPT_CLASS}ReverseBtn`,
        'BBCode 转 Markdown（有选区时只转换选区）',
        bbcodeIcon
      );
    
      function bindConvertButton(button, direction) {
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
    
      bindConvertButton(convertBtn, 'markdown-to-bbcode');
      bindConvertButton(reverseBtn, 'bbcode-to-markdown');
    
      const cleanBtn = Array.from(toolbar.children).find(child => child.classList?.contains('tool_clean'));
      if (cleanBtn) {
        toolbar.insertBefore(convertBtn, cleanBtn);
        toolbar.insertBefore(reverseBtn, cleanBtn);
      } else {
        toolbar.append(convertBtn);
        toolbar.append(reverseBtn);
      }
    }
    
    function addChatConversionButtons(editor) {
      if (editor.dataset.md2bbcodeEnhanced === 'true') return;
    
      const wrapper = editor.closest('.dollars-input-wrapper');
      if (!wrapper) return;
    
      // Find the input-actions container next to the wrapper
      const actions = wrapper.nextElementSibling;
      if (!actions || !actions.classList?.contains('input-actions')) return;
      if (actions.querySelector(`.${SCRIPT_CLASS}ChatBtn`)) return;
    
      const convertBtn = createChatButton(
        `${SCRIPT_CLASS}ChatConvertBtn`,
        'Markdown 转 BBCode（有选区时只转换选区）',
        markdownIcon
      );
      const reverseBtn = createChatButton(
        `${SCRIPT_CLASS}ChatReverseBtn`,
        'BBCode 转 Markdown（有选区时只转换选区）',
        bbcodeIcon
      );
    
      function bindChatButton(button, direction) {
        button.addEventListener('click', async event => {
          event.preventDefault();
          event.stopPropagation();
          if (button.classList.contains(`${SCRIPT_CLASS}Loading`)) return;
    
          button.classList.add(`${SCRIPT_CLASS}Loading`);
          try {
            await convertContentEditable(editor, direction);
          } catch (error) {
            console.error('[md2bbcode] failed to convert chat text', error);
          } finally {
            button.classList.remove(`${SCRIPT_CLASS}Loading`);
          }
        });
      }
    
      bindChatButton(convertBtn, 'markdown-to-bbcode');
      bindChatButton(reverseBtn, 'bbcode-to-markdown');
    
      // Insert before the send button (last child)
      const sendBtn = actions.querySelector('.send-btn');
      if (sendBtn) {
        actions.insertBefore(convertBtn, sendBtn);
        actions.insertBefore(reverseBtn, sendBtn);
      } else {
        actions.append(convertBtn);
        actions.append(reverseBtn);
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
          width: 28px !important;
          height: 24px !important;
          overflow: visible !important;
        }
        .${SCRIPT_CLASS}ConvertBtn a,
        .${SCRIPT_CLASS}ReverseBtn a {
          display: inline-flex !important;
          align-items: center;
          justify-content: center;
          width: 28px !important;
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
          width: 19px;
          height: 19px;
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
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          margin: 0 2px 0 0;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          opacity: .7;
          transition: opacity .15s ease;
        }
        .${SCRIPT_CLASS}ChatBtn:hover {
          opacity: 1;
          background: rgba(128,128,128,.15);
        }
        .${SCRIPT_CLASS}ChatBtn svg {
          display: block;
          width: 18px;
          height: 18px;
          pointer-events: none;
        }
        .${SCRIPT_CLASS}ChatBtn.${SCRIPT_CLASS}Loading {
          opacity: .35;
          pointer-events: none;
        }
      `;
      document.head.append(style);
    }
    
    injectStyle();
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
          if (!textarea.closest('.markItUp') && textarea.dataset.md2bbcodeEnhanced !== 'true') {
            enhancePlainTextarea(textarea);
          }
        }, 600);
      }
    });
    
})();
