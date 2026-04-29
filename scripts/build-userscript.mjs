import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const commonHeader = `// ==UserScript==
// @name         Bangumi Markdown 转 BBCode
// @namespace    bangumi.md2bbcode
// @version      0.0.3
// @description  为 Bangumi 编辑器添加 Markdown 转 BBCode
// @author       aronnax
// @icon         https://bgm.tv/img/favicon.ico
// @match        *://bgm.tv/*
// @match        *://chii.in/*
// @match        *://bangumi.tv/*
// @grant        none
// @license      MIT
// ==/UserScript==
`;

const result = await build({
  entryPoints: ['src/userscript/entry.js'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  legalComments: 'none',
  write: false
});

const bundled = new TextDecoder().decode(result.outputFiles[0].contents);
await writeFile('dist/md2bbcode.user.js', `${commonHeader}\n${bundled}`);

const greasyForkRawUrl = 'https://raw.githubusercontent.com/aronnaxlin/md2bbcode/main/dist/md2bbcode.greasyfork.user.js';

const greasyForkHeader = commonHeader.replace(
  '// @grant        none',
  `// @require      https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.js
// @downloadURL   ${greasyForkRawUrl}
// @updateURL     ${greasyForkRawUrl}
// @grant        none`
);

const core = await readFile('src/core/markdown-to-bbcode.js', 'utf8');
const app = await readFile('src/userscript/app.js', 'utf8');

const greasyForkCore = core
  .replace(/^import MarkdownIt from 'markdown-it';\r?\n\r?\n/, '')
  .replace(/\bnew MarkdownIt\(/g, 'window.markdownit(')
  .replace('export function markdownToBBCode(source) {', 'function markdownToBBCode(source) {')
  .replace('export function bbcodeToMarkdown(source) {', 'function bbcodeToMarkdown(source) {')
  .replace('export function markdownToBBCodeChat(source) {', 'function markdownToBBCodeChat(source) {')
  .replace('export function bbcodeToMarkdownChat(source) {', 'function bbcodeToMarkdownChat(source) {')
  .replace(/export const md2bbcode = \{\r?\n  markdownToBBCode,\r?\n  bbcodeToMarkdown,\r?\n  markdownToBBCodeChat,\r?\n  bbcodeToMarkdownChat\r?\n\};/, 'const md2bbcode = {\n  markdownToBBCode,\n  bbcodeToMarkdown,\n  markdownToBBCodeChat,\n  bbcodeToMarkdownChat\n};');

const greasyForkApp = app.replace(/^import \{ md2bbcode \} from '\.\.\/core\/markdown-to-bbcode\.js';\r?\n\r?\n/, '');

await writeFile('dist/md2bbcode.greasyfork.user.js', `${greasyForkHeader}
(function () {
  'use strict';

${greasyForkCore}

${greasyForkApp}
})();
`);

const bgmHeader = commonHeader.replace(
  '// @grant        none',
  '// @gf\n// @grant        none'
);

const markdownItUrl = 'https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.js';

await writeFile('dist/md2bbcode.bgm.user.js', `${bgmHeader}
(function () {
  'use strict';

  const markdownItUrl = '${markdownItUrl}';
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
${greasyForkCore.split('\n').map(line => `    ${line}`).join('\n')}

${greasyForkApp.split('\n').map(line => `    ${line}`).join('\n')}
  }).catch(error => {
    console.error('[md2bbcode] failed to initialize', error);
  });
})();
`);
