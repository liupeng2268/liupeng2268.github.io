// data.js —— 数据获取层（统一返回 Promise，出错抛异常由路由层处理）

export async function fetchPosts() {
  const res = await fetch('./data/posts.json');
  if (!res.ok) throw new Error('加载文章列表失败');
  return res.json();
}

export async function fetchTools() {
  const res = await fetch('./data/tools.json');
  if (!res.ok) throw new Error('加载工具箱失败');
  return res.json();
}

export async function fetchArticle(slug) {
  const res = await fetch(`./articles/${slug}.md`);
  if (!res.ok) throw new Error('文章不存在');
  return res.text();
}

export async function fetchAbout() {
  const res = await fetch('./about.md');
  if (!res.ok) throw new Error('加载关于页失败');
  return res.text();
}
