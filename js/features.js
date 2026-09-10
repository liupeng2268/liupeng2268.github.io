// features.js —— 站点增强：搜索 / 目录 / 上下篇 / 阅读进度 / 代码复制
// 设计约束：图标只用 index.html 中锁定的 Lucide SVG，本模块不引入新图标、不用 emoji。

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ============================================================
   一、文章搜索
   ============================================================ */
let searchQuery = '';
let searchScope = '';

function matchPost(post, q) {
  if (!q) return true;
  const k = q.toLowerCase();
  return [post.title, post.excerpt, post.date, (post.tags || []).join(' ')]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase().includes(k));
}

function searchBoxHtml() {
  return `
    <div class="search-box">
      <input
        class="search-input"
        id="searchInput"
        type="search"
        placeholder="搜索标题、摘要或标签"
        aria-label="搜索文章"
        autocomplete="off"
      />
      <button class="search-clear" id="searchClear" type="button" hidden>清除</button>
    </div>
    <p class="search-hint" id="searchHint" hidden></p>
  `;
}

// 绑定搜索框：输入时按关键词重渲染列表
// scope 用于隔离不同列表的搜索词：同 scope 内返回时保留，跨 scope 自动清空
function bindSearch({ root, posts, scope = 'home', renderList }) {
  const input = root.querySelector('#searchInput');
  const clearBtn = root.querySelector('#searchClear');
  const hint = root.querySelector('#searchHint');
  const listEl = root.querySelector('#postList');
  if (!input || !listEl) return;

  if (scope !== searchScope) {
    searchScope = scope;
    searchQuery = '';
  }
  input.value = searchQuery;

  const apply = () => {
    searchQuery = input.value.trim();
    const filtered = posts.filter((p) => matchPost(p, searchQuery));
    listEl.innerHTML = renderList(filtered);
    if (clearBtn) clearBtn.hidden = !searchQuery;
    if (hint) {
      if (searchQuery) {
        hint.textContent = `匹配 ${filtered.length} 篇（共 ${posts.length} 篇）`;
        hint.hidden = false;
      } else {
        hint.hidden = true;
      }
    }
  };

  input.addEventListener('input', apply);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      input.value = '';
      apply();
    }
  });
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      apply();
      input.focus();
    });
  }
  apply();
}

/* ============================================================
   二、文章目录（TOC）+ 阅读进度
   ============================================================ */
let articleEl = null;
let tocHeadings = [];
let tocLinks = [];

function slugify(text, used) {
  const base =
    String(text)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '') || 'section';
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

function buildToc(body, headings, slug) {
  const used = new Set();
  const items = headings.map((h) => {
    if (!h.id) h.id = slugify(h.textContent, used);
    const text = escapeHtml(h.textContent || '');
    const cls = h.tagName.toLowerCase() === 'h3' ? ' toc-link-lv3' : '';
    return `<li><a class="toc-link${cls}" href="#/post/${encodeURIComponent(
      slug
    )}#${encodeURIComponent(h.id)}">${text}</a></li>`;
  });
  const nav = document.createElement('details');
  nav.className = 'toc';
  nav.open = true;
  nav.innerHTML = `
    <summary class="toc-summary">目录</summary>
    <nav class="toc-nav" aria-label="文章目录"><ul class="toc-list">${items.join(
      ''
    )}</ul></nav>
  `;
  body.parentNode.insertBefore(nav, body);
}

function updateProgress() {
  const bar = document.getElementById('readingProgress');
  if (!bar) return;
  if (!articleEl) {
    bar.style.width = '0%';
    bar.classList.remove('is-active');
    return;
  }
  const rect = articleEl.getBoundingClientRect();
  const total = articleEl.offsetHeight - window.innerHeight;
  let pct = total > 0 ? -rect.top / total : rect.top <= 0 ? 1 : 0;
  pct = Math.min(1, Math.max(0, pct));
  bar.style.width = `${(pct * 100).toFixed(2)}%`;
  bar.classList.toggle('is-active', pct > 0.001);
}

function updateTocActive() {
  if (!tocHeadings.length) return;
  let idx = 0;
  for (let i = 0; i < tocHeadings.length; i += 1) {
    if (tocHeadings[i].getBoundingClientRect().top <= 100) idx = i;
    else break;
  }
  const atBottom =
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
  if (atBottom) idx = tocHeadings.length - 1;
  tocLinks.forEach((a, i) => a.classList.toggle('is-active', i === idx));
}

