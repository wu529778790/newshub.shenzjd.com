<template>
  <div class="min-h-screen relative overflow-hidden">
    <!-- 动态背景 -->
    <div class="fixed inset-0 -z-10">
      <div class="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-950 dark:to-purple-950 transition-colors duration-500"></div>
      <div class="absolute top-0 left-0 w-full h-full opacity-30 dark:opacity-20">
        <div class="absolute top-10 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-20 right-20 w-96 h-96 bg-purple-400 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s"></div>
      </div>
    </div>

    <!-- 新版头部 -->
    <NewHeader
      :source-count="sources.length"
      :loading="globalLoading"
      @refresh="refreshAll"
      @search="handleSearch"
      @toggle-layout="toggleLayout" />

    <!-- 初始加载状态 -->
    <LoadingState v-if="initialLoading" message="正在初始化数据源..." />

    <!-- 初始错误状态 -->
    <ErrorState
      v-else-if="error"
      title="加载失败"
      :message="error"
      @retry="reloadPage" />

    <!-- 主内容区域 -->
    <main v-else class="container mx-auto px-4 py-6 md:py-8">
      <!-- 工具栏 - 分类 + 视图切换 -->
      <div class="mb-6">
        <!-- 分类和视图控制 -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- 分类筛选 -->
          <div class="flex flex-wrap items-center gap-2">
            <button
              @click="activeColumn = 'all'"
              class="btn btn-sm md:btn-md gap-2"
              :class="[
                activeColumn === 'all'
                  ? 'btn-primary shadow-lg shadow-primary/30'
                  : 'btn-ghost border border-base-300/50 hover:border-primary/30'
              ]">
              <span>🌐 全部</span>
              <span class="badge badge-ghost badge-sm">{{ sources.length }}</span>
            </button>
            <button
              v-for="col in columns"
              :key="col.id"
              @click="activeColumn = col.id"
              class="btn btn-sm md:btn-md gap-2"
              :class="[
                activeColumn === col.id
                  ? 'btn-primary shadow-lg shadow-primary/30'
                  : 'btn-ghost border border-base-300/50 hover:border-primary/30'
              ]">
              <span>{{ col.icon }} {{ col.name }}</span>
              <span class="badge badge-ghost badge-sm">{{ col.count }}</span>
            </button>
          </div>

          <!-- 视图切换和设置 -->
          <div class="flex items-center gap-2">
            <button
              @click="toggleLayout"
              class="btn btn-ghost btn-sm md:btn-md btn-circle"
              title="切换布局">
              <svg v-if="layout === 'grid'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              @click="showSettings = true"
              class="btn btn-ghost btn-sm md:btn-md btn-circle"
              title="设置">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 数据源列表 -->
      <div
        class="transition-all duration-300"
        :class="[
          layout === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6'
            : 'space-y-4 md:space-y-6 max-w-4xl mx-auto'
        ]">
        <template v-for="source in sources" :key="source.id">
          <NewCard
            v-if="shouldShowSource(source)"
            :source="source"
            :items="hotItemsBySource[source.id] || []"
            :loading="loadingStates[source.id]"
            :is-pinned="pinnedSources.includes(source.id)"
            :layout="layout"
            @refresh="refreshSource"
            @open-link="openLink"
            @toggle-pin="togglePin"
            @generate-image="generateImage" />
        </template>
      </div>

      <!-- 空状态 -->
      <div v-if="sources.length > 0 && filteredSources.length === 0" class="text-center py-16">
        <div class="text-6xl mb-4 animate-bounce">🔍</div>
        <h3 class="text-xl font-semibold mb-2">未找到匹配内容</h3>
        <p class="text-base-content/60 mb-4">尝试调整搜索关键词或分类筛选</p>
        <button @click="clearSearch" class="btn btn-primary btn-outline">清除搜索</button>
      </div>

      <!-- 悬浮操作按钮 (移动端) -->
      <div class="fixed bottom-6 right-6 md:hidden z-40">
        <button
          @click="refreshAll"
          :disabled="globalLoading"
          class="btn btn-primary btn-circle btn-lg shadow-2xl shadow-primary/40"
          :class="{ 'animate-spin': globalLoading }">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </main>

    <!-- 搜索弹窗 -->
    <SearchModal
      v-if="showSearch"
      :sources="sources"
      :hot-items="hotItemsBySource"
      @close="showSearch = false"
      @open-link="openLink" />

    <!-- 设置弹窗 -->
    <SettingsModal
      v-if="showSettings"
      @close="showSettings = false"
      @save="handleSettingsSave" />
  </div>
</template>

