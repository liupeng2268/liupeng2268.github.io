// data.js —— 数据获取层（统一返回 Promise，出错抛异常由路由层处理）
// 站点为静态内容，正文与索引在单次会话内缓存，避免目录跳转时重复请求。

const cache = new Map();

async function cached(key, loader) {
  if (cache.has(key)) return cache.get(key);
  const p = loader();
  cache.set(key, p);
  try {
    await p;
  } catch (e) {
    cache.delete(key); // 失败不留缓存，重试可恢复
  }
  return p;
}

export async function fetchPosts() {
  return cached('posts', async () => {
    const res = await fetch('./data/posts.json');
    if (!res.ok) throw new Error('加载文章列表失败');
    return res.json();
  });
}

export async function fetchTools() {
  return cached('tools', async () => {
    const res = await fetch('./data/tools.json');
    if (!res.ok) throw new Error('加载工具箱失败');
    return res.json();
  });
}

export async function fetchArticle(slug) {
  return cached(`article:${slug}`, async () => {
    const res = await fetch(`./articles/${encodeURIComponent(slug)}.md`);
    if (!res.ok) throw new Error('文章不存在');
    return res.text();
  });
}

export async function fetchAbout() {
  return cached('about', async () => {
    const res = await fetch('./about.md');
    if (!res.ok) throw new Error('加载关于页失败');
    return res.text();
  });
}
