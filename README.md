# Bangumi Markdown 转 BBCode

给 Bangumi 编辑器添加轻量的 Markdown / BBCode 双向转换按钮。适合在吐槽、回复、日志等 Bangumi 的 BBCode 编辑区里先写 Markdown，再一键转换成站内可用格式；也可以把已有 BBCode 回转成更容易编辑的 Markdown。

<p>
  <a href="https://greasyfork.org/zh-CN/scripts/575652-bangumi-markdown-%E8%BD%AC-bbcode">
    <img alt="在 Greasy Fork 安装" src="https://img.shields.io/badge/Greasy%20Fork-%E5%AE%89%E8%A3%85%E8%84%9A%E6%9C%AC-7a3cff?style=for-the-badge&logo=tampermonkey&logoColor=white">
  </a>
</p>

## 功能

- 在 Bangumi 的 markItUp 编辑器工具栏中加入 Markdown 转 BBCode 和 BBCode 转 Markdown 图标。
- 点击图标后，将选中的文本转换为目标格式。
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
https://raw.githubusercontent.com/aronnaxlin/md2bbcode/main/dist/md2bbcode.greasyfork.user.js
```

Greasy Fork 自动更新建议在脚本后台设置「同步 URL」为上面的 raw 地址，并配置 GitHub push webhook。Greasy Fork 没有通用写入 API；它支持通过 GitHub/GitLab/Bitbucket 的 push 或 release webhook 检查同步更新。

Greasy Fork 版脚本的元信息也指向同一份 raw 地址：

```text
@downloadURL https://raw.githubusercontent.com/aronnaxlin/md2bbcode/main/dist/md2bbcode.greasyfork.user.js
@updateURL   https://raw.githubusercontent.com/aronnaxlin/md2bbcode/main/dist/md2bbcode.greasyfork.user.js
```

## 致谢

感谢 [furtherun/bangumi-blog-markdown-desktop](https://github.com/furtherun/bangumi-blog-markdown-desktop/tree/main) 的早期探索。这个项目验证了 CommonMark/Markdown AST 渲染到 Bangumi BBCode 的可行性，也提供了不少贴近 Bangumi 日志排版的经验规则。
