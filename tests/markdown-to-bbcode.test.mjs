import assert from 'node:assert/strict';
import { markdownToBBCode } from '../src/core/markdown-to-bbcode.js';

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

console.log(`ok ${cases.length + 11} markdown-to-bbcode cases`);
