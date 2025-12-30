#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { handler } from './.output/server/index.mjs';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 静态资源目录
const PUBLIC_DIR = path.join(process.cwd(), '.output', 'public');

// 检查文件是否存在并返回内容类型
function getContentType(extname) {
  const types = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.html': 'text/html',
    '.txt': 'text/plain'
  };
  return types[extname] || 'application/octet-stream';
}

// 处理静态资源请求
function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filepath = url.pathname;

  // 防止路径遍历攻击
  if (filepath.includes('..')) {
    return false;
  }

  // 如果是根路径，不处理（交给 Nitro）
  if (filepath === '/') {
    return false;
  }

  // 构建完整文件路径
  const fullPath = path.join(PUBLIC_DIR, filepath);

  // 检查文件是否存在
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return false;
  }

  // 读取并返回文件
  try {
    const extname = path.extname(fullPath);
    const contentType = getContentType(extname);
    const content = fs.readFileSync(fullPath);

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Length': content.length
    });
    res.end(content);
    return true;
  } catch (error) {
    console.error('静态资源服务错误:', error);
    return false;
  }
}

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // 尝试服务静态资源
  if (serveStatic(req, res)) {
    return;
  }

  // 其他请求交给 Nitro handler
  handler(req, res);
});

// 启动服务器
server.listen(PORT, HOST, () => {
  console.log(`🚀 NewsHub 服务器已启动`);
  console.log(`   访问地址: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`   静态目录: ${PUBLIC_DIR}`);
});

// 错误处理
server.on('error', (error) => {
  console.error('❌ 服务器启动失败:', error);
  process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM 信号收到，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT 信号收到，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
