# Bangumi Markdown 转 BBCode

给 Bangumi 编辑器添加一个轻量的 Markdown 转 BBCode 按钮。适合在吐槽、回复、日志等 Bangumi 的 BBCode 编辑区里先写 Markdown，再一键转换成站内可用格式。

<p>
  <a href="https://greasyfork.org/zh-CN/scripts/575652-bangumi-markdown-%E8%BD%AC-bbcode">
    <img alt="在 Greasy Fork 安装" src="https://img.shields.io/badge/Greasy%20Fork-%E5%AE%89%E8%A3%85%E8%84%9A%E6%9C%AC-7a3cff?style=for-the-badge&logo=tampermonkey&logoColor=white">
  </a>
</p>

## 功能

- 在 Bangumi 的 markItUp 编辑器工具栏中加入一个 Markdown 小图标。
- 点击图标后，将选中的 Markdown 转成 BBCode。
- 如果没有选中文本，则转换整个文本框。
- 转换后触发标准 `input` / `change` 事件，可兼容已有 BBCode 预览组件。
- 使用 `markdown-it` 解析 Markdown，不依赖简单正则硬凑。

## 支持格式

- 标题：`#` / `##` / `###` 转为 `[b][size=...]`
- 粗体、斜体、删除线
- 链接与图片
- 引用
- 有序 / 无序列表
- 行内代码与代码块
- 分割线
- `<u>`、`<mask>`、`<details><summary>...`
- 表格会退化为可读纯文本

## 构建产物

项目会生成三种脚本：

- `dist/md2bbcode.user.js`：本地安装用，依赖打包进单文件。
- `dist/md2bbcode.greasyfork.user.js`：Greasy Fork 用，通过 `@require` 引入可读的 `markdown-it` 浏览器构建，避免混淆检测。
- `dist/md2bbcode.bgm.user.js`：Bangumi 组件用，不使用 `@require`，运行时通过 `$.getScript` 加载依赖。

## 开发

安装依赖：

```powershell
npm.cmd install
```

运行测试：

```powershell
npm.cmd test
```

构建脚本：

```powershell
npm.cmd run build
```

测试用 Markdown 样本文本在：

```text
tests/fixtures/bangumi-sample.md
```

## 致谢

感谢 [furtherun/bangumi-blog-markdown-desktop](https://github.com/furtherun/bangumi-blog-markdown-desktop/tree/main) 的早期探索。这个项目验证了 CommonMark/Markdown AST 渲染到 Bangumi BBCode 的可行性，也提供了不少贴近 Bangumi 日志排版的经验规则。
