<template>
  <section
    :key="source.id"
    class="relative overflow-hidden transition-all duration-300"
    :class="[
      layout === 'grid' ? 'rounded-2xl' : 'rounded-xl',
      isPinned ? 'ring-2 ring-blue-500/30' : ''
    ]">

    <!-- 玻璃拟态背景层 -->
    <div
      class="absolute inset-0 -z-10 opacity-60"
      :class="[
        isPinned
          ? 'bg-gradient-to-br from-blue-50/80 via-purple-50/80 to-pink-50/80 dark:from-blue-900/40 dark:via-purple-900/40 dark:to-pink-900/40'
          : 'bg-white/70 dark:bg-slate-800/70'
      ]"></div>

    <!-- 背景装饰 -->
    <div class="absolute inset-0 -z-20">
      <div
        class="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-30"
        :class="source.color ? `bg-${source.color}-400` : 'bg-blue-400'"></div>
    </div>

    <!-- 卡片内容 -->
    <div
      class="backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 relative"
      :data-source-id="source.id">

      <!-- 头部 -->
      <div class="p-4 md:p-5 border-b border-slate-200/50 dark:border-slate-700/50">
        <div class="flex items-center justify-between gap-3">
          <!-- 左侧：图标 + 标题 -->
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <!-- 动态图标 -->
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
              :class="[
                source.color
                  ? `bg-${source.color}-100 dark:bg-${source.color}-900/30 text-${source.color}-600 dark:text-${source.color}-400`
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              ]"
              v-html="source.icon || '📰'"></div>

            <!-- 标题信息 -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h3 class="font-bold text-base text-slate-800 dark:text-slate-100 truncate">
                  {{ source.name }}
                </h3>
                <!-- 置顶标识 -->
                <svg v-if="isPinned" class="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.856 1.233.856a1 1 0 01-.894 1.79l-1.599-.8L11 6.323V7.5a1 1 0 01-2 0V6.323L6.046 4.741 4.447 5.541a1 1 0 01-.894-1.79l1.233-.856-1.233-.856a1 1 0 01.894-1.79l1.599.8L9 3.323V2.5a1 1 0 011-1z" />
                </svg>
              </div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  实时更新
                </span>
                <span v-if="source.interval" class="text-xs text-slate-400">
                  {{ formatInterval(source.interval) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 右侧：操作按钮 -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <!-- 置顶 -->
            <button
              @click="$emit('togglePin', source.id)"
              class="btn btn-ghost btn-xs btn-circle hover:bg-blue-50 dark:hover:bg-blue-900/30"
              :class="isPinned ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'"
              :title="isPinned ? '取消置顶' : '置顶'">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>

            <!-- 刷新 -->
            <button
              @click="$emit('refresh', source)"
              :disabled="loading"
              class="btn btn-ghost btn-xs btn-circle hover:bg-green-50 dark:hover:bg-green-900/30 text-slate-400 hover:text-green-500 disabled:opacity-50"
              :class="{ 'animate-spin': loading }"
              :title="`刷新 ${source.name}`">
              <svg v-if="!loading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div v-else class="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full"></div>
            </button>

            <!-- 更多菜单 -->
            <div class="dropdown dropdown-end">
              <label tabindex="0" class="btn btn-ghost btn-xs btn-circle hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-400 hover:text-slate-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </label>
              <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-40 mt-1 text-xs">
                <li><a @click="$emit('generate-image', source)">📸 生成分享图</a></li>
                <li><a :href="source.home" target="_blank">🔗 打开官网</a></li>
                <li><a @click="copyApiUrl(source.id)">📋 复制 API 链接</a></li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 加载进度条 -->
        <div v-if="loading" class="mt-3">
          <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1 overflow-hidden">
            <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" style="width: 60%"></div>
          </div>
        </div>
      </div>

      <!-- 内容区域 -->
      <div class="relative">
        <!-- 加载状态 - 骨架屏优化 -->
        <div v-if="loading" class="p-4 space-y-3 min-h-[200px]">
          <!-- 标题骨架 -->
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/4"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-1/2"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-2/3"></div>
          <!-- 分隔线 -->
          <div class="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
          <!-- 内容骨架 -->
          <div class="space-y-2">
            <div class="flex gap-3">
              <div class="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full flex-shrink-0 animate-pulse"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-full"></div>
                <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-5/6"></div>
              </div>
            </div>
            <div class="flex gap-3">
              <div class="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full flex-shrink-0 animate-pulse"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-5/6"></div>
                <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-4/6"></div>
              </div>
            </div>
            <div class="flex gap-3">
              <div class="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full flex-shrink-0 animate-pulse"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-4/6"></div>
                <div class="h-3 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-3/6"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 内容列表 -->
        <div v-else-if="items && items.length > 0" class="p-2">
          <div
            class="max-h-96 overflow-y-auto custom-scrollbar"
            :class="layout === 'grid' ? 'space-y-1' : 'space-y-1.5'">
            <div
              v-for="(item, index) in visibleItems"
              :key="item.id"
              class="group flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
              @click="debouncedOpenLink(item.url)">
              <!-- 排名徽章 -->
              <div class="flex-shrink-0">
                <div
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  :class="getRankBadgeStyle(index + 1)">
                  {{ index + 1 }}
                </div>
              </div>

              <!-- 标题 -->
              <div class="flex-1 min-w-0">
                <h4
                  class="text-sm font-medium leading-tight line-clamp-2 transition-colors"
                  :class="[
                    index < 3
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-700 dark:text-slate-300',
                    'group-hover:text-blue-600 dark:group-hover:text-blue-400'
                  ]">
                  {{ item.title }}
                </h4>

                <!-- 额外信息 -->
                <div class="flex items-center gap-2 mt-1">
                  <span v-if="item.extra?.info" class="text-xs text-slate-500 dark:text-slate-400">
                    {{ item.extra.info }}
                  </span>
                  <span v-if="item.createdAt" class="text-xs text-slate-400">
                    {{ formatTime(item.createdAt) }}
                  </span>
                </div>
              </div>

              <!-- 外部链接图标 -->
              <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
            </div>
          </div>

          <!-- 底部操作栏 -->
          <div class="flex items-center justify-between px-3 py-2 border-t border-slate-200/50 dark:border-slate-700/50 mt-2">
            <span class="text-xs text-slate-500">共显示 {{ Math.min(items.length, 12) }} 条</span>
            <div class="flex gap-2">
              <button
                v-if="items.length > 0"
                @click="$emit('openLink', source.home)"
                class="text-xs text-blue-500 hover:text-blue-600 font-medium">
                访问官网 →
              </button>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="!loading && items && items.length === 0" class="p-8 text-center">
          <div class="text-4xl mb-2">📭</div>
          <p class="text-sm text-slate-500">暂无热点内容</p>
          <button @click="$emit('refresh', source)" class="btn btn-ghost btn-xs mt-2 text-blue-500">
            刷新重试
          </button>
        </div>

        <!-- 错误状态 -->
        <div v-else-if="!loading && items === null" class="p-6 text-center">
          <div class="text-4xl mb-2">⚠️</div>
          <p class="text-sm text-slate-500 mb-2">加载失败</p>
          <button @click="$emit('refresh', source)" class="btn btn-error btn-xs">
            重试
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  source: {
    type: Object,
    required: true
  },
  items: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  layout: {
    type: String,
    default: 'grid',
    validator: (value) => ['grid', 'list'].includes(value)
  }
})

