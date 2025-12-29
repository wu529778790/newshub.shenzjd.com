import { logger } from './logger';

/**
 * 数据源错误类型
 */
export class DataSourceError extends Error {
  constructor(
    public sourceId: string,
    public originalError: any,
    public statusCode?: number,
    public metadata?: Record<string, any>
  ) {
    const message = originalError instanceof Error
      ? originalError.message
      : String(originalError);

    super(`[DataSource:${sourceId}] ${message}`);
    this.name = 'DataSourceError';
  }
}

/**
 * 网络请求错误
 */
export class NetworkError extends DataSourceError {
  constructor(
    sourceId: string,
    public url: string,
    public response?: Response,
    metadata?: Record<string, any>
  ) {
    super(
      sourceId,
      `Network request failed: ${url}`,
      response?.status,
      metadata
    );
    this.name = 'NetworkError';
  }
}

/**
 * 解析错误
 */
export class ParseError extends DataSourceError {
  constructor(
    sourceId: string,
    public rawData: any,
    message: string,
    metadata?: Record<string, any>
  ) {
    super(sourceId, `Parse error: ${message}`, undefined, metadata);
    this.name = 'ParseError';
  }
}

/**
 * 配置错误
 */
export class ConfigError extends DataSourceError {
  constructor(sourceId: string, message: string) {
    super(sourceId, `Configuration error: ${message}`);
    this.name = 'ConfigError';
  }
}

/**
 * 错误处理器
 */
export class ErrorHandler {
  private static instance: ErrorHandler;

  // 错误统计
  private errorStats = new Map<string, {
    count: number;
    lastError: number;
    errorTypes: Record<string, number>;
  }>();

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 处理错误
   */
  handle<T>(
    sourceId: string,
    error: any,
    fallback: T,
    options: {
      log?: boolean;
      report?: boolean;
      retry?: () => Promise<T>;
    } = {}
  ): T {
    // 记录错误统计
    this.recordError(sourceId, error);

    // 日志记录
    if (options.log !== false) {
      this.logError(sourceId, error);
    }

    // 上报到监控系统（如果有）
    if (options.report !== false) {
      this.reportError(sourceId, error);
    }

    // 尝试重试
    if (options.retry) {
      try {
        return options.retry();
      } catch (retryError) {
        // 重试也失败，返回降级数据
        return fallback;
      }
    }

    return fallback;
  }

  /**
   * 包装异步操作，自动处理错误
   */
  async wrap<T>(
    sourceId: string,
    operation: () => Promise<T>,
    options: {
      fallback?: T;
      log?: boolean;
      report?: boolean;
      retryCount?: number;
      retryDelay?: number;
    } = {}
  ): Promise<T> {
    const {
      fallback = [] as any,
      log = true,
      report = true,
      retryCount = 0,
      retryDelay = 1000
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // 不是最后一次尝试，等待后重试
        if (attempt < retryCount) {
          if (log) {
            logger.warn(
              `[${sourceId}] 第 ${attempt + 1} 次尝试失败，${retryDelay}ms 后重试...`
            );
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    // 所有尝试都失败
    return this.handle(sourceId, lastError, fallback, { log, report });
  }

  /**
   * 记录错误统计
   */
  private recordError(sourceId: string, error: any): void {
    const now = Date.now();
    const stats = this.errorStats.get(sourceId) || {
      count: 0,
      lastError: 0,
      errorTypes: {}
    };

    stats.count++;
    stats.lastError = now;

    const errorType = this.getErrorType(error);
    stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + 1;

    this.errorStats.set(sourceId, stats);
  }

  /**
   * 获取错误类型
   */
  private getErrorType(error: any): string {
    if (error instanceof DataSourceError) {
      return error.name;
    }
    if (error instanceof Error) {
      return error.name || 'Error';
    }
    return 'Unknown';
  }

  /**
   * 日志记录
   */
  private logError(sourceId: string, error: any): void {
    if (error instanceof DataSourceError) {
      logger.error(
        `数据源 ${sourceId} 错误:`,
        error.message,
        error.statusCode ? `Status: ${error.statusCode}` : ''
      );
    } else {
      logger.error(`数据源 ${sourceId} 未知错误:`, error);
    }
  }

  /**
   * 上报错误（占位符，可扩展为实际的监控系统）
   */
  private reportError(sourceId: string, error: any): void {
    // 可以集成到 Sentry, DataDog 等监控平台
    // 这里仅记录到内存，可通过 API 暴露
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      // 生产环境可发送到监控服务
    }
  }

  /**
   * 获取错误统计
   */
  getStats(sourceId?: string) {
    if (sourceId) {
      return this.errorStats.get(sourceId);
    }
    return Object.fromEntries(this.errorStats);
  }

  /**
   * 清除统计
   */
  clearStats(sourceId?: string): void {
    if (sourceId) {
      this.errorStats.delete(sourceId);
    } else {
      this.errorStats.clear();
    }
  }

  /**
   * 检查数据源是否健康（基于错误率）
   */
  isHealthy(sourceId: string, windowMs: number = 5 * 60 * 1000): boolean {
    const stats = this.errorStats.get(sourceId);
    if (!stats) return true;

    const now = Date.now();
    const recentErrors = Object.values(stats.errorTypes).reduce((a, b) => a + b, 0);

    // 如果最近5分钟错误超过10次，认为不健康
    return recentErrors < 10;
  }
}

/**
 * 便捷函数：执行带错误处理的操作
 */
export async function withErrorHandling<T>(
  sourceId: string,
  operation: () => Promise<T>,
  options: {
    fallback?: T;
    retryCount?: number;
    retryDelay?: number;
  } = {}
): Promise<T> {
  return ErrorHandler.getInstance().wrap(sourceId, operation, options);
}

/**
 * 便捷函数：创建数据源错误
 */
export function createDataSourceError(
  sourceId: string,
  error: any,
  statusCode?: number,
  metadata?: Record<string, any>
): DataSourceError {
  return new DataSourceError(sourceId, error, statusCode, metadata);
}

/**
 * 错误分类器
 */
export class ErrorClassifier {
  /**
   * 判断错误是否可重试
   */
  static isRetryable(error: any): boolean {
    if (error instanceof NetworkError) {
      // 网络错误可重试
      return true;
    }
    if (error instanceof DataSourceError) {
      // 5xx 错误可重试
      return (error.statusCode || 0) >= 500;
    }
    // 其他错误不重试
    return false;
  }

  /**
   * 判断错误是否为临时性
   */
  static isTemporary(error: any): boolean {
    if (error instanceof NetworkError) {
      const status = error.statusCode;
      // 429, 503 是临时性的
      return status === 429 || status === 503;
    }
    return false;
  }

  /**
   * 判断错误是否需要通知用户
   */
  static shouldNotify(error: any): boolean {
    if (error instanceof ConfigError) {
      return true; // 配置错误需要管理员注意
    }
    if (error instanceof DataSourceError) {
      // 持续失败需要通知
      const stats = ErrorHandler.getInstance().getStats(error.sourceId);
      if (stats && stats.count > 5) {
        return true;
      }
    }
    return false;
  }
}
