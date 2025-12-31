<template>
  <div
    class="fixed inset-0 z-[70] flex items-start justify-center pt-20 md:pt-32 bg-black/40 backdrop-blur-sm transition-all"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')">

    <div
      class="w-full max-w-2xl mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all"
      @keydown.stop>

      <!-- 搜索框 -->
      <div class="p-4 border-b border-slate-200 dark:border-slate-700">
        <div class="relative">
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            placeholder="搜索热点内容、数据源名称..."
            class="w-full pr-12 pl-12 py-3 text-lg input input-bordered bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:outline-none rounded-xl"
            @input="handleSearch" />

          <!-- 搜索图标 -->
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <!-- 清除按钮 -->
          <button
            v-if="searchQuery"
            @click="clearSearch"
            class="absolute right-4 top-1/2 -translate-y-1/2 btn btn-ghost btn-xs btn-circle text-slate-400 hover:text-slate-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- 搜索结果 -->
      <div class="max-h-[60vh] overflow-y-auto custom-scrollbar">
        <!-- 搜索历史 -->
        <div v-if="!searchQuery && searchHistory.length > 0" class="p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-slate-500">搜索历史</h3>
            <button @click="clearHistory" class="text-xs text-red-500 hover:underline">清除</button>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(item, index) in searchHistory"
              :key="index"
              @click="selectHistory(item)"
              class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-sm hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
              {{ item }}
            </button>
          </div>
        </div>

        <!-- 匹配结果 -->
        <div v-if="searchQuery && filteredResults.length > 0" class="p-2">
          <div class="text-xs text-slate-500 px-2 py-1">
            找到 {{ filteredResults.length }} 个匹配项
          </div>
          <div
            v-for="result in filteredResults"
            :key="result.source.id"
            class="p-3 m-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-600"
            @click="selectResult(result)">

            <div class="flex items-start gap-3">
              <!-- 来源图标 -->
              <div
                class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                :class="[
                  result.source.color
                    ? `bg-${result.source.color}-100 dark:bg-${result.source.color}-900/30 text-${result.source.color}-600`
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                ]">
                {{ result.source.name.charAt(0) }}
              </div>

              <!-- 内容 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
                    {{ result.item.title }}
                  </h4>
                  <span class="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
                    {{ result.source.name }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span v-if="result.item.extra?.info" class="text-xs text-slate-500">
                    {{ result.item.extra.info }}
                  </span>
                  <span v-if="result.item.createdAt" class="text-xs text-slate-400">
                    {{ formatTime(result.item.createdAt) }}
                  </span>
                </div>
              </div>

              <!-- 排名 -->
              <div class="flex-shrink-0">
                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-200 dark:bg-slate-700">
                  {{ result.index + 1 }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 无结果 -->
        <div v-if="searchQuery && filteredResults.length === 0" class="p-8 text-center">
          <div class="text-5xl mb-3">🔍</div>
          <p class="text-slate-500">未找到匹配内容</p>
          <p class="text-xs text-slate-400 mt-1">尝试使用其他关键词搜索</p>
        </div>

        <!-- 快捷建议 -->
        <div v-if="!searchQuery" class="p-4 border-t border-slate-200 dark:border-slate-700">
          <h3 class="text-sm font-semibold text-slate-500 mb-2">快速筛选</h3>
          <div class="grid grid-cols-2 gap-2">
            <button @click="quickFilter('国内')" class="btn btn-ghost btn-sm border border-slate-200 dark:border-slate-700">🇨🇳 国内</button>
            <button @click="quickFilter('科技')" class="btn btn-ghost btn-sm border border-slate-200 dark:border-slate-700">💻 科技</button>
            <button @click="quickFilter('财经')" class="btn btn-ghost btn-sm border border-slate-200 dark:border-slate-700">💰 财经</button>
            <button @click="quickFilter('知乎')" class="btn btn-ghost btn-sm border border-slate-200 dark:border-slate-700">知乎</button>
          </div>
        </div>
      </div>

      <!-- 底部提示 -->
      <div class="p-2 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 text-center border-t border-slate-200 dark:border-slate-700">
        按 Enter 打开第一个结果 • 按 Esc 关闭
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  sources: {
    type: Array,
    default: () => []
  },
  hotItems: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'openLink'])

const searchQuery = ref('')
const searchHistory = ref([])
const searchInput = ref(null)

// 搜索历史管理
const loadHistory = () => {
  const saved = localStorage.getItem('searchHistory')
  if (saved) {
    try {
      searchHistory.value = JSON.parse(saved)
    } catch {
      searchHistory.value = []
    }
  }
}

const saveHistory = (query) => {
  if (!query || query.trim().length < 2) return

  // 去重并保持最近的10条
  const filtered = searchHistory.value.filter(item => item !== query)
  filtered.unshift(query)
  searchHistory.value = filtered.slice(0, 10)

  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
}

const selectHistory = (query) => {
  searchQuery.value = query
  handleSearch()
}

// 搜索逻辑
const filteredResults = computed(() => {
  if (!searchQuery.value || searchQuery.value.trim().length < 2) return []

  const query = searchQuery.value.toLowerCase().trim()
  const results = []

  props.sources.forEach(source => {
    const items = props.hotItems[source.id] || []

    items.forEach((item, index) => {
      // 搜索标题
      if (item.title.toLowerCase().includes(query)) {
        results.push({ source, item, index })
      }
      // 搜索来源名称
      else if (source.name.toLowerCase().includes(query)) {
        results.push({ source, item, index })
      }
      // 搜索额外信息
      else if (item.extra?.info?.toLowerCase().includes(query)) {
        results.push({ source, item, index })
      }
    })
  })

  return results.slice(0, 20) // 限制结果数量
})

const handleSearch = () => {
  // 防抖处理已在输入框的 input 事件中处理
}

const clearSearch = () => {
  searchQuery.value = ''
}

const selectResult = (result) => {
  saveHistory(searchQuery.value)
  emit('openLink', result.item.url)
  emit('close')
}

const quickFilter = (keyword) => {
  searchQuery.value = keyword
  handleSearch()
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

// 键盘导航
const handleKeydown = (e) => {
  if (e.key === 'Enter' && filteredResults.value.length > 0) {
    selectResult(filteredResults.value[0])
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

// 生命周期
onMounted(() => {
  loadHistory()
  nextTick(() => {
    searchInput.value?.focus()
  })

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
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
</style>
