// seo.js —— 动态维护 <head> 里的标题与分享信息
// 为什么需要：本站是 SPA，切换路由不会重新加载 HTML，
// 写在 index.html 里的 <title> / meta 不会自动变，必须手动同步。

const SITE_NAME = '我的个人网页';
const SITE_DESC = 'Oracle 数据库运维笔记与前端学习记录';

// 找不到对应的 meta 标签就创建一个，避免 querySelector 返回 null 时报错
function ensureMeta(attr, key) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  return el;
}

// 统一入口：各路由渲染完成后调用
// title 传具体页面名（如文章标题），description 不传则用站点默认描述
export function setPageMeta({ title, description } = {}) {
  const desc = description || SITE_DESC;
  const full = title ? `${title} · ${SITE_NAME}` : SITE_NAME;

  document.title = full;

  ensureMeta('name', 'description').setAttribute('content', desc);
  ensureMeta('property', 'og:title').setAttribute('content', full);
  ensureMeta('property', 'og:description').setAttribute('content', desc);
  ensureMeta('property', 'og:url').setAttribute('content', location.href);
  ensureMeta('name', 'twitter:title').setAttribute('content', full);
  ensureMeta('name', 'twitter:description').setAttribute('content', desc);
}
