# 测试文档

## 概述

项目使用 [Vitest](https://vitest.dev/) 作为测试框架，支持单元测试、集成测试和端到端测试。

## 测试框架

- **测试框架**: Vitest
- **测试运行器**: @nuxt/test-utils
- **断言库**: Vitest 内置
- **Mock 工具**: vi.fn(), vi.mock()

## 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test test/unit

# 运行特定测试文件
pnpm test test/unit/cache-manager.test.ts

# 运行测试并显示覆盖率
pnpm test -- --coverage

# 监听模式
pnpm test -- --watch

# 运行特定测试（按名称）
pnpm test -- -t "should set and get values"
```

## 测试结构

```
test/
├── api.test.ts              # API 集成测试
├── unit/
│   ├── cache-manager.test.ts
│   ├── concurrency.test.ts
│   ├── metrics.test.ts
│   └── validator.test.ts
└── e2e/
    └── user-flow.test.ts
```

## 单元测试示例

### 测试缓存管理器

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { CacheManager } from '~/server/utils/cache-manager';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({ maxSize: 10, maxAge: 1000 });
  });

  it('should set and get values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should respect TTL', async () => {
    cache.set('key1', 'value1', 100);
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('key1')).toBeNull();
  });
});
```

### 测试并发工具

```typescript
import { describe, it, expect } from 'vitest';
import { TaskQueue } from '~/server/utils/concurrency';

describe('TaskQueue', () => {
  it('should limit concurrency', async () => {
    const queue = new TaskQueue(2);
    const order: number[] = [];

    const tasks = [
      () => new Promise(resolve => setTimeout(() => { order.push(1); resolve(1); }, 50)),
      () => new Promise(resolve => setTimeout(() => { order.push(2); resolve(2); }, 30)),
      () => new Promise(resolve => setTimeout(() => { order.push(3); resolve(3); }, 10)),
    ];

    await queue.addAll(tasks);
    expect(order).toEqual([2, 3, 1]);
  });
});
```

### 测试 API 端点

```typescript
import { describe, it, expect } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils';

describe('API tests', async () => {
  await setup({ server: true });

  it('/api/v1/sources', async () => {
    const response = await $fetch('/api/v1/sources');
    expect(response.apiVersion).toBe('1.0');
    expect(response.data).toBeInstanceOf(Array);
  });

  it('/api/v1/sources/:id/hot', async () => {
    const response = await $fetch('/api/v1/sources/weibo/hot');
    expect(response.data.items).toBeInstanceOf(Array);
  });
});
```

## 测试最佳实践

### 1. 测试命名

使用清晰、描述性的测试名称：

```typescript
// ✅ Good
it('should evict oldest item when cache is full');

// ❌ Bad
it('test eviction');
```

### 2. 测试隔离

每个测试应该独立，不依赖其他测试的状态：

```typescript
beforeEach(() => {
  cache = new CacheManager();
  // 每个测试前重置状态
});
```

### 3. 边界条件

测试边界情况和错误处理：

```typescript
it('should handle empty array', () => {
  expect(processItems([])).toEqual([]);
});

it('should throw on invalid input', () => {
  expect(() => processItems(null)).toThrow();
});
```

### 4. 异步测试

正确处理异步操作：

```typescript
// ✅ Good
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBe('expected');
});

// ✅ Good
it('should reject on error', async () => {
  await expect(asyncFunction()).rejects.toThrow('error');
});
```

### 5. Mock 策略

只 Mock 外部依赖，不 Mock 实现细节：

```typescript
// ✅ Good - Mock 外部 API
vi.mock('node-fetch', () => ({
  default: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }))
}));

// ❌ Bad - Mock 内部实现
vi.mock('./internal-function', () => ({
  internalFunction: vi.fn(() => 'mocked')
}));
```

## 测试覆盖率

### 配置

在 `vitest.config.ts` 中配置覆盖率：

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

### 生成报告

```bash
# 生成覆盖率报告
pnpm test -- --coverage

# 查看报告
open coverage/index.html
```

## 集成测试

### API 测试

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils';

describe('API Integration', () => {
  beforeAll(async () => {
    await setup({ server: true });
  });

  it('should return sources list', async () => {
    const sources = await $fetch('/api/v1/sources');
    expect(sources.data.length).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    const response = await $fetch('/api/v1/sources/invalid/hot', {
      throwOnError: false,
    });
    expect(response.error.code).toBe('SOURCE_NOT_FOUND');
  });
});
```

### 数据源测试

```typescript
import { describe, it, expect } from 'vitest';
import { getWeiboHotList } from '~/server/sources/weibo';

describe('Weibo Source', () => {
  it('should return valid data structure', async () => {
    const items = await getWeiboHotList();

    expect(items).toBeInstanceOf(Array);
    expect(items.length).toBeGreaterThan(0);

    const firstItem = items[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('title');
    expect(firstItem).toHaveProperty('url');
  });

  it('should handle network errors', async () => {
    // Mock fetch to fail
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    await expect(getWeiboHotList()).rejects.toThrow();
  });
});
```

## E2E 测试

### 用户流程测试

```typescript
import { describe, it, expect } from 'vitest';
import { setup, createPage } from '@nuxt/test-utils';

describe('User Flow', () => {
  await setup({ server: true });

  it('should load and display sources', async () => {
    const page = await createPage('/');

    // 等待数据加载
    await page.waitForSelector('[data-source-id]');

    const sources = await page.locator('[data-source-id]').count();
    expect(sources).toBeGreaterThan(0);
  });

  it('should handle drag and drop', async () => {
    const page = await createPage('/');

    // 等待加载
    await page.waitForSelector('.drag-handle');

    // 模拟拖拽
    const firstCard = await page.locator('[data-source-id]').first();
    const secondCard = await page.locator('[data-source-id]').nth(1);

    // 执行拖拽操作
    await firstCard.dragTo(secondCard);

    // 验证顺序改变
    const firstId = await firstCard.getAttribute('data-source-id');
    const secondId = await secondCard.getAttribute('data-source-id');

    expect(firstId).not.toBe(secondId);
  });
});
```

## 性能测试

### 基准测试

```typescript
import { describe, it, expect } from 'vitest';
import { Bench } from 'tinybench';

describe('Performance Benchmarks', () => {
  it('should handle 1000 cache operations efficiently', async () => {
    const cache = new CacheManager({ maxSize: 1000 });
    const bench = new Bench({ time: 100 });

    bench
      .add('set operations', () => {
        for (let i = 0; i < 100; i++) {
          cache.set(`key${i}`, `value${i}`);
        }
      })
      .add('get operations', () => {
        for (let i = 0; i < 100; i++) {
          cache.get(`key${i}`);
        }
      });

    await bench.run();

    const setTask = bench.tasks.find(t => t.name === 'set operations');
    expect(setTask?.result?.hz).toBeGreaterThan(1000);
  });
});
```

## 测试工具

### 自定义匹配器

```typescript
// 扩展 Vitest 匹配器
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor}-${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor}-${ceiling}`,
        pass: false,
      };
    }
  },
});

// 使用
expect(100).toBeWithinRange(90, 110);
```

### 测试数据生成器

```typescript
function createMockNewsItem(overrides = {}) {
  return {
    id: `mock-${Math.random()}`,
    title: 'Mock Title',
    url: 'https://example.com',
    pubDate: new Date().toISOString(),
    ...overrides,
  };
}

// 使用
const item = createMockNewsItem({ title: 'Custom Title' });
```

## CI/CD 集成

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## 常见问题

### Q: 如何测试私有函数？

A: 导出并测试，或者测试使用该函数的公共 API：

```typescript
// 导出测试
export function internalHelper() { /* ... */ }

// 或者测试公共 API
publicFunction(); // 内部调用 internalHelper()
```

### Q: 如何 Mock 第三方 API？

A: 使用 `vi.mock` 或 `fetch` mock：

```typescript
import { afterAll, beforeAll } from 'vitest';

const server = setupServer(
  rest.get('https://api.example.com/data', (req, res, ctx) => {
    return res(ctx.json({ data: 'mock' }));
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());
```

### Q: 测试太慢怎么办？

A:
1. 减少等待时间
2. 使用 `vi.useFakeTimers()`
3. 并行运行测试
4. Mock 外部依赖

### Q: 如何测试 Vue 组件？

A: 使用 `@vue/test-utils`：

```typescript
import { mount } from '@vue/test-utils';
import MyComponent from '~/components/MyComponent.vue';

it('renders correctly', () => {
  const wrapper = mount(MyComponent, {
    props: { source: { id: 'test', name: 'Test' } }
  });

  expect(wrapper.text()).toContain('Test');
});
```

## 总结

- ✅ 编写独立的、可重复的测试
- ✅ 测试边界情况和错误处理
- ✅ 保持测试代码简洁易读
- ✅ 定期运行测试并监控覆盖率
- ✅ 在 CI/CD 中自动化测试流程
