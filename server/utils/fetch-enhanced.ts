import { $fetch } from 'ofetch';
import { NetworkError, ParseError, withErrorHandling } from './error-handler';
import { logger } from './logger';

/**
 * 增强的 fetch 工具，集成错误处理和重试机制
 */

const fetchInstance = $fetch.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  },
  timeout: 10000,
  retry: 0, // 禁用内置重试，使用我们自己的重试逻辑
});

export interface EnhancedFetchOptions {
  sourceId: string;
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  parseJson?: boolean;
  validate?: (data: any) => boolean;
}

/**
 * 增强的 fetch 函数
 */
export async function enhancedFetch<T = any>(
  url: string,
  options: EnhancedFetchOptions
): Promise<T> {
  const {
    sourceId,
    retries = 3,
    retryDelay = 1000,
    timeout = 10000,
    parseJson = true,
    validate
  } = options;

  return withErrorHandling(
    sourceId,
    async () => {
      try {
        // 设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetchInstance(url, {
          signal: controller.signal,
          timeout,
        });

        clearTimeout(timeoutId);

        // 检查 HTTP 状态
        if (!response.ok) {
          throw new NetworkError(sourceId, url, response, {
            status: response.status,
            statusText: response.statusText,
          });
        }

        // 解析数据
        let data: any = response;

        if (parseJson) {
          try {
            const text = await response.text();
            data = JSON.parse(text);
          } catch (e) {
            throw new ParseError(sourceId, response, 'Invalid JSON response');
          }
        }

        // 验证数据
        if (validate && !validate(data)) {
          throw new ParseError(
            sourceId,
            data,
            'Data validation failed',
            { url }
          );
        }

        return data;
      } catch (error) {
        // 如果是 AbortError，转换为 NetworkError
        if (error.name === 'AbortError') {
          throw new NetworkError(sourceId, url, undefined, {
            reason: 'timeout',
            timeout,
          });
        }

        // 如果是 NetworkError 或 ParseError，直接抛出
        if (error instanceof NetworkError || error instanceof ParseError) {
          throw error;
        }

        // 其他错误包装为 NetworkError
        throw new NetworkError(sourceId, url, undefined, {
          originalError: error,
        });
      }
    },
    {
      fallback: [],
      retryCount: retries,
      retryDelay,
    }
  );
}

/**
 * 获取原始响应（不解析 JSON）
 */
export async function enhancedFetchRaw(
  url: string,
  options: EnhancedFetchOptions
): Promise<Response> {
  const { sourceId, retries = 3, retryDelay = 1000, timeout = 10000 } = options;

  return withErrorHandling(
    sourceId,
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetchInstance.raw(url, {
          signal: controller.signal,
          timeout,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new NetworkError(sourceId, url, response, {
            status: response.status,
            statusText: response.statusText,
          });
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          throw new NetworkError(sourceId, url, undefined, {
            reason: 'timeout',
            timeout,
          });
        }

        if (error instanceof NetworkError) {
          throw error;
        }

        throw new NetworkError(sourceId, url, undefined, {
          originalError: error,
        });
      }
    },
    {
      fallback: null as any,
      retryCount: retries,
      retryDelay,
    }
  );
}

/**
 * HTML 内容获取（特殊处理）
 */
export async function fetchHtml(
  url: string,
  options: Omit<EnhancedFetchOptions, 'parseJson'>
): Promise<string> {
  const response = await enhancedFetchRaw(url, options);
  return response.text();
}

/**
 * JSONP 风格的数据获取
 */
export async function fetchJsonp<T = any>(
  url: string,
  options: EnhancedFetchOptions
): Promise<T> {
  const html = await fetchHtml(url, options);

  // 尝试提取 JSON 数据
  const jsonMatch = html.match(/<!--s-data:(.*?)-->/s) ||
                    html.match(/var\s+\w+\s*=\s*(\{[\s\S]*?\});/) ||
                    html.match(/callback\((.*?)\);/s);

  if (!jsonMatch || !jsonMatch[1]) {
    throw new ParseError(
      options.sourceId,
      html,
      'Failed to extract JSONP data'
    );
  }

  try {
    return JSON.parse(jsonMatch[1]);
  } catch (e) {
    throw new ParseError(
      options.sourceId,
      jsonMatch[1],
      'Invalid JSON in JSONP response'
    );
  }
}

/**
 * 重试包装器（带退避策略）
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoff?: 'fixed' | 'exponential' | 'linear';
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoff = 'exponential',
    shouldRetry = () => true
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // 检查是否应该重试
      if (attempt === retries || !shouldRetry(error)) {
        throw error;
      }

      // 计算延迟时间
      let delay = baseDelay;
      if (backoff === 'exponential') {
        delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      } else if (backoff === 'linear') {
        delay = Math.min(baseDelay * (attempt + 1), maxDelay);
      }

      logger.warn(
        `尝试 ${attempt + 1}/${retries + 1} 失败，${delay}ms 后重试...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 并发控制
 */
export class FetchLimiter {
  private queue: Array<() => Promise<any>> = [];
  private active = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          this.active++;
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.active--;
          this.processNext();
        }
      });

      if (this.active < this.maxConcurrent) {
        this.processNext();
      }
    });
  }

  private processNext(): void {
    if (this.queue.length === 0 || this.active >= this.maxConcurrent) {
      return;
    }

    const task = this.queue.shift();
    if (task) {
      task();
    }
  }

  async all<T>(fns: Array<() => Promise<T>>): Promise<T[]> {
    const promises = fns.map(fn => this.add(fn));
    return Promise.all(promises);
  }
}

/**
 * 批量获取工具
 */
export async function batchFetch<T>(
  urls: string[],
  options: {
    sourceId: string;
    concurrency?: number;
    retries?: number;
  }
): Promise<Array<{ success: boolean; data?: T; error?: any }>> {
  const { sourceId, concurrency = 3, retries = 2 } = options;

  const limiter = new FetchLimiter(concurrency);

  const results = await Promise.allSettled(
    urls.map((url, index) =>
      limiter.add(async () => {
        return enhancedFetch<T>(url, {
          sourceId: `${sourceId}-${index}`,
          retries,
        });
      })
    )
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value };
    } else {
      return {
        success: false,
        error: result.reason,
      };
    }
  });
}
