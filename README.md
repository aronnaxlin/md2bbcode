# Bangumi Markdown 转 BBCode

在 Bangumi 发帖、回复、写日志时，用 Markdown 先把内容写顺，再一键转换成站内可用的 BBCode。也可以把已有 BBCode 转回 Markdown，方便继续编辑。

<p>
  <a href="https://bangumi.tv/dev/app/6020"><img alt="超合金组件安装" src="https://img.shields.io/badge/%E8%B6%85%E5%90%88%E9%87%91%E7%BB%84%E4%BB%B6-%E5%AE%89%E8%A3%85-ff6699?style=for-the-badge"></a>
  <a href="https://greasyfork.org/zh-CN/scripts/575652-bangumi-markdown-%E8%BD%AC-bbcode"><img alt="在 Greasy Fork 安装" src="https://img.shields.io/badge/Greasy%20Fork-%E5%AE%89%E8%A3%85%E8%84%9A%E6%9C%AC-7a3cff?style=for-the-badge&logo=tampermonkey&logoColor=white"></a>
  <a href="https://github.com/aronnaxlin/md2bbcode/raw/refs/heads/main/dist/md2bbcode.greasyfork.user.js"><img alt="从 GitHub Raw 安装" src="https://img.shields.io/badge/GitHub-Raw%20%E5%AE%89%E8%A3%85-181717?style=for-the-badge&logo=github&logoColor=white"></a>
  <a href="https://raw.giteeusercontent.com/aronnaxlin/md2bbcode/raw/main/dist/md2bbcode.greasyfork.user.js"><img alt="从 Gitee Raw 安装" src="https://img.shields.io/badge/Gitee-Raw%20%E5%A4%87%E7%94%A8-C71D23?style=for-the-badge&logo=gitee&logoColor=white"></a>
</p>

## 安装

推荐直接安装 Bangumi 站内组件；也可以通过 Tampermonkey 使用用户脚本版。

