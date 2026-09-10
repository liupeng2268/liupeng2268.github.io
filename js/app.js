// app.js —— 站点入口（type=module）
import { parseFrontMatter, renderMarkdown } from './md.js';
import { fetchPosts, fetchTools, fetchArticle, fetchAbout } from './data.js';
import { registerRoute, registerNotFound, navigate, startRouter } from './router.js';
import { setPageMeta } from './seo.js';
import {
  searchBoxHtml,
  bindSearch,
  enhanceArticle,
  resetArticleEnhancements,
  readingMinutes,
  pagerHtml,
  setupBackToTop,
} from './features.js';

// ---------- 工具函数 ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatDate(iso) {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[1]}年${parseInt(m[2], 10)}月${parseInt(m[3], 10)}日`;
}

// 从 Markdown 正文提取纯文本摘要：先删代码块，再删标记符号，最后压平空白
function textExcerpt(content, len = 100) {
  const text = String(content || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~\[\]()!|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > len ? `${text.slice(0, len)}…` : text;
}

function tagChip(tag) {
  return `<a class="chip" href="#/tag/${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`;
}

// 整卡可点击通过标题链接的 ::after 覆盖层实现：
// 卡片内还有标签链接，若用 <a> 包裹会导致锚点嵌套，浏览器解析器会强制拆分 DOM。
function postCard(post) {
  return `
    <div class="post-card">
      <div class="post-card-body">
        <h3 class="post-title">
          <a class="post-card-link" href="#/post/${encodeURIComponent(post.slug)}">${escapeHtml(post.title)}</a>
        </h3>
        <p class="post-meta"><time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time></p>
        <div class="post-tags">${post.tags.map(tagChip).join('')}</div>
        <p class="post-excerpt">${escapeHtml(post.excerpt)}</p>
      </div>
      <span class="post-card-arrow" aria-hidden="true">
        <svg class="icon icon-20"><use href="#icon-arrow-right"/></svg>
      </span>
    </div>
  `;
}

function postListHtml(posts, emptyText) {
  return posts.length
    ? posts.map(postCard).join('')
    : `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
}

function errorState(root, retryPath) {
  root.innerHTML = `<div class="error-state">加载失败，<button class="link-btn" id="retryBtn" type="button">点击重试</button></div>`;
  const btn = document.getElementById('retryBtn');
  if (btn) btn.addEventListener('click', () => navigate(retryPath));
}

// ---------- 各路由渲染 ----------
async function renderHome(params, root) {
  root.innerHTML = `<div class="page-state">加载中…</div>`;
  try {
    const posts = await fetchPosts();
    posts.sort((a, b) => (a.date < b.date ? 1 : -1));
    root.innerHTML = `
      <header class="page-head">
        <h1 class="page-title">文章</h1>
        <p class="page-subtitle">运维笔记与前端学习记录</p>
        ${searchBoxHtml()}
      </header>
      <div class="post-list" id="postList"></div>
    `;
    bindSearch({
      root,
      posts,
      scope: 'home',
      renderList: (list) => postListHtml(list, '没有匹配的文章'),
    });
    setPageMeta({ title: '文章' });
  } catch (e) {
    errorState(root, '/');
  }
}

async function renderPost(params, root) {
  const { slug } = params;
  root.innerHTML = `<div class="page-state">加载中…</div>`;
  try {
    const raw = await fetchArticle(slug);
    const { meta, content } = parseFrontMatter(raw);
    const html = renderMarkdown(content);
    const tags = (meta.tags || []).map(tagChip).join('');
    let pager = '';
    try {
      pager = pagerHtml(await fetchPosts(), slug);
    } catch (e) {
      pager = '';
    }
    root.innerHTML = `
      <article class="article">
        <header class="article-head">
          <h1 class="article-title">${escapeHtml(meta.title || slug)}</h1>
          <p class="post-meta">
            <time datetime="${escapeHtml(meta.date || '')}">${formatDate(meta.date)}</time>
            <span class="meta-sep" aria-hidden="true">·</span>
            <span>约 ${readingMinutes(content)} 分钟</span>
          </p>
          <div class="post-tags">${tags}</div>
        </header>
        <div class="article-body markdown">${html}</div>
        ${pager}
        <footer class="article-foot">
          <a class="back-link" href="#/">返回文章列表</a>
        </footer>
      </article>
    `;
    document.querySelectorAll('#app pre code').forEach((el) => {
      if (window.hljs) window.hljs.highlightElement(el);
    });
    enhanceArticle({ root, slug });
    setPageMeta({
      title: meta.title || slug,
      description: textExcerpt(content),
    });
  } catch (e) {
    errorState(root, `/post/${slug}`);
  }
}

async function renderTag(params, root) {
  const name = decodeURIComponent(params.name);
  root.innerHTML = `<div class="page-state">加载中…</div>`;
  try {
    const posts = await fetchPosts();
    const filtered = posts.filter((p) => (p.tags || []).includes(name));
    filtered.sort((a, b) => (a.date < b.date ? 1 : -1));
    root.innerHTML = `
      <header class="page-head">
        <h1 class="page-title">标签：${escapeHtml(name)}</h1>
        <p class="page-subtitle">共 ${filtered.length} 篇文章</p>
        ${searchBoxHtml()}
      </header>
      <div class="post-list" id="postList"></div>
    `;
    bindSearch({
      root,
      posts: filtered,
      scope: `tag:${name}`,
      renderList: (list) => postListHtml(list, '该标签下没有匹配的文章'),
    });
    setPageMeta({ title: `标签：${name}` });
  } catch (e) {
    errorState(root, `/tag/${params.name}`);
  }
}

async function renderTags(params, root) {
  root.innerHTML = `<div class="page-state">加载中…</div>`;
  try {
    const posts = await fetchPosts();
    const counts = {};
    posts.forEach((p) => (p.tags || []).forEach((t) => {
      counts[t] = (counts[t] || 0) + 1;
    }));
    const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    root.innerHTML = `
      <header class="page-head">
        <h1 class="page-title">标签</h1>
        <p class="page-subtitle">按主题浏览文章</p>
      </header>
      <div class="tag-cloud">
        ${
          tags.length
            ? tags
                .map(
                  (t) =>
                    `<a class="chip chip-lg" href="#/tag/${encodeURIComponent(
                      t
                    )}">${escapeHtml(t)} <span class="chip-count">${counts[t]}</span></a>`
                )
                .join('')
            : `<div class="empty-state">还没有标签</div>`
        }
      </div>
    `;
    setPageMeta({ title: '标签', description: '按主题浏览全部文章标签' });
  } catch (e) {
    errorState(root, '/tags');
  }
}

async function renderAbout(params, root) {
  root.innerHTML = `<div class="page-state">加载中…</div>`;
  try {
    const raw = await fetchAbout();
    const html = renderMarkdown(raw);
    root.innerHTML = `
      <article class="article">
        <div class="article-body markdown">${html}</div>
      </article>
    `;
    setPageMeta({ title: '关于', description: textExcerpt(raw) });
  } catch (e) {
    errorState(root, '/about');
  }
}

async function renderTools(params, root) {
  root.innerHTML = `<div class="page-state">加载中…</div>`;
  try {
    const tools = await fetchTools();
    root.innerHTML = `
      <header class="page-head">
        <h1 class="page-title">工具箱</h1>
        <p class="page-subtitle">日常使用的在线工具</p>
      </header>
      <div class="tool-list">
        ${tools
          .map(
            (tool) => `
          <a class="tool-card" href="${escapeHtml(
            tool.url
          )}" target="_blank" rel="noopener noreferrer">
            <span class="tool-icon" aria-hidden="true">
              <svg class="icon icon-20"><use href="#icon-tool"/></svg>
            </span>
            <span class="tool-body">
              <span class="tool-name">${escapeHtml(tool.name)}</span>
              <span class="tool-desc">${escapeHtml(tool.desc)}</span>
            </span>
            <span class="tool-ext" aria-hidden="true">
              <svg class="icon icon-20"><use href="#icon-external-link"/></svg>
            </span>
          </a>`
          )
          .join('')}
      </div>
    `;
    setPageMeta({ title: '工具箱', description: '日常使用的在线工具入口' });
  } catch (e) {
    errorState(root, '/tools');
  }
}

function renderNotFound(root) {
  root.innerHTML = `
    <div class="not-found">
      <h1 class="page-title">页面不存在</h1>
      <p class="page-subtitle">你访问的页面找不到了。</p>
      <a class="btn" href="#/">返回首页</a>
    </div>
  `;
  setPageMeta({ title: '页面不存在' });
}

// ---------- 移动端菜单切换 ----------
function setupMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('navMenu');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    menu.classList.toggle('open', !open);
    toggle.setAttribute('aria-label', !open ? '关闭导航菜单' : '打开导航菜单');
  });
  menu.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
    });
  });
}

// ---------- 注册路由并启动 ----------
// 每次进入路由先清理文章页的滚动监听与进度条（文章页由 enhanceArticle 自行重建）
function withCleanup(handler) {
  return async (params, root) => {
    resetArticleEnhancements();
    await handler(params, root);
  };
}

registerRoute('/', withCleanup(renderHome));
registerRoute('/home', withCleanup(renderHome));
registerRoute('/post/:slug', withCleanup(renderPost));
registerRoute('/tag/:name', withCleanup(renderTag));
registerRoute('/tags', withCleanup(renderTags));
registerRoute('/about', withCleanup(renderAbout));
registerRoute('/tools', withCleanup(renderTools));
registerNotFound((root) => {
  resetArticleEnhancements();
  renderNotFound(root);
});

setupMobileMenu();
setupBackToTop();
startRouter();
