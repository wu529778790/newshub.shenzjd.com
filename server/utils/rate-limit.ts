/**
 * IP 级别的速率限制器
 * 防止 API 滥用和 DDoS 攻击
 */

import { logger } from './logger';

interface RateLimitConfig {
  maxRequests: number;      // 最大请求数
  windowMs: number;         // 时间窗口（毫秒）
  blockDuration?: number;   // 封锁持续时间（毫秒）
  skip?: (event: any) => boolean;  // 跳过限制的条件
}

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
  blockedUntil?: number;
}

export class RateLimitManager {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private config: RateLimitConfig) {
    // 定期清理过期记录
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 检查请求是否被允许
   */
  isAllowed(event: any): boolean {
    // 检查是否需要跳过
    if (this.config.skip && this.config.skip(event)) {
      return true;
    }

    const ip = this.getClientIP(event);
    if (!ip) return true;

    const now = Date.now();
    const entry = this.store.get(ip);

    // 检查是否被封锁
    if (entry?.blockedUntil && entry.blockedUntil > now) {
      logger.warn(`[RateLimit] IP ${ip} is blocked until ${new Date(entry.blockedUntil)}`);
      return false;
    }

    // 如果没有记录，创建新记录
    if (!entry) {
      this.store.set(ip, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
      });
      return true;
    }

    // 检查是否在时间窗口内
    if (now - entry.firstRequest < this.config.windowMs) {
      // 在窗口内，增加计数
      entry.count++;
      entry.lastRequest = now;

      // 检查是否超过限制
      if (entry.count > this.config.maxRequests) {
        // 封锁 IP
        const blockDuration = this.config.blockDuration || this.config.windowMs;
        entry.blockedUntil = now + blockDuration;

        logger.warn(
          `[RateLimit] IP ${ip} exceeded limit (${entry.count}/${this.config.maxRequests}), ` +
          `blocked for ${blockDuration}ms`
        );

        return false;
      }
    } else {
      // 超出窗口，重置计数
      entry.count = 1;
      entry.firstRequest = now;
      entry.lastRequest = now;
      entry.blockedUntil = undefined;
    }

    return true;
  }

  /**
   * 获取客户端 IP
   */
  private getClientIP(event: any): string | null {
    const req = event.node.req;

    // 从代理头中获取真实 IP
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }

    // 从真实 IP 头获取
    const realIP = req.headers['x-real-ip'];
    if (realIP) return realIP;

    // 直接连接
    return req.socket?.remoteAddress || null;
  }

  /**
   * 清理过期记录
   */
  private cleanup(): void {
    const now = Date.now();
    const timeout = this.config.windowMs + (this.config.blockDuration || 0);

    for (const [ip, entry] of this.store.entries()) {
      // 如果最后请求时间超过超时时间，删除记录
      if (now - entry.lastRequest > timeout) {
        this.store.delete(ip);
      }
    }
  }

  /**
   * 获取状态
   */
  getStatus(): {
    totalIPs: number;
    blockedIPs: number;
    config: RateLimitConfig;
  } {
    const now = Date.now();
    const blockedIPs = Array.from(this.store.values()).filter(
      e => e.blockedUntil && e.blockedUntil > now
    ).length;

    return {
      totalIPs: this.store.size,
      blockedIPs,
      config: this.config,
    };
  }

  /**
   * 手动解除封锁
   */
  unblockIP(ip: string): boolean {
    const entry = this.store.get(ip);
    if (entry) {
      entry.blockedUntil = undefined;
      entry.count = 0;
      logger.info(`[RateLimit] IP ${ip} manually unblocked`);
      return true;
    }
    return false;
  }

  /**
   * 清理所有记录
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * 停止清理定时器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

/**
 * 全局速率限制器实例
 */
export const globalRateLimiter = new RateLimitManager({
  maxRequests: 60,          // 每分钟 60 次
  windowMs: 60000,
  blockDuration: 300000,    // 封锁 5 分钟
  skip: (event) => {
    // 跳过监控端点
    const path = event.node.req.url || '';
    if (path.startsWith('/api/v1/metrics')) return true;

    // 跳过健康检查
    if (path.startsWith('/health')) return true;

    return false;
  },
});

/**
 * API 级别的速率限制器
 */
export const apiRateLimiter = new RateLimitManager({
  maxRequests: 20,          // 批量 API 每分钟 20 次
  windowMs: 60000,
  blockDuration: 60000,     // 封锁 1 分钟
});

/**
 * 中间件：应用速率限制
 */
export function useRateLimit(event: any, limiter = globalRateLimiter): boolean {
  const allowed = limiter.isAllowed(event);

  if (!allowed) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      data: {
        message: '请求频率过高，请稍后再试',
        retryAfter: limiter.config.blockDuration || limiter.config.windowMs,
      },
    });
  }

  return true;
}
