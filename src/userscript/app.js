import { md2bbcode } from '../core/markdown-to-bbcode.js';

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
      width: 23px;
      height: 23px;
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
      width: 18px;
      height: 18px;
      fill: currentColor;
      pointer-events: none;
    }
  `;
  document.head.append(style);
}

injectStyle();
enhanceAllEditors();

new MutationObserver(enhanceAllEditors).observe(document.body, { childList: true, subtree: true });