// 滚动事件每秒可触发上百次，而屏幕最多 60 帧。
// 用 rAF + 开关把一帧内的多次事件合并成一次执行（节流），避免无谓的布局计算。
let scrollTicking = false;
function onScroll() {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(() => {
    scrollTicking = false;
    updateProgress();
    updateTocActive();
  });
}

/* ============================================================
   三、代码块复制
   ============================================================ */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    /* 降级到 execCommand */
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch (e) {
    ok = false;
  }
  document.body.removeChild(ta);
  return ok;
}

function bindCodeCopy(body) {
  body.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy')) return;
    pre.classList.add('code-block');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'code-copy';
    btn.textContent = '复制';
    btn.addEventListener('click', async () => {
      const code = pre.querySelector('code');
      const ok = await copyText((code || pre).textContent || '');
      btn.textContent = ok ? '已复制' : '复制失败';
      btn.classList.toggle('is-done', ok);
      setTimeout(() => {
        btn.textContent = '复制';
        btn.classList.remove('is-done');
      }, 1600);
    });
    pre.appendChild(btn);
  });
}

/* ============================================================
   四、返回顶部
   ============================================================ */
let toTopBtn = null;
let toTopTicking = false;

function onScrollToTop() {
  if (toTopTicking) return;
  toTopTicking = true;
  window.requestAnimationFrame(() => {
    toTopTicking = false;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (toTopBtn) toTopBtn.classList.toggle('is-visible', y > 400);
  });
}

// 系统开启「减弱动态效果」时用瞬间滚动，避免平滑动画引起不适
function scrollBehavior() {
  const reduce =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduce ? 'auto' : 'smooth';
}

// 只在启动时调用一次：与文章页的监听互相独立，切换路由不受影响
export function setupBackToTop() {
  toTopBtn = document.getElementById('toTop');
  if (!toTopBtn) return;
  toTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  });
  window.addEventListener('scroll', onScrollToTop, { passive: true });
  onScrollToTop();
}

/* ============================================================
   五、对外接口
   ============================================================ */

// 文章页渲染完成后调用：生成目录、复制按钮，开启滚动监听
export function enhanceArticle({ root, slug }) {
  resetArticleEnhancements();
  const article = root.querySelector('.article');
  const body = root.querySelector('.article-body');
  if (!article || !body) return;

  const headings = Array.from(body.querySelectorAll('h2, h3'));
  if (headings.length >= 2) {
    buildToc(body, headings, slug);
    tocHeadings = headings;
    tocLinks = Array.from(root.querySelectorAll('.toc-link'));
  }

  bindCodeCopy(body);

  articleEl = article;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
}

// 离开文章页时清理
export function resetArticleEnhancements() {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('resize', onScroll);
  articleEl = null;
  tocHeadings = [];
  tocLinks = [];
  const bar = document.getElementById('readingProgress');
  if (bar) {
    bar.style.width = '0%';
    bar.classList.remove('is-active');
  }
}

// 估算阅读时长（中文按 400 字/分钟，西文按 200 词/分钟）
export function readingMinutes(content) {
  const text = String(content || '');
  const cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const words = (text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z0-9]+/g) || [])
    .length;
  return Math.max(1, Math.round(cjk / 400 + words / 200));
}

// 上一篇 / 下一篇：列表按日期降序，左侧为较新一篇，右侧为较早一篇
export function pagerHtml(posts, slug) {
  const list = posts.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const i = list.findIndex((p) => p.slug === slug);
  if (i === -1 || list.length < 2) return '';
  const newer = list[i - 1];
  const older = list[i + 1];
  const item = (post, label, dir) =>
    post
      ? `<a class="pager-item pager-${dir}" href="#/post/${encodeURIComponent(post.slug)}">
           <span class="pager-label">${label}</span>
           <span class="pager-title">${escapeHtml(post.title)}</span>
         </a>`
      : `<span class="pager-item pager-${dir} is-empty"><span class="pager-label">${label}</span></span>`;
  return `
    <nav class="pager" aria-label="上下篇导航">
      ${item(newer, '较新一篇', 'prev')}
      ${item(older, '较早一篇', 'next')}
    </nav>
  `;
}

export { searchBoxHtml, bindSearch, escapeHtml };
