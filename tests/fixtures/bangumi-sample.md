# Markdown 转 BBCode 测试日志

这是一段中文正文，包含 **粗体**、*斜体*、~~删除线~~，以及 `inline code`。

也测试一下中文紧贴格式：这是**中文粗体**和*中文斜体*。

## 链接与图片

[Bangumi](https://bangumi.tv) 和 [带括号的链接](https://example.com/a_(b))。

![示例图片](https://lsky.ry.mk/i/2026/04/27/041526baa0663.webp)

危险链接应保持原样，不应该变成 BBCode：

[bad](javascript:alert(1))

![bad](javascript:alert(1))

## 引用

> 第一行引用
> 第二行引用，包含 **粗体** 和 [链接](https://bgm.tv)。

## 列表

- 无序项目 A
- 无序项目 B，包含 `code`
- 无序项目 C

1. 有序项目 A
2. 有序项目 B
3. 有序项目 C

## 代码块

```js
const site = 'Bangumi';
console.log(`Hello, ${site}`);
```

## Bangumi 扩展写法

<u>下划线文字</u>

<mask>这是一段剧透内容</mask>

<details>
<summary>折叠标题</summary>
这里是 details 中的隐藏内容。
可以用来模拟长剧透。
</details>

---

## 表格退化

| 项目 | 结果 |
| --- | --- |
| 中文 | 可读 |
| 表格 | 退化为纯文本 |