<script setup>
// 导入组件 - 使用新的组件结构
import LoadingState from "./components/LoadingState.vue";
import ErrorState from "./components/ErrorState.vue";
import NewHeader from "./components/NewHeader.vue";
import NewCard from "./components/NewCard.vue";
import SearchModal from "./components/SearchModal.vue";
import SettingsModal from "./components/SettingsModal.vue";

// 响应式状态
const sources = ref([]);
const hotItemsBySource = ref({});
const loadingStates = ref({});
const initialLoading = ref(false);
const error = ref(null);
const pinnedSources = ref([]);
const activeColumn = ref("all");
const allSourcesData = ref({});

// 新增功能状态
const layout = ref("grid"); // 'grid' 或 'list'
const showSearch = ref(false);
const showSettings = ref(false);
const globalLoading = ref(false);

// 配置
const SOURCE_PREFERENCE_KEY = "hot-list-preference-v2";

// 数据源优先级分组
const PRIORITY_GROUPS = {
  high: ['weibo', 'baidu', 'zhihu', 'bilibili'],  // 前4个优先加载
  medium: ['douyin', 'hupu', 'tieba', 'toutiao', 'ithome', 'xueqiu'], // 第二批
  low: ['solidot', 'github', 'sspai', 'v2exnew', 'juejin', 'coolapk', 'kuaishou', 'bbcnews', 'hackernews', 'ifeng', 'jin10', 'gelonghui', 'fastbull', 'wallstreetcn', 'sputniknewscn', 'cankaoxiaoxi', 'pcbeta', 'nowcoder', 'thepaper']  // 最后加载
};

// 获取优先级
const getPriority = (sourceId) => {
  if (PRIORITY_GROUPS.high.includes(sourceId)) return 1;
  if (PRIORITY_GROUPS.medium.includes(sourceId)) return 2;
  return 3;
};

// 获取保存的用户偏好设置
const getSavedPreference = () => {
  const saved = localStorage.getItem(SOURCE_PREFERENCE_KEY);
  if (!saved) return { pinned: [], layout: "grid" };
  try {
    const parsed = JSON.parse(saved);
    return {
      pinned: parsed.pinned || [],
      layout: parsed.layout || "grid",
    };
  } catch {
    return { pinned: [], layout: "grid" };
  }
};

// 保存用户偏好设置
const savePreference = (pinned, layoutType = "grid") => {
  localStorage.setItem(
    SOURCE_PREFERENCE_KEY,
    JSON.stringify({ pinned, layout: layoutType })
  );
};

// 清理无效的源 ID
const cleanInvalidSources = (preference, validSourceIds) => {
  const cleaned = {
    pinned: preference.pinned.filter(id => validSourceIds.includes(id)),
    layout: preference.layout || "grid",
  };

  if (cleaned.pinned.length !== preference.pinned.length) {
    savePreference(cleaned.pinned, cleaned.layout);
    console.log('已清理无效的数据源缓存');
  }

  return cleaned;
};

// 切换置顶状态
const togglePin = (sourceId) => {
  const preference = getSavedPreference();
  const isPinned = preference.pinned.includes(sourceId);

  if (isPinned) {
    preference.pinned = preference.pinned.filter((id) => id !== sourceId);
  } else {
    preference.pinned.push(sourceId);
  }

  pinnedSources.value = preference.pinned;

  // 重新排序 sources
  const newSources = [...sources.value];
  sortSourcesWithPinning(newSources, preference.pinned);
  sources.value = newSources;

  // 保存偏好
  const validSourceIds = sources.value.map(s => s.id);
  const cleaned = cleanInvalidSources(preference, validSourceIds);
  savePreference(cleaned.pinned, layout.value);
};

// 根据置顶状态排序
const sortSourcesWithPinning = (sourceList, pinned) => {
  sourceList.sort((a, b) => {
    const aPinned = pinned.includes(a.id);
    const bPinned = pinned.includes(b.id);

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    return 0;
  });
};

