import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  bbcodeToMarkdown,
  bbcodeToMarkdownChat,
  markdownToBBCode,
  markdownToBBCodeChat
} from '../src/core/markdown-to-bbcode.js';

const cases = [
  ['**粗体**', '[b]粗体[/b]'],
  ['__粗体__', '[b]粗体[/b]'],
  ['*斜体*', '[i]斜体[/i]'],
  ['_斜体_', '[i]斜体[/i]'],
  ['~~删除~~', '[s]删除[/s]'],
  ['[Bangumi](https://bangumi.tv)', '[url=https://bangumi.tv]Bangumi[/url]'],
  ['![alt](https://example.com/a.png)', '[img]https://example.com/a.png[/img]'],
  ['`const a = 1`', '[size=12][color=#666]const a = 1[/color][/size]'],
  ['# 标题', '[b][size=24]标题[/size][/b]'],
  ['> 引用\n> 第二行', '[quote]引用\n第二行[/quote]'],
  ['- 项目', '* 项目'],
  ['1. 项目', '1. 项目'],
  ['```js\nconst a = 1;\n```', '[code]const a = 1;[/code]']
];

for (const [input, expected] of cases) {
  assert.equal(markdownToBBCode(input), expected, input);
}

assert.equal(
  markdownToBBCode('**[链接](https://bangumi.tv)**'),
  '[b][url=https://bangumi.tv]链接[/url][/b]'
);

assert.equal(
  markdownToBBCode('这是**中文粗体**和*斜体*。'),
  '这是[b]中文粗体[/b]和[i]斜体[/i]。'
);

assert.equal(
  markdownToBBCode('[标题 **粗体**](https://example.com/a_(b))'),
  '[url=https://example.com/a_(b)]标题 [b]粗体[/b][/url]'
);

assert.equal(
  markdownToBBCode('[中文](https://example.com/中文/路径?番=1#锚点)'),
  '[url=https://example.com/中文/路径?番=1#锚点]中文[/url]'
);

assert.equal(
  markdownToBBCode('[百分号](https://example.com/100%25?q=50%)'),
  '[url=https://example.com/100%25?q=50%]百分号[/url]'
);

assert.equal(
  markdownToBBCode('| A | B |\n| - | - |\n| 中 | 文 |'),
  'A | B |\n中 | 文 |'
);

assert.equal(
  markdownToBBCode('## 二级\n\n### 三级'),
  '[b][size=22]二级[/size][/b]\n\n[b][size=20]三级[/size][/b]'
);

assert.equal(
  markdownToBBCode('---'),
  '___________________________________________________________________________'
);

assert.equal(
  markdownToBBCode('[bad](javascript:alert(1))'),
  '[bad](javascript:alert(1))'
);

assert.equal(
  markdownToBBCode('![bad](javascript:alert(1))'),
  '![bad](javascript:alert(1))'
);

assert.equal(
  markdownToBBCode('<u>下划线</u> 和 <mask>隐藏</mask>'),
  '[u]下划线[/u] 和 [mask]隐藏[/mask]'
);

assert.equal(
  markdownToBBCode('<details><summary>剧透</summary>犯人是我</details>'),
  '[color=yellowgreen]剧透[/color] [mask]犯人是我[/mask]'
);

assert.equal(
  markdownToBBCode('<!-- 注释 -->正文'),
  '正文'
);

const reverseCases = [
  ['[b]粗体[/b]', '**粗体**'],
  ['[i]斜体[/i]', '*斜体*'],
  ['[s]删除[/s]', '~~删除~~'],
  ['[u]下划线[/u]', '<u>下划线</u>'],
  ['[url=https://bangumi.tv]Bangumi[/url]', '[Bangumi](https://bangumi.tv)'],
  ['[url]https://bangumi.tv[/url]', '[https://bangumi.tv](https://bangumi.tv)'],
  ['[img]https://example.com/a.png[/img]', '![](https://example.com/a.png)'],
  ['[quote]引用\n第二行[/quote]', '> 引用\n> 第二行'],
  ['[code]const a = 1;[/code]', '```\nconst a = 1;\n```'],
  ['[mask]隐藏[/mask]', '<mask>隐藏</mask>'],
  ['[b][size=24]标题[/size][/b]', '# 标题'],
  ['[size=12][color=#666]const a = 1[/color][/size]', '`const a = 1`'],
  ['[color=red]红色[/color]', '<span style="color: red">红色</span>'],
  ['[size=18]大字[/size]', '<span style="font-size: 18px">大字</span>'],
  ['[font=serif]衬线[/font]', '<span style="font-family: serif">衬线</span>'],
  ['[center]居中[/center]', '<div align="center">居中</div>'],
  ['[align=right]右对齐[/align]', '<div align="right">右对齐</div>'],
  ['[quote=Alice]引用[/quote]', '> **Alice:**\n> 引用'],
  ['[code=js]const a = 1;[/code]', '```js\nconst a = 1;\n```'],
  ['[list][*]第一项[*]第二项[/list]', '- 第一项\n- 第二项'],
  ['[olist][*]第一项[*]第二项[/olist]', '1. 第一项\n2. 第二项']
];

for (const [input, expected] of reverseCases) {
  assert.equal(bbcodeToMarkdown(input), expected, input);
}

assert.equal(
  bbcodeToMarkdown('[b][url=https://bangumi.tv]链接[/url][/b]'),
  '**[链接](https://bangumi.tv)**'
);

assert.equal(bbcodeToMarkdown('[b][size=25]一级[/size][/b]'), '# 一级');
assert.equal(bbcodeToMarkdown('[b][size=23]二级[/size][/b]'), '## 二级');
assert.equal(bbcodeToMarkdown('[b][size=21]三级[/size][/b]'), '### 三级');
assert.equal(bbcodeToMarkdown('[b][size=19]四级[/size][/b]'), '#### 四级');
assert.equal(bbcodeToMarkdown('[b][size=16.5]五级[/size][/b]'), '##### 五级');
assert.equal(bbcodeToMarkdown('[b][size=15]正文粗体[/size][/b]'), '**<span style="font-size: 15px">正文粗体</span>**');

assert.equal(
  bbcodeToMarkdown('这是[b]中文粗体[/b]和[i]斜体[/i]。'),
  '这是**中文粗体**和*斜体*。'
);

assert.equal(
  bbcodeToMarkdown('[unknown]保留[/unknown]'),
  '[unknown]保留[/unknown]'
);

assert.equal(
  markdownToBBCode('<span style="color: red; font-size: 18px">红色大字</span>'),
  '[color=red][size=18]红色大字[/size][/color]'
);

assert.equal(
  markdownToBBCode('<div align="center">居中</div>'),
  '[center]居中[/center]'
);

assert.equal(
  markdownToBBCodeChat('**粗体** [链接](https://bangumi.tv) ![图](https://example.com/a.png)'),
  '[b]粗体[/b] [url=https://bangumi.tv]链接[/url] ![图](https://example.com/a.png)'
);

assert.equal(
  bbcodeToMarkdownChat('[b]粗体[/b] [img]https://example.com/a.png[/img]'),
  '**粗体** [img]https://example.com/a.png[/img]'
);

const sampleBBCode = readFileSync(new URL('./fixtures/bangumi-bbcode-sample.txt', import.meta.url), 'utf8');
const sampleMarkdown = readFileSync(new URL('./fixtures/bangumi-bbcode-sample.expected.md', import.meta.url), 'utf8');
assert.equal(bbcodeToMarkdown(sampleBBCode), sampleMarkdown.trim());

console.log(`ok ${cases.length + reverseCases.length + 27} markdown/bbcode conversion cases`);
