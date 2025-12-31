<template>
  <header class="sticky top-0 z-50">
    <!-- 玻璃拟态背景 -->
    <div class="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-700/50">
      <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between gap-4">
          <!-- Logo 和标题 -->
          <div class="flex items-center gap-3 flex-shrink-0">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div class="hidden sm:block">
              <h1 class="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                NewsHub
              </h1>
              <p class="text-xs text-slate-500 dark:text-slate-400">热点聚合器</p>
            </div>
          </div>

          <!-- 搜索触发按钮 (移动端) -->
          <button
            @click="$emit('search')"
            class="sm:hidden btn btn-ghost btn-sm btn-circle"
            title="搜索">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          <!-- 桌面端搜索栏 -->
          <div class="hidden sm:flex flex-1 max-w-md mx-4">
            <div class="relative w-full">
              <input
                type="text"
                placeholder="搜索热点... (Ctrl+K)"
                class="w-full input input-sm input-bordered bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-none transition-all"
                @focus="$emit('search')" />
              <kbd class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 border border-slate-300 dark:border-slate-600 rounded px-1.5 py-0.5">⌘K</kbd>
            </div>
          </div>

          <!-- 操作按钮组 -->
          <div class="flex items-center gap-1 sm:gap-2">
            <!-- 刷新按钮 -->
            <button
              @click="$emit('refresh')"
              :disabled="loading"
              class="btn btn-ghost btn-sm sm:btn-md btn-circle"
              :class="{ 'animate-spin': loading }"
              title="刷新全部">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <!-- 布局切换 -->
            <button
              @click="$emit('toggle-layout')"
              class="btn btn-ghost btn-sm sm:btn-md btn-circle hidden md:block"
              title="切换布局">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>

            <!-- 主题切换 -->
            <button
              @click="toggleTheme"
              class="btn btn-ghost btn-sm sm:btn-md btn-circle"
              :title="currentTheme === 'light' ? '切换到深色' : '切换到浅色'">
              <svg v-if="currentTheme === 'light'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>

            <!-- GitHub -->
            <a
              href="https://github.com/wu529778790/newshub.shenzjd.com"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-ghost btn-sm sm:btn-md btn-circle"
              title="GitHub 仓库">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>

            <!-- 更多菜单 -->
            <div class="dropdown dropdown-end">
              <label tabindex="0" class="btn btn-ghost btn-sm sm:btn-md btn-circle">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </label>
              <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 mt-2">
                <li><a @click="$emit('search')"><span>搜索 (⌘K)</span></a></li>
                <li><a @click="$emit('toggle-layout')"><span>切换布局</span></a></li>
                <li><a @click="toggleTheme"><span>切换主题</span></a></li>
                <li><a href="/api" target="_blank"><span>API 文档</span></a></li>
                <li><a @click="showShortcuts = true"><span>快捷键</span></a></li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            在线: {{ sourceCount }} 个数据源
          </span>
          <span v-if="loading" class="text-blue-500">刷新中...</span>
        </div>
      </div>
    </div>

    <!-- 快捷键提示弹窗 -->
    <div v-if="showShortcuts" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" @click="showShortcuts = false">
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl" @click.stop>
        <h3 class="text-lg font-bold mb-4">键盘快捷键</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span>打开搜索</span>
            <kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">⌘/Ctrl + K</kbd>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span>刷新全部</span>
            <kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">⌘/Ctrl + R</kbd>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span>切换布局</span>
            <kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">⌘/Ctrl + L</kbd>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-200 dark:border-slate-700">
            <span>关闭弹窗</span>
            <kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">Esc</kbd>
          </div>
        </div>
        <button @click="showShortcuts = false" class="btn btn-primary btn-block mt-4">明白</button>
      </div>
    </div>
  </header>
</template>

<script setup>
const props = defineProps({
  sourceCount: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['refresh', 'search', 'toggle-layout'])

// 主题管理
const currentTheme = ref('light')
const showShortcuts = ref(false)

const toggleTheme = () => {
  const newTheme = currentTheme.value === 'light' ? 'dark' : 'light'
  currentTheme.value = newTheme
  document.documentElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
}

// 初始化主题
onMounted(() => {
  const savedTheme = localStorage.getItem('theme') || 'light'
  currentTheme.value = savedTheme
  document.documentElement.setAttribute('data-theme', savedTheme)

  // 键盘快捷键
  const handleKeydown = (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    const modifier = isMac ? e.metaKey : e.ctrlKey

    if (modifier && e.key === 'k') {
      e.preventDefault()
      emit('search')
    } else if (modifier && e.key === 'r') {
      e.preventDefault()
      emit('refresh')
    } else if (modifier && e.key === 'l') {
      e.preventDefault()
      emit('toggle-layout')
    } else if (e.key === 'Escape') {
      showShortcuts.value = false
    }
  }

  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
})
</script>