const emit = defineEmits(['refresh', 'openLink', 'togglePin', 'generateImage'])

// 优化：只渲染前12条可见内容，减少DOM节点
const visibleItems = computed(() => {
  return props.items.slice(0, 12)
})

// 防抖函数
const debounce = (fn, delay) => {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// 防抖的打开链接
const debouncedOpenLink = debounce((url) => {
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}, 150)

// 格式化时间间隔
const formatInterval = (ms) => {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  return `${hours}小时`
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (minutes < 1440) return `${Math.floor(minutes / 60)}小时前`
  return `${Math.floor(minutes / 1440)}天前`
}

// 排名徽章样式
const getRankBadgeStyle = (rank) => {
  if (rank === 1) return 'bg-yellow-500 text-white shadow-md'
  if (rank === 2) return 'bg-gray-400 text-white'
  if (rank === 3) return 'bg-orange-500 text-white'
  return 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
}

// 复制 API 链接
const copyApiUrl = async (sourceId) => {
  const url = `${window.location.origin}/api/hot/${sourceId}`
  try {
    await navigator.clipboard.writeText(url)
    alert(`已复制 API 链接:\n${url}`)
  } catch (err) {
    console.error('复制失败:', err)
  }
}
</script>

<style scoped>
/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

/* 玻璃拟态增强 */
.backdrop-blur-xl {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* 动画优化 */
.transition-all {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
