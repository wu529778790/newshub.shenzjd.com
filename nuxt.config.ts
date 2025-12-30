// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from "nuxt/config";
import { resolve } from "node:path";

export default defineNuxtConfig({
  // 兼容性日期
  compatibilityDate: "2025-07-15",

  // 开发工具（生产环境禁用）
  devtools: { enabled: process.env.NODE_ENV !== "production" },

  // 模块
  modules: [
    "@nuxtjs/tailwindcss",
  ],

  // 页面路由
  pages: true,

  // TypeScript 配置
  typescript: {
    tsConfig: {
      compilerOptions: {
        strict: false,
      },
    },
    typeCheck: false,
  },

  // 构建配置
  build: {
    // 分析打包大小
    analyze: process.env.ANALYZE === "true",

    // 滚动到顶部
    transpile: [],
  },

  // Nitro 服务器配置
  nitro: {
    // 存储配置
    storage: {
      // 可选：Redis 配置（如果提供）
      redis: process.env.REDIS_URL ? {
        driver: "redis",
        url: process.env.REDIS_URL,
      } : undefined,

      // 本地文件缓存
      fs: {
        driver: "fs",
        base: "./data/cache",
      },
    },

    // 预设（自动检测）
    preset: process.env.NITRO_PRESET || "node",

    // 压缩配置
    compressPublicAssets: true,
  },

  // 运行时配置
  runtimeConfig: {
    // 私有密钥（服务器端可用）
    apiSecret: process.env.API_SECRET,

    // 公共配置（客户端可用）
    public: {
      siteUrl: process.env.SITE_URL || "http://localhost:3000",
      siteName: "NewsHub - 热点聚合器",
      version: process.env.npm_package_version || "0.0.1",
    },
  },

  // 后端插件（Nitro 自动从 server/plugins 加载，无需在此配置）

  // 路径别名
  alias: {
    "#": resolve(__dirname, "./server"),
    "@shared": resolve(__dirname, "./shared"),
    "@composables": resolve(__dirname, "./composables"),
  },

  // PostCSS 配置
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
      ...(process.env.NODE_ENV === "production" ? {
        cssnano: {
          preset: ["default", {
            discardComments: { removeAll: true },
          }],
        },
      } : {}),
    },
  },

  // Tailwind CSS 配置
  tailwindcss: {
    config: {
      theme: {
        extend: {
          colors: {
            primary: "#07C160",
            secondary: "#1DA1F2",
          },
        },
      },
    },
  },

  // 开发服务器配置
  devServer: {
    host: "0.0.0.0",
    port: 3000,
  },

  // 性能优化
  experimental: {
    // 组件自动懒加载
    payloadExtraction: true,

    // 渲染策略
    renderJsonPayloads: true,

    // 响应式组件
    viewTransition: true,

    // 优化客户端路由
    clientRouteCache: true,
  },

  // 优化打包
  vite: {
    // 构建选项
    build: {
      // 代码分割
      rollupOptions: {
        output: {
          manualChunks: {
            // 拆分大型依赖
            "vue-vendor": ["vue"],
            "utils": ["dayjs", "cheerio", "fast-xml-parser"],
            "image": ["html2canvas"],
          },
        },
      },
      // 目标浏览器
      target: "es2018",
    },

    // 开发服务器优化
    server: {
      fs: {
        allow: [".."],
      },
    },
  },

  // 缓存配置
  routeRules: {
    // 静态资源长期缓存
    "/_nuxt/**": {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    },

    // API 响应缓存
    "/api/v1/sources/**": {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=30",
      },
    },
  },
});
