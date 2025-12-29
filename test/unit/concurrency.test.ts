import { describe, it, expect, vi } from 'vitest';
import { TaskQueue, RateLimiter, RetryStrategy, PriorityTaskQueue } from '~/server/utils/concurrency';

describe('TaskQueue', () => {
  it('should execute tasks with limited concurrency', async () => {
    const queue = new TaskQueue(2);
    const executionOrder: number[] = [];

    const tasks = [
      () => new Promise(resolve => setTimeout(() => { executionOrder.push(1); resolve(1); }, 50)),
      () => new Promise(resolve => setTimeout(() => { executionOrder.push(2); resolve(2); }, 30)),
      () => new Promise(resolve => setTimeout(() => { executionOrder.push(3); resolve(3); }, 10)),
    ];

    const results = await queue.addAll(tasks);
    expect(results).toEqual([1, 2, 3]);
    expect(executionOrder).toEqual([2, 3, 1]); // 2 and 3 start first, 1 starts after one finishes
  });

  it('should respect max concurrency', async () => {
    const queue = new TaskQueue(2);
    let active = 0;
    let maxActive = 0;

    const tasks = Array(5).fill(0).map((_, i) => async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise(resolve => setTimeout(resolve, 10));
      active--;
      return i;
    });

    await queue.addAll(tasks);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('should pause and resume', async () => {
    const queue = new TaskQueue(2);
    const order: number[] = [];

    queue.pause();

    const p1 = queue.add(() => new Promise(resolve => setTimeout(() => { order.push(1); resolve(1); }, 10)));
    const p2 = queue.add(() => new Promise(resolve => setTimeout(() => { order.push(2); resolve(2); }, 10)));

    // Wait a bit, tasks should not have started
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(order).toEqual([]);

    queue.resume();
    await Promise.all([p1, p2]);
    expect(order).toEqual([1, 2]);
  });

  it('should get status', async () => {
    const queue = new TaskQueue(2);
    const status1 = queue.getStatus();
    expect(status1.pending).toBe(0);
    expect(status1.active).toBe(0);
    expect(status1.max).toBe(2);

    const p = queue.add(() => new Promise(resolve => setTimeout(resolve, 50)));
    const status2 = queue.getStatus();
    expect(status2.pending).toBe(1);

    await p;
    const status3 = queue.getStatus();
    expect(status3.pending).toBe(0);
    expect(status3.active).toBe(0);
  });

  it('should wait for all tasks', async () => {
    const queue = new TaskQueue(2);
    const order: number[] = [];

    for (let i = 0; i < 5; i++) {
      queue.add(() => new Promise(resolve => setTimeout(() => { order.push(i); resolve(i); }, 10)));
    }

    await queue.waitAll();
    expect(order.length).toBe(5);
  });
});

describe('RateLimiter', () => {
  it('should limit requests per time window', async () => {
    const limiter = new RateLimiter(2, 100); // 2 requests per 100ms
    const start = Date.now();

    await limiter.acquire(); // 1
    await limiter.acquire(); // 2

    // Third should wait
    const thirdStart = Date.now();
    await limiter.acquire(); // 3
    const thirdDuration = Date.now() - thirdStart;

    expect(thirdDuration).toBeGreaterThanOrEqual(80);
    expect(thirdDuration).toBeLessThan(150);
  });

  it('should wrap functions with rate limiting', async () => {
    const limiter = new RateLimiter(2, 100);
    const results: number[] = [];

    const wrapped = limiter.wrap(async (value: number) => {
      results.push(value);
      return value;
    });

    await Promise.all([
      wrapped(1),
      wrapped(2),
      wrapped(3),
    ]);

    expect(results).toEqual([1, 2, 3]);
  });

  it('should get status', async () => {
    const limiter = new RateLimiter(2, 100);
    const status1 = limiter.getStatus();
    expect(status1.currentRequests).toBe(0);
    expect(status1.maxRequests).toBe(2);

    await limiter.acquire();
    const status2 = limiter.getStatus();
    expect(status2.currentRequests).toBe(1);
  });
});

describe('RetryStrategy', () => {
  it('should retry failed operations', async () => {
    const strategy = new RetryStrategy({ maxRetries: 3, baseDelay: 10 });

    let attempts = 0;
    const result = await strategy.execute(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Failed');
      return 'success';
    });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('should stop after max retries', async () => {
    const strategy = new RetryStrategy({ maxRetries: 2, baseDelay: 10 });

    let attempts = 0;
    await expect(
      strategy.execute(async () => {
        attempts++;
        throw new Error('Always fails');
      })
    ).rejects.toThrow('Always fails');

    expect(attempts).toBe(3); // Initial + 2 retries
  });

  it('should use exponential backoff', async () => {
    const strategy = new RetryStrategy({
      maxRetries: 3,
      baseDelay: 10,
      backoff: 'exponential',
    });

    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;

    vi.stubGlobal('setTimeout', vi.fn((fn, delay) => {
      delays.push(delay);
      return originalSetTimeout(fn, 0);
    }));

    try {
      let attempts = 0;
      await strategy.execute(async () => {
        attempts++;
        if (attempts < 4) throw new Error('Failed');
        return 'success';
      });
    } finally {
      vi.unstubAllGlobal();
    }

    // Should have delays: 10, 20, 40
    expect(delays[0]).toBe(10);
    expect(delays[1]).toBe(20);
    expect(delays[2]).toBe(40);
  });

  it('should respect custom retry condition', async () => {
    const strategy = new RetryStrategy({ maxRetries: 5, baseDelay: 10 });

    let attempts = 0;
    const result = await strategy.execute(
      async () => {
        attempts++;
        if (attempts === 2) return 'success';
        throw new Error('Failed');
      },
      (error, attempt) => {
        // Only retry once
        return attempt < 1;
      }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });
});

describe('PriorityTaskQueue', () => {
  it('should execute higher priority tasks first', async () => {
    const queue = new PriorityTaskQueue(2);
    const order: number[] = [];

    // Add low priority first
    queue.add(() => new Promise(resolve => setTimeout(() => { order.push(1); resolve(1); }, 10)), 10);
    queue.add(() => new Promise(resolve => setTimeout(() => { order.push(2); resolve(2); }, 10)), 100);
    queue.add(() => new Promise(resolve => setTimeout(() => { order.push(3); resolve(3); }, 10)), 50);

    await queue.waitAll();
    // 2 (highest) and 3 (medium) should execute before 1 (lowest)
    expect(order[0]).toBe(2);
    expect(order[1]).toBe(3);
    expect(order[2]).toBe(1);
  });

  it('should handle multiple tasks with same priority', async () => {
    const queue = new PriorityTaskQueue(2);
    const order: number[] = [];

    queue.add(() => new Promise(resolve => setTimeout(() => { order.push(1); resolve(1); }, 20)), 50);
    queue.add(() => new Promise(resolve => setTimeout(() => { order.push(2); resolve(2); }, 10)), 50);
    queue.add(() => new Promise(resolve => setTimeout(() => { order.push(3); resolve(3); }, 5)), 50);

    await queue.waitAll();
    expect(order.length).toBe(3);
  });

  it('should get status', async () => {
    const queue = new PriorityTaskQueue(2);
    const status1 = queue.getStatus();
    expect(status1.pending).toBe(0);
    expect(status1.active).toBe(0);
    expect(status1.max).toBe(2);

    queue.add(() => new Promise(resolve => setTimeout(resolve, 50)), 100);
    const status2 = queue.getStatus();
    expect(status2.pending).toBe(1);
  });
});
