/**
 * 性能分析器
 * 提供代码执行时间分析、内存分析、调用栈追踪等功能
 */

import { logger } from './logger';

/**
 * 性能分析结果
 */
export interface ProfileResult {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  memoryDelta: {
    heapUsed: number;
    external: number;
  };
  children: ProfileResult[];
}

/**
 * 性能分析器
 */
export class Profiler {
  private static stack: ProfileResult[] = [];
  private static activeProfiles = new Map<string, ProfileResult>();

  /**
   * 开始性能分析
   */
  static start(name: string): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage();

    const profile: ProfileResult = {
      name,
      duration: 0,
      startTime,
      endTime: 0,
      memoryBefore,
      memoryAfter: memoryBefore,
      memoryDelta: { heapUsed: 0, external: 0 },
      children: [],
    };

    // 如果有父级，添加到父级的子节点
    if (this.stack.length > 0) {
      this.stack[this.stack.length - 1].children.push(profile);
    }

    this.stack.push(profile);
    this.activeProfiles.set(id, profile);

    return id;
  }

  /**
   * 结束性能分析
   */
  static end(id: string): ProfileResult | null {
    const profile = this.activeProfiles.get(id);
    if (!profile) {
      logger.warn(`[Profiler] No active profile found for id: ${id}`);
      return null;
    }

    profile.endTime = Date.now();
    profile.duration = profile.endTime - profile.startTime;
    profile.memoryAfter = process.memoryUsage();
    profile.memoryDelta.heapUsed = profile.memoryAfter.heapUsed - profile.memoryBefore.heapUsed;
    profile.memoryDelta.external = profile.memoryAfter.external - profile.memoryBefore.external;

    // 从栈中移除
    const stackIndex = this.stack.indexOf(profile);
    if (stackIndex !== -1) {
      this.stack.splice(stackIndex, 1);
    }

    this.activeProfiles.delete(id);

    // 如果是根级分析，记录结果
    if (this.stack.length === 0) {
      this.logResult(profile);
    }

    return profile;
  }

  /**
   * 包装函数进行性能分析
   */
  static async profile<T>(
    name: string,
    fn: () => Promise<T>,
    options: { log?: boolean; threshold?: number } = {}
  ): Promise<T> {
    const { log = true, threshold = 100 } = options;

    const id = Profiler.start(name);
    try {
      const result = await fn();
      const profile = Profiler.end(id);

      if (profile && log && profile.duration >= threshold) {
        logger.warn(`[Profiler] ${name} took ${profile.duration}ms (threshold: ${threshold}ms)`);
      }

      return result;
    } catch (error) {
      Profiler.end(id);
      throw error;
    }
  }

  /**
   * 同步版本的性能分析
   */
  static profileSync<T>(
    name: string,
    fn: () => T,
    options: { log?: boolean; threshold?: number } = {}
  ): T {
    const { log = true, threshold = 100 } = options;

    const id = Profiler.start(name);
    try {
      const result = fn();
      const profile = Profiler.end(id);

      if (profile && log && profile.duration >= threshold) {
        logger.warn(`[Profiler] ${name} took ${profile.duration}ms (threshold: ${threshold}ms)`;
      }

      return result;
    } catch (error) {
      Profiler.end(id);
      throw error;
    }
  }

  /**
   * 记录分析结果
   */
  private static logResult(profile: ProfileResult, depth: number = 0): void {
    const indent = '  '.repeat(depth);
    const memoryMB = (profile.memoryDelta.heapUsed / 1024 / 1024).toFixed(2);

    logger.debug(
      `${indent}[Profiler] ${profile.name}: ${profile.duration}ms, Memory: ${memoryMB}MB`
    );

    // 递归记录子节点
    profile.children.forEach(child => {
      this.logResult(child, depth + 1);
    });
  }

  /**
   * 获取内存快照
   */
  static getMemorySnapshot(): NodeJS.MemoryUsage {
    return process.memoryUsage();
  }

  /**
   * 格式化内存使用
   */
  static formatMemory(usage: NodeJS.MemoryUsage): string {
    return {
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      external: `${(usage.external / 1024 / 1024).toFixed(2)}MB`,
    };
  }
}

/**
 * 调用栈追踪器
 */
export class CallTracer {
  private static calls: Array<{
    function: string;
    timestamp: number;
    duration: number;
    success: boolean;
  }> = [];

  /**
   * 记录函数调用
   */
  static record(
    functionName: string,
    duration: number,
    success: boolean = true
  ): void {
    this.calls.push({
      function: functionName,
      timestamp: Date.now(),
      duration,
      success,
    });

    // 限制记录数量，避免内存泄漏
    if (this.calls.length > 1000) {
      this.calls = this.calls.slice(-500);
    }
  }

  /**
   * 包装函数进行调用追踪
   */
  static async trace<T>(
    functionName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.record(functionName, duration, true);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.record(functionName, duration, false);
      throw error;
    }
  }

  /**
   * 获取调用统计
   */
  static getStats(): {
    totalCalls: number;
    successRate: number;
    avgDuration: number;
    slowestCalls: Array<{ function: string; duration: number }>;
  } {
    const totalCalls = this.calls.length;
    if (totalCalls === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        avgDuration: 0,
        slowestCalls: [],
      };
    }

    const successCount = this.calls.filter(c => c.success).length;
    const avgDuration = this.calls.reduce((sum, c) => sum + c.duration, 0) / totalCalls;
    const slowestCalls = [...this.calls]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(c => ({ function: c.function, duration: c.duration }));

    return {
      totalCalls,
      successRate: (successCount / totalCalls) * 100,
      avgDuration,
      slowestCalls,
    };
  }

  /**
   * 清空调用记录
   */
  static clear(): void {
    this.calls = [];
  }
}

/**
 * 装饰器：自动分析方法性能
 */
export function Profiled(
  options: { threshold?: number; log?: boolean } = {}
) {
  const { threshold = 50, log = true } = options;

  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const methodName = `${target.constructor.name}.${propertyKey}`;
      const id = Profiler.start(methodName);

      try {
        const result = await originalMethod.apply(this, args);
        const profile = Profiler.end(id);

        if (profile && log && profile.duration >= threshold) {
          logger.warn(`[Profiled] ${methodName} took ${profile.duration}ms`);
        }

        return result;
      } catch (error) {
        Profiler.end(id);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * 装饰器：自动追踪方法调用
 */
export function Traced(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const methodName = `${target.constructor.name}.${propertyKey}`;
    return CallTracer.trace(methodName, async () => {
      return await originalMethod.apply(this, args);
    });
  };

  return descriptor;
}
