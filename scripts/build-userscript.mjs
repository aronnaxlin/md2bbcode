import { writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const header = `// ==UserScript==
// @name         Bangumi Markdown 转 BBCode
// @namespace    bangumi.md2bbcode
// @version      0.0.1
// @description  为 Bangumi 编辑器添加 Markdown 转 BBCode 和 BBCode 预览
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
await writeFile('dist/md2bbcode.user.js', `${header}\n${bundled}`);
