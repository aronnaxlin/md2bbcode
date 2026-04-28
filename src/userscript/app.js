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

function enhanceEditor(header) {
  if (header.querySelector(`.${SCRIPT_CLASS}ConvertBtn`)) return;

  const textarea = header.parentElement?.querySelector('textarea');
  const toolbar = header.firstElementChild;
  if (!textarea || !toolbar) return;

  addConversionButtons(toolbar, textarea);
}

function enhanceTextarea(textarea) {
  if (textarea.closest('.markItUp') || textarea.dataset.md2bbcodeEnhanced === 'true') return;

  const header = document.createElement('div');
  header.className = `markItUpHeader ${SCRIPT_CLASS}PlainHeader`;

  const toolbar = document.createElement('ul');
  header.append(toolbar);
  textarea.before(header);
  textarea.dataset.md2bbcodeEnhanced = 'true';

  addConversionButtons(toolbar, textarea);
}

function enhanceAllEditors() {
  document.querySelectorAll('.markItUpHeader').forEach(enhanceEditor);
  document.querySelectorAll('textarea').forEach(enhanceTextarea);
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
      color: #9a9a9a;
      filter: none !important;
      opacity: 1;
    }
    .${SCRIPT_CLASS}ConvertBtn a:hover,
    .${SCRIPT_CLASS}ReverseBtn a:hover {
      color: #cfcfcf;
    }
    .${SCRIPT_CLASS}ConvertBtn svg,
    .${SCRIPT_CLASS}ReverseBtn svg {
      display: block;
      width: 19px;
      height: 19px;
      fill: currentColor;
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
  `;
  document.head.append(style);
}

injectStyle();
enhanceAllEditors();

new MutationObserver(enhanceAllEditors).observe(document.body, { childList: true, subtree: true });
