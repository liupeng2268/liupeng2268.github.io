---
title: 前端 Markdown 渲染入门
date: 2026-08-08
tags: [前端, JavaScript]
slug: frontend-markdown-rendering
---

## 为什么需要渲染

Markdown 是纯文本，浏览器不认识。需要把它转成 HTML 才能显示。前端常用 marked 做解析，DOMPurify 做净化（防 XSS），highlight.js 做代码高亮。

## 最小可用代码

```html
<script src="https://cdn.jsdelivr.net/npm/marked@12/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js"></script>
<script>
  const md = '# 你好\n\n这是 **加粗** 文本';
  const html = DOMPurify.sanitize(marked.parse(md));
  document.body.innerHTML = html;
</script>
```

## 关键点

- 必须先净化再插入 DOM：Markdown 可能包含恶意脚本。
- 代码高亮：渲染后对 pre code 调用 hljs.highlightElement。
- 异步加载 .md：用 fetch 读取，本地需跑 HTTP 服务（不能直接 file:// 打开）。

逐步动手改上面的代码，比看十篇教程都管用。