- 推荐：[Bangumi 超合金组件](https://bangumi.tv/dev/app/6020)

用户脚本版请先安装 [Tampermonkey](https://www.tampermonkey.net/) 或兼容的脚本管理器，然后任选一个入口：

- [Greasy Fork 脚本页](https://greasyfork.org/zh-CN/scripts/575652-bangumi-markdown-%E8%BD%AC-bbcode)
- 备用：[GitHub Raw](https://github.com/aronnaxlin/md2bbcode/raw/refs/heads/main/dist/md2bbcode.greasyfork.user.js)
- 备用：[Gitee Raw](https://raw.giteeusercontent.com/aronnaxlin/md2bbcode/raw/main/dist/md2bbcode.greasyfork.user.js)

安装后刷新 Bangumi 页面。进入支持 BBCode 的编辑框时，工具栏里会多出 Markdown 和 BBCode 两个小按钮。

## 能做什么

- **Markdown 转 BBCode**：把 `**粗体**`、`[链接](https://example.com)`、引用、列表、代码块等 Markdown 写法转成 Bangumi 支持的 BBCode。
- **BBCode 转 Markdown**：把 `[b]粗体[/b]`、`[url=...]链接[/url]`、`[quote]引用[/quote]` 等内容转回 Markdown。
- **只转换选中的部分**：选中文本后点按钮，只会转换选区；没选中时转换整个编辑框。
- **自动出现在常用编辑框**：小组、条目讨论、日志、评论、回复等地方都会自动识别。
- **支持 Re:Dollars 聊天窗口**：聊天输入框也会有转换按钮，但会使用更保守的聊天专用转换规则。
- **可在组件设置里关闭**：Bangumi 组件设置面板里会出现独立的 `MD2BBCode` 标签页，可以控制按钮是否显示。

## 使用方式

在编辑框里写 Markdown：

```markdown
## 标题

这是 **粗体**，这是 [链接](https://bangumi.tv)。

> 引用内容

- 第一项
- 第二项
```

点击 **Markdown -> BBCode** 按钮后会变成 Bangumi 可用格式：

```text
[b][size=22]标题[/size][/b]

这是 [b]粗体[/b]，这是 [url=https://bangumi.tv]链接[/url]。

[quote]引用内容[/quote]

* 第一项
* 第二项
```

如果你正在编辑别人留下的 BBCode，也可以点击 **BBCode -> Markdown** 转回更容易修改的文本。

## 支持的编辑场景

脚本会尽量只增强真正需要 BBCode 的输入区，不会跑到搜索框里。

目前重点支持：

- 小组话题和回复
- 条目讨论和评论
- 日志 / blog 编辑
- 常见回复框、评论框、编辑框
- 私信等 Bangumi 标准编辑器
- Re:Dollars 聊天窗口
- 点击后才生成工具栏的动态编辑框

明确排除：

- 顶部搜索框
- 主页 timeline 吐槽框
- 其它不适合完整 BBCode 的输入区域

## 支持的格式

Markdown 转 BBCode 支持：

- 标题
- 粗体、斜体、删除线、下划线
- 链接、图片
- 引用
- 无序列表、有序列表
- 行内代码、代码块
- 分割线
- 表格转为可读纯文本
- `<mask>` / `<spoiler>` 隐藏内容
- `<details><summary>标题</summary>内容</details>` 折叠内容
- 字色、字号、字体、对齐等常见 HTML 样式写法

BBCode 转 Markdown 支持：

- `[b]`、`[i]`、`[s]`、`[u]`
- `[url]`、`[img]`
- `[quote]`、`[code]`、`[mask]`
- `[color]`、`[size]`
- `[align]`、`[left]`、`[center]`、`[right]`
- `[list]`
- 常见 Bangumi 标题写法会尽量还原成 Markdown 标题

未识别的 BBCode 会尽量保留原文，避免误删内容。

## Re:Dollars 聊天模式

Re:Dollars 聊天支持的 BBCode 比普通编辑器少，所以脚本会更保守：

- 会转换：粗体、斜体、下划线、删除线、代码、链接、mask。
- 不会生成复杂排版标签。
- 图片等聊天不支持的内容会尽量保持原样，而不是强行转成不可用 BBCode。

## 设置

打开 Bangumi 组件设置，会看到一个和「通用」平级的 `MD2BBCode` 标签页。

里面可以分别设置：

- **编辑器工具栏按钮**
- **Re:Dollars 聊天按钮**

每一项都有三个选项：

- 显示两个按钮
- 只显示 Markdown -> BBCode
- 不显示

## 说明

- 链接会尽量保留原样，不会主动把中文链接、百分号、已编码 URL 再转义一遍。
- 危险链接如 `javascript:` 不会被转换成可点击 BBCode 链接。
- 脚本会监听动态加载的编辑框，所以大多数“点开后才出现编辑器”的页面也能正常显示按钮。
- 如果按钮没有出现，可以先刷新页面，或点击进入编辑框后稍等一下。

## 项目地址

- [Bangumi 超合金组件](https://bangumi.tv/dev/app/6020)
- [GitHub 源码仓库](https://github.com/aronnaxlin/md2bbcode)
- [Gitee 源码仓库](https://gitee.com/aronnaxlin/md2bbcode)
- [Greasy Fork 信息页](https://greasyfork.org/zh-CN/scripts/575652-bangumi-markdown-%E8%BD%AC-bbcode)

## 开发

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
```

项目会生成三种脚本：

- `dist/md2bbcode.user.js`：本地安装用，依赖打包进单文件。
- `dist/md2bbcode.greasyfork.user.js`：Greasy Fork 用。
- `dist/md2bbcode.bgm.user.js`：Bangumi 组件用。

Greasy Fork 同步源：

```text
https://github.com/aronnaxlin/md2bbcode/raw/refs/heads/main/dist/md2bbcode.greasyfork.user.js
```

## 致谢

感谢 [furtherun/bangumi-blog-markdown-desktop](https://github.com/furtherun/bangumi-blog-markdown-desktop/) 的早期探索。这个项目验证了 CommonMark/Markdown AST 渲染到 Bangumi BBCode 的可行性，也提供了不少贴近 Bangumi 日志排版的经验规则。
