# 项目记忆：我的个人网页

- 形态：纯静态零构建个人站点（文章列表/详情、标签、关于、工具箱），无框架、无 npm、无构建步骤。
- 技术栈：vanilla JS + 哈希路由（#/...）+ marked + DOMPurify + highlight.js（均 CDN）。文章存 articles/*.md（front-matter: title/date/tags/slug），索引 data/posts.json，工具箱 data/tools.json。
- 部署：GitHub Pages；根目录 .nojekyll 禁用 Jekyll；全部相对路径，无需改 base。本地预览必须走 HTTP 服务（python -m http.server），不能 file:// 直开。
- 设计：Lucide SVG 图标（禁 emoji 图标），主色 #2563eb，仅亮色响应式主题。
- 维护：新增文章 = 复制 articles 模板 + 在 posts.json 加一条；新增工具 = 编辑 tools.json。
- 路由表：#/ 文章列表、#/post/:slug 详情、#/tags 标签总览、#/tag/:name 按标签过滤、#/about 关于、#/tools 工具箱。
