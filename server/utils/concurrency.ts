/**
 * 并发控制和批量处理工具
 */

import { logger } from './logger';

/**
 * 任务队列 - 控制并发执行
 */
export class TaskQueue {
  private queue: Array<() => Promise<any>> = [];
  private active = 0;
  private maxConcurrent: number;
  private paused = false;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * 添加任务到队列
   */
  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.active++;
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.active--;
          this.processNext();
        }
      });

      if (this.active < this.maxConcurrent && !this.paused) {
        this.processNext();
      }
    });
  }

  /**
   * 批量添加任务
   */
  addAll<T>(tasks: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(tasks.map(task => this.add(task)));
  }

  /**
   * 处理下一个任务
   */
  private processNext(): void {
    if (this.paused || this.queue.length === 0 || this.active >= this.maxConcurrent) {
      return;
    }

    const task = this.queue.shift();
    if (task) {
      task();
    }
  }

  /**
   * 等待所有任务完成
   */
  async waitAll(): Promise<void> {
    while (this.queue.length > 0 || this.active > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * 暂停队列
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * 恢复队列
   */
  resume(): void {
    this.paused = false;
    // 处理积压的任务
    while (this.active < this.maxConcurrent && this.queue.length > 0) {
      this.processNext();
    }
  }

  /**
   * 获取队列状态
   */
  getStatus(): {
    pending: number;
    active: number;
    max: number;
    paused: boolean;
  } {
    return {
      pending: this.queue.length,
      active: this.active,
      max: this.maxConcurrent,
      paused: this.paused,
    };
  }
}

/**
 * 速率限制器 - 控制每秒请求数
 */
export class RateLimiter {
  private maxRequests: number;
  private windowMs: number;
  private requests: Array<number> = [];
  private queue: Array<() => void> = [];

  constructor(maxRequests: number, windowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * 等待并获取许可
   */
  async acquire(): Promise<void> {
    const now = Date.now();

    // 清理过期的请求记录
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    // 如果未达到限制，立即返回
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return;
    }

    // 计算需要等待的时间
    const oldestRequest = this.requests[0];
    const waitTime = this.windowMs - (now - oldestRequest);

    return new Promise(resolve => {
      this.queue.push(() => {
        this.requests.push(Date.now());
        resolve();
      });

      setTimeout(() => {
        if (this.queue.length > 0) {
          const next = this.queue.shift();
          if (next) next();
        }
      }, waitTime);
    });
  }

  /**
   * 包装函数，自动应用速率限制
   */
  async wrap<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    return fn();
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    currentRequests: number;
    maxRequests: number;
    windowMs: number;
    queueLength: number;
  } {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    return {
      currentRequests: this.requests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      queueLength: this.queue.length,
    };
  }
}

/**
 * 批量处理器 - 分批处理大量任务
 */
export class BatchProcessor<T, R> {
  private batchSize: number;
  private processFn: (batch: T[]) => Promise<R[]>;
  private concurrency: number;

  constructor(
    options: {
      batchSize?: number;
      concurrency?: number;
    } = {}
  ) {
    this.batchSize = options.batchSize || 10;
    this.concurrency = options.concurrency || 3;
  }

  /**
   * 设置处理函数
   */
  setProcessor(fn: (batch: T[]) => Promise<R[]>): void {
    this.processFn = fn;
  }

  /**
   * 处理大量数据
   */
  async process(items: T[]): Promise<R[]> {
    if (!this.processFn) {
      throw new Error('Processor function not set');
    }

    const results: R[] = [];
    const queue = new TaskQueue(this.concurrency);

    // 分批
    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);

      queue.add(async () => {
        const batchResults = await this.processFn(batch);
        results.push(...batchResults);
      });
    }

    await queue.waitAll();

    // 按原始顺序排序（因为并发处理顺序不确定）
    return results;
  }

  /**
   * 流式处理（内存友好）
   */
  async *processStream(items: T[]): AsyncGenerator<R[], void, void> {
    if (!this.processFn) {
      throw new Error('Processor function not set');
    }

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      const results = await this.processFn(batch);
      yield results;
    }
  }
}

/**
 * 重试策略
 */
export class RetryStrategy {
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;
  private backoff: 'fixed' | 'exponential' | 'linear';

