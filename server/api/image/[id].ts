import { genSources } from "~/shared/pre-sources";

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id as string;

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing source id",
    });
  }

  const sources = genSources();
  const source = sources[id];

  if (!source) {
    throw createError({
      statusCode: 404,
      statusMessage: "Source not found",
    });
  }

  const hotListApi = `/api/hot-list?id=${id}`;
  const data = await $fetch(hotListApi).catch(() => []);

  if (!data || data.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: "No data available for image generation",
    });
  }

  const html = generateImageHTML(source, data);

  event.node.res.setHeader('Content-Type', 'text/html; charset=utf-8');
  event.node.res.end(html);
});

function generateImageHTML(source: any, items: any[]) {
  const topItems = items.slice(0, 10);
  const timestamp = new Date().toLocaleString('zh-CN');

  const colorMap: any = {
    red: { start: '#ef4444', end: '#dc2626', bg: '#fee2e2', text: '#dc2626' },
    blue: { start: '#3b82f6', end: '#2563eb', bg: '#dbeafe', text: '#2563eb' },
    green: { start: '#10b981', end: '#059669', bg: '#d1fae5', text: '#059669' },
    orange: { start: '#f59e0b', end: '#d97706', bg: '#fef3c7', text: '#d97706' },
    gray: { start: '#6b7280', end: '#4b5563', bg: '#f3f4f6', text: '#4b5563' },
    teal: { start: '#14b8a6', end: '#0d9488', bg: '#ccfbf1', text: '#0d9488' },
    emerald: { start: '#10b981', end: '#059669', bg: '#d1fae5', text: '#059669' },
    primary: { start: '#6366f1', end: '#4f46e5', bg: '#e0e7ff', text: '#4f46e5' },
  };

  const colors = colorMap[source.color] || colorMap.primary;

  const itemsHtml = topItems.map((item, index) => {
    const rankBg = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#f97316' : colors.bg;
    const rankColor = index < 3 ? 'white' : colors.text;

    return `
        <div class="item">
          <div class="rank" style="background: ${rankBg}; color: ${rankColor}">${index + 1}</div>
          <div>
            <div class="title">${escapeHtml(item.title)}</div>
            ${item.extra?.info ? `<div class="extra">${escapeHtml(item.extra.info)}</div>` : ''}
          </div>
        </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${source.name} - 热点分享图</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 600px; width: 100%; overflow: hidden; }
    .header { background: linear-gradient(135deg, ${colors.start} 0%, ${colors.end} 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; }
    .header .subtitle { font-size: 14px; opacity: 0.9; }
    .header .timestamp { font-size: 12px; margin-top: 12px; opacity: 0.8; }
    .content { padding: 20px; background: #f8fafc; }
    .item { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; border-left: 4px solid ${colors.start}; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; gap: 12px; align-items: flex-start; }
    .rank { background: ${colors.bg}; color: ${colors.text}; font-weight: 700; font-size: 14px; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .title { font-size: 15px; font-weight: 600; color: #1e293b; line-height: 1.5; flex: 1; }
    .extra { font-size: 12px; color: #64748b; margin-top: 4px; }
    .footer { padding: 16px 20px; background: white; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #64748b; }
    .logo { font-weight: 700; color: #334155; }
    .count { background: #f1f5f9; padding: 4px 12px; border-radius: 20px; font-weight: 600; color: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>${source.name}</h1>
      <div class="subtitle">${source.title || '热点聚合'}</div>
      <div class="timestamp">生成时间: ${timestamp}</div>
    </div>
    <div class="content">${itemsHtml}</div>
    <div class="footer">
      <div class="logo">NewsHub</div>
      <div class="count">共 ${items.length} 条热点</div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}
