// md.js —— Markdown 解析与净化
// 依赖 CDN 全局变量：window.marked、window.DOMPurify

// 解析 front matter：切出 `---` 之间的元数据 + body
export function parseFrontMatter(raw) {
  const text = String(raw || '').trim();
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!fmMatch) {
    return { meta: {}, content: raw || '' };
  }
  const metaRaw = fmMatch[1];
  const content = fmMatch[2];
  const meta = {};
  for (const line of metaRaw.split('\n')) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      meta[key] = val
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      meta[key] = val.replace(/^["']|["']$/g, '');
    }
  }
  return { meta, content };
}

// 判断是否为站外链接：非 http(s) 一律算站内（如 #/post/xxx、mailto:）
function isExternal(href) {
  if (!/^https?:\/\//i.test(href)) return false;
  try {
    return new URL(href, location.href).host !== location.host;
  } catch (e) {
    return true;
  }
}

// 净化后的二次加工：外链新窗口打开 + 给表格套可滚动容器
// 用 <template> 承载：它的内容不渲染、不加载资源、不进文档流，适合处理 HTML 字符串
function postProcess(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;

  tpl.content.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!isExternal(href)) return;
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });

  tpl.content.querySelectorAll('table').forEach((table) => {
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  return tpl.innerHTML;
}

// 渲染 Markdown：marked 解析 → DOMPurify 净化 → 二次加工
export function renderMarkdown(md) {
  const rawHtml = window.marked.parse(md);
  const clean = window.DOMPurify.sanitize(rawHtml);
  return postProcess(clean);
}