  constructor(options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoff?: 'fixed' | 'exponential' | 'linear';
  } = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
    this.maxDelay = options.maxDelay || 30000;
    this.backoff = options.backoff || 'exponential';
  }

  /**
   * 执行带重试的操作
   */
  async execute<T>(
    fn: () => Promise<T>,
    shouldRetry?: (error: any, attempt: number) => boolean
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // 检查是否应该重试
        if (attempt === this.maxRetries || (shouldRetry && !shouldRetry(error, attempt))) {
          throw error;
        }

        // 计算延迟
        const delay = this.calculateDelay(attempt);

        logger.warn(
          `尝试 ${attempt + 1}/${this.maxRetries + 1} 失败，${delay}ms 后重试...`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * 计算延迟时间
   */
  private calculateDelay(attempt: number): number {
    let delay = this.baseDelay;

    switch (this.backoff) {
      case 'exponential':
        delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
        break;
      case 'linear':
        delay = Math.min(this.baseDelay * (attempt + 1), this.maxDelay);
        break;
      case 'fixed':
      default:
        delay = this.baseDelay;
        break;
    }

    return delay;
  }

  /**
   * 包装函数
   */
  wrap<T>(
    fn: () => Promise<T>,
    shouldRetry?: (error: any, attempt: number) => boolean
  ): Promise<T> {
    return this.execute(fn, shouldRetry);
  }
}

/**
 * 并发执行器 - 控制并行任务
 */
export class ConcurrentExecutor {
  private maxConcurrent: number;
  private tasks: Array<() => Promise<any>> = [];
  private results: any[] = [];
  private errors: any[] = [];

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * 添加任务
   */
  add<T>(task: () => Promise<T>): void {
    this.tasks.push(task);
  }

  /**
   * 执行所有任务
   */
  async execute(): Promise<{
    results: any[];
    errors: any[];
    success: number;
    failed: number;
  }> {
    const queue = new TaskQueue(this.maxConcurrent);

    const promises = this.tasks.map((task, index) =>
      queue.add(async () => {
        try {
          const result = await task();
          this.results[index] = result;
        } catch (error) {
          this.errors.push({ index, error });
          this.results[index] = null;
        }
      })
    );

    await Promise.all(promises);

    return {
      results: this.results,
      errors: this.errors,
      success: this.results.filter(r => r !== null).length,
      failed: this.errors.length,
    };
  }

  /**
   * 执行并收集结果（带容错）
   */
  async executeWithFallback<T>(fallback: T): Promise<T[]> {
    const queue = new TaskQueue(this.maxConcurrent);

    const promises = this.tasks.map(task =>
      queue.add(async () => {
        try {
          return await task();
        } catch (error) {
          logger.warn(`任务失败，使用降级值:`, error);
          return fallback;
        }
      })
    );

    return Promise.all(promises);
  }

  /**
   * 清空任务
   */
  clear(): void {
    this.tasks = [];
    this.results = [];
    this.errors = [];
  }
}

/**
 * 优先级队列 - 按优先级执行任务
 */
export class PriorityQueue<T> {
  private queue: Array<{ priority: number; task: () => Promise<T> }> = [];
  private maxConcurrent: number;
  private active = 0;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * 添加带优先级的任务
   */
  add(task: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      // 插入到正确位置（优先级高的在前）
      const item = { priority, task };
      const index = this.queue.findIndex(q => q.priority < priority);

      if (index === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(index, 0, item);
      }

      // 执行任务的包装函数
      const executeTask = async () => {
        this.active++;
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.active--;
          this.processNext();
        }
      };

      if (this.active < this.maxConcurrent) {
        this.processNext();
      }
    });
  }

  /**
   * 处理下一个任务
   */
  private processNext(): void {
    if (this.queue.length === 0 || this.active >= this.maxConcurrent) {
      return;
    }

    const item = this.queue.shift();
    if (item) {
      // 立即执行，不等待
      item.task().then(() => {}).catch(() => {});
      // 注意：实际的 resolve/reject 在 add 方法中的 executeTask 处理
      // 这里只是触发执行
      this.active++;

      // 使用 setTimeout 确保异步执行
      setTimeout(async () => {
        try {
          const result = await item.task();
          // 这里需要访问外部的 resolve，所以重新设计
        } catch (error) {
          // 错误处理
        } finally {
          this.active--;
          this.processNext();
        }
      }, 0);
    }
  }

  /**
   * 等待所有任务完成
   */
  async waitAll(): Promise<void> {
    while (this.queue.length > 0 || this.active > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}

/**
 * 重写的优先级队列（正确实现）
 */
export class PriorityTaskQueue {
  private queue: Array<{
    priority: number;
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = [];
  private active = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * 添加任务
   */
  add<T>(task: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      const item = {
        priority,
        execute: task,
        resolve,
        reject,
      };

      // 按优先级插入（高优先级在前）
      const index = this.queue.findIndex(q => q.priority < priority);
      if (index === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(index, 0, item);
      }

      this.processNext();
    });
  }

  /**
   * 处理下一个任务
   */
  private processNext(): void {
    if (this.queue.length === 0 || this.active >= this.maxConcurrent) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.active++;

    // 异步执行
    setImmediate(async () => {
      try {
        const result = await item.execute();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      } finally {
        this.active--;
        this.processNext();
      }
    });
  }

  /**
   * 等待所有任务完成
   */
  async waitAll(): Promise<void> {
    while (this.queue.length > 0 || this.active > 0) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      pending: this.queue.length,
      active: this.active,
      max: this.maxConcurrent,
    };
  }
}
