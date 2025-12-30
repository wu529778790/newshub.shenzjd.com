#!/usr/bin/env node
/**
 * Docker 启动脚本
 * 用于启动 Nitro 构建的服务器
 */

import http from 'node:http';
import { handler } from './.output/server/index.mjs';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 创建 HTTP 服务器
const server = http.createServer(handler);

// 启动服务器
server.listen(PORT, HOST, () => {
  console.log(`🚀 NewsHub 服务器已启动`);
  console.log(`   访问地址: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`   环境变量: NODE_ENV=${process.env.NODE_ENV || 'undefined'}`);
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
