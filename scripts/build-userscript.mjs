import { readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const commonHeader = `// ==UserScript==
// @name         Bangumi Markdown 转 BBCode
// @namespace    bangumi.md2bbcode
// @version      0.0.1
// @description  为 Bangumi 编辑器添加 Markdown 转 BBCode
// @author       you
// @icon         https://bgm.tv/img/favicon.ico
// @match        http*://bgm.tv/*
// @match        http*://chii.in/*
// @match        http*://bangumi.tv/*
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
  .replace("import MarkdownIt from 'markdown-it';\n\n", '')
  .replace('const markdown = new MarkdownIt({', 'const markdown = window.markdownit({')
  .replace('export function markdownToBBCode(source) {', 'function markdownToBBCode(source) {')
  .replace('export const md2bbcode = {\n  markdownToBBCode\n};', 'const md2bbcode = {\n  markdownToBBCode\n};');

const greasyForkApp = app.replace("import { md2bbcode } from '../core/markdown-to-bbcode.js';\n\n", '');

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

  function loadScript(src) {
    if (window.markdownit) return Promise.resolve();

    if (window.$ && typeof window.$.getScript === 'function') {
      return new Promise((resolve, reject) => {
        window.$.getScript(src).done(resolve).fail((_jqxhr, _settings, error) => {
          reject(error || new Error('failed to load ' + src));
        });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('failed to load ' + src));
      document.head.appendChild(script);
    });
  }

  function runMd2BBCode() {
${greasyForkCore.split('\n').map(line => `    ${line}`).join('\n')}

${greasyForkApp.split('\n').map(line => `    ${line}`).join('\n')}
  }

  loadScript(markdownItUrl)
    .then(runMd2BBCode)
    .catch(error => {
      console.error('[md2bbcode] failed to load markdown parser', error);
    });
})();
`);
