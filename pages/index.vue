<template>
  <div
    class="min-h-screen bg-gradient-to-br from-base-100 via-base-50 to-base-100">
    <!-- 头部区域 -->
    <AppHeader :source-count="sources.length" @refresh="reloadPage" />

    <!-- 初始加载状态 -->
    <LoadingState v-if="initialLoading" message="正在加载数据源..." />

    <!-- 初始错误状态 -->
    <ErrorState
      v-else-if="error"
      title="加载失败"
      :message="error"
      @retry="reloadPage" />

    <!-- 主内容区域 -->
    <main v-else class="container mx-auto px-6 py-8">
      <draggable
        v-model="sources"
        item-key="id"
        tag="div"
        class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6"
        handle=".drag-handle"
        animation="300"
        ghost-class="opacity-50"
        chosen-class="ring-2 ring-primary ring-offset-2 ring-offset-base-100"
        :disabled="isPinnedMode">
        <template #item="{ element: source }">
          <HotListCard
            :source="source"
            :items="hotItemsBySource[source.id] || []"
            :loading="loadingStates[source.id]"
            :is-pinned="pinnedSources.includes(source.id)"
            @refresh="refreshSource"
            @open-link="openLink"
            @toggle-pin="togglePin"
            @set-element-ref="(el) => (sourceElements[source.id] = el)" />
        </template>
      </draggable>
    </main>
  </div>
</template>

<script setup>
import draggable from "vuedraggable";
import { AppHeader, LoadingState, ErrorState, HotListCard } from "./components";

const sources = ref([]);
const hotItemsBySource = ref({});
const loadingStates = ref({});
const initialLoading = ref(false);
const error = ref(null);
const sourceElements = ref({});
const pinnedSources = ref([]);
const isPinnedMode = ref(false);

const SOURCE_PREFERENCE_KEY = "hot-list-preference";

// 获取保存的用户偏好设置
const getSavedPreference = () => {
  const saved = localStorage.getItem(SOURCE_PREFERENCE_KEY);
  if (!saved) return { order: [], pinned: [] };
  try {
    const parsed = JSON.parse(saved);
    return {
      order: parsed.order || [],
      pinned: parsed.pinned || [],
    };
  } catch {
    return { order: [], pinned: [] };
  }
};

// 保存用户偏好设置
const savePreference = (order, pinned) => {
  localStorage.setItem(
    SOURCE_PREFERENCE_KEY,
    JSON.stringify({ order, pinned })
  );
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
  sortSourcesWithPinning(newSources, preference.pinned, preference.order);
  sources.value = newSources;

  // 保存偏好
  savePreference(preference.order, preference.pinned);
};

// 根据置顶状态排序
const sortSourcesWithPinning = (sourceList, pinned, order) => {
  sourceList.sort((a, b) => {
    const aPinned = pinned.includes(a.id);
    const bPinned = pinned.includes(b.id);

    // 置顶的在前面
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // 都置顶或都不置顶，按 order 排序
    const aIndex = order.indexOf(a.id);
    const bIndex = order.indexOf(b.id);

    // 如果不在 order 中，放到后面
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });
};

// 打开链接
const openLink = (url) => {
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const fetchHotListForSource = async (source, isRefresh = false) => {
  if (loadingStates.value[source.id]) return;
  if (
    !isRefresh &&
    hotItemsBySource.value[source.id] &&
    hotItemsBySource.value[source.id].length > 0
  ) {
    return;
  }

  loadingStates.value = { ...loadingStates.value, [source.id]: true };
  try {
    const params = { id: source.id };
    // 如果是刷新操作，添加refresh参数强制重新获取数据
    if (isRefresh) {
      params.refresh = "true";
    }
    const items = await $fetch("/api/hot-list", { params });
    hotItemsBySource.value = {
      ...hotItemsBySource.value,
      [source.id]: items || [],
    };
  } catch (err) {
    console.error(`Failed to fetch hot list for ${source.id}:`, err);
    hotItemsBySource.value = { ...hotItemsBySource.value, [source.id]: [] };
  } finally {
    loadingStates.value = { ...loadingStates.value, [source.id]: false };
  }
};

const refreshSource = async (source) => {
  await fetchHotListForSource(source, true);
};

let observer;
const setupObserver = () => {
  if (observer) {
    observer.disconnect();
  }

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const sourceId = entry.target.dataset.sourceId;
          const source = sources.value.find((s) => s.id === sourceId);
          if (source) {
            fetchHotListForSource(source);
            observer.unobserve(entry.target);
          }
        }
      }
    },
    { rootMargin: "300px 0px 300px 0px" }
  );

  const elements = Object.values(sourceElements.value);
  if (elements.length > 0) {
    elements.forEach((el) => {
      if (el) observer.observe(el);
    });
  }
};

const loadInitialData = async () => {
  initialLoading.value = true;
  error.value = null;
  try {
    let sourceList = await $fetch("/api/sources");
    const preference = getSavedPreference();

    // 保存置顶状态
    pinnedSources.value = preference.pinned || [];

    // 应用排序和置顶
    if (preference.order && Array.isArray(preference.order)) {
      const sourceMap = new Map(sourceList.map((s) => [s.id, s]));
      const orderedList = [];
      preference.order.forEach((id) => {
        if (sourceMap.has(id)) {
          orderedList.push(sourceMap.get(id));
          sourceMap.delete(id);
        }
      });
      orderedList.push(...sourceMap.values());
      sourceList = orderedList;
    }

    // 应用置顶排序
    sortSourcesWithPinning(sourceList, preference.pinned || [], preference.order || []);
    sources.value = sourceList;
  } catch (err) {
    console.error("Failed to fetch sources:", err);
    error.value = "获取数据源列表失败，请检查网络连接。";
  } finally {
    initialLoading.value = false;
  }
};

const reloadPage = () => {
  window.location.reload();
};

let observerInitialized = false;
watch(
  sources,
  (newSources) => {
    if (!newSources || newSources.length === 0) return;

    const order = newSources.map((s) => s.id);
    const pinned = pinnedSources.value;
    savePreference(order, pinned);

    if (!observerInitialized) {
      nextTick(() => {
        setupObserver();
        observerInitialized = true;
      });
    }
  },
  { deep: true }
);

onMounted(loadInitialData);

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>