// 打开链接
const openLink = (url) => {
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

// 生成图片
const generateImage = async (source) => {
  console.log(`生成图片: ${source.name}`);
  // 这里可以调用图片生成 API
  try {
    const items = hotItemsBySource.value[source.id];
    if (!items || items.length === 0) {
      alert("暂无数据可生成图片");
      return;
    }

    // 调用图片生成 API
    const url = `/api/image/${source.id}`;
    window.open(url, "_blank");
  } catch (err) {
    console.error("生成图片失败:", err);
    alert("生成图片失败，请重试");
  }
};

// 搜索处理
const handleSearch = () => {
  showSearch.value = true;
};

// 布局切换
const toggleLayout = () => {
  layout.value = layout.value === "grid" ? "list" : "grid";
  savePreference(pinnedSources.value, layout.value);
};

// 设置保存
const handleSettingsSave = (settings) => {
  // 处理设置保存逻辑
  showSettings.value = false;
  console.log("保存设置:", settings);
};

// 分类图标映射
const columnIcons = {
  china: '🇨🇳',
  world: '🌍',
  tech: '💻',
  finance: '💰',
  culture: '📚',
};

// 分类计算
const columns = computed(() => {
  const cols = [
    { id: 'china', name: '国内', count: 0, icon: columnIcons.china },
    { id: 'world', name: '国际', count: 0, icon: columnIcons.world },
    { id: 'tech', name: '科技', count: 0, icon: columnIcons.tech },
    { id: 'finance', name: '财经', count: 0, icon: columnIcons.finance },
    { id: 'culture', name: '文化', count: 0, icon: columnIcons.culture },
  ];

  sources.value.forEach(source => {
    const sourceData = allSourcesData.value[source.id];
    if (sourceData && sourceData.column) {
      const col = cols.find(c => c.id === sourceData.column);
      if (col) col.count++;
    }
  });

  return cols.filter(c => c.count > 0);
});

// 判断是否显示该数据源
const shouldShowSource = (source) => {
  // 分类过滤
  if (activeColumn.value !== 'all') {
    const sourceData = allSourcesData.value[source.id];
    if (!sourceData || sourceData.column !== activeColumn.value) {
      return false;
    }
  }

  return true;
};

// 计算当前筛选后的源列表
const filteredSources = computed(() => {
  return sources.value.filter(shouldShowSource);
});

// 获取单个数据源数据
const fetchHotListForSource = async (source, isRefresh = false, retryCount = 0) => {
  if (loadingStates.value[source.id] && !isRefresh) return;
  if (!isRefresh && hotItemsBySource.value[source.id]?.length > 0) return;

  loadingStates.value = { ...loadingStates.value, [source.id]: true };

  try {
    const params = { id: source.id };
    if (isRefresh) params.refresh = "true";

    const items = await $fetch("/api/hot-list", {
      params,
      retry: 2,
      retryDelay: 1000,
      timeout: 15000
    });

    if ((!items || items.length === 0) && !isRefresh && retryCount < 1) {
      console.warn(`Empty data for ${source.id}, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchHotListForSource(source, true, retryCount + 1);
    }

    hotItemsBySource.value = {
      ...hotItemsBySource.value,
      [source.id]: items || [],
    };
  } catch (err) {
    console.error(`Failed to fetch hot list for ${source.id}:`, err);

    if (retryCount < 2) {
      console.warn(`Retry ${retryCount + 1}/2 for ${source.id}`);
      await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
      return fetchHotListForSource(source, isRefresh, retryCount + 1);
    }

    hotItemsBySource.value = { ...hotItemsBySource.value, [source.id]: [] };
  } finally {
    loadingStates.value = { ...loadingStates.value, [source.id]: false };
  }
};

// 刷新单个源
const refreshSource = async (source) => {
  await fetchHotListForSource(source, true);
};

// 刷新所有源 - 使用分批刷新
const refreshAll = async () => {
  if (globalLoading.value) return;

  globalLoading.value = true;
  try {
    console.log('🔄 开始刷新所有数据源...');

    // 按优先级分组
    const groupedSources = {
      high: sources.value.filter(s => PRIORITY_GROUPS.high.includes(s.id)),
      medium: sources.value.filter(s => PRIORITY_GROUPS.medium.includes(s.id)),
      low: sources.value.filter(s => !PRIORITY_GROUPS.high.includes(s.id) && !PRIORITY_GROUPS.medium.includes(s.id))
    };

    // 分批刷新
    await loadBatch(groupedSources.high, 0);
    await new Promise(resolve => setTimeout(resolve, 300));
    await loadBatch(groupedSources.medium, 0);
    await new Promise(resolve => setTimeout(resolve, 300));
    await loadBatch(groupedSources.low, 0);

    console.log('✅ 所有数据源刷新完成');
  } catch (err) {
    console.error('刷新失败:', err);
  } finally {
    globalLoading.value = false;
  }
};

// 加载初始数据 - 分批加载优化版
const loadInitialData = async () => {
  initialLoading.value = true;
  error.value = null;

  try {
    // 1. 先获取数据源列表
    let sourceList = await $fetch("/api/sources");

    // 2. 获取并清理保存的偏好设置
    const validSourceIds = sourceList.map(s => s.id);
    let preference = getSavedPreference();
    preference = cleanInvalidSources(preference, validSourceIds);

    // 3. 保存状态
    pinnedSources.value = preference.pinned || [];
    layout.value = preference.layout || "grid";

    // 4. 保存完整的源数据
    sourceList.forEach(source => {
      allSourcesData.value[source.id] = source;
    });

    // 5. 应用置顶排序
    sortSourcesWithPinning(sourceList, preference.pinned || []);
    sources.value = sourceList;

    // 6. 分批加载数据（核心优化）
    console.log('🚀 开始分批加载数据源...');

    // 按优先级分组
    const groupedSources = {
      high: sourceList.filter(s => PRIORITY_GROUPS.high.includes(s.id)),
      medium: sourceList.filter(s => PRIORITY_GROUPS.medium.includes(s.id)),
      low: sourceList.filter(s => !PRIORITY_GROUPS.high.includes(s.id) && !PRIORITY_GROUPS.medium.includes(s.id))
    };

    // 高优先级立即加载（3-4个）
    console.log(`📥 高优先级加载: ${groupedSources.high.length} 个源`);
    await loadBatch(groupedSources.high, 0);

    // 中优先级延迟500ms后加载
    setTimeout(async () => {
      console.log(`📥 中优先级加载: ${groupedSources.medium.length} 个源`);
      await loadBatch(groupedSources.medium, 500);

      // 低优先级再延迟500ms后加载
      setTimeout(async () => {
        console.log(`📥 低优先级加载: ${groupedSources.low.length} 个源`);
        await loadBatch(groupedSources.low, 500);
      }, 500);
    }, 500);

  } catch (err) {
    console.error("Failed to fetch sources:", err);
    error.value = "获取数据源列表失败，请检查网络连接。";
  } finally {
    initialLoading.value = false;
  }
};

// 加载一批数据源（带并发控制）
const loadBatch = async (sourceBatch, delay = 0) => {
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 限制并发数为3
  const CONCURRENT_LIMIT = 3;
  const batches = [];

  for (let i = 0; i < sourceBatch.length; i += CONCURRENT_LIMIT) {
    batches.push(sourceBatch.slice(i, i + CONCURRENT_LIMIT));
  }

  // 逐批执行
  for (const batch of batches) {
    const promises = batch.map(source => loadSingleSource(source));
    await Promise.allSettled(promises);
    // 批次间稍作延迟，避免请求风暴
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

// 加载单个数据源
const loadSingleSource = async (source) => {
  loadingStates.value = { ...loadingStates.value, [source.id]: true };

  try {
    const items = await $fetch("/api/hot-list", {
      params: { id: source.id },
      retry: 1,
      timeout: 10000
    });

    hotItemsBySource.value = {
      ...hotItemsBySource.value,
      [source.id]: items || [],
    };
    console.log(`✅ ${source.name} 加载完成 (${items?.length || 0} 条)`);
  } catch (err) {
    console.warn(`❌ ${source.name} 加载失败:`, err.message);
    hotItemsBySource.value = { ...hotItemsBySource.value, [source.id]: [] };
  } finally {
    loadingStates.value = { ...loadingStates.value, [source.id]: false };
  }
};

// 重新加载页面
const reloadPage = () => {
  window.location.reload();
};

// 监听器
watch(
  sources,
  (newSources) => {
    if (!newSources || newSources.length === 0) return;

    const pinned = pinnedSources.value;
    const validSourceIds = newSources.map(s => s.id);
    const cleaned = cleanInvalidSources({ pinned, layout: layout.value }, validSourceIds);
    savePreference(cleaned.pinned, cleaned.layout);
  },
  { deep: true }
);

// 生命周期
onMounted(() => {
  loadInitialData();

  // 页面可见性变化处理
  const handleVisibilityChange = () => {
    if (!document.hidden && sources.value.length > 0) {
      sources.value.forEach(source => {
        const items = hotItemsBySource.value[source.id];
        if (!items || items.length === 0) {
          console.log(`Page visible, reloading empty source: ${source.id}`);
          fetchHotListForSource(source, true);
        }
      });
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // 键盘快捷键
  const handleKeydown = (e) => {
    // Ctrl/Cmd + R: 刷新全部
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      refreshAll();
    }
    // Ctrl/Cmd + F: 聚焦搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.querySelector('input[type="text"]');
      if (searchInput) searchInput.focus();
    }
  };

  document.addEventListener('keydown', handleKeydown);

  // 清理函数
  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('keydown', handleKeydown);
  });
});
</script>

<style scoped>
/* 玻璃拟态输入框样式 */
.glass-input {
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.glass-input:focus {
  backdrop-filter: blur(16px);
  transform: translateY(-1px);
}

/* 自定义滚动条 */
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

/* 动画优化 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
