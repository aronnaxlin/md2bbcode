import { md2bbcode } from '../core/markdown-to-bbcode.js';

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
  if (headerButtons.querySelector(`.${SCRIPT_CLASS}ChatBtn`)) return;

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
  bindChatButton(reverseBtn, 'bbcode-to-markdown');

  // Insert before the search button in header-buttons
  const searchBtn = headerButtons.querySelector('#dollars-search-btn');
  if (searchBtn) {
    headerButtons.insertBefore(convertBtn, searchBtn);
    headerButtons.insertBefore(reverseBtn, searchBtn);
  } else {
    headerButtons.prepend(reverseBtn);
    headerButtons.prepend(convertBtn);
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
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      margin: 0 4px 0 0;
      border: none;
      border-radius: 4px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: .75;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.15s ease;
    }
    .${SCRIPT_CLASS}ChatBtn:hover {
      opacity: 1;
      transform: scale(1.15);
    }
    .${SCRIPT_CLASS}ChatBtn svg {
      display: block;
      width: 18px;
      height: 18px;
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
      if (!textarea.isConnected) return;
      if (!textarea.closest('.markItUp') && textarea.dataset.md2bbcodeEnhanced !== 'true') {
        enhancePlainTextarea(textarea);
      }
    }, 600);
  }
});
