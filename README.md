# Bangumi Markdown 转 BBCode

给 Bangumi 编辑器添加轻量的 Markdown / BBCode 双向转换按钮。适合在吐槽、回复、日志等 Bangumi 的 BBCode 编辑区里先写 Markdown，再一键转换成站内可用格式；也可以把已有 BBCode 回转成更容易编辑的 Markdown。

<p>
  <a href="https://greasyfork.org/zh-CN/scripts/575652-bangumi-markdown-%E8%BD%AC-bbcode">
    <img alt="在 Greasy Fork 安装" src="https://img.shields.io/badge/Greasy%20Fork-%E5%AE%89%E8%A3%85%E8%84%9A%E6%9C%AC-7a3cff?style=for-the-badge&logo=tampermonkey&logoColor=white">
  </a>
  <a href="https://github.com/aronnaxlin/md2bbcode/raw/refs/heads/main/dist/md2bbcode.greasyfork.user.js">
    <img alt="从 GitHub Raw 安装" src="https://img.shields.io/badge/GitHub-Raw%20%E5%AE%89%E8%A3%85-181717?style=for-the-badge&logo=github&logoColor=white">
  </a>
  <a href="https://raw.giteeusercontent.com/aronnaxlin/md2bbcode/raw/main/dist/md2bbcode.greasyfork.user.js">
    <img alt="从 Gitee Raw 安装" src="https://img.shields.io/badge/Gitee-Raw%20%E5%A4%87%E7%94%A8-C71D23?style=for-the-badge&logo=gitee&logoColor=white">
  </a>
</p>

## 安装

请先安装 [Tampermonkey](https://www.tampermonkey.net/) 或兼容的用户脚本管理器，然后从下面任一入口安装：

- 推荐从 [Greasy Fork 脚本页](https://greasyfork.org/zh-CN/scripts/575652-bangumi-markdown-%E8%BD%AC-bbcode) 安装。
- 从 [GitHub Raw](https://github.com/aronnaxlin/md2bbcode/raw/refs/heads/main/dist/md2bbcode.greasyfork.user.js) 安装。
- 从 [Gitee Raw](https://raw.giteeusercontent.com/aronnaxlin/md2bbcode/raw/main/dist/md2bbcode.greasyfork.user.js) 安装。

## 项目地址

- [GitHub 源码仓库](https://github.com/aronnaxlin/md2bbcode)
- [Gitee 源码仓库](https://gitee.com/aronnaxlin/md2bbcode)
- [Greasy Fork 信息页](https://greasyfork.org/zh-CN/scripts/575652-bangumi-markdown-%E8%BD%AC-bbcode)

## 功能

- **智能编辑器识别**：自动识别 Bangumi 的 markItUp 编辑器、普通回复框、日志编辑框等，**不会**污染搜索框、主页 timeline 吐槽框等无关输入框。
- **双向转换**：在编辑器工具栏中提供 **Markdown → BBCode** 与 **BBCode → Markdown** 两个按钮，点击即可转换。
- **选区感知**：有选中文本时仅转换选区；无选区时转换全文。
- **多场景覆盖**：支持小组话题、条目讨论、日志、评论、私信（PM）等 Bangumi 标准编辑器。
- **Re:Dollars 聊天窗口支持**：在 Re:Dollars（班固米聊天）的输入框头部提供转换按钮，适配 `contenteditable` 富文本编辑器。
- **聊天专用有限转换器**：Re:Dollars 聊天仅支持 `[b]`、`[i]`、`[u]`、`[s]`、`[code]`、`[url]`、`[mask]` 标签；聊天模式只转换这些标签，其余内容保持原样，不会生成聊天不支持的 BBCode。
- **动态检测**：通过 `MutationObserver` 监听 markItUp 工具栏的延迟生成，也通过 `focusin` 捕获无原生工具栏的编辑器，确保各种动态加载场景下按钮都能正确注入。
- **事件兼容**：转换后自动触发 `input` / `change` 事件，可与 Bangumi 的 BBCode 实时预览等已有组件协同工作。
- **明暗主题自适应**：按钮继承官方 markItUp 图标的颜色与滤镜，在亮色和暗色主题下均保持视觉一致。
- **可靠解析**：使用 `markdown-it` 解析 Markdown，不依赖简单正则硬凑。

## 支持格式

- 标题：`#` / `##` / `###` 转为 `[b][size=...]`
- 粗体、斜体、删除线
- 链接与图片
- 引用
- 有序 / 无序列表
- 行内代码与代码块
- 分割线
- `<u>`、`<mask>`、`<details><summary>...`
- BBCode 反向转换：`[b]`、`[i]`、`[s]`、`[u]`、`[url]`、`[img]`、`[quote]`、`[code]`、`[mask]`、`[color]`、`[size]`、`[font]`、`[align]`、`[list]`、`[olist]`
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

测试用 BBCode 反向转换样本文本在：

```text
tests/fixtures/bangumi-bbcode-sample.txt
tests/fixtures/bangumi-bbcode-sample.expected.md
```

## 自动化

仓库包含 GitHub Actions 检测：

- 运行单元测试。
- 构建三种脚本产物。
- 对三个产物执行 `node --check`。
- 检查 `dist/` 构建结果是否已经提交。
- 检查 Greasy Fork 脚本页可访问。
- 检查 Greasy Fork 建议同步源可访问：

```text
https://github.com/aronnaxlin/md2bbcode/raw/refs/heads/main/dist/md2bbcode.greasyfork.user.js
```

Greasy Fork 自动更新建议在脚本后台设置「同步 URL」为上面的 raw 地址，并配置 GitHub push webhook。Greasy Fork 没有通用写入 API；它支持通过 GitHub/GitLab/Bitbucket 的 push 或 release webhook 检查同步更新。

Greasy Fork 版脚本的元信息也指向同一份 raw 地址：

```text
@downloadURL https://github.com/aronnaxlin/md2bbcode/raw/refs/heads/main/dist/md2bbcode.greasyfork.user.js
@updateURL   https://github.com/aronnaxlin/md2bbcode/raw/refs/heads/main/dist/md2bbcode.greasyfork.user.js
```

## 致谢

感谢 [furtherun/bangumi-blog-markdown-desktop](https://github.com/furtherun/bangumi-blog-markdown-desktop/tree/main) 的早期探索。这个项目验证了 CommonMark/Markdown AST 渲染到 Bangumi BBCode 的可行性，也提供了不少贴近 Bangumi 日志排版的经验规则。
