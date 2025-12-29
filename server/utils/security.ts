/**
 * 安全工具
 * 提供基础的安全防护功能
 */

import crypto from 'crypto';

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

/**
 * 简单的输入清理
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // 移除 HTML 标签
    .replace(/script/gi, '') // 移除 script 关键字
    .trim();
}

/**
 * 验证 URL 格式
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * 生成请求 ID
 */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}`;
}

/**
 * 简单的哈希函数
 */
export function hashString(str: string, algorithm: string = 'sha256'): string {
  return crypto.createHash(algorithm).update(str).digest('hex');
}

/**
 * 检查敏感信息
 */
export function containsSensitiveInfo(text: string): boolean {
  const patterns = [
    /\b\d{11}\b/, // 手机号
    /\b\d{18}\b/, // 身份证号
    /\b\d{4}-\d{4}-\d{4}\b/, // 信用卡
    /password|secret|key/i, // 敏感关键词
  ];

  return patterns.some(pattern => pattern.test(text));
}

/**
 * 安全的 JSON 解析
 */
export function safeJsonParse(text: string, fallback: any = null): any {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/**
 * 深度对象清理（移除敏感字段）
 */
export function sanitizeObject(obj: any, sensitiveKeys: string[] = ['password', 'token', 'secret']): any {
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, sensitiveKeys));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      result[key] = '***REDACTED***';
    } else {
      result[key] = sanitizeObject(value, sensitiveKeys);
    }
  }

  return result;
}

/**
 * 速率限制检查
 */
export class RateLimitChecker {
  private attempts = new Map<string, { count: number; first: number }>();

  constructor(private maxAttempts: number = 5, private windowMs: number = 60000) {}

  check(identifier: string): boolean {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry) {
      this.attempts.set(identifier, { count: 1, first: now });
      return true;
    }

    // 检查是否在窗口内
    if (now - entry.first > this.windowMs) {
      // 超出窗口，重置
      this.attempts.set(identifier, { count: 1, first: now });
      return true;
    }

    // 增加计数
    entry.count++;

    // 检查是否超过限制
    if (entry.count > this.maxAttempts) {
      return false;
    }

    return true;
  }

  clear(identifier: string): void {
    this.attempts.delete(identifier);
  }

  cleanup(): void {
    const now = Date.now();
    for (const [id, entry] of this.attempts.entries()) {
      if (now - entry.first > this.windowMs) {
        this.attempts.delete(id);
      }
    }
  }
}

/**
 * 全局速率限制检查器
 */
export const globalRateLimitChecker = new RateLimitChecker(10, 60000);

/**
 * IP 白名单管理
 */
export class IpWhitelist {
  private ips: Set<string> = new Set();

  constructor(initialIps: string[] = []) {
    initialIps.forEach(ip => this.ips.add(ip));
  }

  add(ip: string): void {
    this.ips.add(ip);
  }

  remove(ip: string): void {
    this.ips.delete(ip);
  }

  has(ip: string): boolean {
    return this.ips.has(ip);
  }

  list(): string[] {
    return Array.from(this.ips);
  }

  clear(): void {
    this.ips.clear();
  }
}

/**
 * 全局 IP 白名单
 */
export const ipWhitelist = new IpWhitelist(
  process.env.IP_WHITELIST?.split(',') || []
);

/**
 * 检查是否允许访问
 */
export function isAllowedIP(ip: string): boolean {
  // 如果白名单为空，允许所有
  if (ipWhitelist.list().length === 0) return true;

  return ipWhitelist.has(ip);
}

/**
 * 生成安全头
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}
