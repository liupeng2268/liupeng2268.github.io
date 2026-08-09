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

// 渲染 Markdown：marked 解析 → DOMPurify 净化
export function renderMarkdown(md) {
  const rawHtml = window.marked.parse(md);
  const clean = window.DOMPurify.sanitize(rawHtml);
  return clean;
}
