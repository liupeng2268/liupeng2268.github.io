// router.js —— 哈希路由
// 路由形如：#/  #/post/:slug  #/tag/:name  #/tags  #/about  #/tools

const routes = [];
let notFoundHandler = null;

function extractKeys(pattern) {
  return (pattern.match(/:([^/]+)/g) || []).map((k) => k.slice(1));
}

export function registerRoute(pattern, handler) {
  routes.push({ pattern, handler, keys: extractKeys(pattern) });
}

export function registerNotFound(handler) {
  notFoundHandler = handler;
}

export function navigate(path) {
  const target = '#' + path;
  if (location.hash === target) {
    handleRoute();
  } else {
    location.hash = target;
  }
}

function parseHash() {
  let hash = location.hash || '#/';
  if (hash.startsWith('#')) hash = hash.slice(1);
  if (!hash.startsWith('/')) hash = '/' + hash;
  return hash;
}

function matchRoute(path) {
  for (const r of routes) {
    const regex = new RegExp(
      '^' +
        r.pattern.replace(/:[^/]+/g, '([^/]+)').replace(/\//g, '\\/') +
        '$'
    );
    const m = path.match(regex);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => {
        params[k] = decodeURIComponent(m[i + 1]);
      });
      return { handler: r.handler, params };
    }
  }
  return null;
}

function updateNavActive(path) {
  document.querySelectorAll('.nav-link').forEach((link) => {
    const route = link.getAttribute('data-route');
    let active = false;
    if (route === 'home' && (path === '/' || path === '/home')) active = true;
    else if (route === 'tags' && (path === '/tags' || path.startsWith('/tag/'))) active = true;
    else if (route === 'about' && path === '/about') active = true;
    else if (route === 'tools' && path === '/tools') active = true;
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

async function handleRoute() {
  const path = parseHash();
  const app = document.getElementById('app');
  const matched = matchRoute(path);
  if (matched) {
    try {
      await matched.handler(matched.params, app);
    } catch (err) {
      console.error('[router] 渲染异常：', err);
    }
  } else if (notFoundHandler) {
    notFoundHandler(app);
  }
  window.scrollTo(0, 0);
  updateNavActive(path);
}

export function startRouter() {
  window.addEventListener('hashchange', handleRoute);
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', handleRoute);
  } else {
    handleRoute();
  }
}
